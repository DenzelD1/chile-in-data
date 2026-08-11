import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { WeatherWidget } from "@/components/weather-widget";
import { getWidgetDefinition } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Clima",
};

export default function ClimaPage() {
  const widget = getWidgetDefinition("weather");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title={widget.label} description={widget.description} />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <WeatherWidget />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Este widget consumirá el clima actual y el pronóstico de los próximos
          días desde la API de OpenWeather.
        </p>
      </section>
    </main>
  );
}