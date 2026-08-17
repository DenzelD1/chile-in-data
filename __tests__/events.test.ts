import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/events/route";

// Fuerza la zona horaria UTC para que el cálculo de días (date-fns) y el
// parseo de "YYYY-MM-DD" sean deterministas en cualquier máquina de CI.
process.env.TZ = "UTC";

const MOCK_API_KEY = "test-google-calendar-key";

/**
 * Fecha "actual" fijada con fake timers (2026-08-11 mediodía UTC). Al correr
 * los tests en UTC, los días restantes son cálculos exactos.
 */
const NOW = "2026-08-11T12:00:00.000Z";

/**
 * Payload de Google Calendar Events API. Incluye ítems inválidos (sin título,
 * fecha tipo `dateTime`, fecha mal formada) para verificar que el adaptador
 * los descarta.
 */
const googleCalendarPayload = {
  kind: "calendar#events",
  items: [
    {
      id: "e1",
      summary: "Día de la Independencia",
      start: { date: "2026-09-18" },
    },
    {
      id: "e2",
      summary: "Navidad",
      start: { date: "2026-12-25" },
    },
    {
      id: "e3",
      summary: "",
      start: { date: "2026-10-01" },
    },
    {
      id: "e4",
      summary: "Evento con hora",
      start: { dateTime: "2026-09-01T10:00:00Z" },
    },
    {
      id: "e5",
      summary: "Fecha mal formada",
      start: { date: "2026/09/18" },
    },
  ],
};

const CALENDAR_PATH = "calendars/es.cl%23holiday%40group.v.calendar.google.com/events";

function createFetchMock({ payload = googleCalendarPayload }: { payload?: unknown } = {}) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      json: async () => payload,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.GOOGLE_CALENDAR_API_KEY = MOCK_API_KEY;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_CALENDAR_API_KEY;
});

describe("GET /api/events", () => {
  it("consulta Google Calendar con la URL correcta y caché de 1 día", async () => {
    vi.setSystemTime(new Date(NOW));
    const fetchMock = createFetchMock();

    await GET();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toContain(CALENDAR_PATH);
    expect(url).toContain(`key=${MOCK_API_KEY}`);
    expect(new URL(String(url)).searchParams.get("timeMin")).toBe(NOW);
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("orderBy=startTime");
    expect(url).toContain("maxResults=10");
    expect(options).toEqual({ next: { revalidate: 86400 } });
  });

  it("mapea la respuesta a un arreglo EventDTO con días restantes correctos", async () => {
    vi.setSystemTime(new Date(NOW));
    createFetchMock();

    const response = await GET();

    expect(response.status).toBe(200);
    const events = (await response.json()) as Array<Record<string, unknown>>;

    expect(events).toHaveLength(2);

    expect(events[0]).toEqual({
      id: "e1",
      title: "Día de la Independencia",
      date: "2026-09-18",
      daysRemaining: 38,
    });

    expect(events[1]).toEqual({
      id: "e2",
      title: "Navidad",
      date: "2026-12-25",
      daysRemaining: 136,
    });
  });

  it("responde 500 cuando no hay llave de API configurada", async () => {
    delete process.env.GOOGLE_CALENDAR_API_KEY;

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it("responde 503 cuando Google Calendar no está disponible", async () => {
    vi.setSystemTime(new Date(NOW));

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        throw new Error("network down");
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();

    expect(response.status).toBe(503);
  });

  it("responde 503 cuando la respuesta de Google Calendar es inválida", async () => {
    vi.setSystemTime(new Date(NOW));
    createFetchMock({ payload: { items: "no-es-arreglo" } });

    const response = await GET();

    expect(response.status).toBe(503);
  });
});