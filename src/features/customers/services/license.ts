/**
 * La licencia de conducir del cliente.
 *
 * ── Para qué la quiere un taller ───────────────────────────────────────────
 *
 * Para dos cosas concretas, y ninguna es archivar papeles:
 *
 *   · SABER QUIÉN SE LLEVA EL VEHÍCULO. En la entrega hay que comprobar que
 *     quien recoge es quien puede recoger, y la licencia es lo que se pide.
 *   · SABER SI PUEDE CONDUCIRLO. Una camioneta de carga no la mueve una A-I,
 *     y el taller la mueve —del patio al elevador, a la prueba de ruta—.
 *
 * De ahí que el dato que de verdad opera no sea el número sino LA FECHA: una
 * licencia vencida convierte una prueba de ruta en un problema del taller, no
 * del cliente. Por eso el vencimiento tiene estado propio y se avisa antes.
 *
 * ── El número ──────────────────────────────────────────────────────────────
 *
 * Se guarda entero porque hay que compararlo con el plástico que el cliente
 * enseña en el mostrador, y una versión enmascarada no sirve para eso. Pero es
 * dato personal como el documento: no sale en listas ni en resultados de
 * búsqueda, solo en la ficha de su dueño. Cuando haya base, esta columna lleva
 * el mismo tratamiento que `customers.document_number` —permiso aparte y
 * rastro en la auditoría—.
 */

export interface DriverLicense {
  readonly number: string;
  readonly category: string;
  /** `YYYY-MM-DD`, o `null` si no se registró. */
  readonly expiresOn: string | null;
  readonly restrictions: string | null;
}

export interface LicenseCategory {
  readonly code: string;
  readonly label: string;
}

/**
 * Las clases y categorías del reglamento peruano.
 *
 * La etiqueta dice QUÉ CONDUCE y no repite el código: quien rellena esto
 * mirando el plástico reconoce «A-IIb», pero quien lee la ficha después
 * necesita saber si esa persona puede mover el camión que tiene en el patio.
 */
export const LICENSE_CATEGORIES: readonly LicenseCategory[] = [
  { code: 'A-I', label: 'Particulares — autos y camionetas' },
  { code: 'A-IIa', label: 'Taxi y transporte de hasta 16 personas' },
  { code: 'A-IIb', label: 'Carga hasta 3 ejes' },
  { code: 'A-IIIa', label: 'Transporte de más de 16 personas' },
  { code: 'A-IIIb', label: 'Carga de más de 3 ejes' },
  { code: 'A-IIIc', label: 'Materiales peligrosos' },
  { code: 'B-I', label: 'Motocicletas' },
  { code: 'B-IIa', label: 'Mototaxis' },
  { code: 'B-IIb', label: 'Motos de carga' },
  { code: 'B-IIc', label: 'Trimotos de carga' },
];

export function categoryLabel(code: string): string {
  return LICENSE_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

export interface Check {
  readonly valid: boolean;
  readonly problem: string;
}

const OK: Check = { valid: true, problem: '' };

/** Comparable: mayúsculas, sin guiones ni espacios. */
export function normalizeLicense(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/gu, '').toUpperCase();
}

/**
 * Comprueba la FORMA, no el registro.
 *
 * En Perú el número suele ser una letra y ocho cifras —Q43802725—, pero no
 * siempre: las antiguas y las extranjeras no siguen ese patrón, y el taller
 * atiende a quien entra por la puerta. Exigir el formato nuevo dejaría fuera
 * licencias válidas, y quien la tiene delante acabaría tecleando cualquier
 * cosa con la forma correcta para poder guardar.
 */
export function checkLicenseNumber(value: string): Check {
  const limpio = normalizeLicense(value);
  if (limpio === '') return { valid: false, problem: 'Escribe el número de la licencia.' };
  if (limpio.length < 6) {
    return { valid: false, problem: 'Un número de licencia tiene al menos 6 caracteres.' };
  }
  if (limpio.length > 15) {
    return { valid: false, problem: 'Un número de licencia no pasa de 15 caracteres.' };
  }
  return OK;
}

export function checkExpiry(value: string): Check {
  if (value.trim() === '') return OK; // Opcional: se completa después.
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return { valid: false, problem: 'La fecha va como AAAA-MM-DD.' };
  }
  const fecha = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) {
    return { valid: false, problem: 'Esa fecha no existe.' };
  }
  const año = Number(value.slice(0, 4));
  if (año < 1990 || año > 2100) {
    return { valid: false, problem: 'Revisa el año del vencimiento.' };
  }
  return OK;
}

export type LicenseStatus = 'vigente' | 'por-vencer' | 'vencida' | 'sin-fecha';

/** A partir de aquí se avisa. Dos meses es lo que tarda un trámite sin prisa. */
export const AVISO_DIAS = 60;

/** Días entre hoy y el vencimiento. Negativo si ya pasó. */
export function daysUntil(expiresOn: string, now: Date): number {
  const fin = Date.parse(`${expiresOn}T12:00:00Z`);
  const hoy = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
  return Math.round((fin - hoy) / 86_400_000);
}

export function licenseStatus(license: DriverLicense, now: Date): LicenseStatus {
  if (license.expiresOn === null) return 'sin-fecha';
  const dias = daysUntil(license.expiresOn, now);
  if (dias < 0) return 'vencida';
  if (dias <= AVISO_DIAS) return 'por-vencer';
  return 'vigente';
}

/**
 * Qué decir del vencimiento, en la frase que se lee en pantalla.
 *
 * «Vence el 2027-03-14» no le dice nada a nadie de pie en el mostrador.
 * «Vence en 12 días» sí, porque es la información con la que se decide si se
 * le deja hacer la prueba de ruta.
 */
export function expiryPhrase(license: DriverLicense, now: Date): string {
  if (license.expiresOn === null) return 'Sin fecha de vencimiento';
  const dias = daysUntil(license.expiresOn, now);
  if (dias < -1) return `Vencida hace ${String(-dias)} días`;
  if (dias === -1) return 'Vencida ayer';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  if (dias <= AVISO_DIAS) return `Vence en ${String(dias)} días`;
  return `Vigente hasta el ${license.expiresOn}`;
}

/** Si el formulario de licencia está listo. Vacío entero también vale: la
 *  licencia es opcional, y media licencia no. */
export function canSaveLicense(number: string, expiresOn: string): boolean {
  if (number.trim() === '' && expiresOn.trim() === '') return true;
  return checkLicenseNumber(number).valid && checkExpiry(expiresOn).valid;
}

/** `null` cuando no se registró nada: una licencia con el número vacío es
 *  peor que ninguna, porque la ficha la enseñaría como si existiera. */
export function licenseFrom(
  number: string,
  category: string,
  expiresOn: string,
  restrictions: string,
): DriverLicense | null {
  const num = normalizeLicense(number);
  if (num === '') return null;
  return {
    number: num,
    category: category.trim() === '' ? 'A-I' : category,
    expiresOn: expiresOn.trim() === '' ? null : expiresOn,
    restrictions: restrictions.trim() === '' ? null : restrictions.trim(),
  };
}
