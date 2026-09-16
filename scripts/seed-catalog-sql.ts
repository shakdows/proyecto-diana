import {
  APP_SETTINGS,
  CHECKLIST,
  CORPORATE_CLIENTS,
  PAUSE_REASONS,
  SERVICE_TYPES,
  SURVEY_QUESTIONS,
} from '../db/seed/catalog';
import {
  PERMISSIONS,
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from '../src/lib/auth/permissions';
import { allTransitions } from '../src/features/orders/services/state-machine';

/**
 * El mismo catálogo que `seed-catalog.ts`, pero ESCRITO como SQL.
 *
 * ── Por qué existe además del otro ─────────────────────────────────────────
 *
 * `db:seed:catalog` se conecta con `DATABASE_URL`, que lleva dentro la
 * contraseña del propietario de la base. Eso está bien en la máquina de quien
 * administra el sistema y está mal en cualquier otro sitio: para sembrar el
 * catálogo no hace falta repartir esa contraseña.
 *
 * Esto emite el SQL por la salida estándar. Se pega en el editor de Supabase,
 * se pasa por `psql`, o lo aplica quien tenga acceso —sin que la credencial
 * viaje a ninguna parte—.
 *
 * Lee EXACTAMENTE las mismas fuentes que el seed normal: los permisos, la
 * matriz de roles y el grafo de la máquina de estados salen del dominio. El
 * código y la base no pueden discrepar porque la base se llena desde el
 * código.
 *
 * Idempotente, igual que el otro: se puede volver a aplicar sin duplicar nada.
 */

/** Comillas de cadena en SQL. Lo único que hay que escapar es la comilla. */
function q(value: string): string {
  return `'${value.replace(/'/gu, "''")}'`;
}

function qn(value: string | null | undefined): string {
  return value === null || value === undefined ? 'null' : q(value);
}

/** Un literal de array de `citext`, para la asignación de permisos. */
function arr(values: readonly string[]): string {
  return `array[${values.map(q).join(', ')}]::citext[]`;
}

const out: string[] = [];
const say = (line = ''): void => void out.push(line);

say('-- ─────────────────────────────────────────────────────────────────────');
say('-- Catálogo base de Diana. GENERADO por `npm run db:seed:catalog:sql`.');
say('-- No editar a mano: se regenera desde el dominio (permisos, roles y la');
say('-- máquina de estados) y desde `db/seed/catalog.ts`.');
say('-- ─────────────────────────────────────────────────────────────────────');
say();
say('begin;');
say();

// ── Permisos ────────────────────────────────────────────────────────────────
/*
 * Una sola sentencia con todas las filas, no una por fila.
 *
 * No es un truco de brevedad: son 72 permisos, 76 transiciones y un centenar
 * de ítems de checklist. En sentencias sueltas el archivo pasa de 80 KB y se
 * vuelve incómodo de pegar en cualquier sitio; agrupado cabe de una vez y se
 * aplica en un viaje en lugar de en trescientos.
 */
say(`-- Permisos (${PERMISSIONS.length})`);
say('insert into permissions (code, resource, action) values');
say(
  PERMISSIONS.map((code) => {
    const [resource = '', action = ''] = code.split(':');
    return `  (${q(code)}, ${q(resource)}, ${q(action)})`;
  }).join(',\n'),
);
say('on conflict (code) do update set resource = excluded.resource, action = excluded.action;');
say();

// ── Roles y sus permisos ────────────────────────────────────────────────────
say(`-- Roles (${ROLES.length}) y su matriz de permisos`);
for (const role of ROLES) {
  say(
    `insert into roles (code, name, is_system) values (${q(role)}, ${q(ROLE_LABELS[role])}, true) ` +
      `on conflict (code) do update set name = excluded.name;`,
  );
  /* Se reescribe el conjunto completo: la semilla es autoritativa. */
  say(`delete from role_permissions where role_id = (select id from roles where code = ${q(role)});`);
  say(
    `insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r ` +
      `join permissions p on p.code = any(${arr(ROLE_PERMISSIONS[role])}) where r.code = ${q(role)};`,
  );
}
say();

// ── Máquina de estados ──────────────────────────────────────────────────────
const transitions = allTransitions();
say(`-- Grafo de la máquina de estados (${transitions.length} ternas)`);
say('delete from status_transitions;');
say('insert into status_transitions (from_status, action, to_status, required_permission) values');
say(
  transitions
    .map(
      (t) =>
        `  (${q(t.from)}::order_status, ${q(t.action)}::order_action, ` +
        `${q(t.to)}::order_status, ${qn(t.permission)})`,
    )
    .join(',\n') + ';',
);
say();

// ── Ajustes ─────────────────────────────────────────────────────────────────
say(`-- Ajustes de la aplicación (${APP_SETTINGS.length})`);
say('insert into app_settings (key, value, description) values');
say(
  APP_SETTINGS.map(
    (s) => `  (${q(s.key)}, ${q(JSON.stringify(s.value))}::jsonb, ${q(s.description)})`,
  ).join(',\n'),
);
say(
  'on conflict (key) do update set value = excluded.value, ' +
    'description = excluded.description, updated_at = now();',
);
say();

// ── Clientes corporativos ───────────────────────────────────────────────────
say(`-- Clientes corporativos (${CORPORATE_CLIENTS.length})`);
say('insert into corporate_clients (code, name, legal_name, brand_color) values');
say(
  CORPORATE_CLIENTS.map(
    (c) => `  (${q(c.code)}, ${q(c.name)}, ${q(c.legalName)}, ${q(c.brandColor)})`,
  ).join(',\n'),
);
say('on conflict (code) do update set name = excluded.name;');
say();

// ── Tipos de servicio ───────────────────────────────────────────────────────
say('-- Tipos de servicio y sus etapas finales');
for (const [i, st] of SERVICE_TYPES.entries()) {
  say(
    `insert into service_types (code, name, position) values (${q(st.code)}, ${q(st.name)}, ${i}) ` +
      `on conflict (code) do update set name = excluded.name;`,
  );
  say(
    `delete from service_type_final_stages where service_type_id = (select id from service_types where code = ${q(st.code)});`,
  );
  for (const [j, stage] of st.finalStages.entries()) {
    say(
      `insert into service_type_final_stages (service_type_id, stage, position) select id, ${q(stage)}::final_stage, ${j} ` +
        `from service_types where code = ${q(st.code)};`,
    );
  }
  for (const [k, child] of (st.children ?? []).entries()) {
    say(
      `insert into service_types (code, name, parent_id, position) select ${q(child.code)}, ${q(child.name)}, id, ${k} ` +
        `from service_types where code = ${q(st.code)} ` +
        `on conflict (code) do update set name = excluded.name, parent_id = excluded.parent_id;`,
    );
  }
}
say();

// ── Checklist ───────────────────────────────────────────────────────────────
const items = CHECKLIST.reduce((n, c) => n + c.items.length, 0);
say(`-- Checklist de recepción (${CHECKLIST.length} categorías, ${items} ítems)`);
say('insert into checklist_categories (code, name, position) values');
say(CHECKLIST.map((cat, i) => `  (${q(cat.code)}, ${q(cat.name)}, ${i})`).join(',\n'));
say('on conflict (code) do update set name = excluded.name, position = excluded.position;');
say();

/*
 * Los ítems llegan con el CÓDIGO de su categoría y el identificador se
 * resuelve con un join contra la tabla, no con un `select` por fila: así la
 * sentencia es una y el vínculo lo hace PostgreSQL.
 */
say('insert into checklist_item_defs (category_id, code, label, position, input_type, is_required)');
say('select c.id, v.code, v.label, v.position, v.input_type::checklist_input_type, v.is_required');
say('from (values');
say(
  CHECKLIST.flatMap((cat) =>
    cat.items.map(
      (item, j) =>
        `  (${q(cat.code)}, ${q(item.code)}, ${q(item.label)}, ${j}, ` +
        `${q(item.inputType)}, ${item.required ?? true})`,
    ),
  ).join(',\n'),
);
say(') as v(category_code, code, label, position, input_type, is_required)');
say('join checklist_categories c on c.code = v.category_code');
say('on conflict (code) do update set label = excluded.label, position = excluded.position,');
say('  input_type = excluded.input_type, is_required = excluded.is_required;');
say();

// ── Motivos de pausa ────────────────────────────────────────────────────────
say(`-- Motivos de pausa (${PAUSE_REASONS.length})`);
say('insert into pause_reasons (code, label, counts_as_productive, blocks_eta, position) values');
say(
  PAUSE_REASONS.map(
    (r, i) => `  (${q(r.code)}, ${q(r.label)}, ${r.productive}, ${r.blocksEta}, ${i})`,
  ).join(',\n'),
);
say(
  'on conflict (code) do update set label = excluded.label, ' +
    'counts_as_productive = excluded.counts_as_productive, blocks_eta = excluded.blocks_eta;',
);
say();

// ── Cuestionario ────────────────────────────────────────────────────────────
say(`-- Cuestionario de satisfacción, versión 1 (${SURVEY_QUESTIONS.length} preguntas)`);
say(
  `insert into survey_templates (code, name) values ('satisfaccion_base', 'Encuesta de satisfacción') ` +
    `on conflict (code) do update set name = excluded.name;`,
);
say(
  `insert into survey_template_versions (template_id, version, published_at, is_current) ` +
    `select id, 1, now(), true from survey_templates where code = 'satisfaccion_base' ` +
    `on conflict (template_id, version) do update set is_current = true;`,
);
for (const [i, qn_] of SURVEY_QUESTIONS.entries()) {
  const options = 'options' in qn_ ? q(JSON.stringify(qn_.options)) : 'null';
  say(
    `insert into survey_questions (template_version_id, code, text, type, options, position, weight, metric_role) ` +
      `select v.id, ${q(qn_.code)}, ${q(qn_.text)}, ${q(qn_.type)}::survey_question_type, ${options}::jsonb, ` +
      `${i + 1}, ${qn_.weight}, ${q(qn_.role)}::metric_role ` +
      `from survey_template_versions v join survey_templates t on t.id = v.template_id ` +
      `where t.code = 'satisfaccion_base' and v.version = 1 ` +
      `on conflict (template_version_id, code) do update set text = excluded.text, ` +
      `weight = excluded.weight, metric_role = excluded.metric_role;`,
  );
}
say();

// ── Sede y bahías ───────────────────────────────────────────────────────────
say('-- Sede y bahías');
say(
  `insert into branches (code, name, city, address) values ` +
    `('LIMA-01', 'Taller Central Lima', 'Lima', 'Av. Industrial 1420, Lima') ` +
    `on conflict (code) do update set name = excluded.name;`,
);
const BAYS = ['B1', 'B2', 'B3', 'B4', 'PP1', 'ALI1'];
say('insert into bays (branch_id, code, name, type)');
/* `bays.type` es `text`, no un enum: un cast a `bay_type` falla. */
say('select b.id, v.code, v.name, v.type from branches b, (values');
say(
  BAYS.map((bay) => {
    const type = bay.startsWith('PP')
      ? 'planchado'
      : bay.startsWith('ALI')
        ? 'alineamiento'
        : 'mecanica';
    return `  (${q(bay)}, ${q('Bahía ' + bay)}, ${q(type)})`;
  }).join(',\n'),
);
say(") as v(code, name, type) where b.code = 'LIMA-01'");
say('on conflict (branch_id, code) do nothing;');
say();
say('commit;');

process.stdout.write(out.join('\n') + '\n');
