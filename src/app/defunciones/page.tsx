import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { getWidgetDefinition } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Defunciones",
};

export default function DefuncionesPage() {
  const widget = getWidgetDefinition("mortality");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title={widget.label} description={widget.description} />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Este widget procesará los CSV del MINSAL (defunciones y accidentes)
          mediante Route Handlers en el servidor de Next.js.
        </p>
      </section>
    </main>
  );
}