import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPopulationData,
  getPopulationSeries,
  resolvePopulationYear,
} from "@/services/population";

/**
 * Valores esperados de 2026 (límite inferior del JSON del INE).
 */
const FIRST_YEAR = 2026;
const FIRST_YEAR_RECORD = {
  year: 2026,
  total: 20150948,
  men: 9912927,
  women: 10238021,
};

/**
 * Valores esperados de 2070 (límite superior del JSON del INE).
 */
const LAST_YEAR = 2070;
const LAST_YEAR_RECORD = {
  year: 2070,
  total: 16972558,
  men: 8326470,
  women: 8646088,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolvePopulationYear", () => {
  it("devuelve el año tal cual cuando está dentro del rango 2026–2070", () => {
    expect(resolvePopulationYear(2035)).toBe(2035);
  });

  it("clampea años anteriores al rango al límite inferior (2026)", () => {
    expect(resolvePopulationYear(2020)).toBe(FIRST_YEAR);
  });

  it("clampea años posteriores al rango al límite superior (2070)", () => {
    expect(resolvePopulationYear(2099)).toBe(LAST_YEAR);
  });
});

describe("getPopulationData", () => {
  it("mapea el JSON del INE a un PopulationDTO para el año actual (2026)", async () => {
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));

    const data = await getPopulationData();

    expect(data).toEqual(FIRST_YEAR_RECORD);
  });

  it("cae al límite 2026 cuando el año actual es anterior al rango (2020)", async () => {
    vi.setSystemTime(new Date("2020-03-01T12:00:00Z"));

    const data = await getPopulationData();

    expect(data.year).toBe(FIRST_YEAR);
    expect(data).toEqual(FIRST_YEAR_RECORD);
  });

  it("cae al límite 2070 cuando el año actual supera el rango (2099), sin errores", async () => {
    vi.setSystemTime(new Date("2099-12-31T23:59:59Z"));

    const data = await getPopulationData();

    expect(data.year).toBe(LAST_YEAR);
    expect(data).toEqual(LAST_YEAR_RECORD);
  });
});

describe("getPopulationSeries", () => {
  it("devuelve el año actual y los dos siguientes (2026 → 2026, 2027, 2028)", async () => {
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));

    const series = await getPopulationSeries(3);

    expect(series).toHaveLength(3);
    expect(series.map((entry) => entry.year)).toEqual([2026, 2027, 2028]);
    expect(series[0]).toEqual(FIRST_YEAR_RECORD);
    expect(series[1]).toEqual({
      year: 2027,
      total: 20252145,
      men: 9960291,
      women: 10291854,
    });
    expect(series[2]).toEqual({
      year: 2028,
      total: 20342246,
      men: 10002262,
      women: 10339984,
    });
  });

  it("fija el inicio de la serie al límite inferior cuando el año actual es anterior al rango", async () => {
    vi.setSystemTime(new Date("2020-03-01T12:00:00Z"));

    const series = await getPopulationSeries(3);

    expect(series.map((entry) => entry.year)).toEqual([2026, 2027, 2028]);
    expect(series[0]).toEqual(FIRST_YEAR_RECORD);
  });

  it("deduplica años al alcanzar el tope de 2070 (2069 → [2069, 2070])", async () => {
    vi.setSystemTime(new Date("2069-06-01T12:00:00Z"));

    const series = await getPopulationSeries(3);

    expect(series.map((entry) => entry.year)).toEqual([2069, 2070]);
    expect(series).toHaveLength(2);
  });

  it("muestra solo 2070 cuando el año actual lo supera en 2099", async () => {
    vi.setSystemTime(new Date("2099-12-31T23:59:59Z"));

    const series = await getPopulationSeries(3);

    expect(series.map((entry) => entry.year)).toEqual([2070]);
    expect(series[0]).toEqual(LAST_YEAR_RECORD);
  });
});