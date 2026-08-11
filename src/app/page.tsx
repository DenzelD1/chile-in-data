import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { WeatherWidget } from "@/components/weather-widget";
import { WIDGETS } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Página de inicio: dashboard principal que agrupa todas las visualizaciones.
 * El widget de clima se renderiza en vivo (Client Component) en la celda de
 * su id; el resto de los widgets enlazan a su ruta pública.
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Dashboard"
        description="Resumen de los datos públicos de Chile en un solo lugar."
      />

      <section className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-8 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {WIDGETS.map((widget) =>
          widget.id === "weather" ? (
            <WeatherWidget key={widget.id} />
          ) : (
            <Link
              key={widget.id}
              href={widget.href}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {widget.label}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {widget.description}
              </p>
            </Link>
          ),
        )}
      </section>
    </main>
  );
}