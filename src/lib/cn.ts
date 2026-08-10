/**
 * Utilidad para componer listas de clases CSS descartando valores falsy.
 * Evita la dependencia de librerías externas tipo `clsx`.
 */
type ClassValue = string | number | null | undefined | false;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).map(String).join(" ");
}