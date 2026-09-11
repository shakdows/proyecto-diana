import type { QueueEntry, ServiceKind } from './services/station';

/**
 * Colas de ejemplo de las dos estaciones finales.
 *
 * Cada cola incluye un vehículo vencido, uno en proceso y uno terminado, para
 * que la pantalla enseñe los tres estados y el aviso de «se está alargando».
 * En la Fase 13 salen de las órdenes en `PENDIENTE_*` y `EN_*`.
 */
const ALINEAMIENTO: readonly QueueEntry[] = [
  {
    orderId: 'os-157',
    orderCode: 'OS-2026-000157',
    vehicle: 'Kia Sportage',
    plate: 'JKL-012',
    customer: 'Transportes Andinos S.A.C.',
    state: 'pendiente',
    startedMinutesAgo: null,
    typicalMinutes: 45,
    promisedInMinutes: -35,
    remainingServices: ['alineamiento', 'lavado'],
  },
  {
    orderId: 'os-154',
    orderCode: 'OS-2026-000154',
    vehicle: 'Toyota Hilux SRV',
    plate: 'ABC-123',
    customer: 'Juan Pérez',
    state: 'en_proceso',
    startedMinutesAgo: 58,
    typicalMinutes: 45,
    promisedInMinutes: 95,
    remainingServices: ['alineamiento', 'lavado'],
  },
  {
    orderId: 'os-158',
    orderCode: 'OS-2026-000158',
    vehicle: 'Toyota Corolla',
    plate: 'MNO-345',
    customer: 'Lucía Ramos',
    state: 'terminado',
    startedMinutesAgo: 180,
    typicalMinutes: 45,
    promisedInMinutes: 240,
    remainingServices: ['alineamiento', 'lavado'],
  },
];

const LAVADO: readonly QueueEntry[] = [
  {
    orderId: 'os-158',
    orderCode: 'OS-2026-000158',
    vehicle: 'Toyota Corolla',
    plate: 'MNO-345',
    customer: 'Lucía Ramos',
    state: 'pendiente',
    startedMinutesAgo: null,
    typicalMinutes: 25,
    promisedInMinutes: -15,
    remainingServices: ['lavado'],
  },
  {
    orderId: 'os-155',
    orderCode: 'OS-2026-000155',
    vehicle: 'Mitsubishi L200',
    plate: 'DEF-456',
    customer: 'Minera Los Andes S.A.',
    state: 'pendiente',
    startedMinutesAgo: null,
    typicalMinutes: 25,
    promisedInMinutes: 70,
    remainingServices: ['lavado'],
  },
  {
    orderId: 'os-159',
    orderCode: 'OS-2026-000159',
    vehicle: 'Nissan Frontier',
    plate: 'PQR-678',
    customer: 'Roberto Silva',
    state: 'terminado',
    startedMinutesAgo: 90,
    typicalMinutes: 25,
    promisedInMinutes: 200,
    remainingServices: ['lavado'],
  },
];

export const DEMO_QUEUES: Readonly<Record<ServiceKind, readonly QueueEntry[]>> = {
  alineamiento: ALINEAMIENTO,
  lavado: LAVADO,
};
