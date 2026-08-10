import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { WIDGETS } from "@/lib/widgets";

/**
 * Encabezado del sitio con navegación entre las visualizaciones.
 * Es un Server Component: los enlaces se renderizan en el servidor,
 * mientras que el botón de tema es un Client Component anidado.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Chile en Datos
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex">
          {WIDGETS.map((widget) => (
            <Link
              key={widget.id}
              href={widget.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {widget.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}