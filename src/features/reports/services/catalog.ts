/**
 * El catálogo de documentos.
 *
 * Los nueve PDF ya existen y los sirve `/api/documentos/[tipo]/[id]`. Esto es
 * lo que falta: qué documentos hay, qué hace falta para generar cada uno, y
 * quién puede pedirlo.
 *
 * Va como DATO y no como tarjetas escritas a mano en la pantalla, por dos
 * motivos que se notan al mes siguiente: añadir un documento es añadir una
 * fila, y una prueba puede comprobar que la lista de aquí y los tipos que la
 * API sirve de verdad no se han separado. Una tarjeta con un botón que lleva a
 * un 404 es peor que no tener la tarjeta.
 */

import type { Permission } from '@/lib/auth/permissions';

/** Qué contexto hay que elegir antes de poder generar. */
export type DocumentContext = 'orden' | 'compra' | 'empresa';

export type DocumentGroup = 'operativos' | 'compras' | 'ejecutivos';

export interface DocumentKind {
  /** El mismo identificador que acepta la API. */
  readonly id: string;
  readonly group: DocumentGroup;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly context: DocumentContext;
  /** Sin este permiso, la tarjeta no se dibuja siquiera. */
  readonly permission: Permission;
}

export const GROUP_LABELS: Readonly<Record<DocumentGroup, string>> = {
  operativos: 'Documentos operativos',
  compras: 'Compras y repuestos',
  ejecutivos: 'Informes ejecutivos',
};

export const GROUP_HINTS: Readonly<Record<DocumentGroup, string>> = {
  operativos: 'Lo que se imprime o se le manda al cliente durante el servicio.',
  compras: 'Lo que se manda al proveedor y lo que se archiva al recibir.',
  ejecutivos: 'Lo que ve la empresa cliente. Aquí el documento también vende.',
};

export const DOCUMENTS: readonly DocumentKind[] = [
  {
    id: 'checklist',
    group: 'operativos',
    label: 'Checklist de recepción',
    description: 'Estado del vehículo al ingresar, con observaciones y niveles.',
    icon: 'clipboard',
    context: 'orden',
    permission: 'receptions:read',
  },
  {
    id: 'orden',
    group: 'operativos',
    label: 'Orden de servicio',
    description: 'Resumen completo de la orden: vehículo, cliente y trabajos.',
    icon: 'file',
    context: 'orden',
    permission: 'orders:read',
  },
  {
    id: 'diagnostico',
    group: 'operativos',
    label: 'Diagnóstico técnico',
    description: 'Hallazgos del técnico con su criticidad y evidencia.',
    icon: 'stethoscope',
    context: 'orden',
    permission: 'diagnostics:read',
  },
  {
    id: 'cotizacion',
    group: 'operativos',
    label: 'Cotización',
    description: 'Trabajos propuestos con precios, para el cliente.',
    icon: 'receipt',
    context: 'orden',
    permission: 'quotations:read',
  },
  {
    id: 'trabajo',
    group: 'operativos',
    label: 'Reporte de trabajo',
    description: 'Qué se hizo, quién lo hizo y cuánto tiempo llevó.',
    icon: 'wrench',
    context: 'orden',
    permission: 'repairs:read',
  },
  {
    id: 'entrega',
    group: 'operativos',
    label: 'Acta de entrega',
    description: 'Conformidad del cliente al recoger el vehículo.',
    icon: 'handshake',
    context: 'orden',
    permission: 'orders:read',
  },
  {
    id: 'compra',
    group: 'compras',
    label: 'Orden de compra',
    description: 'Pedido al proveedor, con cantidades y precios acordados.',
    icon: 'cart',
    context: 'compra',
    /*
     * `purchases:write`, no `purchases:read`.
     *
     * Leer el estado de una compra y EMITIR el pedido que se le manda al
     * proveedor no son la misma potestad. Con el permiso de lectura —que
     * tienen hasta los técnicos— cualquiera podía generar el PDF que sale del
     * taller con un compromiso de compra dentro.
     */
    permission: 'purchases:write',
  },
  {
    id: 'repuestos',
    group: 'compras',
    label: 'Reporte de repuestos',
    description: 'Qué se pidió, qué llegó y qué falta por recibir.',
    icon: 'box',
    context: 'orden',
    permission: 'parts:read',
  },
  {
    id: 'informe',
    group: 'ejecutivos',
    label: 'Informe corporativo de satisfacción',
    description: 'NPS, satisfacción y evolución del periodo, por empresa.',
    icon: 'chart',
    context: 'empresa',
    permission: 'reports:generate',
  },
];

export function documentById(id: string): DocumentKind | undefined {
  return DOCUMENTS.find((d) => d.id === id);
}

/**
 * Los documentos que este usuario puede pedir.
 *
 * Se filtra por permiso y NO por rol: un permiso se le puede dar a un rol
 * nuevo mañana sin tocar esta pantalla. Ojo con lo que esto es y no es: sirve
 * para no ofrecer un botón que va a fallar, no para proteger nada. Quien
 * escriba la URL del PDF a mano se topa con la comprobación del servidor, que
 * es la que manda.
 */
export function visibleDocuments(granted: readonly Permission[]): readonly DocumentKind[] {
  const set = new Set(granted);
  return DOCUMENTS.filter((d) => set.has(d.permission));
}

export function groupsOf(documents: readonly DocumentKind[]): readonly DocumentGroup[] {
  const order: readonly DocumentGroup[] = ['operativos', 'compras', 'ejecutivos'];
  return order.filter((g) => documents.some((d) => d.group === g));
}

/** Búsqueda por nombre o descripción del documento. */
export function searchDocuments(
  documents: readonly DocumentKind[],
  query: string,
): readonly DocumentKind[] {
  const q = query
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .trim();
  if (q === '') return documents;

  const fold = (v: string): string =>
    v.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase();

  return documents.filter(
    (d) => fold(d.label).includes(q) || fold(d.description).includes(q) || d.id.includes(q),
  );
}

/** La URL que genera el documento. */
export function documentHref(
  kind: DocumentKind,
  target: string,
  supplierId?: string,
): string {
  const base = `/api/documentos/${kind.id}/${encodeURIComponent(target)}`;
  return supplierId === undefined || supplierId === ''
    ? base
    : `${base}?proveedor=${encodeURIComponent(supplierId)}`;
}
