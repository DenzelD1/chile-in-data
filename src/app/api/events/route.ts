import { NextResponse } from "next/server";

import { differenceInDays, startOfDay } from "date-fns";

import type { EventDTO } from "@/types/events";

/**
 * ID del calendario público de feriados de Chile (Google Calendar):
 * `es.cl#holiday@group.v.calendar.google.com`. Se usa ya codificado en URL
 * (`%23` → `#` y `%40` → `@`) porque viaja como segmento de ruta.
 */
const CALENDAR_ID = "es.cl%23holiday%40group.v.calendar.google.com";

/**
 * Estrategia de caché acordada: 1 día (86400 segundos) entre peticiones a
 * Google Calendar. Los feriados casi nunca cambian, así que se reduce el
 * consumo de cuota de la API.
 */
const REVALIDATE_SECONDS = 86400;

/** Máxima cantidad de eventos que se piden a la API (la UI slice con Zustand). */
const MAX_RESULTS = 10;

const CALENDAR_BASE_URL = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`;

/**
 * Forma mínima de la respuesta de Google Calendar Events API. Solo se tipan
 * los campos que el Patrón Adaptador necesita consumir; el resto del JSON
 * (descripciones, ubicaciones, etag, etc.) se descarta en el mapeo.
 */
interface GoogleCalendarResponse {
  items?: Array<{
    id?: string | null;
    summary?: string | null;
    start?: { date?: string | null } | null;
  }>;
}

/**
 * Construye la URL de Google Calendar para los próximos eventos. La llave se
 * lee desde `process.env` (servidor) y nunca viaja al bundle del cliente.
 * `timeMin` filtra solo los eventos a partir de la fecha actual en ISO.
 */
function buildEventsUrl(apiKey: string, now: string): string {
  const url = new URL(CALENDAR_BASE_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", now);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(MAX_RESULTS));
  return url.toString();
}

/**
 * Type guard que valida en runtime que la respuesta de Google Calendar tenga
 * la forma esperada, evitando errores de mapeo silenciosos (resiliencia
 * absoluta).
 */
function isGoogleCalendarResponse(
  value: unknown,
): value is GoogleCalendarResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.items === undefined || Array.isArray(candidate.items);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Valida que la fecha del evento tenga el formato ISO `YYYY-MM-DD`. */
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Patrón Adaptador: convierte un ítem de la respuesta de Google Calendar en un
 * `EventDTO` limpio. Se descartan los eventos sin título y los que no tienen
 * una fecha de día completo válida (`start.date`). Los días restantes se
 * calculan con `date-fns` entre el inicio del día del evento y el de hoy.
 */
function toEventDTO(item: {
  id?: string | null;
  summary?: string | null;
  start?: { date?: string | null } | null;
}): EventDTO | null {
  const rawDate = item.start?.date;
  if (!item.summary || !rawDate || !isIsoDate(rawDate)) return null;

  const daysRemaining = differenceInDays(
    startOfDay(new Date(rawDate)),
    startOfDay(new Date()),
  );

  return {
    id: item.id ?? `${rawDate}-${item.summary}`,
    title: item.summary,
    date: rawDate,
    daysRemaining,
  };
}

/**
 * Mapea el arreglo de eventos de Google Calendar a un arreglo limpio de
 * `EventDTO`, filtrando los ítems inválidos (sin título ni fecha de día).
 */
function mapResults(payload: GoogleCalendarResponse): EventDTO[] {
  if (!Array.isArray(payload.items)) return [];

  const events: EventDTO[] = [];
  for (const item of payload.items) {
    if (!isRecord(item)) continue;
    const dto = toEventDTO(item);
    if (dto !== null) events.push(dto);
  }
  return events;
}

/**
 * Ejecuta un fetch contra la Google Calendar API con la URL dada y valida la
 * respuesta en runtime. Si la API no está disponible o devuelve un payload
 * inválido, lanza un error que el Route Handler convierte en un 503
 * controlado.
 */
async function fetchEvents(apiKey: string, url: string): Promise<GoogleCalendarResponse> {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error("Google Calendar no está disponible en este momento.");
  }

  const payload: unknown = await response.json();
  if (!isGoogleCalendarResponse(payload)) {
    throw new Error(
      "La respuesta de Google Calendar no tiene el formato esperado.",
    );
  }

  return payload;
}

/**
 * Backend for Frontend del módulo de Eventos.
 *
 * Protege la llave `GOOGLE_CALENDAR_API_KEY` (leída de `process.env`, en el
 * servidor) cacheando las respuestas de Google Calendar con
 * `revalidate: 86400` (1 día, los feriados casi nunca cambian) y devolviendo
 * únicamente un arreglo limpio de `EventDTO` con los días restantes calculados
 * vía `date-fns`.
 */
export async function GET() {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "La variable de entorno GOOGLE_CALENDAR_API_KEY no está configurada.",
      },
      { status: 500 },
    );
  }

  try {
    const now = new Date().toISOString();
    const payload = await fetchEvents(apiKey, buildEventsUrl(apiKey, now));
    const events = mapResults(payload);

    return NextResponse.json(events);
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la API de Google Calendar." },
      { status: 503 },
    );
  }
}