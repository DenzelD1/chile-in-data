/**
 * DTO (Data Transfer Object) del módulo de Noticias.
 *
 * Contiene únicamente los campos que la UI necesita renderizar, desacoplada
 * del formato que devuelve la API de Newsdata.io. Es el contrato que viaja
 * entre el Route Handler (Backend for Frontend) y el componente visual
 * (NewsWidget).
 */
export interface NewsArticleDTO {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  url: string;
  source: string;
}
