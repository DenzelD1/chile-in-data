import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { getWidgetDefinition } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Alertas",
};

export default function AlertasPage() {
  const widget = getWidgetDefinition("alerts");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title={widget.label} description={widget.description} />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Este widget se alimentará de alertas nacionales y regionales mediante
          scraping de Senapred desde el servidor de Next.js.
        </p>
      </section>
    </main>
  );
}