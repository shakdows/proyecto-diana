import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Protección del documento de identidad (§52).
 *
 * El número completo se guarda con acceso revocado; lo que la interfaz ve es
 * `document_last3`. Para poder BUSCAR por DNI sin leer el DNI se guarda además
 * un HMAC: la búsqueda calcula el HMAC del término y compara contra la columna
 * indexada. El número nunca sale de la base.
 *
 * HMAC y no hash simple: con un hash sin clave, un atacante con acceso de
 * lectura a la columna podría recorrer los 8 dígitos de todos los DNI del país
 * en minutos y deshacer el anonimato. La clave lo impide.
 */
export function hashDocument(documentNumber: string, secret: string): string {
  if (secret.length < 32) {
    throw new Error('DOCUMENT_HASH_SECRET debe tener al menos 32 caracteres.');
  }
  return createHmac('sha256', secret)
    .update(documentNumber.trim().toUpperCase())
    .digest('hex');
}

export function lastThree(documentNumber: string): string {
  return documentNumber.trim().slice(-3);
}

/** Token del portal del cliente: 32 bytes, base64url. */
export function generatePortalToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Solo se guarda el hash del token: quien lea `authorization_links` no puede
 * reconstruir el enlace.
 */
export function hashPortalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Comparación en tiempo constante, para no filtrar información por el reloj. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
