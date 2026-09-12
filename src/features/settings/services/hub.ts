/**
 * El mapa del centro de administración.
 *
 * Cada ajuste del sistema ya existe como catálogo sembrado —el checklist, los
 * tipos de servicio, los motivos de pausa, el cuestionario, los umbrales—. Lo
 * que no existía era el sitio desde donde verlos.
 *
 * Va como DATO porque tres cosas dependen de ello y ninguna debería vivir
 * dentro del JSX: qué permiso hace falta para cada bloque, si pertenece al
 * modo simple o al avanzado, y por qué palabras se puede encontrar.
 */

import { CHECKLIST, PAUSE_REASONS, SERVICE_TYPES, SURVEY_QUESTIONS, CORPORATE_CLIENTS, APP_SETTINGS } from '../../../../db/seed/catalog';
import { PERMISSIONS, ROLES, type Permission } from '@/lib/auth/permissions';
import { ORDER_STATUSES } from '@/features/orders/services/order-status';

export type SettingsSection =
  | 'general'
  | 'personas'
  | 'taller'
  | 'cliente'
  | 'sistema';

export const SECTION_LABELS: Readonly<Record<SettingsSection, string>> = {
  general: 'General',
  personas: 'Personas y accesos',
  taller: 'Operación del taller',
  cliente: 'Experiencia del cliente',
  sistema: 'Sistema',
};

/**
 * Simple o avanzado.
 *
 * Idea del cliente, y buena: quien administra el día a día —dar de alta una
 * empresa, añadir un ítem al checklist— no debería tropezarse con los pesos
 * del porcentaje de avance ni con el grafo de estados. Tocar eso por error no
 * rompe una pantalla: cambia el significado de todos los informes ya
 * emitidos.
 *
 * No es seguridad, es no poner el interruptor del cuadro general junto al de
 * la luz del pasillo. El permiso sigue decidiendo quién entra.
 */
export type SettingsLevel = 'simple' | 'avanzado';

export interface SettingsEntry {
  readonly id: string;
  readonly section: SettingsSection;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly permission: Permission;
  readonly level: SettingsLevel;
  /** Cuántos elementos tiene hoy, leídos del catálogo real. */
  readonly count: number | null;
  /** Unidad de esa cifra: «5 empresas». */
  readonly unit: string;
  /** Por qué palabras se encuentra, además del nombre. */
  readonly keywords: readonly string[];
  /** `false` cuando el bloque todavía no tiene panel que abrir. */
  readonly available: boolean;
}

const checklistItems = CHECKLIST.reduce((n, c) => n + c.items.length, 0);

