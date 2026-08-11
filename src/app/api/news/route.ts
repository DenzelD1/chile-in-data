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

/** Región local por defecto (regla de negocio del módulo). */
const LOCAL_REGION = "coquimbo";

/**
 * Estrategia de caché acordada: 15 minutos (900 segundos) entre peticiones a
 * Newsdata.io para proteger los límites de la capa gratuita de la API.
 */
const REVALIDATE_SECONDS = 900;

/**
 * Construye la URL de Newsdata.io para un filtro dado. La llave se lee desde
 * `process.env` (servidor) y nunca viaja al bundle del cliente.
 */
function buildNewsUrl(apiKey: string, filter: NewsFilter): string {
  const url = new URL("https://newsdata.io/api/1/news");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("country", "cl");

  if (filter === "local") {
    url.searchParams.set("q", LOCAL_REGION);
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

/**
 * Backend for Frontend del módulo de Noticias.
 *
 * Protege la llave `NEWSDATA_API_KEY` (leída de `process.env`, en el
 * servidor) cacheando las respuestas de Newsdata.io con `revalidate: 900`
 * (15 minutos) y devolviendo únicamente un arreglo limpio de `NewsArticleDTO`.
 *
 * - `?filter=nacional`: consume la API apuntando a Chile (newsdata.io).
 * - `?filter=local`: consume la API con `q=coquimbo` (región local por defecto).
 * - `?filter=ambas` (o ausente/inválido): ejecuta ambos fetch en paralelo con
 *   `Promise.all` y combina los arreglos.
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const filter = parseFilter(searchParams.get("filter"));

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La variable de entorno NEWSDATA_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  try {
    let articles: NewsArticleDTO[];

    if (filter === "nacional" || filter === "local") {
      const url = buildNewsUrl(apiKey, filter);
      const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
      if (!response.ok) {
        return NextResponse.json(
          { error: "Newsdata.io no está disponible en este momento." },
          { status: 503 },
        );
      }
      const payload: unknown = await response.json();
      if (!isNewsdataResponse(payload)) {
        return NextResponse.json(
          { error: "La respuesta de Newsdata.io no tiene el formato esperado." },
          { status: 503 },
        );
      }
      articles = mapResults(payload);
    } else {
      const [nacionalUrl, localUrl] = [
        buildNewsUrl(apiKey, "nacional"),
        buildNewsUrl(apiKey, "local"),
      ];

      const [nacionalResponse, localResponse] = await Promise.all([
        fetch(nacionalUrl, { next: { revalidate: REVALIDATE_SECONDS } }),
        fetch(localUrl, { next: { revalidate: REVALIDATE_SECONDS } }),
      ]);

      if (!nacionalResponse.ok || !localResponse.ok) {
        return NextResponse.json(
          { error: "Newsdata.io no está disponible en este momento." },
          { status: 503 },
        );
      }

      const [nacionalPayload, localPayload] = (await Promise.all([
        nacionalResponse.json(),
        localResponse.json(),
      ])) as [unknown, unknown];

      if (!isNewsdataResponse(nacionalPayload) || !isNewsdataResponse(localPayload)) {
        return NextResponse.json(
          { error: "La respuesta de Newsdata.io no tiene el formato esperado." },
          { status: 503 },
        );
      }

      articles = [...mapResults(nacionalPayload), ...mapResults(localPayload)];
    }

    return NextResponse.json(articles);
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la API de Newsdata.io." },
      { status: 503 },
    );
  }
}
