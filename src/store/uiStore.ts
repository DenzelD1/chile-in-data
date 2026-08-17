import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { UI_STORE_STORAGE_KEY } from "@/lib/constants";
import { WIDGETS } from "@/lib/widgets";
import type { WidgetId } from "@/types/widget";

/**
 * Cantidad de eventos próximos mostrados en el widget de Eventos.
 */
export type EventsCount = 1 | 2 | 3;

/**
 * Preferencias de UI que se persisten en `localStorage`.
 */
interface UiPreferences {
  /** Indica si el modo oscuro está activo. */
  darkMode: boolean;
  /** Filtro de widgets visibles en el dashboard. */
  visibleWidgetIds: WidgetId[];
  /** Cantidad de eventos próximos a mostrar (1 o 3). */
  eventsCount: EventsCount;
}

/**
 * Acciones para mutar las preferencias de UI.
 */
interface UiActions {
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  showWidget: (widgetId: WidgetId) => void;
  hideWidget: (widgetId: WidgetId) => void;
  toggleWidgetVisibility: (widgetId: WidgetId) => void;
  resetWidgetVisibility: () => void;
  setEventsCount: (count: EventsCount) => void;
}

type UiState = UiPreferences & UiActions;

const ALL_WIDGET_IDS: readonly WidgetId[] = WIDGETS.map((widget) => widget.id);

const initialState: UiPreferences = {
  darkMode: false,
  visibleWidgetIds: [...ALL_WIDGET_IDS],
  eventsCount: 3,
};

/**
 * Store global de UI para "Chile en Datos".
 *
 * Únicamente maneja preferencias de interfaz (modo oscuro y filtros de
 * widgets) y las persiste en `localStorage` mediante el middleware `persist`.
 *
 * Es seguro en SSR: el middleware detecta que `localStorage` no existe en el
 * servidor y degrada a estado en memoria sin lanzar errores.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      ...initialState,

      setDarkMode: (enabled) => set({ darkMode: enabled }),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      showWidget: (widgetId) =>
        set((state) =>
          state.visibleWidgetIds.includes(widgetId)
            ? {}
            : { visibleWidgetIds: [...state.visibleWidgetIds, widgetId] },
        ),

      hideWidget: (widgetId) =>
        set((state) => ({
          visibleWidgetIds: state.visibleWidgetIds.filter((id) => id !== widgetId),
        })),

      toggleWidgetVisibility: (widgetId) =>
        set((state) => ({
          visibleWidgetIds: state.visibleWidgetIds.includes(widgetId)
            ? state.visibleWidgetIds.filter((id) => id !== widgetId)
            : [...state.visibleWidgetIds, widgetId],
        })),

      resetWidgetVisibility: () => set({ visibleWidgetIds: [...ALL_WIDGET_IDS] }),

      setEventsCount: (count) => set({ eventsCount: count }),
    }),
    {
      name: UI_STORE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        darkMode: state.darkMode,
        visibleWidgetIds: state.visibleWidgetIds,
        eventsCount: state.eventsCount,
      }),
    },
  ),
);