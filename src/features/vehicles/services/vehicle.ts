/**
 * El vehículo, tal como lo teclea quien lo tiene delante.
 *
 * Este módulo no guarda nada ni sabe dónde va a parar el vehículo: da forma y
 * comprueba. Lo mismo tendrá que valer cuando el alta venga de la recepción,
 * de la ficha del cliente o de una importación de flota, y tres pantallas
 * decidiendo por su cuenta qué es una placa válida es cómo se llena la base de
 * placas que no se pueden buscar.
 *
 * ── Sobre la placa ─────────────────────────────────────────────────────────
 *
 * Se comprueba la FORMA, no el registro. En Perú una placa de auto son seis
 * caracteres —ABC123, A1B234— pero el taller también atiende maquinaria, y ahí
 * lo que hay es un número de serie o un código interno que no sigue ninguna
 * regla. Exigir el patrón de auto dejaría fuera media nave.
 *
 * Así que se pide algo que se pueda buscar y comparar, y nada más. Quien
 * tiene la placa delante sabe mejor que esta función qué está leyendo.
 */

import type { DemoVehicle } from '@/features/customers/demo';

export type EquipmentKind = 'vehiculo' | 'maquinaria';

export interface VehicleInput {
  readonly plate: string;
  readonly brand: string;
  readonly model: string;
  readonly modelYear: string;
  readonly color: string;
  readonly mileage: string;
  readonly equipmentKind: EquipmentKind;
}

export const VEHICLE_VACIO: VehicleInput = {
  plate: '',
  brand: '',
  model: '',
  modelYear: '',
  color: '',
  mileage: '',
  equipmentKind: 'vehiculo',
};

export interface Check {
  readonly valid: boolean;
  /** Qué decirle a quien escribe. Vacío cuando es válido. */
  readonly problem: string;
}

const OK: Check = { valid: true, problem: '' };

/** Comparable: mayúsculas, sin guiones ni espacios. Igual que la búsqueda. */
export function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/gu, '').toUpperCase();
}

/** Con el guión que se lee en la calle: ABC-123. */
export function formatPlate(plate: string): string {
  const limpia = normalizePlate(plate);
  return limpia.length === 6 ? `${limpia.slice(0, 3)}-${limpia.slice(3)}` : limpia;
}

export function checkPlate(value: string): Check {
  const limpia = normalizePlate(value);
  if (limpia === '') return { valid: false, problem: 'Escribe la placa.' };
  if (limpia.length < 5) {
    return { valid: false, problem: 'Una placa tiene al menos 5 caracteres.' };
  }
  if (limpia.length > 10) {
    return { valid: false, problem: 'Una placa no pasa de 10 caracteres.' };
  }
  return OK;
}

/**
 * El año del modelo.
 *
 * El tope es el año QUE VIENE, no el actual: en octubre ya hay coches del año
 * siguiente en la calle, y rechazarlos obligaría a poner un año falso.
 */
export function checkYear(value: string, now: Date): Check {
  if (value.trim() === '') return OK; // Opcional: se completa después.
  if (!/^\d{4}$/u.test(value.trim())) {
    return { valid: false, problem: 'El año son cuatro cifras.' };
  }
  const año = Number(value);
  const tope = now.getFullYear() + 1;
  if (año < 1950 || año > tope) {
    return { valid: false, problem: `El año está entre 1950 y ${String(tope)}.` };
  }
  return OK;
}

export function checkMileage(value: string): Check {
  if (value.trim() === '') return OK; // Opcional: muchas veces no se mira al recibir.
  if (!/^\d{1,7}$/u.test(value.replace(/[\s.,]/gu, ''))) {
    return { valid: false, problem: 'Solo cifras, sin letras.' };
  }
  return OK;
}

export function newVehicleId(now: number, seed = ''): string {
  const sufijo = seed === '' ? Math.random().toString(36).slice(2, 6) : seed;
  return `veh-nuevo-${String(now)}-${sufijo}`;
}

/** Vacío es `null`, no `''`: una cadena vacía se cuela como dato presente. */
function orEmpty(value: string, fallback: string): string {
  const limpio = value.trim();
  return limpio === '' ? fallback : limpio;
}

export function vehicleFromInput(input: VehicleInput, id: string, now: Date): DemoVehicle {
  const km = Number(input.mileage.replace(/[\s.,]/gu, ''));

  return {
    id,
    plate: normalizePlate(input.plate),
    /* Sin marca, la ficha pinta un hueco y la foto no encuentra nada que
       enseñar. «Sin marca» es feo pero es verdad, y se corrige editando. */
    brand: orEmpty(input.brand, 'Sin marca'),
    model: orEmpty(input.model, ''),
    modelYear: input.modelYear.trim() === '' ? now.getFullYear() : Number(input.modelYear),
    color: orEmpty(input.color, 'Sin registrar'),
    mileage: Number.isFinite(km) ? km : 0,
    /* No se le ha hecho nada todavía. `0` diría «servicio hoy». */
    lastServiceDaysAgo: null,
    equipmentKind: input.equipmentKind,
    /* Registrar el vehículo NO es recibirlo. La orden nace en la recepción,
       con su checklist y su kilometraje de entrada; darla por abierta aquí
       metería un coche en el taller que nadie ha visto. */
    openOrderId: null,
  };
}

/** Si el formulario está listo para guardar. */
export function canSaveVehicle(input: VehicleInput, now: Date): boolean {
  return (
    checkPlate(input.plate).valid &&
    checkYear(input.modelYear, now).valid &&
    checkMileage(input.mileage).valid
  );
}
