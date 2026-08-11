"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { NewsArticleDTO } from "@/types/news";

/** Valor del filtro de noticias compartido con el Route Handler. */
type NewsFilter = "nacional" | "local" | "ambas";

const FILTERS: ReadonlyArray<{ value: NewsFilter; label: string }> = [
  { value: "nacional", label: "Nacional" },
  { value: "local", label: "Local" },
  { value: "ambas", label: "Ambas" },
];

const NEWS_UNAVAILABLE_MESSAGE =
  "Las noticias no están disponibles en este momento. Inténtalo más tarde.";
const LOCATION_REQUIRED_MESSAGE =
  "Se requiere ubicación para noticias locales.";

function parseFilter(value: string | null): NewsFilter {
  if (value === "nacional" || value === "local") return value;
  return "ambas";
}

/**
 * Widget de noticias nacionales y regionales de Chile. Es un Client Component:
 * - Usa `useSearchParams`, `usePathname` y `useRouter` de `next/navigation`
 *   para mantener el estado del filtro en la URL (`?newsFilter=<valor>`).
 * - Pide la ubicación al navegador al montarse (`navigator.geolocation`).
 * - Consume el Route Handler propio (`/api/news`) — nunca Newsdata.io en el
 *   cliente, para proteger la llave.
 *
 * Regla de negocio crítica: si el filtro pide noticias locales (Local o
 * Ambas) y el usuario deniega la ubicación, el widget NO llama a la API y
 * muestra "Se requiere ubicación para noticias locales" en lugar de fabricar
 * una región por defecto.
 */
export function NewsWidget() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentFilter = parseFilter(searchParams.get("newsFilter"));

  const [articles, setArticles] = useState<NewsArticleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [locationDenied, setLocationDenied] = useState(false);
  const locationRequestedRef = useRef(false);

  const needsLocation = currentFilter === "local" || currentFilter === "ambas";

  // Geolocalización: solo se pide cuando el filtro requiere noticias locales,
  // y solo una vez (evita el doble disparo bajo el StrictMode de desarrollo).
  useEffect(() => {
    if (!needsLocation) return;
    if (coords !== null || locationDenied) return;
    if (locationRequestedRef.current) return;
    locationRequestedRef.current = true;

    if (!("geolocation" in navigator)) {
      // Grupo sin soporte de geolocalización. El setState se difiere a un
      // microtask porque la regla react-hooks desaconseja setState síncrono
      // dentro del cuerpo del effect.
      queueMicrotask(() => {
        setLocationDenied(true);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: geo }) => {
        setCoords({ lat: geo.latitude, lon: geo.longitude });
      },
      () => {
        setLocationDenied(true);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [needsLocation, coords, locationDenied]);

  useEffect(() => {
    let cancelled = false;

    // Ubicación exigida y denegada: fallback amigable, NO se llama a la API.
    if (needsLocation && locationDenied) {
      queueMicrotask(() => {
        if (cancelled) return;
        setArticles([]);
        setLoading(false);
        setError(LOCATION_REQUIRED_MESSAGE);
      });
      return;
    }

    // Ubicación exigida pero aún en espera de la respuesta del navegador:
    // se mantiene el skeleton de carga hasta que se resuelva.
    if (needsLocation && coords === null) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoading(true);
        setError(null);
      });
      return;
    }

    async function loadNews() {
      const params = new URLSearchParams({ filter: currentFilter });
      if (coords !== null) {
        params.set("lat", String(coords.lat));
        params.set("lon", String(coords.lon));
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/news?${params.toString()}`);
        if (!response.ok) {
          if (!cancelled) {
            setLoading(false);
            setError(NEWS_UNAVAILABLE_MESSAGE);
          }
          return;
        }

        const data = (await response.json()) as NewsArticleDTO[];
        if (!cancelled) {
          setArticles(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError(NEWS_UNAVAILABLE_MESSAGE);
        }
      }
    }

    void loadNews();

    return () => {
      cancelled = true;
    };
  }, [currentFilter, needsLocation, coords, locationDenied]);

  function updateFilter(filter: NewsFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("newsFilter", filter);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function renderSkeleton() {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="h-40 animate-pulse bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Noticias de Chile"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Noticias
        </h2>
        <div className="flex gap-1 rounded-lg bg-zinc-200 p-1 dark:bg-zinc-800">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => updateFilter(value)}
              aria-pressed={currentFilter === value}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                currentFilter === value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No hay noticias disponibles para este filtro en este momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
            >
              {article.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagen remota de Newsdata.io; <Image/> exigiría configurar remotePatterns
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-zinc-200 dark:bg-zinc-800">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    News Chile
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-semibold leading-snug text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                  {article.title}
                </h3>
                {article.description ? (
                  <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {article.description}
                  </p>
                ) : null}
                <span className="mt-auto text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {article.source}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}