"use client";

import { useEffect, useState } from "react";

import { useUiStore } from "@/store/uiStore";
import type { EventDTO } from "@/types/events";

const EVENTS_UNAVAILABLE_MESSAGE =
  "Los eventos no están disponibles en este momento.";

const COUNTS = [1, 2, 3] as const;

/** Texto amigable según los días restantes, con singular/plural. */
function formatDaysRemaining(days: number): string {
  if (days <= 0) return "Hoy";
  return days === 1 ? "Queda 1 día" : `Quedan ${days} días`;
}

/**
 * Widget de eventos próximos (feriados de Chile vía Google Calendar). Es un
 * Client Component:
 * - Lee `eventsCount` y `setEventsCount` desde el store global de UI
 *   (Zustand + persist), que persiste el filtro de 1 vs 3 eventos.
 * - Consume el Route Handler propio (`/api/events`) — nunca Google Calendar
 *   en el cliente.
 * - Muestra un skeleton de carga (`animate-pulse`) mientras resuelve.
 */
export function EventsWidget() {
  const eventsCount = useUiStore((state) => state.eventsCount);
  const setEventsCount = useUiStore((state) => state.setEventsCount);

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/events");
        if (!response.ok) {
          if (!cancelled) {
            setLoading(false);
            setError(EVENTS_UNAVAILABLE_MESSAGE);
          }
          return;
        }

        const data = (await response.json()) as EventDTO[];
        if (!cancelled) {
          setEvents(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError(EVENTS_UNAVAILABLE_MESSAGE);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  // Límite visual aplicado por el estado de Zustand (1 vs 3 eventos).
  const visibleEvents = events.slice(0, eventsCount);

  return (
    <section
      aria-label="Eventos próximos de Chile"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Próximos eventos
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {eventsCount} evento{eventsCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex gap-1 rounded-lg bg-zinc-200 p-1 dark:bg-zinc-800">
          {COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setEventsCount(count)}
              aria-pressed={eventsCount === count}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                eventsCount === count
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
      ) : visibleEvents.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No hay eventos próximos disponibles en este momento.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleEvents.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {event.title}
                </h3>
                <time
                  dateTime={event.date}
                  className="text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {event.date}
                </time>
              </div>
              <span className="shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {formatDaysRemaining(event.daysRemaining)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}