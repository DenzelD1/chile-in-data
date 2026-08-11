import type { Metadata } from "next";
import { Suspense } from "react";

import { NewsWidget } from "@/components/news-widget";
import { PageHeader } from "@/components/page-header";
import { getWidgetDefinition } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Noticias",
};

export default function NoticiasPage() {
  const widget = getWidgetDefinition("news");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title={widget.label} description={widget.description} />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <Suspense
          fallback={
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Cargando...
            </div>
          }
        >
          <NewsWidget />
        </Suspense>
      </section>
    </main>
  );
}