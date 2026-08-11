import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/news/route";

const MOCK_API_KEY = "test-newsdata-key";
const MOCK_OPENWEATHER_KEY = "test-openweather-key";

/**
 * Payload de Newsdata.io para noticias nacionales. Incluye artículos sin
 * título y sin `article_id` para verificar que el adaptador los descarta o
 * asigna valores por defecto correctamente.
 */
const nacionalPayload = {
  status: "success",
  totalResults: 4,
  results: [
    {
      article_id: "a1",
      title: "Cifra de exportaciones sube en Chile",
      description: "Las exportaciones aumentaron un 5%.",
      image_url: "https://cdn.example.com/a1.jpg",
      link: "https://example.com/a1",
      source_id: "Diario Nacional",
    },
    {
      article_id: "a2",
      title: "",
      description: "Este artículo no tiene título y debe filtrarse.",
      link: "https://example.com/a2",
    },
    {
      article_id: null,
      title: "Artículo sin id de API",
      link: "https://example.com/a3",
    },
    {
      title: "Artículo sin enlace ni fuente",
      description: "El id cae al título y la fuente al valor por defecto.",
    },
  ],
};

/** Payload de Newsdata.io para la región local del usuario. */
const localPayload = {
  status: "success",
  totalResults: 1,
  results: [
    {
      article_id: "b1",
      title: "Festival de Coquimbo anuncia su cartelera",
      description: "El evento se realizará en enero.",
      image_url: null,
      link: "https://example.com/b1",
      source_id: "El Regional",
    },
  ],
};

const GEO_URL_PART = "api.openweathermap.org/geo/1.0/reverse";

/**
 * Crea un mock de `fetch` con orquestación realista:
 * - A la URL de geocodificación inversa de OpenWeather responde la ciudad
 *   "La Serena".
 * - A las URLs de Newsdata.io responde según tengan o no término `q=`.
 *
 * Normaliza el argumento `url` a texto, ya que el Route Handler pasa un
 * objeto `URL` en la llamada de geocodificación y un `string` en Newsdata.
 */
function createFetchMock({
  geoOk = true,
  geoPayload = [{ name: "La Serena" }],
}: { geoOk?: boolean; geoPayload?: unknown } = {}) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);

      if (url.includes(GEO_URL_PART)) {
        return geoOk
          ? { ok: true, json: async () => geoPayload }
          : { ok: false, json: async () => ({}) };
      }

      if (url.includes("q=")) {
        return { ok: true, json: async () => localPayload };
      }

      return { ok: true, json: async () => nacionalPayload };
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.NEWSDATA_API_KEY = MOCK_API_KEY;
  process.env.OPENWEATHER_API_KEY = MOCK_OPENWEATHER_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEWSDATA_API_KEY;
  delete process.env.OPENWEATHER_API_KEY;
});

describe("GET /api/news", () => {
  it("filtro nacional: consulta Chile sin geocodificación ni query local", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=nacional"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("country=cl");
    expect(url).not.toContain("q=");
    expect(options).toEqual({ next: { revalidate: 900 } });

    expect(response.status).toBe(200);
    const articles = (await response.json()) as Array<Record<string, unknown>>;

    expect(articles).toHaveLength(3);

    expect(articles[0]).toEqual({
      id: "a1",
      title: "Cifra de exportaciones sube en Chile",
      description: "Las exportaciones aumentaron un 5%.",
      imageUrl: "https://cdn.example.com/a1.jpg",
      url: "https://example.com/a1",
      source: "Diario Nacional",
    });

    expect(articles[1]).toEqual({
      id: "https://example.com/a3",
      title: "Artículo sin id de API",
      description: "",
      imageUrl: null,
      url: "https://example.com/a3",
      source: "Chile en Datos",
    });

    expect(articles[2]).toEqual({
      id: "Artículo sin enlace ni fuente",
      title: "Artículo sin enlace ni fuente",
      description: "El id cae al título y la fuente al valor por defecto.",
      imageUrl: null,
      url: "Artículo sin enlace ni fuente",
      source: "Chile en Datos",
    });
  });

  it("filtro local: hace geocodificación inversa y usa la ciudad en q=", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=local&lat=-29.95&lon=-71.33"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [geoUrl] = fetchMock.mock.calls[0];
    expect(geoUrl).toContain(GEO_URL_PART);
    expect(geoUrl).toContain("lat=-29.95");
    expect(geoUrl).toContain("lon=-71.33");
    expect(geoUrl).toContain("limit=1");
    expect(geoUrl).toContain(`appid=${MOCK_OPENWEATHER_KEY}`);

    const [newsUrl, options] = fetchMock.mock.calls[1];
    expect(newsUrl).toContain("country=cl");
    expect(newsUrl).toContain("q=");
    expect(newsUrl).not.toContain("q=coquimbo");
    expect(options).toEqual({ next: { revalidate: 900 } });

    expect(response.status).toBe(200);
    const articles = (await response.json()) as Array<Record<string, unknown>>;

    expect(articles).toHaveLength(1);
    expect(articles[0]).toEqual({
      id: "b1",
      title: "Festival de Coquimbo anuncia su cartelera",
      description: "El evento se realizará en enero.",
      imageUrl: null,
      url: "https://example.com/b1",
      source: "El Regional",
    });
  });

  it("filtro local sin lat/lon: cae al fallback genérico (coquimbo) sin geocodificar", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=local"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("q=coquimbo");

    expect(response.status).toBe(200);
  });

  it("filtro local con geocodificación fallida: usa el fallback coquimbo", async () => {
    const fetchMock = createFetchMock({ geoOk: false });

    const response = await GET(
      new Request("http://localhost/api/news?filter=local&lat=-29.95&lon=-71.33"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [newsUrl] = fetchMock.mock.calls[1].map((arg) => String(arg));
    expect(newsUrl).toContain("q=coquimbo");

    expect(response.status).toBe(200);
  });

  it("filtro ambas: geocodifica una vez y combina los arreglos con Promise.all", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=ambas&lat=-29.95&lon=-71.33"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls[0]).toContain(GEO_URL_PART);
    expect(urls[1]).not.toContain("q=");
    expect(urls[2]).toContain("q=");

    expect(response.status).toBe(200);
    const articles = (await response.json()) as Array<Record<string, unknown>>;

    expect(articles).toHaveLength(4);
    expect(articles.map((article) => article.id)).toEqual([
      "a1",
      "https://example.com/a3",
      "Artículo sin enlace ni fuente",
      "b1",
    ]);
  });

  it("sin parámetro filter usa ambas por defecto", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(new Request("http://localhost/api/news"));

    // Sin lat/lon la geolocalización se omite: solo nacional + local.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("responde 500 cuando no hay llave de API configurada", async () => {
    delete process.env.NEWSDATA_API_KEY;

    const response = await GET(
      new Request("http://localhost/api/news?filter=nacional"),
    );

    expect(response.status).toBe(500);
  });

  it("responde 503 cuando Newsdata.io no está disponible", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        throw new Error("network down");
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/news?filter=nacional"),
    );

    expect(response.status).toBe(503);
  });

  it("responde 503 cuando la respuesta de Newsdata.io es inválida", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => ({
        ok: true,
        json: async () => ({ results: "no-es-arreglo" }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/news?filter=nacional"),
    );

    expect(response.status).toBe(503);
  });
});