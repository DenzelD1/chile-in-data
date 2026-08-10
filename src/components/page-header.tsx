import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Encabezado reutilizable de cada página. Es un Server Component:
 * no requiere interactividad, por lo que se renderiza en el servidor.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white px-8 py-10 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">{description}</p>
        ) : null}
        {children}
      </div>
    </header>
  );
}