import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { PopulationWidget } from "@/components/population-widget";
import { getWidgetDefinition } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Población",
};

export default function PoblacionPage() {
  const widget = getWidgetDefinition("population");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title={widget.label} description={widget.description} />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <PopulationWidget />
      </section>
    </main>
  );
}