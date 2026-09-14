/**
 * La puerta del taller: encontrar el vehículo que está llegando.
 *
 * La placa es la búsqueda principal y no una más. Es el único dato que el
 * asesor tiene SIEMPRE —está pintado en el vehículo que tiene delante—,
 * mientras que el nombre puede no recordarlo y el documento está en la
 * guantera. Por eso la placa decide el diseño: un campo grande, y lo demás
 * como alternativa.
 */

import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';

/** Mayúsculas, sin guiones ni espacios. Es como la guarda la base. */
export function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/gu, '').toUpperCase();
}

/** «ABC123» → «ABC-123». Solo para mostrar. */
export function formatPlate(value: string): string {
  const clean = normalizePlate(value);
  return clean.length === 6 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

/**
 * ¿Ya se puede buscar?
 *
 * Con menos de tres caracteres la respuesta sería media flota, y lanzar la
 * búsqueda a cada tecla enseña al asesor a ignorar lo que aparece. Tres es el
 * primer punto donde el resultado significa algo.
 */
export function isSearchable(value: string): boolean {
  return normalizePlate(value).length >= 3;
}

/** Una placa peruana completa: tres letras y tres cifras. */
export function isCompletePlate(value: string): boolean {
  return /^[A-Z0-9]{6}$/u.test(normalizePlate(value));
}

export interface VehicleMatch {
  readonly vehicle: DemoVehicle;
  readonly customer: DemoCustomer;
  /** `true` cuando la placa coincide entera; `false` si es un parecido. */
  readonly exact: boolean;
}

/**
 * Busca la placa en la cartera.
 *
 * Devuelve la coincidencia exacta si existe y, si no, las que empiezan igual:
 * el asesor que teclea «ABC» mientras mira el parachoques quiere ver las tres
 * candidatas, no un «no encontrado» que le haga dudar de su propia vista.
 */
export function lookupPlate(
  customers: readonly DemoCustomer[],
  query: string,
): readonly VehicleMatch[] {
  const target = normalizePlate(query);
  if (target.length < 3) return [];

  const exactas: VehicleMatch[] = [];
  const parciales: VehicleMatch[] = [];

  for (const customer of customers) {
    for (const vehicle of customer.vehicles) {
      const plate = normalizePlate(vehicle.plate);
      if (plate === target) exactas.push({ vehicle, customer, exact: true });
      else if (plate.startsWith(target)) parciales.push({ vehicle, customer, exact: false });
    }
  }

  // La exacta manda. Las parciales van ordenadas por placa para que la lista
  // no cambie de orden entre dos pulsaciones.
  return [
    ...exactas,
    ...parciales.sort((a, b) => normalizePlate(a.vehicle.plate).localeCompare(normalizePlate(b.vehicle.plate))),
  ];
}

export type SearchState = 'vacio' | 'corto' | 'buscando' | 'encontrado' | 'sin_resultados';

/**
 * En qué estado está la búsqueda.
 *
 * Se calcula aquí y no en la pantalla porque de él depende lo que se ofrece:
 * «no encontrado» abre la puerta a registrar el vehículo, y ofrecer eso
 * mientras todavía se está escribiendo hace que el asesor cree un duplicado
 * de un vehículo que sí existía.
 */
export function searchState(input: {
  readonly query: string;
  readonly pending: boolean;
  readonly matches: number;
}): SearchState {
  if (input.query.trim() === '') return 'vacio';
  if (!isSearchable(input.query)) return 'corto';
  if (input.pending) return 'buscando';
  return input.matches > 0 ? 'encontrado' : 'sin_resultados';
}

export type IntakeStage = 'en_recepcion' | 'checklist' | 'orden_generada';

export interface TodayIntake {
  readonly orderId: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly equipmentKind: 'vehiculo' | 'maquinaria';
  /** Minutos desde que entró, para poder formatear la hora contra `now`. */
  readonly arrivedMinutesAgo: number;
  readonly stage: IntakeStage;
  readonly checklistDone: number;
  readonly checklistTotal: number;
  readonly orderCode: string;
  /**
   * El acta, cuando la recepción se cerró en esta demostración.
   *
   * Las sembradas no la tienen: se derivan de órdenes que ya venían abiertas
   * y nunca pasaron por el recorrido de recepción, así que no hay acta que
   * enseñar.
   */
  readonly actaCode?: string;
}

export const STAGE_LABELS: Readonly<Record<IntakeStage, string>> = {
  en_recepcion: 'En recepción',
  checklist: 'Checklist en curso',
  orden_generada: 'Orden generada',
};

/**
 * ¿Cuándo llegó?
 *
 * Se guarda el desfase en minutos y la hora se calcula al pintar. Guardar la
 * hora ya formateada congelaría la pantalla en el momento de la compilación,
 * que es justo el error que este proyecto evita con `force-dynamic`.
 */
export function arrivedAt(now: Date, minutesAgo: number): Date {
  return new Date(now.getTime() - minutesAgo * 60_000);
}

/** Solo lo que entró HOY. Ayer ya no es recepción, es seguimiento. */
export function arrivedToday(now: Date, minutesAgo: number): boolean {
  const at = arrivedAt(now, minutesAgo);
  return (
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()
  );
}

export interface ReceptionMatches {
  /** Vehículos cuya placa casa. Es lo que se pinta primero y grande. */
  readonly vehicles: readonly VehicleMatch[];
  /**
   * Clientes que casan por nombre, documento o teléfono y que NO están ya
   * representados arriba por uno de sus vehículos.
   */
  readonly people: readonly DemoCustomer[];
}

/**
 * Buscar en la recepción como la pantalla promete.
 *
 * ── El fallo que arregla ───────────────────────────────────────────────────
 *
 * Debajo del campo pone «Escribe la placa. También sirve el nombre, el
 * documento o el teléfono», y no servía: solo se buscaba por placa. Tecleabas
 * el nombre de un cliente y la pantalla decía «no encontrado», que no es que
 * no ayude —es que MIENTE, y lleva a crear otra vez un cliente que ya existe—.
 *
 * Peor todavía con un cliente recién dado de alta SIN vehículo: no tiene
 * placa, así que era literalmente imposible llegar a él desde aquí.
 *
 * ── Por qué la placa sigue mandando ────────────────────────────────────────
 *
 * Porque es el único dato que el asesor tiene SIEMPRE: está pintado en el
 * vehículo que tiene delante, mientras que el nombre puede no recordarlo y el
 * documento está en la guantera. Las personas van debajo, como alternativa, y
 * nunca por encima de una placa que casa.
 */
export function lookupReception(
  customers: readonly DemoCustomer[],
  query: string,
  searchPeople: (customers: readonly DemoCustomer[], query: string) => readonly DemoCustomer[],
): ReceptionMatches {
  const vehicles = lookupPlate(customers, query);

  /* Quien ya sale arriba con su vehículo no se repite abajo: la misma persona
     dos veces en la misma pantalla hace dudar de si son dos. */
  const arriba = new Set(vehicles.map((m) => m.customer.id));
  const people = searchPeople(customers, query).filter((c) => !arriba.has(c.id));

  return { vehicles, people };
}
