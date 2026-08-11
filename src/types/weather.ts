/**
 * DTO (Data Transfer Object) del módulo de Clima.
 *
 * Contiene únicamente los campos que la UI necesita renderizar, desacoplada
 * del formato pesado que devuelve la API de OpenWeather. Es el contrato que
 * viaja entre el Route Handler (Backend for Frontend), el Patrón Adaptador y
 * el componente visual (WeatherWidget).
 */
export interface WeatherDTO {
  city: string;
  temperature: number;
  condition: string;
  iconCode: string;
  minTemp: number;
  maxTemp: number;
  humidity: number;
}
