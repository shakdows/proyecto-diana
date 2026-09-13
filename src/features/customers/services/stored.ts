/**
 * Lo que sale de `localStorage`, puesto en forma.
 *
 * ── Por qué hace falta ─────────────────────────────────────────────────────
 *
 * Un cliente guardado ayer no tiene los campos que el código añadió hoy. Pasó
 * exactamente eso: se añadió `license` al modelo, y la ficha de un cliente
 * creado ANTES reventaba con «Cannot read properties of undefined» —pantalla
 * de error, sin datos, sin pista de por qué—. El tipo de TypeScript decía que
 * el campo estaba; el navegador de quien lo probaba decía que no. TypeScript
 * no sabe nada de lo que alguien guardó la semana pasada.
 *
 * ── Por qué se rellena en vez de tirarlo ───────────────────────────────────
 *
 * `STORE_VERSION` existe justo para esto: al subirla, lo viejo se descarta y
 * la pantalla vuelve al estado inicial. Es honesto, pero aquí se lleva por
 * delante los clientes que alguien dio de alta, que es lo único que no se
 * puede volver a sacar de ninguna parte —el resto de la demostración se
 * regenera sola—.
 *
 * Así que esto MIGRA: pone el valor que el campo habría tenido si hubiera
 * existido. Una fila que no se puede reconocer como cliente sí se descarta,
 * porque un objeto a medias reventaría más adelante y más lejos.
 */

import type { DemoCustomer, DemoVehicle } from '../demo';
import type { DocumentType } from './identity';
import type { DriverLicense } from './license';

const TIPOS_DOC: readonly string[] = ['DNI', 'RUC', 'CE', 'PASAPORTE'];
const PREFERENCIAS: readonly string[] = ['whatsapp', 'telefono', 'correo'];

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function texto(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function numero(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hidrataVehiculo(raw: unknown): DemoVehicle | null {
  if (!esObjeto(raw)) return null;
  const plate = texto(raw.plate);
  const id = texto(raw.id);
  if (plate === null || id === null) return null;

  return {
    id,
    plate,
    brand: texto(raw.brand) ?? 'Sin marca',
    model: texto(raw.model) ?? '',
    modelYear: numero(raw.modelYear) ?? 0,
    color: texto(raw.color) ?? 'Sin registrar',
    mileage: numero(raw.mileage) ?? 0,
    lastServiceDaysAgo: numero(raw.lastServiceDaysAgo),
    equipmentKind: raw.equipmentKind === 'maquinaria' ? 'maquinaria' : 'vehiculo',
    openOrderId: texto(raw.openOrderId),
  };
}

export function hydrateLicense(raw: unknown): DriverLicense | null {
  if (!esObjeto(raw)) return null;
  const number = texto(raw.number);
  if (number === null) return null;
  return {
    number,
    category: texto(raw.category) ?? 'A-I',
    expiresOn: texto(raw.expiresOn),
    restrictions: texto(raw.restrictions),
  };
}

/** `null` si la fila no se puede reconocer como un cliente. */
export function hydrateCustomer(raw: unknown): DemoCustomer | null {
  if (!esObjeto(raw)) return null;

  const id = texto(raw.id);
  if (id === null) return null;

  const kind = raw.kind === 'empresa' ? 'empresa' : 'persona';
  const documentType = (
    typeof raw.documentType === 'string' && TIPOS_DOC.includes(raw.documentType)
      ? raw.documentType
      : kind === 'empresa'
        ? 'RUC'
        : 'DNI'
  ) as DocumentType;

  const contactPreference = (
    typeof raw.contactPreference === 'string' && PREFERENCIAS.includes(raw.contactPreference)
      ? raw.contactPreference
      : 'whatsapp'
  ) as DemoCustomer['contactPreference'];

  return {
    id,
    kind,
    firstName: texto(raw.firstName),
    lastName: texto(raw.lastName),
    businessName: texto(raw.businessName),
    documentType,
    documentLast: texto(raw.documentLast) ?? '',
    phone: texto(raw.phone),
    altPhone: texto(raw.altPhone),
    email: texto(raw.email),
    address: texto(raw.address),
    contactPreference,
    corporateClient: texto(raw.corporateClient),
    license: hydrateLicense(raw.license),
    lastVisitDaysAgo: numero(raw.lastVisitDaysAgo),
    vehicles: Array.isArray(raw.vehicles)
      ? raw.vehicles.map(hidrataVehiculo).filter((v): v is DemoVehicle => v !== null)
      : [],
    /* Todo lo que salga de aquí es de la demostración por definición: lo
       escribió esta pantalla, no una base con RLS detrás. */
    isDemo: true,
  };
}

export function hydrateCustomers(raw: unknown): readonly DemoCustomer[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(hydrateCustomer).filter((c): c is DemoCustomer => c !== null);
}
