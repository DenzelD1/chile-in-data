/**
 * DTO (Data Transfer Object) del módulo de Población.
 *
 * Contiene únicamente los campos que la UI necesita renderizar, desacoplada
 * del formato crudo del JSON estático del INE (llaves `Total`, `Hombres` y
 * `Mujeres`). Es el contrato que viaja entre la capa de datos
 * (`src/services/population`) y el componente visual (`PopulationWidget`).
 *
 * Nota de negocio: el desglose regional queda postergado; esta primera fase
 * solo entrega totales nacionales segmentados por género.
 */
export interface PopulationDTO {
  /** Año consultado (resuelto con la lógica de fallback, entre 2026 y 2070). */
  year: number;
  /** Población total nacional para ese año. */
  total: number;
  /** Población masculina nacional para ese año. */
  men: number;
  /** Población femenina nacional para ese año. */
  women: number;
}