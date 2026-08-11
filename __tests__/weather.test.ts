import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/weather/route";

const MOCK_API_KEY = "test-openweather-key";

/**
 * Payload masivo realista de OpenWeather (más campos de los que la UI usa),
 * para verificar que el Patrón Adaptador descarta todo excepto el WeatherDTO.
 */
const openWeatherPayload = {
  coord: { lon: -70.66, lat: -33.45 },
  weather: [
    { id: 800, main: "Clear", description: "cielo despejado", icon: "01d" },
  ],
  base: "stations",
  main: {
    temp: 21.5,
    feels_like: 20.9,
    temp_min: 19.2,
    temp_max: 23.4,
    pressure: 1016,
    humidity: 58,
    sea_level: 1016,
    grnd_level: 987,
  },
  visibility: 10000,
  wind: { speed: 4.1, deg: 240, gust: 5.3 },
  clouds: { all: 0 },
  dt: 1723400000,
  sys: {
    type: 2,
    id: 2011356,
    country: "CL",
    sunrise: 1723372900,
    sunset: 1723410400,
  },
  timezone: -14400,
  id: 3870011,
  name: "Coquimbo",
  cod: 200,
};

function createFetchMock(payload: unknown, ok = true) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok,
      json: async () => payload,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.OPENWEATHER_API_KEY = MOCK_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENWEATHER_API_KEY;
});

describe("GET /api/weather", () => {
  it("mapea la respuesta masiva de OpenWeather al WeatherDTO estricto", async () => {
    const fetchMock = createFetchMock(openWeatherPayload);

    const response = await GET(
      new Request("http://localhost/api/weather?lat=-33.45&lon=-70.66"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      city: "Coquimbo",
      temperature: 21.5,
      condition: "cielo despejado",
      iconCode: "01d",
      minTemp: 19.2,
      maxTemp: 23.4,
      humidity: 58,
    });
  });

  it("construye la URL con coordenadas, llave, unidades métricas e idioma español", async () => {
    const fetchMock = createFetchMock(openWeatherPayload);

    await GET(
      new Request("http://localhost/api/weather?lat=-33.45&lon=-70.66"),
    );

    const [url, options] = fetchMock.mock.calls[0];
    const parsedUrl = new URL(url as string);

    expect(parsedUrl.searchParams.get("lat")).toBe("-33.45");
    expect(parsedUrl.searchParams.get("lon")).toBe("-70.66");
    expect(parsedUrl.searchParams.get("appid")).toBe(MOCK_API_KEY);
    expect(parsedUrl.searchParams.get("units")).toBe("metric");
    expect(parsedUrl.searchParams.get("lang")).toBe("es");
    expect(options).toEqual({ next: { revalidate: 300 } });
  });

  it("responde 400 cuando faltan lat o lon", async () => {
    const response = await GET(new Request("http://localhost/api/weather"));

    expect(response.status).toBe(400);
  });

  it("responde 500 cuando no hay llave de API configurada", async () => {
    delete process.env.OPENWEATHER_API_KEY;

    const response = await GET(
      new Request("http://localhost/api/weather?lat=-33.45&lon=-70.66"),
    );

    expect(response.status).toBe(500);
  });

  it("responde 503 cuando OpenWeather no está disponible", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        throw new Error("network down");
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/weather?lat=-33.45&lon=-70.66"),
    );

    expect(response.status).toBe(503);
  });

  it("responde 503 cuando la respuesta de OpenWeather es inválida", async () => {
    createFetchMock({ main: { temp: "no-es-numero" } });

    const response = await GET(
      new Request("http://localhost/api/weather?lat=-33.45&lon=-70.66"),
    );

    expect(response.status).toBe(503);
  });
});
