/**
 * ⚠️ DATOS DE DEMOSTRACIÓN.
 *
 * Los clientes con orden abierta se DERIVAN de `demoOrders()`, no se escriben
 * a mano. Ya pasó una vez en este proyecto: dos pantallas inventaron por su
 * cuenta al dueño de la misma placa y se contradecían entre sí. Aquí el
 * teléfono, la empresa y el vehículo salen de la misma fila que pinta el
 * tablero, así que no pueden discrepar.
 *
 * Encima se añaden clientes SIN orden abierta —que es la mayoría de la cartera
 * de un taller real— para que la búsqueda tenga a quién encontrar y la lista
 * no parezca que solo existe quien está hoy en el taller.
 */

import { CORPORATE_CLIENTS } from '../../../db/seed/catalog';
import { demoOrders } from '@/features/demo/board';
import type { DocumentType } from './services/identity';
import type { DriverLicense } from './services/license';
import { displayName } from './services/identity';
import type { SearchableCustomer } from './services/search';

export interface DemoVehicle {
  readonly id: string;
  readonly plate: string;
  readonly brand: string;
  readonly model: string;
  readonly modelYear: number;
  readonly color: string;
  readonly mileage: number;
  readonly lastServiceDaysAgo: number | null;
  readonly equipmentKind: 'vehiculo' | 'maquinaria';
  /** Orden abierta ahora mismo, si la hay. */
  readonly openOrderId: string | null;
}

export interface DemoCustomer {
  readonly id: string;
  readonly kind: 'persona' | 'empresa';
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly businessName: string | null;
  readonly documentType: DocumentType;
  /** Últimos tres. El completo no sale de la base. */
  readonly documentLast: string;
  readonly phone: string | null;
  readonly altPhone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly contactPreference: 'whatsapp' | 'telefono' | 'correo';
  readonly corporateClient: string | null;
  /**
   * La licencia de quien conduce, si se registró.
   *
   * Es dato personal como el documento: NO sale en listas ni en resultados de
   * búsqueda, solo en la ficha de su dueño —donde hace falta para compararla
   * con el plástico que enseña en el mostrador—.
   */
  readonly license: DriverLicense | null;
  readonly lastVisitDaysAgo: number | null;
  readonly vehicles: readonly DemoVehicle[];
  readonly isDemo: true;
}

/** Parte la cadena «Toyota Hilux SRV» en marca y modelo. */
function splitVehicle(full: string): { brand: string; model: string } {
  const [brand = full, ...rest] = full.split(' ');
  return { brand, model: rest.join(' ') || full };
}

/** Nombre de persona partido en nombre y apellidos. */
function splitPerson(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/u);
  return { firstName: parts[0] ?? full, lastName: parts.slice(1).join(' ') };
}

/** Una razón social lleva S.A., S.A.C., E.I.R.L. o similar. */
function looksLikeCompany(name: string): boolean {
  return /\b(s\.?a\.?c?\.?|e\.?i\.?r\.?l\.?|s\.?r\.?l\.?|ltda|inc|corp|banco|transportes|inversiones|renting|automotores)\b/iu.test(
    name,
  );
}