export const SETTINGS: readonly SettingsEntry[] = [
  {
    id: 'empresas',
    section: 'general',
    label: 'Empresas corporativas',
    description: 'Flotas que agrupan clientes y vehículos bajo una misma cuenta.',
    icon: 'building',
    permission: 'corporate_clients:manage',
    level: 'simple',
    count: CORPORATE_CLIENTS.length,
    unit: 'empresas',
    keywords: [...CORPORATE_CLIENTS.map((c) => c.name), 'flota', 'corporativo'],
    available: true,
  },
  {
    id: 'servicios',
    section: 'general',
    label: 'Tipos de servicio',
    description: 'Qué se ofrece y qué servicios finales lleva cada uno.',
    icon: 'list',
    permission: 'settings:manage',
    level: 'simple',
    count: SERVICE_TYPES.length,
    unit: 'tipos',
    keywords: ['preventivo', 'correctivo', 'planchado', 'pintura', 'lavado', 'alineamiento'],
    available: true,
  },
  {
    id: 'usuarios',
    section: 'personas',
    label: 'Usuarios',
    description: 'Quién entra al sistema, con qué puesto y en qué sede.',
    icon: 'users',
    permission: 'users:manage',
    level: 'simple',
    count: null,
    unit: 'usuarios',
    keywords: ['cuenta', 'acceso', 'personal', 'alta', 'baja'],
    available: false,
  },
  {
    id: 'roles',
    section: 'personas',
    label: 'Roles y permisos',
    description: 'Qué puede hacer cada puesto. La matriz completa, sin resumir.',
    icon: 'shield',
    permission: 'roles:manage',
    level: 'simple',
    count: ROLES.length,
    unit: 'puestos',
    keywords: ['permiso', 'rbac', 'asesor', 'tecnico', 'administrador', 'matriz'],
    available: true,
  },
  {
    id: 'checklist',
    section: 'taller',
    label: 'Checklist de recepción',
    description: `${String(CHECKLIST.length)} categorías y ${String(checklistItems)} puntos de inspección.`,
    icon: 'clipboard',
    permission: 'checklists:manage',
    level: 'simple',
    count: checklistItems,
    unit: 'puntos',
    keywords: ['inspeccion', 'recepcion', 'interiores', 'exteriores', 'neumaticos', 'fluidos'],
    available: true,
  },
  {
    id: 'pausas',
    section: 'taller',
    label: 'Motivos de pausa',
    description: 'Por qué se para el cronómetro y si ese tiempo cuenta como productivo.',
    icon: 'pause',
    permission: 'settings:manage',
    level: 'simple',
    count: PAUSE_REASONS.length,
    unit: 'motivos',
    keywords: ['cronometro', 'tiempo', 'productivo', 'espera', 'refrigerio'],
    available: true,
  },
  {
    id: 'workflow',
    section: 'taller',
    label: 'Estados y flujo',
    description: 'El recorrido completo de una orden, de la recepción al cierre.',
    icon: 'workflow',
    permission: 'settings:manage',
    level: 'avanzado',
    count: ORDER_STATUSES.length,
    unit: 'estados',
    keywords: ['maquina', 'transicion', 'etapa', 'flujo'],
    available: true,
  },
  {
    id: 'encuesta',
    section: 'cliente',
    label: 'Cuestionario de satisfacción',
    description: 'Las preguntas que recibe el cliente y cuánto pesa cada una.',
    icon: 'message',
    permission: 'questionnaires:manage',
    level: 'simple',
    count: SURVEY_QUESTIONS.length,
    unit: 'preguntas',
    keywords: ['encuesta', 'csat', 'nps', 'satisfaccion', 'pregunta'],
    available: true,
  },
  {
    id: 'parametros',
    section: 'sistema',
    label: 'Umbrales y parámetros',
    description: 'Pesos del avance, tolerancias del semáforo, caducidad de enlaces.',
    icon: 'sliders',
    permission: 'settings:manage',
    level: 'avanzado',
    count: APP_SETTINGS.length,
    unit: 'parámetros',
    keywords: ['nps', 'csat', 'umbral', 'semaforo', 'eta', 'peso', 'avance', 'igv', 'impuesto'],
    available: true,
  },
  {
    id: 'notificaciones',
    section: 'sistema',
    label: 'Notificaciones',
    description: 'Qué se avisa, a quién y por qué canal.',
    icon: 'bell',
    permission: 'notifications:manage',
    level: 'avanzado',
    count: null,
    unit: 'reglas',
    keywords: ['correo', 'whatsapp', 'aviso', 'canal'],
    available: false,
  },
  {
    id: 'auditoria',
    section: 'sistema',
    label: 'Auditoría',
    description: 'Quién cambió qué y cuándo. No se configura: se consulta.',
    icon: 'history',
    permission: 'audit:read',
    level: 'avanzado',
    count: null,
    unit: 'registros',
    keywords: ['rastro', 'log', 'cambio', 'historial'],
    available: false,
  },
];

export function settingById(id: string): SettingsEntry | undefined {
  return SETTINGS.find((s) => s.id === id);
}

/**
 * Lo que este usuario puede administrar, en el nivel que ha elegido.
 *
 * El nivel filtra DESPUÉS del permiso, nunca al revés: cambiar a «simple» no
 * puede conceder nada que el permiso no diera.
 */
export function visibleSettings(
  granted: readonly Permission[],
  level: SettingsLevel,
): readonly SettingsEntry[] {
  const set = new Set(granted);
  return SETTINGS.filter(
    (s) => set.has(s.permission) && (level === 'avanzado' || s.level === 'simple'),
  );
}

export function sectionsOf(entries: readonly SettingsEntry[]): readonly SettingsSection[] {
  const order: readonly SettingsSection[] = [
    'general',
    'personas',
    'taller',
    'cliente',
    'sistema',
  ];
  return order.filter((s) => entries.some((e) => e.section === s));
}

const fold = (v: string): string =>
  v.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase();

/**
 * Buscar un ajuste.
 *
 * Busca también en las palabras clave, no solo en el nombre: quien teclea
 * «NPS» no sabe que el ajuste se llama «umbrales y parámetros» —por eso lo
 * busca—, y quien teclea «BBVA» quiere llegar a empresas.
 */
export function searchSettings(
  entries: readonly SettingsEntry[],
  query: string,
): readonly SettingsEntry[] {
  const q = fold(query).trim();
  if (q === '') return entries;

  return entries.filter(
    (e) =>
      fold(e.label).includes(q) ||
      fold(e.description).includes(q) ||
      e.id.includes(q) ||
      e.keywords.some((k) => fold(k).includes(q)),
  );
}

/** Comprobación de que ningún permiso citado se ha escrito mal. */
export const KNOWN_PERMISSIONS: readonly string[] = PERMISSIONS;
