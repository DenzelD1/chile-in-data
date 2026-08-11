"use client";

import { useEffect, useRef, useState } from "react";

import type { WeatherDTO } from "@/types/weather";

const LOCATION_REQUIRED_MESSAGE =
  "Se requiere permiso de ubicación para mostrar el clima local.";
const WEATHER_UNAVAILABLE_MESSAGE =
  "El clima no está disponible en este momento. Inténtalo más tarde.";

/**
 * Widget de clima local. Es un Client Component:
 * - Pide la ubicación al navegador al montarse (`navigator.geolocation`).
 * - Consume el Route Handler propio (`/api/weather`) — nunca OpenWeather en
 *   el cliente, para proteger la llave.
 *
 * Regla de negocio crítica: NO existe ubicación por defecto. Si el usuario
 * deniega el permiso o la geolocalización falla, el widget no llama a la API
 * y muestra un mensaje claro pidiendo el permiso.
 */
export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    // Evita disparar la geolocalización dos veces bajo el doble montaje de
    // React StrictMode en desarrollo.
    if (requestedRef.current) return;
    requestedRef.current = true;

    if (!("geolocation" in navigator)) {
      // Navegador sin soporte de geolocalización. El setState se difiere a un
      // microtask porque la regla react-hooks desaconseja setState síncrono
      // dentro del cuerpo del effect.
      queueMicrotask(() => {
        setLoading(false);
        setError(LOCATION_REQUIRED_MESSAGE);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;

        try {
          const response = await fetch(
            `/api/weather?lat=${latitude}&lon=${longitude}`,
          );

          if (!response.ok) {
            setLoading(false);
            setError(WEATHER_UNAVAILABLE_MESSAGE);
            return;
          }

          const data = (await response.json()) as WeatherDTO;
          setWeather(data);
        } catch {
          setError(WEATHER_UNAVAILABLE_MESSAGE);
        } finally {
          setLoading(false);
        }
      },
      () => {
        // Permiso denegado o error de geolocalización: NO usar una ubicación
        // predeterminada y NO llamar a la API.
        setLoading(false);
        setError(LOCATION_REQUIRED_MESSAGE);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  if (loading) {
    return (
      <section
        aria-label="Cargando clima local"
        aria-busy="true"
        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="h-6 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-label="Clima local"
        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Clima local
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
      </section>
    );
  }

  if (weather === null) {
    return null;
  }

  const { city, temperature, condition, iconCode, minTemp, maxTemp, humidity } =
    weather;

  return (
    <section
      aria-label="Clima local"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Clima local
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{city}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- icono remoto de OpenWeather; <Image/> exigiría configurar remotePatterns */}
        <img
          src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`}
          alt={condition}
          width={100}
          height={100}
          loading="lazy"
          className="h-16 w-16 shrink-0"
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {Math.round(temperature)}°C
        </span>
        <span className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
          {condition}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-700">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Mínima</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {Math.round(minTemp)}°C
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Máxima</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {Math.round(maxTemp)}°C
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Humedad</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {humidity}%
          </dd>
        </div>
      </dl>
    </section>
  );
}