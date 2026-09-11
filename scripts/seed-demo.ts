import type postgres from 'postgres';
import { connect } from '../db/client';
import {
  generatePortalToken,
  hashDocument,
  hashPortalToken,
} from '../src/lib/security/document';
import type { OrderAction } from '../src/features/orders/services/state-machine';
import type { OrderStatus } from '../src/features/orders/services/order-status';

/**
 * Datos de demostración.
 *
 * Construye órdenes recorriendo el flujo REAL y deteniéndose en el estado
 * pedido. No inserta estados a mano: cada cambio pasa por el disparador que
 * valida el grafo contra `status_transitions`, de modo que si la máquina de
 * estados estuviera mal, este seed fallaría.
 *
 * Todas las filas llevan `is_demo = true`. En producción `ENABLE_DEMO_DATA` va
 * en `false` y este script no debe ejecutarse.
 */

type Tx = postgres.TransactionSql;

const SECRET =
  process.env['DOCUMENT_HASH_SECRET'] ??
  'semilla-de-demostracion-no-usar-en-produccion-0001';

const MIN = 60_000;
const ago = (minutes: number): Date => new Date(Date.now() - minutes * MIN);
const ahead = (minutes: number): Date => new Date(Date.now() + minutes * MIN);

/** Aplica una transición declarando la acción, como hará la Server Action. */
async function go(tx: Tx, orderId: string, action: OrderAction, to: OrderStatus): Promise<void> {
  await tx`select set_config('diana.transition_action', ${action}, true)`;
  await tx`update service_orders set status = ${to}::order_status where id = ${orderId}`;
}

function must<T>(rows: readonly T[], what: string): T {
  const row = rows[0];
  if (row === undefined) throw new Error(`No se obtuvo ${what}`);
  return row;
}

interface Context {
  readonly branchId: string;
  readonly people: ReadonlyMap<string, string>;
  readonly vehicles: ReadonlyMap<string, { vehicle: string; customer: string; corp: string | null }>;
}

interface OrderSpec {
  readonly plate: string;
  readonly serviceType: string;
  readonly target: OrderStatus;
  readonly request: string;
  readonly openedMinutesAgo: number;
  readonly promisedInMinutes: number;
  readonly finalStages: readonly ('lavado' | 'alineamiento')[];
  /** Decisión del cliente por línea. `null` = aún sin decidir. */
  readonly decisions: readonly (boolean | null)[];
  /** Deja una línea de repuestos sin recibir del todo. */
  readonly partialParts?: boolean;
  /** Deja el cronómetro corriendo. */
  readonly openSession?: boolean;
  readonly jobsDone?: number;
  readonly estimatedMinutes?: number;
  readonly workedMinutes?: number;
}

const FINDINGS = [
  { n: '001', sys: 'Frenos', find: 'Pastillas delanteras con desgaste aproximado de 90 %.', work: 'Cambio de pastillas delanteras', pri: 'alto', min: 90, price: 450, part: 'Juego de pastillas delanteras' },
  { n: '002', sys: 'Frenos', find: 'Discos delanteros con rayado profundo.', work: 'Cambio de discos delanteros', pri: 'medio', min: 90, price: 800, part: 'Par de discos delanteros' },
  { n: '003', sys: 'Motor', find: 'Filtro de aire saturado.', work: 'Cambio de filtro de aire', pri: 'medio', min: 20, price: 120, part: 'Filtro de aire' },
  { n: '004', sys: 'Suspensión', find: 'Desalineación perceptible.', work: 'Alineamiento', pri: 'recomendacion', min: 40, price: 120, part: null },
  { n: '005', sys: 'Motor', find: 'Bujías al límite de vida útil.', work: 'Cambio de bujías', pri: 'bajo', min: 45, price: 260, part: 'Juego de bujías' },
] as const;

