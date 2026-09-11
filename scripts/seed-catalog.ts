import { connect } from '../db/client';
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
 * Siembra el catálogo del sistema.
 *
 * Lee los permisos, la matriz de roles y el grafo de estados DEL PROPIO
 * DOMINIO: el código y la base no pueden discrepar porque la base se llena
 * desde el código. A partir de aquí la fuente de verdad es la tabla.
 *
 * Idempotente: se puede volver a ejecutar sin duplicar nada.
 */
async function main(): Promise<void> {
  const sql = connect();

  try {
    await sql.begin(async (tx) => {
      // ── Permisos ──────────────────────────────────────────────────────────
      for (const code of PERMISSIONS) {
        const [resource = '', action = ''] = code.split(':');
        await tx`
          insert into permissions (code, resource, action)
          values (${code}, ${resource}, ${action})
          on conflict (code) do update set resource = excluded.resource, action = excluded.action
        `;
      }
      console.log(`  permisos                ${PERMISSIONS.length}`);

      // ── Roles y sus permisos ──────────────────────────────────────────────
      for (const role of ROLES) {
        await tx`
          insert into roles (code, name, is_system)
          values (${role}, ${ROLE_LABELS[role]}, true)
          on conflict (code) do update set name = excluded.name
        `;
        // Se reescribe el conjunto completo: la semilla es autoritativa en la
        // primera carga y reproducible en cualquier entorno.
        await tx`
          delete from role_permissions
          where role_id = (select id from roles where code = ${role})
        `;
        await tx`
          insert into role_permissions (role_id, permission_id)
          select r.id, p.id
          from roles r
          join permissions p on p.code = any(${ROLE_PERMISSIONS[role] as unknown as string[]}::citext[])
          where r.code = ${role}
        `;
      }
      const rolePermRows = await tx<{ count: string }[]>`
        select count(*)::text as count from role_permissions
      `;
      const rolePerms = rolePermRows[0]?.count ?? '0';
      console.log(`  roles                   ${ROLES.length} (${rolePerms} asignaciones)`);

      // ── Grafo de la máquina de estados ────────────────────────────────────
      const transitions = allTransitions();
      await tx`delete from status_transitions`;
      for (const t of transitions) {
        await tx`
          insert into status_transitions (from_status, action, to_status, required_permission)
          values (${t.from}::order_status, ${t.action}::order_action, ${t.to}::order_status,
                  ${t.permission})
        `;
      }
      console.log(`  transiciones de estado  ${transitions.length}`);

      // ── Ajustes ───────────────────────────────────────────────────────────
      for (const s of APP_SETTINGS) {
        await tx`
          insert into app_settings (key, value, description)
          values (${s.key}, ${JSON.stringify(s.value)}::jsonb, ${s.description})
          on conflict (key) do update
            set value = excluded.value, description = excluded.description, updated_at = now()
        `;
      }
      console.log(`  ajustes                 ${APP_SETTINGS.length}`);

      // ── Clientes corporativos ─────────────────────────────────────────────
      for (const c of CORPORATE_CLIENTS) {
        await tx`
          insert into corporate_clients (code, name, legal_name, brand_color)
          values (${c.code}, ${c.name}, ${c.legalName}, ${c.brandColor})
          on conflict (code) do update set name = excluded.name
        `;
      }
      console.log(`  clientes corporativos   ${CORPORATE_CLIENTS.length}`);

      // ── Tipos de servicio y etapas finales ────────────────────────────────
      let serviceTypeCount = 0;
      for (const [i, st] of SERVICE_TYPES.entries()) {
        const [parent] = await tx<{ id: string }[]>`
          insert into service_types (code, name, position)
          values (${st.code}, ${st.name}, ${i})
          on conflict (code) do update set name = excluded.name
          returning id
        `;
        serviceTypeCount += 1;
        if (parent === undefined) continue;

        await tx`delete from service_type_final_stages where service_type_id = ${parent.id}`;
        for (const [j, stage] of st.finalStages.entries()) {
          await tx`
            insert into service_type_final_stages (service_type_id, stage, position)
            values (${parent.id}, ${stage}::final_stage, ${j})
          `;
        }

        for (const [k, child] of (st.children ?? []).entries()) {
          await tx`
            insert into service_types (code, name, parent_id, position)
            values (${child.code}, ${child.name}, ${parent.id}, ${k})
            on conflict (code) do update set name = excluded.name, parent_id = excluded.parent_id
          `;
          serviceTypeCount += 1;
        }
      }
      console.log(`  tipos de servicio       ${serviceTypeCount}`);

      // ── Checklist ─────────────────────────────────────────────────────────
      let itemCount = 0;
      for (const [i, cat] of CHECKLIST.entries()) {
        const [category] = await tx<{ id: string }[]>`
          insert into checklist_categories (code, name, position)
          values (${cat.code}, ${cat.name}, ${i})
          on conflict (code) do update set name = excluded.name, position = excluded.position
          returning id
        `;
        if (category === undefined) continue;

        for (const [j, item] of cat.items.entries()) {
          await tx`
            insert into checklist_item_defs
              (category_id, code, label, position, input_type, is_required)
            values (${category.id}, ${item.code}, ${item.label}, ${j},
                    ${item.inputType}::checklist_input_type, ${item.required ?? true})
            on conflict (code) do update
              set label = excluded.label, position = excluded.position,
                  input_type = excluded.input_type, is_required = excluded.is_required
          `;
          itemCount += 1;
        }
      }
      console.log(`  checklist               ${CHECKLIST.length} categorías, ${itemCount} ítems`);

      // ── Motivos de pausa ──────────────────────────────────────────────────
      for (const [i, r] of PAUSE_REASONS.entries()) {
        await tx`
          insert into pause_reasons (code, label, counts_as_productive, blocks_eta, position)
          values (${r.code}, ${r.label}, ${r.productive}, ${r.blocksEta}, ${i})
          on conflict (code) do update
            set label = excluded.label, counts_as_productive = excluded.counts_as_productive,
                blocks_eta = excluded.blocks_eta
        `;
      }
      console.log(`  motivos de pausa        ${PAUSE_REASONS.length}`);

      // ── Cuestionario de satisfacción, versión 1 ───────────────────────────
      const [template] = await tx<{ id: string }[]>`
        insert into survey_templates (code, name)
        values ('satisfaccion_base', 'Encuesta de satisfacción')
        on conflict (code) do update set name = excluded.name
        returning id
      `;
      if (template !== undefined) {
        const [version] = await tx<{ id: string }[]>`
          insert into survey_template_versions (template_id, version, published_at, is_current)
          values (${template.id}, 1, now(), true)
          on conflict (template_id, version) do update set is_current = true
          returning id
        `;
        if (version !== undefined) {
          for (const [i, q] of SURVEY_QUESTIONS.entries()) {
            const options = 'options' in q ? JSON.stringify(q.options) : null;
            await tx`
              insert into survey_questions
                (template_version_id, code, text, type, options, position, weight, metric_role)
              values (${version.id}, ${q.code}, ${q.text}, ${q.type}::survey_question_type,
                      ${options}::jsonb, ${i + 1}, ${q.weight}, ${q.role}::metric_role)
              on conflict (template_version_id, code) do update
                set text = excluded.text, weight = excluded.weight,
                    metric_role = excluded.metric_role
            `;
          }
        }
      }
      console.log(`  cuestionario            versión 1, ${SURVEY_QUESTIONS.length} preguntas`);

      // ── Sede y bahías propias ─────────────────────────────────────────────
      const [branch] = await tx<{ id: string }[]>`
        insert into branches (code, name, city, address)
        values ('LIMA-01', 'Taller Central Lima', 'Lima', 'Av. Industrial 1420, Lima')
        on conflict (code) do update set name = excluded.name
        returning id
      `;
      if (branch !== undefined) {
        for (const bay of ['B1', 'B2', 'B3', 'B4', 'PP1', 'ALI1']) {
          await tx`
            insert into bays (branch_id, code, name, type)
            values (${branch.id}, ${bay}, ${'Bahía ' + bay},
                    ${bay.startsWith('PP') ? 'planchado' : bay.startsWith('ALI') ? 'alineamiento' : 'mecanica'})
            on conflict (branch_id, code) do nothing
          `;
        }
      }
      console.log('  sedes                   1 sede, 6 bahías');
    });

    console.log('\n✓ Catálogo sembrado.');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('\n✗ Falló el seed de catálogo:\n', error);
  process.exitCode = 1;
});
