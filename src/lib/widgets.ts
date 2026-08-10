import type { WidgetId } from "@/types/widget";

/**
 * Definición de un widget del dashboard: su identidad, metadatos de UI
 * y la ruta pública que lo renderiza.
 */
export interface WidgetDefinition {
  id: WidgetId;
  label: string;
  description: string;
  href: string;
}

/**
 * Catálogo único de widgets disponibles en la aplicación.
 * Cada entrada enruta a su página dentro de `src/app`.
 */
export const WIDGETS: readonly WidgetDefinition[] = [
  {
    id: "population",
    label: "Población",
    description: "Datos totales y regionales de la población, segmentados por género.",
    href: "/poblacion",
  },
  {
    id: "weather",
    label: "Clima",
    description: "Condición climática actual y pronóstico de los próximos días.",
    href: "/clima",
  },
  {
    id: "news",
    label: "Noticias",
    description: "Noticias nacionales y regionales de Chile.",
    href: "/noticias",
  },
  {
    id: "events",
    label: "Eventos",
    description: "Próximos eventos destacados hasta fin de año.",
    href: "/eventos",
  },
  {
    id: "alerts",
    label: "Alertas",
    description: "Alertas nacionales y regionales destacadas de Senapred.",
    href: "/alertas",
  },
  {
    id: "mortality",
    label: "Defunciones",
    description: "Tasa de defunciones y accidentes a nivel nacional.",
    href: "/defunciones",
  },
];

/**
 * Devuelve la definición de un widget por su id.
 *
 * @throws {Error} Si el id no pertenece al catálogo. Esta función se usa en
 * las páginas de cada widget, por lo que un error aquí es un defecto de
 * config, no un fallo en tiempo de ejecución esperado.
 */
export function getWidgetDefinition(id: WidgetId): WidgetDefinition {
  const widget = WIDGETS.find((definition) => definition.id === id);

  if (widget === undefined) {
    throw new Error(`El widget "${id}" no existe en el catálogo de widgets.`);
  }

  return widget;
}