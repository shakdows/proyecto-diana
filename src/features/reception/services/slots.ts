/**
 * Dónde se guarda lo de una recepción.
 *
 * ── El fallo que arregla ───────────────────────────────────────────────────
 *
 * La placa se escribía tal cual venía. La recepción la recibe con guion
 * —«ABC-123», que es como se lee en el vehículo— y la orden sin él
 * —«ABC123», que es como está en el registro—. Resultado: los daños marcados
 * al recibir el vehículo se guardaban en `recepcion.ABC-123.danos` y la ficha
 * de la orden leía `recepcion.ABC123.danos`. Dos almacenes para el mismo
 * vehículo, y la inspección de ingreso no llegaba nunca a la orden.
 *
 * No se veía: cada pantalla funcionaba perfectamente consigo misma.
 *
 * La ranura se calcula ahora desde una forma CANÓNICA de la placa, así que da
 * igual cómo la escriba quien llama.
 *
 * Dominio PURO.
 */

/** «ABC-123», «abc 123» y «ABC123» son el mismo vehículo. */
export function plateKey(plate: string): string {
  return plate.replace(/[^a-z0-9]/giu, '').toUpperCase();
}

export function damageSlot(plate: string): string {
  return `recepcion.${plateKey(plate)}.danos`;
}

export function signatureSlot(plate: string): string {
  return `recepcion.${plateKey(plate)}.firma`;
}

export function signerSlot(plate: string): string {
  return `recepcion.${plateKey(plate)}.firmante`;
}

/** El ancla de las fotos de una pieza. La usa `PhotoCapture`. */
export function partPhotoAnchor(plate: string, partId: string): string {
  return `danos:${plateKey(plate)}:${partId}`;
}

/**
 * La ranura como se escribía ANTES de canonizar la placa.
 *
 * Solo para recuperar una recepción empezada con el formato anterior: quien
 * dejó daños marcados no puede perderlos porque se arreglara un fallo de
 * nombres. Se lee una vez y se reescribe en la buena.
 */
export function legacyDamageSlot(plate: string): string {
  return `recepcion.${plate}.danos`;
}
