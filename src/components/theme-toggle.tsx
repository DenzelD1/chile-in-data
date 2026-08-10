"use client";

import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/uiStore";

/**
 * Botón que alterna el modo oscuro.
 *
 * Es un Client Component porque necesita interactividad y lee/escribe el
 * store global de UI (que persiste en `localStorage`).
 */
export function ThemeToggle() {
  const darkMode = useUiStore((state) => state.darkMode);
  const toggleDarkMode = useUiStore((state) => state.toggleDarkMode);

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-pressed={darkMode}
      aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100",
        "dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
      )}
    >
      {darkMode ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}