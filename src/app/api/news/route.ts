import { NextResponse } from "next/server";

import type { NewsArticleDTO } from "@/types/news";

/**
 * Valor del filtro de noticias: "nacional", "local" o ambas. Cuando no se
 * especifica o el valor es inválido, se devuelven ambas (cobertura completa).
 */
type NewsFilter = "nacional" | "local" | "ambas";

/**
 * Forma mínima de la respuesta de Newsdata.io. Solo se tipan los campos que el
 * Patrón Adaptador necesita consumir; el resto del JSON (campos pesados como
 * `content`, `keywords`, `sentiment`, etc.) se descarta en el mapeo.
 */
interface NewsdataResponse {
  results?: Array<{
    article_id?: string | null;
    title?: string | null;
    description?: string | null;
    image_url?: string | null;
    link?: string | null;
    source_id?: string | null;
  }>;
}

/** Región local genérica usada solo si la geolocalización falla. */
const FALLBACK_LOCAL_REGION = "coquimbo";

/**
 * Estrategia de caché acordada: 15 minutos (900 segundos) entre peticiones a
 * Newsdata.io para proteger los límites de la capa gratuita de la API.
 */
const REVALIDATE_SECONDS = 900;

const NEWS_BASE_URL = "https://newsdata.io/api/1/news";
const OPEN_WEATHER_GEO_URL = "https://api.openweathermap.org/geo/1.0/reverse";

/**
 * Construye la URL de Newsdata.io para un filtro dado. La llave se lee desde
 * `process.env` (servidor) y nunca viaja al bundle del cliente. `query` es el
 * término opcional de búsqueda (ciudad dinámica para noticias locales).
 */
function buildNewsUrl(apiKey: string, query?: string): string {
  const url = new URL(NEWS_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("country", "cl");

  if (query) {
    url.searchParams.set("q", query);
  }

  return url.toString();
}

/**
 * Type guard que valida en runtime que la respuesta de Newsdata.io tenga la
 * forma esperada, evitando errores de mapeo silenciosos (resiliencia absoluta).
 */
function isNewsdataResponse(value: unknown): value is NewsdataResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.results === undefined || Array.isArray(candidate.results);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Patrón Adaptador: convierte un ítem de la respuesta de Newsdata.io en un
 * `NewsArticleDTO` limpio. Se descartan las noticias sin título (regla de
 * negocio del módulo) y se garantiza un `id` estable.
 */
function toNewsArticleDTO(item: {
  article_id?: string | null;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  link?: string | null;
  source_id?: string | null;
}): NewsArticleDTO | null {
  if (!item.title) return null;

  return {
    id: item.article_id ?? item.link ?? item.title,
    title: item.title,
    description: item.description ?? "",
    imageUrl: item.image_url ?? null,
    url: item.link ?? item.title,
    source: item.source_id ?? "Chile en Datos",
  };
}

/**
 * Mapea el arreglo de resultados de Newsdata.io a un arreglo limpio de
 * `NewsArticleDTO`, filtrando los ítems que no tengan título.
 */
function mapResults(payload: NewsdataResponse): NewsArticleDTO[] {
  if (!Array.isArray(payload.results)) return [];

  const articles: NewsArticleDTO[] = [];
  for (const result of payload.results) {
    if (!isRecord(result)) continue;
    const dto = toNewsArticleDTO(result);
    if (dto !== null) articles.push(dto);
  }
  return articles;
}

function parseFilter(value: string | null): NewsFilter {
  if (value === "nacional") return "nacional";
  if (value === "local") return "local";
  return "ambas";
}

function parseCoordinate(value: string | null): number | null {
  if (value === null) return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

/**
 * Ejecuta un fetch contra Newsdata.io con la URL dada y valida la respuesta en
 * runtime. Si la API no está disponible o devuelve un payload inválido,
 * lanza un error que el Route Handler convierte en un 503 controlado.
 */
async function fetchNews(apiKey: string, url: string): Promise<NewsdataResponse> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });

  if (!response.ok) {
    throw new Error("Newsdata.io no está disponible en este momento.");
  }

  const payload: unknown = await response.json();
  if (!isNewsdataResponse(payload)) {
    throw new Error("La respuesta de Newsdata.io no tiene el formato esperado.");
  }

  return payload;
}

/**
 * Geocodificación inversa: traduce unas coordenadas a un nombre de ciudad
 * usando la API de OpenWeather (`/geo/1.0/reverse`). Se envuelve en try/catch
 * por resiliencia: si falla (red, llave ausente o respuesta inválida) devuelve
 * `null` y el Route Handler cae al `FALLBACK_LOCAL_REGION`.
 */
async function reverseGeocodeCity(
  lat: number | null,
  lon: number | null,
): Promise<string | null> {
  if (lat === null || lon === null) return null;

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(OPEN_WEATHER_GEO_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("limit", "1");
    url.searchParams.set("appid", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) return null;

    const [place] = payload;
    if (!isRecord(place) || typeof place.name !== "string") return null;

    const city = place.name.trim();
    return city.length > 0 ? city : null;
  } catch {
    return null;
  }
}

/**
 * Backend for Frontend del módulo de Noticias.
 *
 * Protege la llave `NEWSDATA_API_KEY` (leída de `process.env`, en el
 * servidor) cacheando las respuestas de Newsdata.io con `revalidate: 900`
 * (15 minutos) y devolviendo únicamente un arreglo limpio de `NewsArticleDTO`.
 *
 * - `?filter=nacional`: consume la API apuntando a Chile (newsdata.io).
 * - `?filter=local&lat&lon`: primero resuelve la ciudad real del usuario con
 *   geocodificación inversa de OpenWeather y usa ese texto en `q=...`.
 * - `?filter=ambas&lat&lon`: hace la geocodificación, luego ejecuta ambos
 *   fetch (nacional y local) en paralelo con `Promise.all` y los combina.
 *
 * Si la geolocalización falla, se usa `FALLBACK_LOCAL_REGION` (Coquimbo).
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const filter = parseFilter(searchParams.get("filter"));
  const lat = parseCoordinate(searchParams.get("lat"));
  const lon = parseCoordinate(searchParams.get("lon"));

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La variable de entorno NEWSDATA_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  try {
    let articles: NewsArticleDTO[];

    if (filter === "nacional") {
      const payload = await fetchNews(apiKey, buildNewsUrl(apiKey));
      articles = mapResults(payload);
    } else {
      const city = await reverseGeocodeCity(lat, lon);
      const query = city ?? FALLBACK_LOCAL_REGION;

      if (filter === "local") {
        const payload = await fetchNews(apiKey, buildNewsUrl(apiKey, query));
        articles = mapResults(payload);
      } else {
        const [nacionalPayload, localPayload] = await Promise.all([
          fetchNews(apiKey, buildNewsUrl(apiKey)),
          fetchNews(apiKey, buildNewsUrl(apiKey, query)),
        ]);

        articles = [...mapResults(nacionalPayload), ...mapResults(localPayload)];
      }
    }

    return NextResponse.json(articles);
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la API de Newsdata.io." },
      { status: 503 },
    );
  }
}