/** Clientes que no tienen nada en el taller hoy. La mayoría de la cartera. */
const SIN_ORDEN: readonly DemoCustomer[] = [
  {
    id: 'cli-101', kind: 'persona', firstName: 'Ana', lastName: 'Flores Ruiz',
    businessName: null, documentType: 'DNI', documentLast: '318',
    phone: '+51 946 220 118', altPhone: null, email: 'ana.flores@ejemplo.com',
    address: 'Av. Primavera 1120, Surco', contactPreference: 'whatsapp',
    corporateClient: null, license: null, lastVisitDaysAgo: 46, isDemo: true,
    vehicles: [{
      id: 'veh-101', plate: 'H2L509', brand: 'Toyota', model: 'Yaris', modelYear: 2021,
      color: 'Plata', mileage: 41200, lastServiceDaysAgo: 46, equipmentKind: 'vehiculo',
      openOrderId: null,
    }],
  },
  {
    id: 'cli-102', kind: 'persona', firstName: 'Carlos', lastName: 'Mendoza Rivas',
    businessName: null, documentType: 'DNI', documentLast: '904',
    phone: '+51 951 703 884', altPhone: '+51 1 4457722', email: 'c.mendoza@ejemplo.com',
    address: 'Jr. Huallaga 455, Cercado', contactPreference: 'telefono',
    corporateClient: null, license: null, lastVisitDaysAgo: 121, isDemo: true,
    vehicles: [
      {
        id: 'veh-102', plate: 'J7T264', brand: 'Hyundai', model: 'Accent', modelYear: 2018,
        color: 'Blanco', mileage: 97840, lastServiceDaysAgo: 121, equipmentKind: 'vehiculo',
        openOrderId: null,
      },
      {
        id: 'veh-103', plate: 'K3M881', brand: 'Toyota', model: 'Rush', modelYear: 2022,
        color: 'Gris', mileage: 28300, lastServiceDaysAgo: 200, equipmentKind: 'vehiculo',
        openOrderId: null,
      },
    ],
  },
  {
    id: 'cli-103', kind: 'persona', firstName: 'Lucía', lastName: 'Salazar Peña',
    businessName: null, documentType: 'CE', documentLast: '576',
    phone: '+51 999 412 067', altPhone: null, email: null,
    address: null, contactPreference: 'whatsapp',
    corporateClient: null, license: null, lastVisitDaysAgo: null, isDemo: true,
    vehicles: [],
  },
  {
    id: 'cli-104', kind: 'empresa', firstName: null, lastName: null,
    businessName: 'Distribuidora Andina S.A.C.', documentType: 'RUC', documentLast: '447',
    phone: '+51 1 6117700', altPhone: null, email: 'flota@distribuidoraandina.com',
    address: 'Av. Argentina 3450, Callao', contactPreference: 'correo',
    corporateClient: null, license: null, lastVisitDaysAgo: 18, isDemo: true,
    vehicles: [
      {
        id: 'veh-104', plate: 'L5P330', brand: 'Hino', model: '300', modelYear: 2020,
        color: 'Blanco', mileage: 186500, lastServiceDaysAgo: 18, equipmentKind: 'vehiculo',
        openOrderId: null,
      },
    ],
  },
  {
    id: 'cli-105', kind: 'empresa', firstName: null, lastName: null,
    businessName: 'Minera Altoandina S.A.', documentType: 'RUC', documentLast: '802',
    phone: '+51 1 2093400', altPhone: null, email: 'mantenimiento@altoandina.com.pe',
    address: 'Av. El Derby 254, Surco', contactPreference: 'correo',
    corporateClient: 'Invetsa', license: null, lastVisitDaysAgo: 9, isDemo: true,
    vehicles: [
      {
        id: 'veh-105', plate: 'M8Q117', brand: 'CAT', model: '950 GC', modelYear: 2021,
        color: 'Amarillo', mileage: 6120, lastServiceDaysAgo: 9, equipmentKind: 'maquinaria',
        openOrderId: null,
      },
    ],
  },
];

/**
 * La cartera completa: quien tiene orden abierta hoy, más el resto.
 *
 * Es una función y no una constante porque los vehículos con orden abierta
 * salen de `demoOrders(now)`, que calcula contra la hora actual.
 */
export function demoCustomers(now: Date): readonly DemoCustomer[] {
  const derivados = demoOrders(now).map((order): DemoCustomer => {
    const empresa = looksLikeCompany(order.customer);
    const persona = splitPerson(order.customer);
    const { brand, model } = splitVehicle(order.vehicle);

    return {
      id: `cli-${order.id}`,
      kind: empresa ? 'empresa' : 'persona',
      firstName: empresa ? null : persona.firstName,
      lastName: empresa ? null : persona.lastName,
      businessName: empresa ? order.customer : null,
      documentType: empresa ? 'RUC' : 'DNI',
      documentLast: order.customerDocLast3,
      phone: order.customerPhone,
      altPhone: null,
      email: order.customerEmail,
      address: order.customerAddress,
      contactPreference: 'whatsapp',
      corporateClient: order.corporateClient,
      license: null,
      lastVisitDaysAgo: 0,
      isDemo: true,
      vehicles: [{
        id: `veh-${order.id}`,
        plate: order.plate,
        brand,
        model,
        modelYear: order.modelYear,
        color: order.color,
        mileage: order.usage,
        lastServiceDaysAgo: 0,
        equipmentKind: order.equipmentKind,
        openOrderId: order.id,
      }],
    };
  });

  return [...derivados, ...SIN_ORDEN];
}

export function findDemoCustomer(id: string, now: Date): DemoCustomer | undefined {
  return demoCustomers(now).find((c) => c.id === id);
}

/** La forma que consume la búsqueda. */
export function toSearchable(customer: DemoCustomer): SearchableCustomer {
  return {
    id: customer.id,
    kind: customer.kind,
    name: displayName(customer),
    documentType: customer.documentType,
    documentLast: customer.documentLast,
    phone: customer.phone,
    email: customer.email,
    corporateClient: customer.corporateClient,
    plates: customer.vehicles.map((v) => v.plate),
  };
}

/**
 * Las empresas corporativas disponibles.
 *
 * Salen del MISMO catálogo que siembra la tabla `corporate_clients`, no de una
 * lista escrita aquí. Añadir una empresa es administración y no debería exigir
 * un despliegue; mientras no haya base, al menos no debería exigir tocar dos
 * archivos y acordarse de los dos.
 */
export function demoCorporateClients(): readonly string[] {
  return CORPORATE_CLIENTS.map((c) => c.name);
}
