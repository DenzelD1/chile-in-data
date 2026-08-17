/**
 * DTO (Data Transfer Object) del módulo de Eventos.
 *
 * Contiene únicamente los campos que la UI necesita renderizar, desacoplada
 * del formato que devuelve la API de Google Calendar (eventos "all-day" con
 * `start.date`). Es el contrato que viaja entre el Route Handler (Backend for
 * Frontend) y el componente visual (EventsWidget).
 */
export interface EventDTO {
  id: string;
  title: string;
  /** Fecha del evento en formato ISO `YYYY-MM-DD` (día completo). */
  date: string;
  /** Días restantes desde hoy hasta la fecha del evento. */
  daysRemaining: number;
}