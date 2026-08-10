import { UI_STORE_STORAGE_KEY } from "@/lib/constants";

/**
 * Script inline que se ejecuta en el HTML inicial (antes de la hidratación)
 * para aplicar la clase `dark` sin destello (FOUC) si el usuario tiene el
 * modo oscuro persistido en `localStorage`.
 */
const themeInitScript = [
  "try {",
  "  var raw = localStorage.getItem(" + JSON.stringify(UI_STORE_STORAGE_KEY) + ");",
  "  var stored = raw ? JSON.parse(raw) : null;",
  "  if (stored && stored.state && stored.state.darkMode) {",
  "    document.documentElement.classList.add('dark');",
  "  }",
  "} catch (err) { /* localStorage no disponible; se ignora */ }",
].join("\n");

/**
 * Componente de montaje (Server Component) que inyecta el script de tema.
 * No expone datos sensibles: solo lee la preferencia del propio navegador.
 */
export function ThemeInit() {
  return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}