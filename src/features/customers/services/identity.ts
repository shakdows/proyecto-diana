/**
 * Identidad del cliente: documento, nombre y enmascarado.
 *
 * ⚠️ EL DNI COMPLETO NO VIVE EN LA INTERFAZ.
 *
 * La base guarda el documento en tres formas (docs/04 §4.9): el número
 * completo con `REVOKE SELECT` a `authenticated`, una columna generada con los
 * tres últimos caracteres, y un HMAC-SHA256 para poder BUSCAR por documento
 * sin llegar a leerlo. Ver el número entero exige permiso y deja rastro.
 *
 * Este módulo trabaja solo con lo que la pantalla puede ver. Si alguna función
 * de aquí recibiera un documento completo, sería porque alguien lo trajo desde
 * el servidor sin pasar por `reveal_document_number()`, y eso es un fallo de
 * arriba, no de este archivo.
 */

export type DocumentType = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';
export type CustomerKind = 'persona' | 'empresa';

export interface DocumentRule {
  readonly type: DocumentType;
  readonly label: string;
  readonly length: number | null;
  readonly digitsOnly: boolean;
  readonly kind: CustomerKind;
}

export const DOCUMENT_RULES: readonly DocumentRule[] = [
  { type: 'DNI', label: 'DNI', length: 8, digitsOnly: true, kind: 'persona' },
  { type: 'CE', label: 'Carné de extranjería', length: null, digitsOnly: false, kind: 'persona' },
  { type: 'PASAPORTE', label: 'Pasaporte', length: null, digitsOnly: false, kind: 'persona' },
  { type: 'RUC', label: 'RUC', length: 11, digitsOnly: true, kind: 'empresa' },
];

export function ruleFor(type: DocumentType): DocumentRule {
  const found = DOCUMENT_RULES.find((r) => r.type === type);
  if (found === undefined) throw new Error(`Tipo de documento desconocido: ${type}`);
  return found;
}

/** Quita todo lo que no sea dígito o letra, y sube a mayúsculas. */
export function normalizeDocument(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/gu, '').toUpperCase();
}

export interface DocumentCheck {
  readonly valid: boolean;
  /** Qué decirle a quien escribe. Vacío cuando es válido. */
  readonly problem: string;
}

/**
 * Valida el documento SIN inventarse reglas de la SUNAT.
 *
 * Comprueba longitud y composición, que es lo que evita un error de tecleo, y
 * nada más. No calcula el dígito verificador del RUC ni consulta a nadie: un
 * documento que pasa el formato puede no existir, y eso lo dirá el registro
 * cuando se integre. Fingir aquí una validación fuerte daría una falsa
 * seguridad de que el dato está comprobado.
 */
export function checkDocument(type: DocumentType, value: string): DocumentCheck {
  const rule = ruleFor(type);
  const clean = normalizeDocument(value);

  if (clean === '') return { valid: false, problem: `Falta el ${rule.label.toLowerCase()}.` };

  if (rule.digitsOnly && /[^0-9]/u.test(clean)) {
    return { valid: false, problem: `El ${rule.label} son solo números.` };
  }

  if (rule.length !== null && clean.length !== rule.length) {
    return {
      valid: false,
      problem: `El ${rule.label} tiene ${String(rule.length)} dígitos; escribiste ${String(clean.length)}.`,
    };
  }

  if (rule.length === null && clean.length < 6) {
    return { valid: false, problem: `El ${rule.label.toLowerCase()} es demasiado corto.` };
  }

  // El RUC peruano empieza por 10 (persona con negocio) o 20 (sociedad).
  if (type === 'RUC' && !/^(10|15|17|20)/u.test(clean)) {
    return { valid: false, problem: 'Un RUC empieza por 10, 15, 17 o 20.' };
  }

  return { valid: true, problem: '' };
}

/**
 * Lo que se muestra en pantalla: •••••••72.
 *
 * Recibe SOLO los últimos caracteres, nunca el documento entero. El largo del
 * enmascarado sale de la regla del tipo, así un DNI se ve como un DNI aunque
 * la pantalla no haya visto jamás los otros cinco dígitos.
 */
export function maskDocument(type: DocumentType, last: string): string {
  const rule = ruleFor(type);
  const visible = last.slice(-3);
  const hidden = rule.length === null ? 5 : Math.max(0, rule.length - visible.length);
  return `${'•'.repeat(hidden)}${visible}`;
}

/** «Juan Pérez García», o la razón social cuando es empresa. */
export function displayName(input: {
  readonly kind: CustomerKind;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly businessName?: string | null;
}): string {
  if (input.kind === 'empresa') return (input.businessName ?? '').trim() || 'Empresa sin nombre';
  const full = `${input.firstName ?? ''} ${input.lastName ?? ''}`.replace(/\s+/gu, ' ').trim();
  return full === '' ? 'Cliente sin nombre' : full;
}

/** Iniciales para el avatar. «Juan Pérez» → «JP»; «Mitsui» → «MI». */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/u).filter((w) => w.length > 0);
  if (words.length === 0) return '··';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return `${(words[0] ?? '').charAt(0)}${(words[1] ?? '').charAt(0)}`.toUpperCase();
}

/**
 * Teléfono a dígitos, conservando el prefijo internacional.
 *
 * «+51 987 654 321», «987654321» y «987-654-321» son el mismo teléfono, y si
 * no se normalizan antes de comparar, el sistema crea el mismo cliente tres
 * veces sin avisar.
 */
export function normalizePhone(value: string): string {
  const clean = value.replace(/[^\d+]/gu, '');
  return clean.startsWith('+') ? `+${clean.slice(1).replace(/\+/gu, '')}` : clean;
}

/** Los nueve dígitos finales: es lo que comparten un móvil con y sin prefijo. */
export function phoneKey(value: string): string {
  return normalizePhone(value).replace(/\D/gu, '').slice(-9);
}

/**
 * «987654321» → «987 654 321». Solo para mostrar.
 *
 * Agrupa de tres en tres SOLO cuando parece un móvil peruano: nueve dígitos
 * que empiezan por 9. Un fijo de Lima —«01 234 5678»— también tiene nueve
 * dígitos, y partirlo en tres grupos lo convierte en un número que nadie
 * reconoce. Lo que no encaja se devuelve tal cual lo escribieron, que siempre
 * es mejor que reformatearlo mal.
 */
export function formatPhone(value: string): string {
  const digits = normalizePhone(value);
  const local = digits.replace(/\D/gu, '').slice(-9);
  if (local.length !== 9 || !local.startsWith('9')) return value;
  const prefix = digits.startsWith('+') ? `${digits.slice(0, digits.length - 9)} ` : '';
  return `${prefix}${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