async function buildOrder(tx: Tx, ctx: Context, spec: OrderSpec): Promise<string> {
  const v = ctx.vehicles.get(spec.plate);
  if (v === undefined) throw new Error(`Falta el vehículo ${spec.plate}`);
  const advisor = ctx.people.get('asesor') as string;
  const technician = ctx.people.get('tecnico') as string;

  const serviceType = must(
    await tx<{ id: string }[]>`select id from service_types where code = ${spec.serviceType}`,
    'el tipo de servicio',
  );

  const stages = `{${spec.finalStages.join(',')}}`;
  const order = must(
    await tx<{ id: string; code: string }[]>`
      insert into service_orders
        (corporate_client_id, customer_id, vehicle_id, branch_id, service_type_id,
         advisor_profile_id, status, mileage_in, customer_request, opened_at, promised_at,
         final_stages, is_demo)
      values (${v.corp}, ${v.customer}, ${v.vehicle}, ${ctx.branchId}, ${serviceType.id},
              ${advisor}, 'DRAFT', 41250, ${spec.request}, ${ago(spec.openedMinutesAgo)},
              ${ahead(spec.promisedInMinutes)}, ${stages}::final_stage[], true)
      returning id, code
    `,
    'la orden',
  );
  const id = order.id;
  if (spec.target === 'DRAFT') return id;

  // ── Recepción ──────────────────────────────────────────────────────────────
  await go(tx, id, 'registrar_recepcion', 'RECEPCIONADO');

  const reception = must(
    await tx<{ id: string }[]>`
      insert into vehicle_receptions (service_order_id, received_by, received_at, mileage,
                                      fuel_level, oil_level, coolant_level,
                                      tread_front_left, tread_front_right,
                                      tread_rear_left, tread_rear_right, tread_spare,
                                      customer_request, is_demo)
      values (${id}, ${advisor}, ${ago(spec.openedMinutesAgo)}, 41250,
              'medio', 'normal', 'normal', 5.5, 5.2, 6.1, 6.0, 7.4, ${spec.request}, true)
      returning id
    `,
    'la recepción',
  );
  const checklist = must(
    await tx<{ id: string }[]>`
      insert into vehicle_checklists (reception_id, completed_by, completed_at)
      values (${reception.id}, ${advisor}, ${ago(spec.openedMinutesAgo - 15)})
      returning id
    `,
    'el checklist',
  );
  await tx`
    insert into checklist_items (checklist_id, item_def_id, status, quantity)
    select ${checklist.id}, d.id,
           (case when d.code = 'plumillas' then 'no_conforme'
                 when d.code = 'estructura_remolque' then 'no_aplica'
                 else 'ok' end)::checklist_status,
           (case when d.input_type = 'estado_cantidad' then 1 else null end)
    from checklist_item_defs d where d.is_active
  `;
  await tx`
    insert into vehicle_damages (reception_id, damage_type, body_zone, side, pos_x, pos_y,
                                 severity, description)
    values (${reception.id}, 'rayon', 'lateral_izquierdo', 'izquierdo', 0.3200, 0.5400,
            'bajo', 'Rayón superficial en puerta delantera izquierda')
  `;
  await tx`
    insert into reception_documents (reception_id, document_type, received)
    values (${reception.id}, 'tarjeta_propiedad', true), (${reception.id}, 'soat', true),
           (${reception.id}, 'revision_tecnica', false)
  `;
  for (const kind of ['cliente', 'asesor'] as const) {
    await tx`
      insert into signatures (entity, entity_id, signer_kind, signer_name, image_path, signed_at)
      values ('vehicle_receptions', ${reception.id}, ${kind}::signer_kind,
              ${kind === 'cliente' ? 'Cliente demo' : 'Andrea López'},
              ${`receptions/demo/${reception.id}/${kind}.png`}, ${ago(spec.openedMinutesAgo - 15)})
    `;
  }
  if (spec.target === 'RECEPCIONADO') return id;

  await go(tx, id, 'completar_checklist', 'CHECKLIST_COMPLETADO');
  if (spec.target === 'CHECKLIST_COMPLETADO') return id;

  await go(tx, id, 'enviar_a_diagnostico', 'PENDIENTE_DIAGNOSTICO');
  await tx`
    insert into work_assignments (service_order_id, profile_id, role_in_order, assigned_by,
                                  assigned_at, estimated_minutes)
    values (${id}, ${technician}, 'diagnostico', ${advisor}, ${ago(spec.openedMinutesAgo - 30)}, 60)
  `;
  if (spec.target === 'PENDIENTE_DIAGNOSTICO') return id;

  // ── Diagnóstico ────────────────────────────────────────────────────────────
  await go(tx, id, 'iniciar_diagnostico', 'EN_DIAGNOSTICO');
  const diagnostic = must(
    await tx<{ id: string }[]>`
      insert into diagnostics (service_order_id, technician_profile_id, started_at, completed_at)
      values (${id}, ${technician}, ${ago(spec.openedMinutesAgo - 40)}, ${ago(spec.openedMinutesAgo - 100)})
      returning id
    `,
    'el diagnóstico',
  );

  const count = spec.decisions.length;
  const diagIds: string[] = [];
  for (const f of FINDINGS.slice(0, count)) {
    const item = must(
      await tx<{ id: string }[]>`
        insert into diagnostic_items (diagnostic_id, item_number, system, finding,
                                      recommended_work, priority, estimated_minutes,
                                      requires_parts, internal_notes)
        values (${diagnostic.id}, ${f.n}, ${f.sys}, ${f.find}, ${f.work},
                ${f.pri}::diagnostic_priority, ${f.min}, ${f.part !== null},
                'Nota interna del técnico: no se muestra al cliente.')
        returning id
      `,
      'el ítem de diagnóstico',
    );
    diagIds.push(item.id);
    await tx`
      insert into evidence_files (service_order_id, corporate_client_id, diagnostic_item_id,
                                  kind, storage_path, thumbnail_path, mime_type, size_bytes,
                                  is_client_visible, status, uploaded_by)
      values (${id}, ${v.corp}, ${item.id}, 'foto',
              ${`evidence/demo/${id}/diagnostic_item/${item.id}/foto_01.jpg`},
              ${`evidence/demo/${id}/diagnostic_item/${item.id}/foto_01_thumb.webp`},
              'image/jpeg', 842113, true, 'listo', ${technician})
    `;
  }
  if (spec.target === 'EN_DIAGNOSTICO') return id;

  await go(tx, id, 'completar_diagnostico', 'DIAGNOSTICO_COMPLETADO');
  if (spec.target === 'DIAGNOSTICO_COMPLETADO') return id;

  // ── Cotización ─────────────────────────────────────────────────────────────
  await go(tx, id, 'preparar_cotizacion', 'COTIZACION_EN_PREPARACION');
  const quotation = must(
    await tx<{ id: string }[]>`
      insert into quotations (service_order_id, version, code, status, currency, tax_rate)
      values (${id}, 1, ${`COT-${order.code.slice(3)}-V1`}, 'borrador', 'PEN', 0.18)
      returning id
    `,
    'la cotización',
  );

  const quoteItemIds: string[] = [];
  let subtotal = 0;
  for (const [i, f] of FINDINGS.slice(0, count).entries()) {
    subtotal += f.price;
    const qi = must(
      await tx<{ id: string }[]>`
        insert into quotation_items (quotation_id, diagnostic_item_id, line_number, description,
                                     priority, labor_minutes, labor_unit_price, quantity,
                                     unit_price, tax_rate, line_total, internal_cost)
        values (${quotation.id}, ${diagIds[i] as string}, ${i + 1}, ${f.work},
                ${f.pri}::diagnostic_priority, ${f.min}, 60.00, 1, ${f.price}, 0.18,
                ${f.price}, ${f.price * 0.55})
        returning id
      `,
      'la línea de cotización',
    );
    quoteItemIds.push(qi.id);
    if (f.part !== null) {
      await tx`
        insert into quotation_item_parts (quotation_item_id, description, quantity, unit_cost)
        values (${qi.id}, ${f.part}, 1, ${f.price * 0.4})
      `;
    }
  }
  await tx`
    update quotations set subtotal = ${subtotal}, tax_total = ${subtotal * 0.18},
                          total = ${subtotal * 1.18}, status = 'emitida',
                          issued_at = ${ago(spec.openedMinutesAgo - 120)}, issued_by = ${advisor}
     where id = ${quotation.id}
  `;
  await tx`
    insert into authorization_links (quotation_id, token_hash, expires_at, created_by)
    values (${quotation.id}, ${hashPortalToken(generatePortalToken())},
            ${ahead(60 * 24 * 7)}, ${advisor})
  `;
  if (spec.target === 'COTIZACION_EN_PREPARACION') return id;

  await go(tx, id, 'enviar_cotizacion', 'COTIZACION_ENVIADA');
  if (spec.target === 'COTIZACION_ENVIADA') return id;

  await go(tx, id, 'cliente_abrio_enlace', 'ESPERANDO_CLIENTE');

  // El portal guarda cada decisión al instante; las no tomadas quedan pendientes.
  const authorization = must(
    await tx<{ id: string }[]>`
      insert into customer_authorizations (quotation_id, channel, ip)
      values (${quotation.id}, 'portal', '190.12.44.9')
      returning id
    `,
    'la autorización',
  );
  for (const [i, decision] of spec.decisions.entries()) {
    await tx`
      insert into authorization_items (authorization_id, quotation_item_id, status, decided_at)
      values (${authorization.id}, ${quoteItemIds[i] as string},
              ${decision === null ? 'pendiente' : decision ? 'aprobado' : 'rechazado'}::authorization_item_status,
              ${decision === null ? null : ago(spec.openedMinutesAgo - 150)})
    `;
  }
  if (spec.target === 'ESPERANDO_CLIENTE') return id;

  const approved = spec.decisions.filter((d) => d === true).length;
  const finalStatus: OrderStatus = approved === count ? 'APROBADO' : 'APROBACION_PARCIAL';
  await tx`
    update customer_authorizations set decided_at = ${ago(spec.openedMinutesAgo - 150)}
     where id = ${authorization.id}
  `;
  await go(tx, id, 'registrar_decision', finalStatus);
  if (spec.target === 'APROBADO' || spec.target === 'APROBACION_PARCIAL') return id;

  // ── Repuestos y compras: SOLO los de trabajos aprobados (§60) ──────────────
  const approvedWithParts = FINDINGS.slice(0, count).filter(
    (f, i) => f.part !== null && spec.decisions[i] === true,
  );

  if (approvedWithParts.length === 0) {
    await go(tx, id, 'sin_repuestos', 'LISTO_PARA_REPARACION');
  } else {
    await go(tx, id, 'solicitar_repuestos', 'SOLICITUD_REPUESTOS');
    const request = must(
      await tx<{ id: string }[]>`
        insert into parts_requests (service_order_id, status, requested_by, requested_at)
        values (${id}, 'pendiente', ${technician}, ${ago(spec.openedMinutesAgo - 160)})
        returning id
      `,
      'la solicitud',
    );
    const reqItems: string[] = [];
    for (const f of approvedWithParts) {
      const ri = must(
        await tx<{ id: string }[]>`
          insert into parts_request_items (parts_request_id, description, quantity_required)
          values (${request.id}, ${f.part as string}, 1) returning id
        `,
        'la línea de solicitud',
      );
      reqItems.push(ri.id);
    }
    if (spec.target === 'SOLICITUD_REPUESTOS') return id;

    await go(tx, id, 'autorizar_cotizar', 'REPUESTOS_EN_COTIZACION');
    const supplier = must(
      await tx<{ id: string }[]>`
        insert into suppliers (code, name, tax_id, payment_terms, is_demo)
        values ('REP-01', 'Repuestos del Norte S.A.C.', '20456789012', '30 días', true)
        on conflict (code) do update set name = excluded.name returning id
      `,
      'el proveedor',
    );
    const sq = must(
      await tx<{ id: string }[]>`
        insert into supplier_quotes (parts_request_id, supplier_id, currency, total,
                                     lead_time_days, warranty_months, created_by)
        values (${request.id}, ${supplier.id}, 'PEN', 310.00, 2, 12,
                ${ctx.people.get('compras') as string})
        returning id
      `,
      'la cotización del proveedor',
    );
    for (const riId of reqItems) {
      await tx`
        insert into supplier_quote_items (supplier_quote_id, parts_request_item_id, unit_price,
                                          quantity_available, lead_time_days, is_selected)
        values (${sq.id}, ${riId}, 190.00, 1, 2, true)
      `;
    }
    if (spec.target === 'REPUESTOS_EN_COTIZACION') return id;

    await go(tx, id, 'enviar_a_autorizacion', 'COMPRA_PENDIENTE_AUTORIZACION');
    if (spec.target === 'COMPRA_PENDIENTE_AUTORIZACION') return id;

    await go(tx, id, 'autorizar_compra', 'COMPRA_AUTORIZADA');
    const po = must(
      await tx<{ id: string }[]>`
        insert into purchase_orders (service_order_id, supplier_id, parts_request_id, status,
                                     authorized_by, authorized_at, currency, total, expected_at,
                                     created_by)
        values (${id}, ${supplier.id}, ${request.id}, 'emitida', ${advisor},
                ${ago(spec.openedMinutesAgo - 170)}, 'PEN', 310.00, ${ago(60)},
                ${ctx.people.get('compras') as string})
        returning id
      `,
      'la orden de compra',
    );
    const poItems: string[] = [];
    for (const [i, riId] of reqItems.entries()) {
      const poi = must(
        await tx<{ id: string }[]>`
          insert into purchase_order_items (purchase_order_id, parts_request_item_id, description,
                                            quantity_ordered, unit_price, line_total)
          values (${po.id}, ${riId}, ${approvedWithParts[i]?.part ?? ''}, 1, 190.00, 190.00)
          returning id
        `,
        'la línea de OC',
      );
      poItems.push(poi.id);
    }
    await go(tx, id, 'generar_orden_compra', 'ORDEN_COMPRA_GENERADA');
    await go(tx, id, 'confirmar_envio', 'ESPERANDO_REPUESTOS');
    if (spec.target === 'ESPERANDO_REPUESTOS') return id;

    // Recepción parcial: llega la primera línea, falta el resto (§29).
    const receipt = must(
      await tx<{ id: string }[]>`
        insert into purchase_receipts (purchase_order_id, received_at, received_by, document_number)
        values (${po.id}, ${ago(90)}, ${ctx.people.get('compras') as string}, 'GR-00123')
        returning id
      `,
      'la recepción',
    );
    const firstItem = poItems[0];
    if (firstItem !== undefined) {
      await tx`
        insert into purchase_receipt_items (purchase_receipt_id, purchase_order_item_id,
                                            quantity_received)
        values (${receipt.id}, ${firstItem}, 1)
      `;
    }

    if (spec.partialParts === true && poItems.length > 1) {
      await go(tx, id, 'recepcion_parcial', 'REPUESTOS_PARCIALES');
      await tx`update purchase_orders set status = 'parcial' where id = ${po.id}`;
      if (spec.target === 'REPUESTOS_PARCIALES') return id;
    }

    for (const poi of poItems.slice(1)) {
      await tx`
        insert into purchase_receipt_items (purchase_receipt_id, purchase_order_item_id,
                                            quantity_received)
        values (${receipt.id}, ${poi}, 1)
      `;
    }
    await tx`update purchase_orders set status = 'completa' where id = ${po.id}`;
    await go(tx, id, 'recepcion_completa', 'REPUESTOS_COMPLETOS');
    if (spec.target === 'REPUESTOS_COMPLETOS') return id;

    await go(tx, id, 'liberar_para_reparacion', 'LISTO_PARA_REPARACION');
  }
  if (spec.target === 'LISTO_PARA_REPARACION') return id;

  // ── Reparación ─────────────────────────────────────────────────────────────
  const estimated = spec.estimatedMinutes ?? 180;
  const worked = spec.workedMinutes ?? 160;
  const repairJob = must(
    await tx<{ id: string }[]>`
      insert into repair_jobs (service_order_id, technician_profile_id, estimated_minutes,
                               started_at, final_notes, tests_performed)
      values (${id}, ${technician}, ${estimated}, ${ago(worked + 30)},
              'Trabajos ejecutados sin novedad.', 'Prueba de ruta 8 km.')
      returning id
    `,
    'el trabajo de reparación',
  );

  const approvedIdx = spec.decisions
    .map((d, i) => (d === true ? i : -1))
    .filter((i) => i >= 0);
  const done = spec.jobsDone ?? approvedIdx.length;

  for (const [k, i] of approvedIdx.entries()) {
    await tx`
      insert into repair_job_items (repair_job_id, quotation_item_id, status, estimated_minutes,
                                    parts_installed, completed_at)
      values (${repairJob.id}, ${quoteItemIds[i] as string},
              ${k < done ? 'hecho' : 'en_proceso'}::repair_item_status, 60,
              ${k < done ? 1 : 0}, ${k < done ? ago(40) : null})
    `;
  }

  const refrigerio = must(
    await tx<{ id: string }[]>`select id from pause_reasons where code = 'refrigerio'`,
    'el motivo de pausa',
  );
  await tx`
    insert into repair_time_sessions (repair_job_id, technician_profile_id, kind, pause_reason_id,
                                      started_at, ended_at)
    values (${repairJob.id}, ${technician}, 'trabajo', null, ${ago(worked + 30)}, ${ago(30)}),
           (${repairJob.id}, ${technician}, 'pausa', ${refrigerio.id}, ${ago(30)}, ${ago(15)})
  `;
  await go(tx, id, 'iniciar_trabajo', 'EN_REPARACION');

  if (spec.openSession === true) {
    await tx`
      insert into repair_time_sessions (repair_job_id, technician_profile_id, kind, started_at)
      values (${repairJob.id}, ${technician}, 'trabajo', ${ago(15)})
    `;
  }
  if (spec.target === 'EN_REPARACION') return id;

  await go(tx, id, 'pausar', 'REPARACION_PAUSADA');
  await go(tx, id, 'reanudar', 'EN_REPARACION');

  await tx`update repair_time_sessions set ended_at = now() where repair_job_id = ${repairJob.id} and ended_at is null`;
  await tx`update repair_jobs set finished_at = ${ago(10)} where id = ${repairJob.id}`;
  await tx`
    insert into evidence_files (service_order_id, corporate_client_id, repair_job_item_id, kind,
                                storage_path, mime_type, is_client_visible, status, uploaded_by)
    select ${id}, ${v.corp}, rji.id, 'foto', ${`evidence/demo/${id}/repair/final.jpg`},
           'image/jpeg', true, 'listo', ${technician}
    from repair_job_items rji where rji.repair_job_id = ${repairJob.id} limit 1
  `;
  await go(tx, id, 'terminar_reparacion', 'REPARACION_TERMINADA');
  if (spec.target === 'REPARACION_TERMINADA') return id;

  // ── Calidad ────────────────────────────────────────────────────────────────
  await go(tx, id, 'enviar_a_calidad', 'CONTROL_CALIDAD');
  const qc = must(
    await tx<{ id: string }[]>`
      insert into quality_controls (service_order_id, inspector_profile_id, round, result,
                                    started_at, finished_at)
      values (${id}, ${ctx.people.get('calidad') as string}, 1, 'aprobado', ${ago(9)}, ${ago(8)})
      returning id
    `,
    'el control de calidad',
  );
  await tx`
    insert into quality_control_items (quality_control_id, check_code, label, result)
    values (${qc.id}, 'frenos', 'Prueba de frenado', 'conforme'),
           (${qc.id}, 'torque', 'Torque de ruedas', 'conforme'),
           (${qc.id}, 'fugas', 'Ausencia de fugas', 'conforme')
  `;
  if (spec.target === 'CONTROL_CALIDAD') return id;

  await go(tx, id, 'aprobar_calidad', 'CONTROL_CALIDAD_APROBADO');
  if (spec.target === 'CONTROL_CALIDAD_APROBADO') return id;

  // ── Servicios finales, entrega y cierre ────────────────────────────────────
  if (spec.finalStages.includes('lavado')) {
    await go(tx, id, 'enviar_a_lavado', 'PENDIENTE_LAVADO');
    await tx`
      insert into washing_jobs (service_order_id, status, started_at, finished_at, operator_profile_id)
      values (${id}, 'terminado', ${ago(7)}, ${ago(5)}, ${ctx.people.get('lavado') as string})
    `;
    await go(tx, id, 'iniciar_lavado', 'EN_LAVADO');
    if (spec.target === 'EN_LAVADO') return id;
    await go(tx, id, 'terminar_lavado', 'LISTO_PARA_ENTREGA');
  } else {
    await go(tx, id, 'finalizar_directo', 'LISTO_PARA_ENTREGA');
  }
  if (spec.target === 'LISTO_PARA_ENTREGA') return id;

  await tx`
    insert into signatures (entity, entity_id, signer_kind, signer_name, image_path, signed_at)
    values ('service_orders', ${id}, 'cliente', 'Cliente demo',
            ${`documents/demo/${id}/acta.png`}, ${ago(3)})
  `;
  await go(tx, id, 'entregar', 'ENTREGADO');
  await tx`update service_orders set delivered_at = ${ago(3)} where id = ${id}`;
  if (spec.target === 'ENTREGADO') return id;

  await go(tx, id, 'cerrar', 'CERRADO');
  await tx`update service_orders set closed_at = ${ago(2)} where id = ${id}`;
  return id;
}

