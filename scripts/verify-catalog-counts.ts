import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '../src/lib/auth/permissions';
import { allTransitions } from '../src/features/orders/services/state-machine';
import {
  APP_SETTINGS,
  CHECKLIST,
  CORPORATE_CLIENTS,
  PAUSE_REASONS,
  SERVICE_TYPES,
  SURVEY_QUESTIONS,
} from '../db/seed/catalog';

/**
 * Cuántas filas DEBE tener cada tabla del catálogo, según el código.
 *
 * Sirve para contrastar contra la base después de sembrar: si el código dice
 * 80 transiciones y la tabla tiene 79, el disparador de PostgreSQL rechazará
 * una transición que la interfaz sí ofrece, y eso se descubre el día que
 * alguien intenta darla.
 */
const esperado: Readonly<Record<string, number>> = {
  permissions: PERMISSIONS.length,
  roles: ROLES.length,
  role_permissions: ROLES.reduce((n, r) => n + ROLE_PERMISSIONS[r].length, 0),
  status_transitions: allTransitions().length,
  app_settings: APP_SETTINGS.length,
  corporate_clients: CORPORATE_CLIENTS.length,
  service_types:
    SERVICE_TYPES.length + SERVICE_TYPES.reduce((n, s) => n + (s.children?.length ?? 0), 0),
  service_type_final_stages: SERVICE_TYPES.reduce((n, s) => n + s.finalStages.length, 0),
  checklist_categories: CHECKLIST.length,
  checklist_item_defs: CHECKLIST.reduce((n, c) => n + c.items.length, 0),
  pause_reasons: PAUSE_REASONS.length,
  survey_questions: SURVEY_QUESTIONS.length,
};

for (const [tabla, n] of Object.entries(esperado)) {
  process.stdout.write(`${tabla.padEnd(26)} ${String(n)}\n`);
}
