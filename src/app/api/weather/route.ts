import { NextResponse } from "next/server";

import type { WeatherDTO } from "@/types/weather";

/**
 * Forma mínima del payload que OpenWeather devuelve en `/data/2.5/weather`.
 * Solo se tipan los campos que el Patrón Adaptador necesita consumir; el
 * resto del JSON masivo se descarta en el mapeo.
 */
interface OpenWeatherResponse {
  name: string;
  weather: Array<{
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
}

const OPEN_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

/**
 * Estrategia de caché acordada: 5 minutos (300 segundos) entre peticiones a
 * OpenWeather para evitar bloqueos por límite de peticiones.
 */
const OPEN_WEATHER_REVALIDATE_SECONDS = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard que valida en runtime que la respuesta de OpenWeather tenga la
 * forma esperada, evitando errores de mapeo silenciosos (resiliencia absoluta).
 */
function isOpenWeatherResponse(value: unknown): value is OpenWeatherResponse {
  if (!isRecord(value) || typeof value.name !== "string") return false;
  if (!isRecord(value.main)) return false;
  if (
    typeof value.main.temp !== "number" ||
    typeof value.main.temp_min !== "number" ||
    typeof value.main.temp_max !== "number" ||
    typeof value.main.humidity !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(value.weather) || value.weather.length === 0) return false;
  const [weather] = value.weather;
  return (
    isRecord(weather) &&
    typeof weather.description === "string" &&
    typeof weather.icon === "string"
  );
}

/**
 * Patrón Adaptador: convierte el JSON complejo de OpenWeather en un
 * `WeatherDTO` limpio, exponiendo solo lo que la UI necesita.
 */
function toWeatherDTO(payload: OpenWeatherResponse): WeatherDTO {
  const [weather] = payload.weather;

  return {
    city: payload.name,
    temperature: payload.main.temp,
    condition: weather.description,
    iconCode: weather.icon,
    minTemp: payload.main.temp_min,
    maxTemp: payload.main.temp_max,
    humidity: payload.main.humidity,
  };
}

function parseCoordinate(value: string | null): number | null {
  if (value === null) return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

/**
 * Backend for Frontend del módulo de Clima.
 *
 * Protege la llave `OPENWEATHER_API_KEY` (leída de `process.env`, en el
 * servidor) cacheando la respuesta de OpenWeather con `revalidate: 300` y
 * devolviendo únicamente el `WeatherDTO` al cliente.
 *
 * Errores controlados: 400 sin lat/lon válidos, 500 sin llave configurada y
 * 503 si OpenWeather no está disponible o la respuesta es inválida.
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const lat = parseCoordinate(searchParams.get("lat"));
  const lon = parseCoordinate(searchParams.get("lon"));

  if (lat === null || lon === null) {
    return NextResponse.json(
      { error: "Los parámetros 'lat' y 'lon' son requeridos y deben ser números válidos." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La variable de entorno OPENWEATHER_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  const url = new URL(OPEN_WEATHER_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "es");

  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: OPEN_WEATHER_REVALIDATE_SECONDS },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la API de OpenWeather." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "OpenWeather no está disponible en este momento." },
      { status: 503 },
    );
  }

  const payload: unknown = await response.json();
  if (!isOpenWeatherResponse(payload)) {
    return NextResponse.json(
      { error: "La respuesta de OpenWeather no tiene el formato esperado." },
      { status: 503 },
    );
  }

  return NextResponse.json(toWeatherDTO(payload));
}