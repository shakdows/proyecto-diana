import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enumeraciones del dominio.
 *
 * Se declaran como tipos de PostgreSQL, no como texto libre con `CHECK`: así
 * la base rechaza un valor inválido venga de donde venga —aplicación, script
 * de corrección o `psql`— y el tipo aparece en las herramientas.
 *
 * Lo que es CONFIGURACIÓN DEL NEGOCIO (tipos de servicio, ítems de checklist,
 * motivos de pausa) NO está aquí: son filas de catálogo administrables.
 */

// ── Orden de servicio ────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum('order_status', [
  'DRAFT',
  'RECEPCIONADO',
  'CHECKLIST_COMPLETADO',
  'PENDIENTE_DIAGNOSTICO',
  'EN_DIAGNOSTICO',
  'DIAGNOSTICO_COMPLETADO',
  'COTIZACION_EN_PREPARACION',
  'COTIZACION_ENVIADA',
  'ESPERANDO_CLIENTE',
  'APROBACION_PARCIAL',
  'APROBADO',
  'SOLICITUD_REPUESTOS',
  'REPUESTOS_EN_COTIZACION',
  'COMPRA_PENDIENTE_AUTORIZACION',
  'COMPRA_AUTORIZADA',
  'ORDEN_COMPRA_GENERADA',
  'ESPERANDO_REPUESTOS',
  'REPUESTOS_PARCIALES',
  'REPUESTOS_COMPLETOS',
  'LISTO_PARA_REPARACION',
  'EN_REPARACION',
  'REPARACION_PAUSADA',
  'REPARACION_TERMINADA',
  'CONTROL_CALIDAD',
  'OBSERVADO_CONTROL_CALIDAD',
  'CONTROL_CALIDAD_APROBADO',
  'PENDIENTE_LAVADO',
  'EN_LAVADO',
  'PENDIENTE_ALINEAMIENTO',
  'EN_ALINEAMIENTO',
  'LISTO_PARA_ENTREGA',
  'ENTREGADO',
  'CERRADO',
  'CANCELADO',
]);

export const orderActionEnum = pgEnum('order_action', [
  'registrar_recepcion',
  'completar_checklist',
  'enviar_a_diagnostico',
  'iniciar_diagnostico',
  'completar_diagnostico',
  'preparar_cotizacion',
  'enviar_cotizacion',
  'cliente_abrio_enlace',
  'registrar_decision',
  'cerrar_sin_trabajos',
  'solicitar_repuestos',
  'sin_repuestos',
  'autorizar_cotizar',
  'enviar_a_autorizacion',
  'autorizar_compra',
  'rechazar_compra',
  'generar_orden_compra',
  'confirmar_envio',
  'recepcion_parcial',
  'recepcion_completa',
  'liberar_para_reparacion',
  'iniciar_trabajo',
  'pausar',
  'reanudar',
  'ampliar_cotizacion',
  'terminar_reparacion',
  'enviar_a_calidad',
  'aprobar_calidad',
  'observar_calidad',
  'retomar_reparacion',
  'enviar_a_lavado',
  'enviar_a_alineamiento',
  'finalizar_directo',
  'iniciar_lavado',
  'terminar_lavado',
  'iniciar_alineamiento',
  'terminar_alineamiento',
  'entregar',
  'cerrar',
  'cancelar',
]);

export const orderPriorityEnum = pgEnum('order_priority', ['urgente', 'alta', 'normal', 'baja']);
export const finalStageEnum = pgEnum('final_stage', ['lavado', 'alineamiento']);
export const assignmentRoleEnum = pgEnum('assignment_role', [
  'diagnostico',
  'reparacion',
  'planchado',
  'pintura',
]);

// ── Personas y vehículos ─────────────────────────────────────────────────────

export const documentTypeEnum = pgEnum('document_type', ['DNI', 'CE', 'RUC', 'PAS']);
export const technicianSpecialtyEnum = pgEnum('technician_specialty', [
  'mecanica',
  'planchado',
  'pintura',
  'electricidad',
  'alineamiento',
]);

// ── Recepción y checklist ────────────────────────────────────────────────────

