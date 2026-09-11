import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, citext, createdAt, id, updatedAt } from './_shared';
import {
  followupStatusEnum,
  metricRoleEnum,
  npsCategoryEnum,
  satisfactionLevelEnum,
  surveyQuestionTypeEnum,
  surveyStatusEnum,
} from './enums';
import { branches, corporateClients, profiles } from './core';
import { customers, serviceAdvisors, vehicles } from './people';
import { serviceOrders, serviceTypes } from './orders';

export const surveyTemplates = pgTable(
  'survey_templates',
  {
    id: id(),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('survey_templates_code_key').on(t.code)],
);

/**
 * Publicar una versión CONGELA la anterior.
 *
 * Sin esto, editar una pregunta en 2027 corrompería retroactivamente la
 * comparación histórica de 2026.
 */
export const surveyTemplateVersions = pgTable(
  'survey_template_versions',
  {
    id: id(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => surveyTemplates.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    isCurrent: boolean('is_current').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('survey_template_versions_unique').on(t.templateId, t.version),
    // Parcial: solo puede haber UNA versión vigente por plantilla.
    uniqueIndex('survey_template_versions_current_key')
      .on(t.templateId)
      .where(sql`${t.isCurrent}`),
  ],
);

export const surveyQuestions = pgTable(
  'survey_questions',
  {
    id: id(),
    templateVersionId: uuid('template_version_id')
      .notNull()
      .references(() => surveyTemplateVersions.id, { onDelete: 'cascade' }),
    code: citext('code').notNull(),
    text: text('text').notNull(),
    type: surveyQuestionTypeEnum('type').notNull(),
    options: jsonb('options'),
    position: integer('position').notNull(),
    isRequired: boolean('is_required').notNull().default(true),
    weight: numeric('weight', { precision: 5, scale: 2 }).notNull().default('1.00'),
    /**
     * Evita cablear números de pregunta: el cálculo del NPS busca la marcada
     * como `nps`, no «la pregunta 9».
     */
    metricRole: metricRoleEnum('metric_role').notNull().default('none'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('survey_questions_unique').on(t.templateVersionId, t.code),
    index('survey_questions_version_idx').on(t.templateVersionId, t.position),
  ],
);

export const surveys = pgTable(
  'surveys',
  {
    id: id(),
    code: citext('code').notNull(),
    /** LA COSTURA entre los dos contextos. Nullable: admite encuesta suelta. */
    serviceOrderId: uuid('service_order_id').references(() => serviceOrders.id, {
      onDelete: 'set null',
    }),
    templateVersionId: uuid('template_version_id')
      .notNull()
      .references(() => surveyTemplateVersions.id, { onDelete: 'restrict' }),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'restrict',
    }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'restrict' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    serviceAdvisorId: uuid('service_advisor_id').references(() => serviceAdvisors.id, {
      onDelete: 'set null',
    }),
    serviceTypeId: uuid('service_type_id').references(() => serviceTypes.id, {
      onDelete: 'set null',
    }),
    mileage: integer('mileage'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    status: surveyStatusEnum('status').notNull().default('completed'),
    /**
     * Indicadores ALMACENADOS calculados.
     *
     * Recalcularlos en cada carga del panel obligaría a recorrer millones de
     * respuestas; y un cambio futuro de umbrales no debe reescribir lo que ya
     * se reportó a un cliente.
     */
    csatScore: numeric('csat_score', { precision: 5, scale: 2 }),
    npsScore: integer('nps_score'),
    npsCategory: npsCategoryEnum('nps_category'),
    satisfactionIndex: numeric('satisfaction_index', { precision: 5, scale: 2 }),
    satisfactionLevel: satisfactionLevelEnum('satisfaction_level'),
    requiresFollowUp: boolean('requires_follow_up').notNull().default(false),
    comments: text('comments'),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('surveys_code_key').on(t.code),
    index('surveys_corporate_idx').on(t.corporateClientId, t.answeredAt.desc()),
    index('surveys_answered_idx').on(t.answeredAt.desc()),
    index('surveys_vehicle_idx').on(t.vehicleId, t.answeredAt.desc()),
    index('surveys_order_idx').on(t.serviceOrderId),
    // Parcial: los que requieren seguimiento, que es la pantalla de trabajo.
    index('surveys_followup_idx')
      .on(t.corporateClientId, t.answeredAt.desc())
      .where(sql`${t.requiresFollowUp}`),
  ],
);

export const surveyAnswers = pgTable(
  'survey_answers',
  {
    id: id(),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: 'restrict' }),
    valueNumeric: numeric('value_numeric', { precision: 6, scale: 2 }),
    valueText: text('value_text'),
    valueOptions: jsonb('value_options'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('survey_answers_unique').on(t.surveyId, t.questionId),
    index('survey_answers_survey_idx').on(t.surveyId),
    index('survey_answers_question_idx').on(t.questionId, t.valueNumeric),
  ],
);

export const followups = pgTable(
  'followups',
  {
    id: id(),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'restrict',
    }),
    assignedTo: uuid('assigned_to').references(() => profiles.id, { onDelete: 'set null' }),
    status: followupStatusEnum('status').notNull().default('pendiente'),
    resolution: text('resolution'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closedBy: uuid('closed_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('followups_survey_key').on(t.surveyId),
    index('followups_status_idx').on(t.status, t.createdAt.desc()),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: id(),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'cascade',
    }),
    reportType: citext('report_type').notNull(),
    params: jsonb('params'),
    storagePath: text('storage_path'),
    generatedBy: uuid('generated_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('reports_corporate_idx').on(t.corporateClientId, t.createdAt.desc())],
);
