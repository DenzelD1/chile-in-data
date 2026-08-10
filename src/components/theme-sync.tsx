"use client";

import { useEffect } from "react";

import { useUiStore } from "@/store/uiStore";

/**
 * Sincroniza la preferencia de modo oscuro con el DOM aplicando la clase
 * `dark` sobre `document.documentElement`, que la variante `dark:` de
 * Tailwind usa para activar los estilos oscuros.
 *
 * No renderiza UI, solo efectos.
 */
export function ThemeSync() {
  const darkMode = useUiStore((state) => state.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return null;
}