async function main(): Promise<void> {
  const sql = connect();

  try {
    await sql.begin(async (tx) => {
      const people = [
        { key: 'admin', name: 'Rocío Paredes', role: 'admin' },
        { key: 'asesor', name: 'Andrea López', role: 'asesor' },
        { key: 'tecnico', name: 'Carlos Mendoza', role: 'tecnico' },
        { key: 'tecnico2', name: 'Luis Ramírez', role: 'tecnico' },
        { key: 'compras', name: 'Sofía Torres', role: 'compras' },
        { key: 'calidad', name: 'Marco Ruiz', role: 'calidad' },
        { key: 'lavado', name: 'Jorge Ayala', role: 'lavado' },
        { key: 'alineamiento', name: 'Pedro Salinas', role: 'alineamiento' },
        { key: 'analista', name: 'Elena Vargas', role: 'analista' },
        { key: 'bbva', name: 'Usuario BBVA', role: 'cliente_corporativo' },
        { key: 'mitsui', name: 'Usuario Mitsui', role: 'cliente_corporativo' },
      ] as const;

      const branch = must(
        await tx<{ id: string }[]>`select id from branches where code = 'LIMA-01'`,
        'la sede',
      );

      const ids = new Map<string, string>();
      for (const p of people) {
        const email = `${p.key}@diana.test`;
        const user = must(
          await tx<{ id: string }[]>`
            insert into auth.users (email, raw_app_meta_data)
            values (${email}, ${JSON.stringify({ role: p.role })}::jsonb)
            on conflict (email) do update set email = excluded.email
            returning id
          `,
          `el usuario ${p.key}`,
        );
        await tx`
          insert into profiles (id, role_id, branch_id, full_name, email, is_demo, purchase_limit)
          values (${user.id}, (select id from roles where code = ${p.role}), ${branch.id},
                  ${p.name}, ${email}, true, 20000)
          on conflict (id) do update set full_name = excluded.full_name
        `;
        ids.set(p.key, user.id);
      }
      for (const [key, code] of [['bbva', 'BBVA'], ['mitsui', 'MITSUI']] as const) {
        await tx`
          insert into user_corporate_clients (profile_id, corporate_client_id)
          values (${ids.get(key) as string}, (select id from corporate_clients where code = ${code}))
          on conflict do nothing
        `;
      }
      console.log(`  usuarios                ${people.length}`);

      const customersSeed = [
        { doc: '44556677', type: 'DNI', first: 'Juan', last: 'Pérez', corp: null, plate: 'ABC123', brand: 'Toyota', model: 'Hilux', year: 2021 },
        { doc: '20512345678', type: 'RUC', business: 'Banco Continental', corp: 'BBVA', plate: 'B4T019', brand: 'Kia', model: 'Sportage', year: 2022 },
        { doc: '20487654321', type: 'RUC', business: 'Transportes del Sur S.A.C.', corp: 'MITSUI', plate: 'V2K481', brand: 'Mitsubishi', model: 'L200', year: 2019 },
        { doc: '20399887766', type: 'RUC', business: 'Renting Andino S.A.', corp: 'RELSA', plate: 'C7X330', brand: 'Toyota', model: 'Corolla', year: 2020 },
        { doc: '41239876', type: 'DNI', first: 'María', last: 'Quispe', corp: null, plate: 'D9M772', brand: 'Hyundai', model: 'Tucson', year: 2023 },
      ] as const;

      const vehicles = new Map<string, { vehicle: string; customer: string; corp: string | null }>();
      for (const c of customersSeed) {
        const corpId =
          c.corp === null
            ? null
            : must(
                await tx<{ id: string }[]>`select id from corporate_clients where code = ${c.corp}`,
                'el cliente corporativo',
              ).id;

        const customer = must(
          await tx<{ id: string }[]>`
            insert into customers (corporate_client_id, document_type, document_number,
                                   document_hash, first_name, last_name, business_name, phone, is_demo)
            values (${corpId}, ${c.type}::document_type, ${c.doc}, ${hashDocument(c.doc, SECRET)},
                    ${'first' in c ? c.first : null}, ${'last' in c ? c.last : null},
                    ${'business' in c ? c.business : null}, '+51 999 000 111', true)
            on conflict (document_type, document_number) do update set updated_at = now()
            returning id
          `,
          'el cliente',
        );
        const vehicle = must(
          await tx<{ id: string }[]>`
            insert into vehicles (corporate_client_id, primary_customer_id, plate, brand, model,
                                  model_year, color, vin, last_mileage, is_demo)
            values (${corpId}, ${customer.id}, ${c.plate}, ${c.brand}, ${c.model}, ${c.year},
                    'Blanco', ${'8AJ' + c.plate + '00000000'}, 38800, true)
            on conflict (plate) where deleted_at is null do update set updated_at = now()
            returning id
          `,
          'el vehículo',
        );
        vehicles.set(c.plate, { vehicle: vehicle.id, customer: customer.id, corp: corpId });
      }
      console.log(`  clientes y vehículos    ${customersSeed.length}`);

      const ctx: Context = { branchId: branch.id, people: ids, vehicles };

      /*
       * Órdenes detenidas en estados distintos: pueblan el tablero y hacen que
       * la prueba de paridad recorra varias ramas de la fórmula de avance.
       */
      const specs: readonly OrderSpec[] = [
        {
          plate: 'ABC123', serviceType: 'correctivo', target: 'CERRADO',
          request: 'Ruido al frenar y revisión general', openedMinutesAgo: 600,
          promisedInMinutes: -60, finalStages: ['lavado'],
          decisions: [true, false, true, true], estimatedMinutes: 180, workedMinutes: 160,
        },
        {
          plate: 'B4T019', serviceType: 'preventivo', target: 'EN_REPARACION',
          request: 'Mantenimiento de 40 000 km', openedMinutesAgo: 300,
          promisedInMinutes: 300, finalStages: ['lavado', 'alineamiento'],
          decisions: [true, true, true], jobsDone: 2, estimatedMinutes: 240,
          workedMinutes: 105, openSession: true,
        },
        {
          plate: 'V2K481', serviceType: 'preventivo', target: 'REPUESTOS_PARCIALES',
          request: 'Cambio de pastillas y filtros', openedMinutesAgo: 1620,
          promisedInMinutes: -120, finalStages: ['lavado'],
          decisions: [true, true, true, true, true], partialParts: true,
        },
        {
          plate: 'D9M772', serviceType: 'pp_seguro', target: 'ESPERANDO_CLIENTE',
          request: 'Siniestro: puerta delantera izquierda', openedMinutesAgo: 2900,
          promisedInMinutes: 900, finalStages: ['lavado'],
          decisions: [true, false, null, null, null],
        },
        {
          plate: 'C7X330', serviceType: 'correctivo', target: 'PENDIENTE_DIAGNOSTICO',
          request: 'Revisión de suspensión', openedMinutesAgo: 95,
          promisedInMinutes: 400, finalStages: ['lavado', 'alineamiento'],
          decisions: [true, true, true],
        },
      ];

      for (const spec of specs) {
        const orderId = await buildOrder(tx, ctx, spec);
        const row = must(
          await tx<{ code: string; status: string }[]>`
            select code, status::text as status from service_orders where id = ${orderId}
          `,
          'la orden creada',
        );
        console.log(`  ${row.code}          ${row.status}`);
      }

      // ── Encuesta de la orden entregada: la costura entre los dos contextos ──
      const version = must(
        await tx<{ id: string }[]>`
          select v.id from survey_template_versions v
          join survey_templates t on t.id = v.template_id
          where t.code = 'satisfaccion_base' and v.is_current
        `,
        'la versión del cuestionario',
      );
      const closed = must(
        await tx<{ id: string; corporate_client_id: string | null; customer_id: string; vehicle_id: string; branch_id: string; service_type_id: string }[]>`
          select id, corporate_client_id, customer_id, vehicle_id, branch_id, service_type_id
          from service_orders where status = 'CERRADO' limit 1
        `,
        'la orden cerrada',
      );
      const survey = must(
        await tx<{ code: string }[]>`
          insert into surveys (service_order_id, template_version_id, corporate_client_id,
                               customer_id, vehicle_id, branch_id, service_type_id, mileage,
                               csat_score, nps_score, nps_category, satisfaction_index,
                               satisfaction_level, requires_follow_up, comments, answered_at, is_demo)
          values (${closed.id}, ${version.id}, ${closed.corporate_client_id}, ${closed.customer_id},
                  ${closed.vehicle_id}, ${closed.branch_id}, ${closed.service_type_id}, 41250,
                  87.50, 9, 'promotor', 86.25, 'muy_satisfecho', false,
                  'Muy buena atención, aunque la espera de repuestos fue larga.', ${ago(10)}, true)
          returning code
        `,
        'la encuesta',
      );
      for (const [i, value] of [5, 5, 4, 3, 5, 4, 5, 5].entries()) {
        await tx`
          insert into survey_answers (survey_id, question_id, value_numeric)
          select (select id from surveys where code = ${survey.code}), q.id, ${value}
          from survey_questions q
          where q.template_version_id = ${version.id} and q.position = ${i + 1}
        `;
      }
      await tx`
        insert into survey_answers (survey_id, question_id, value_numeric)
        select (select id from surveys where code = ${survey.code}), q.id, 9
        from survey_questions q
        where q.template_version_id = ${version.id} and q.metric_role = 'nps'
      `;
      console.log(`  encuesta                ${survey.code} (NPS 9, índice 86,25)`);
    });

    console.log('\n✓ Datos de demostración cargados.');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('\n✗ Falló el seed DEMO:\n', error);
  process.exitCode = 1;
});
