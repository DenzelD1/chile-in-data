import { connection } from "next/server";

import { getPopulationSeries } from "@/services/population";
import type { PopulationDTO } from "@/types/population";

const YEARS_TO_SHOW = 3;

const NUMBER_FORMATTER = new Intl.NumberFormat("es-CL");
const PERCENT_FORMATTER = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Widget de población nacional (proyecciones del INE).
 *
 * Muestra el año actual y los dos años siguientes. Es un Server Component
 * puro (SSR): obtiene los datos con el servicio local en el servidor y
 * entrega HTML ya formateado al cliente. No usa `use client` — cero
 * JavaScript adicional para rendimiento extremo.
 *
 * Llama a `await connection()` para que la página se renderice dinámicamente
 * en cada request: así `new Date().getFullYear()` se evalúa contra la fecha
 * real del usuario y el widget se auto-actualiza al cambiar de año (p. ej. el
 * 1 de enero de 2027 comenzará a mostrar 2027→2029 sin necesidad de
 * reconstruir el deploy).
 */
export async function PopulationWidget() {
  await connection();

  const populationSeries = await getPopulationSeries(YEARS_TO_SHOW);

  return (
    <section
      aria-label="Población de Chile"
      className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Población de Chile
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Proyección oficial del INE · año actual y siguientes
          </p>
        </div>
      </div>

      <div className="grid gap-8 border-t border-zinc-200 pt-6 sm:grid-cols-3 dark:border-zinc-700">
        {populationSeries.map((population) => (
          <PopulationYearBlock key={population.year} population={population} />
        ))}
      </div>
    </section>
  );
}

interface PopulationYearBlockProps {
  population: PopulationDTO;
}

/** Bloque visual de un año: total destacado y barras de género. */
function PopulationYearBlock({ population }: PopulationYearBlockProps) {
  const { year, total, men, women } = population;
  const menPercent = (men / total) * 100;
  const womenPercent = (women / total) * 100;

  return (
    <article className="flex flex-col gap-4">
      <span className="self-start rounded-full border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        Año {year}
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Población total
        </p>
        <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {NUMBER_FORMATTER.format(total)}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">habitantes</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Hombres
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {NUMBER_FORMATTER.format(men)} ·{" "}
              {PERCENT_FORMATTER.format(menPercent)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(menPercent * 10) / 10}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Proporción de hombres respecto al total en ${year}`}
            className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${menPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Mujeres
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {NUMBER_FORMATTER.format(women)} ·{" "}
              {PERCENT_FORMATTER.format(womenPercent)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(womenPercent * 10) / 10}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Proporción de mujeres respecto al total en ${year}`}
            className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className="h-full rounded-full bg-pink-500"
              style={{ width: `${womenPercent}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}