export const checklistInputTypeEnum = pgEnum('checklist_input_type', [
  'estado',
  'estado_cantidad',
  'estado_medida',
]);
export const checklistStatusEnum = pgEnum('checklist_status', [
  'ok',
  'no_conforme',
  'no_aplica',
]);
export const fuelLevelEnum = pgEnum('fuel_level', [
  'vacio',
  'un_cuarto',
  'medio',
  'tres_cuartos',
  'lleno',
]);
export const levelReadingEnum = pgEnum('level_reading', ['bajo', 'normal', 'alto']);
export const damageTypeEnum = pgEnum('damage_type', [
  'golpe',
  'rayon',
  'picado',
  'abolladura',
  'otro',
]);
export const bodyZoneEnum = pgEnum('body_zone', [
  'frontal',
  'posterior',
  'lateral_izquierdo',
  'lateral_derecho',
  'techo',
  'interior',
]);
export const receptionDocumentTypeEnum = pgEnum('reception_document_type', [
  'tarjeta_propiedad',
  'revision_tecnica',
  'soat',
  'polarizado',
  'otro',
]);
export const signerKindEnum = pgEnum('signer_kind', ['cliente', 'asesor', 'inspector']);

// ── Diagnóstico y evidencias ─────────────────────────────────────────────────

export const diagnosticPriorityEnum = pgEnum('diagnostic_priority', [
  'critico',
  'alto',
  'medio',
  'bajo',
  'recomendacion',
]);
export const evidenceKindEnum = pgEnum('evidence_kind', ['foto', 'video', 'documento']);
export const evidenceStatusEnum = pgEnum('evidence_status', ['pendiente', 'listo']);

// ── Cotización y autorización ────────────────────────────────────────────────

export const quotationStatusEnum = pgEnum('quotation_status', [
  'borrador',
  'emitida',
  'sustituida',
  'anulada',
]);
export const authorizationItemStatusEnum = pgEnum('authorization_item_status', [
  'pendiente',
  'aprobado',
  'rechazado',
  'aprobado_con_observacion',
]);
export const authorizationChannelEnum = pgEnum('authorization_channel', [
  'portal',
  'telefono',
  'presencial',
  'whatsapp',
]);

// ── Repuestos y compras ──────────────────────────────────────────────────────

export const partsRequestStatusEnum = pgEnum('parts_request_status', [
  'borrador',
  'pendiente',
  'autorizada',
  'rechazada',
  'en_correccion',
]);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'emitida',
  'enviada',
  'parcial',
  'completa',
  'anulada',
]);

// ── Reparación, calidad y servicios finales ──────────────────────────────────

export const repairItemStatusEnum = pgEnum('repair_item_status', [
  'pendiente',
  'en_proceso',
  'hecho',
  'bloqueado',
]);
export const timeSessionKindEnum = pgEnum('time_session_kind', ['trabajo', 'pausa']);
export const qualityResultEnum = pgEnum('quality_result', ['aprobado', 'observado']);
export const qualityItemResultEnum = pgEnum('quality_item_result', [
  'conforme',
  'no_conforme',
  'no_aplica',
]);
export const jobStatusEnum = pgEnum('job_status', ['pendiente', 'en_proceso', 'terminado']);

// ── Notificaciones y documentos ──────────────────────────────────────────────

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'whatsapp',
  'sms',
]);
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pendiente',
  'enviado',
  'fallido',
  'omitido',
]);
export const documentTypeCatalogEnum = pgEnum('document_kind', [
  'checklist_recepcion',
  'orden_servicio',
  'diagnostico',
  'cotizacion',
  'autorizacion',
  'orden_compra',
  'reporte_repuestos',
  'reporte_trabajo',
  'acta_entrega',
  'informe_satisfaccion',
]);

// ── Satisfacción ─────────────────────────────────────────────────────────────

export const surveyQuestionTypeEnum = pgEnum('survey_question_type', [
  'scale_1_5',
  'scale_0_10',
  'yes_no',
  'single_choice',
  'multiple_choice',
  'free_text',
]);
export const metricRoleEnum = pgEnum('metric_role', ['csat', 'nps', 'none']);
export const surveyStatusEnum = pgEnum('survey_status', ['completed', 'voided']);
export const npsCategoryEnum = pgEnum('nps_category', ['detractor', 'pasivo', 'promotor']);
export const satisfactionLevelEnum = pgEnum('satisfaction_level', [
  'insatisfecho',
  'regular',
  'satisfecho',
  'muy_satisfecho',
]);
export const followupStatusEnum = pgEnum('followup_status', [
  'pendiente',
  'en_proceso',
  'resuelto',
  'no_contactado',
]);

// ── Trazabilidad y configuración ─────────────────────────────────────────────

export const actorKindEnum = pgEnum('actor_kind', ['usuario', 'portal_cliente', 'sistema']);
export const settingScopeEnum = pgEnum('setting_scope', ['global', 'corporate_client']);
