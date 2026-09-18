/**
 * ¿Esta ruta es de esta aplicación?
 *
 * Se usa para volver a donde estabas después de cambiar de puesto en la
 * demostración. El destino llega en un formulario, así que llega del
 * NAVEGADOR: sin esta comprobación, un enlace preparado podría mandar a
 * alguien a otro sitio con la apariencia de que lo hizo el sistema —una
 * redirección abierta, que es de las pocas cosas que se cuelan en una
 * aplicación por lo demás bien hecha—.
 *
 * Se aceptan solo rutas absolutas de aquí: empiezan por una barra, no por
 * dos —«//otro.com» es una URL con protocolo heredado— y no traen protocolo
 * ni salto de línea.
 *
 * Dominio PURO.
 */

export function isInternalPath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (/[\r\n\t]/u.test(value)) return false;
  if (/^\/\\/u.test(value)) return false;
  return true;
}

/** La ruta si sirve, y si no, la portada. Nunca lanza. */
export function internalPathOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && isInternalPath(value) ? value : fallback;
}
