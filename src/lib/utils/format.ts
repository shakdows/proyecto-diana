/**
 * Formato para interfaz y documentos.
 *
 * La moneda y la localización son SEMILLAS de `app_settings`: el sistema opera
 * en Perú, pero nada en el código lo da por hecho.
 */

export const DEFAULT_LOCALE = 'es-PE';
export const DEFAULT_CURRENCY = 'PEN';

/**
 * Zona horaria de presentación.
 *
 * El servidor corre en UTC; el taller no. Sin fijarla, una orden prometida
 * para las 16:25 en Lima aparecería como 21:25 en el tablero.
 *
 * SEMILLA: desde la Fase 4 se lee de `branches.timezone`, porque un taller en
 * Lima y otro en Arequipa pueden no compartir la misma.
 */
export const DEFAULT_TIME_ZONE = 'America/Lima';

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatDateTime(
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
    timeZone,
  }).format(date);
}

/**
 * Hora en formato de 24 horas.
 *
 * En un tablero operativo «16:25» es más corto y menos ambiguo que
 * «04:25 p. m.», que además parte la columna en dos líneas.
 */
export function formatTime(
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

export function formatDate(
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(date);
}

/**
 * Normaliza una placa: mayúsculas, sin guiones ni espacios.
 *
 * Se guarda así en la base con índice único, de modo que buscar por placa sea
 * una comparación exacta por índice y no una función sobre la columna.
 */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Presentación: `ABC123` → `ABC-123`. Solo para mostrar, nunca para guardar. */
export function displayPlate(plate: string): string {
  const clean = normalizePlate(plate);
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  if (clean.length === 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

/**
 * Enmascara un documento de identidad: `•••••123`.
 *
 * La interfaz consume SIEMPRE esto. El número completo solo sale de
 * `reveal_document_number()`, que exige permiso y deja registro en
 * `audit_logs`. Ver docs/04-modelo-de-datos.md §4.9.
 */
export function maskDocument(last3: string): string {
  return `•••••${last3}`;
}
