import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/news/route";

const MOCK_API_KEY = "test-newsdata-key";

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

/** Payload de Newsdata.io para la región local de Coquimbo. */
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

/**
 * Crea un mock de `fetch` que responde según la URL consultada: si incluye
 * `q=coquimbo` devuelve el payload local; en caso contrario, el nacional.
 */
function createFetchMock() {
  const fetchMock = vi.fn(
    async (url: string, _init?: RequestInit) => {
      const isLocal = url.includes("q=coquimbo");
      const payload = isLocal ? localPayload : nacionalPayload;
      return { ok: true, json: async () => payload };
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.NEWSDATA_API_KEY = MOCK_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEWSDATA_API_KEY;
});

describe("GET /api/news", () => {
  it("filtro nacional: consulta Chile sin query local y mapea al DTO", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=nacional"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("country=cl");
    expect(url).not.toContain("q=coquimbo");
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

  it("filtro local: consulta Chile con q=coquimbo", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=local"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("country=cl");
    expect(url).toContain("q=coquimbo");

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

  it("filtro ambas: combina los arreglos nacional y local con Promise.all", async () => {
    const fetchMock = createFetchMock();

    const response = await GET(
      new Request("http://localhost/api/news?filter=ambas"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [nacionalUrl, localUrl] = fetchMock.mock.calls.map(([url]) => url);
    expect(nacionalUrl).not.toContain("q=coquimbo");
    expect(localUrl).toContain("q=coquimbo");

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
