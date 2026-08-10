import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { WIDGETS } from "@/lib/widgets";
import { useUiStore } from "@/store/uiStore";

const defaultVisibleWidgetIds = WIDGETS.map((widget) => widget.id);

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({
    darkMode: false,
    visibleWidgetIds: defaultVisibleWidgetIds,
  });
});

afterEach(() => {
  localStorage.clear();
});

describe("useUiStore", () => {
  it("inicia en modo claro con todos los widgets visibles", () => {
    const state = useUiStore.getState();

    expect(state.darkMode).toBe(false);
    expect(state.visibleWidgetIds).toEqual(defaultVisibleWidgetIds);
  });

  it("alterna el modo oscuro", () => {
    useUiStore.getState().toggleDarkMode();
    expect(useUiStore.getState().darkMode).toBe(true);

    useUiStore.getState().toggleDarkMode();
    expect(useUiStore.getState().darkMode).toBe(false);
  });

  it("persiste el modo oscuro en localStorage", () => {
    useUiStore.getState().toggleDarkMode();

    const stored = JSON.parse(localStorage.getItem("chile-en-datos-ui") ?? "null");

    expect(stored.state.darkMode).toBe(true);
  });

  it("oculta y vuelve a mostrar un widget", () => {
    const widgetId = WIDGETS[0].id;

    useUiStore.getState().hideWidget(widgetId);
    expect(useUiStore.getState().visibleWidgetIds).not.toContain(widgetId);

    useUiStore.getState().showWidget(widgetId);
    expect(useUiStore.getState().visibleWidgetIds).toContain(widgetId);
  });

  it("intercala la visibilidad de un widget", () => {
    const widgetId = WIDGETS[1].id;

    useUiStore.getState().toggleWidgetVisibility(widgetId);
    expect(useUiStore.getState().visibleWidgetIds).not.toContain(widgetId);

    useUiStore.getState().toggleWidgetVisibility(widgetId);
    expect(useUiStore.getState().visibleWidgetIds).toContain(widgetId);
  });
});