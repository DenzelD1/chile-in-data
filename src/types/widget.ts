/**
 * Identificador único y tipado de cada widget del dashboard.
 *
 * Estos ids son la "fuente de verdad" para los filtros de widgets visibles
 * que persiste el store de Zustand y para el catálogo definido en `lib/widgets.ts`.
 */
export type WidgetId =
  | "population"
  | "weather"
  | "news"
  | "events"
  | "alerts"
  | "mortality";