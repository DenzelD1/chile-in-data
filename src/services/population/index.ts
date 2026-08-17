import type { PopulationDTO } from "@/types/population";

import populationDataFromJson from "./datos_poblacion_2026_2070.json";

/** Registro crudo de un año según el JSON del INE. */
interface PopulationYearRecord {
  Total: number;
  Hombres: number;
  Mujeres: number;
}

/** Rango de años disponibles en el JSON estático del INE. */
const MIN_YEAR = 2026;
const MAX_YEAR = 2070;

// Tipa explícitamente el JSON importado: `resolveJsonModule` infiere llaves
// literales, mientras que aquí lo indexamos con un año dinámico (string).
const populationData = populationDataFromJson as Record<string, PopulationYearRecord>;

/**
 * Resuelve el año a consultar aplicando la lógica de fallback.
 *
 * El JSON solo cubre 2026–2070. Si el año actual queda fuera de ese rango
 * (p. ej. 2020 o 2099), se clampea al límite más cercano para que la
 * aplicación nunca lance un error por falta de datos.
 */
export function resolvePopulationYear(currentYear: number): number {
  if (currentYear < MIN_YEAR) {
    return MIN_YEAR;
  }

  if (currentYear > MAX_YEAR) {
    return MAX_YEAR;
  }

  return currentYear;
}

/** Mapea el registro crudo del JSON a un `PopulationDTO` para un año dado. */
function toPopulationDTO(year: number): PopulationDTO {
  const record = populationData[String(year)];

  return {
    year,
    total: record.Total,
    men: record.Hombres,
    women: record.Mujeres,
  };
}

/**
 * Devuelve la población total nacional del año en curso, segmentada por
 * género, usando las proyecciones estáticas del INE (JSON local).
 *
 * La descarga se simula como asíncrona (`Promise.resolve`) para respetar el
 * contrato de la capa de servicios del proyecto (funciones que devuelven
 * `Promise`), facilitando futuras migraciones a una fuente remota sin
 * modificar los consumidores.
 */
export async function getPopulationData(): Promise<PopulationDTO> {
  const year = resolvePopulationYear(new Date().getFullYear());

  return toPopulationDTO(year);
}

/**
 * Devuelve una serie de `count` años consecutivos comenzando por el año en
 * curso: el año actual y los siguientes (p. ej. en 2026 devuelve 2026, 2027
 * y 2028). El **año base** (el actual) se resuelve con la lógica de fallback
 * (p. ej. en 2020 la serie parte en 2026), y cada año siguiente se clampea al
 * tope de 2070 deduplicando los repetidos para no mostrar tarjetas iguales
 * (p. ej. en 2069 la serie es [2069, 2070]).
 */
export async function getPopulationSeries(count: number): Promise<PopulationDTO[]> {
  const baseYear = resolvePopulationYear(new Date().getFullYear());
  const years: number[] = [];

  for (let offset = 0; offset < count; offset++) {
    const year = resolvePopulationYear(baseYear + offset);

    if (!years.includes(year)) {
      years.push(year);
    }
  }

  return years.map(toPopulationDTO);
}