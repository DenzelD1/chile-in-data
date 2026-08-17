import type { Metadata } from "next";

import { EventsWidget } from "@/components/events-widget";
import { PageHeader } from "@/components/page-header";
import { getWidgetDefinition } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Eventos",
};

export default function EventosPage() {
  const widget = getWidgetDefinition("events");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title={widget.label} description={widget.description} />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <EventsWidget />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Este widget consulta de 1 a 3 eventos próximos desde el calendario de
          feriados de Chile (Google Calendar).
        </p>
      </section>
    </main>
  );
}