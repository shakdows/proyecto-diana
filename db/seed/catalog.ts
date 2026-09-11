/**
 * Catálogo base del sistema.
 *
 * Estos datos son la SEMILLA reproducible; a partir de la primera carga, la
 * fuente de verdad es la tabla y un administrador los cambia sin desplegar.
 */

export interface ChecklistItemSeed {
  readonly code: string;
  readonly label: string;
  readonly inputType: 'estado' | 'estado_cantidad' | 'estado_medida';
  readonly unit?: string;
  readonly required?: boolean;
}

export interface ChecklistCategorySeed {
  readonly code: string;
  readonly name: string;
  readonly items: readonly ChecklistItemSeed[];
}

/** Digitalización de la hoja física de checklist (§6). */
export const CHECKLIST: readonly ChecklistCategorySeed[] = [
  {
    code: 'interiores',
    name: 'Interiores',
    items: [
      { code: 'manijas_interiores', label: 'Manijas interiores', inputType: 'estado' },
      { code: 'tapasoles', label: 'Tapasoles', inputType: 'estado' },
      { code: 'cinturones', label: 'Cinturones de seguridad', inputType: 'estado' },
      { code: 'tapiceria', label: 'Estado de tapicería', inputType: 'estado' },
      { code: 'alogeno_neblinero', label: 'Alógeno / neblinero original', inputType: 'estado' },
      { code: 'radio_control', label: 'Radio y control', inputType: 'estado' },
      { code: 'cenicero', label: 'Cenicero', inputType: 'estado' },
      { code: 'piso_salon', label: 'Piso del salón', inputType: 'estado' },
      { code: 'llave_contacto', label: 'Llave de contacto', inputType: 'estado_cantidad' },
      { code: 'control_alarma', label: 'Control de alarma', inputType: 'estado_cantidad' },
      { code: 'retrovisor_interior', label: 'Retrovisor interior', inputType: 'estado' },
      { code: 'encendedor', label: 'Encendedor', inputType: 'estado' },
      { code: 'luz_salon', label: 'Luz de salón', inputType: 'estado' },
    ],
  },
  {
    code: 'exteriores',
    name: 'Exteriores',
    items: [
      { code: 'antena', label: 'Antena', inputType: 'estado' },
      { code: 'plumillas', label: 'Plumillas', inputType: 'estado' },
      { code: 'espejos_laterales', label: 'Espejos laterales', inputType: 'estado' },
      { code: 'tapacubos', label: 'Tapacubos', inputType: 'estado_cantidad' },
      { code: 'tapa_combustible', label: 'Tapa de combustible', inputType: 'estado' },
      { code: 'seguro_rueda', label: 'Seguro de rueda', inputType: 'estado' },
      { code: 'seguro_vasos', label: 'Seguro de vasos', inputType: 'estado' },
      { code: 'aros', label: 'Aros', inputType: 'estado_cantidad' },
      { code: 'llanta_repuesto', label: 'Llanta de repuesto', inputType: 'estado' },
      { code: 'logos', label: 'Logos', inputType: 'estado' },
      { code: 'emblemas', label: 'Emblemas', inputType: 'estado' },
      { code: 'manijas_exteriores', label: 'Manijas exteriores', inputType: 'estado' },
    ],
  },
  {
    code: 'funciones',
    name: 'Funciones',
    items: [
      { code: 'limpiaparabrisas', label: 'Limpiaparabrisas', inputType: 'estado' },
      { code: 'claxon', label: 'Claxon', inputType: 'estado' },
      { code: 'aire_acondicionado', label: 'Aire acondicionado', inputType: 'estado' },
      { code: 'control_lunas', label: 'Control de lunas', inputType: 'estado' },
      { code: 'espejos_electricos', label: 'Espejos eléctricos', inputType: 'estado' },
      { code: 'pestillos', label: 'Pestillos', inputType: 'estado' },
      { code: 'alarma', label: 'Alarma', inputType: 'estado' },
      { code: 'luces', label: 'Luces', inputType: 'estado' },
    ],
  },
  {
    code: 'otros',
    name: 'Otros elementos',
    items: [
      { code: 'parabrisas_delantero', label: 'Parabrisas delantero', inputType: 'estado' },
      { code: 'parabrisas_posterior', label: 'Parabrisas posterior', inputType: 'estado' },
      { code: 'lunas_laterales', label: 'Lunas laterales', inputType: 'estado' },
      { code: 'estado_llantas', label: 'Estado de llantas', inputType: 'estado' },
      { code: 'botiquin', label: 'Botiquín', inputType: 'estado' },
      { code: 'extintor', label: 'Extintor', inputType: 'estado' },
      { code: 'cable_bateria', label: 'Cable de batería', inputType: 'estado' },
      { code: 'soga_remolque', label: 'Soga de remolque', inputType: 'estado' },
      { code: 'linterna', label: 'Linterna', inputType: 'estado' },
      { code: 'herramientas', label: 'Herramientas', inputType: 'estado_cantidad' },
      { code: 'gata_palanca', label: 'Gata y palanca', inputType: 'estado' },
      { code: 'chaleco', label: 'Chaleco', inputType: 'estado_cantidad' },
      { code: 'triangulos', label: 'Triángulos', inputType: 'estado_cantidad' },
      { code: 'faros', label: 'Faros', inputType: 'estado' },
      { code: 'conos', label: 'Conos', inputType: 'estado_cantidad' },
      { code: 'lamparas', label: 'Lámparas', inputType: 'estado_cantidad' },
      { code: 'estructura_remolque', label: 'Estructura de remolque', inputType: 'estado', required: false },
    ],
  },
];

export interface ServiceTypeSeed {
  readonly code: string;
  readonly name: string;
  readonly finalStages: readonly ('lavado' | 'alineamiento')[];
  readonly children?: readonly { code: string; name: string }[];
}

/** Tipos de servicio y su secuencia final configurable (§13, §37). */
export const SERVICE_TYPES: readonly ServiceTypeSeed[] = [
  { code: 'preventivo', name: 'Mantenimiento preventivo', finalStages: ['lavado'] },
  {
    code: 'correctivo',
    name: 'Mantenimiento correctivo',
    finalStages: ['lavado', 'alineamiento'],
  },
  {
    code: 'planchado_pintura',
    name: 'Planchado y pintura',
    finalStages: ['lavado'],
    children: [
      { code: 'pp_particular', name: 'Planchado y pintura · Particular' },
      { code: 'pp_cortesia', name: 'Planchado y pintura · Cortesía comercial' },
      { code: 'pp_garantia', name: 'Planchado y pintura · Garantía' },
      { code: 'pp_seguro', name: 'Planchado y pintura · Seguro' },
      { code: 'pp_otro', name: 'Planchado y pintura · Otro' },
    ],
  },
];

/** Motivos de pausa (§31). `blocksEta` marca las esperas de terceros. */
export const PAUSE_REASONS = [
  { code: 'espera_autorizacion', label: 'Espera de autorización', productive: false, blocksEta: true },
  { code: 'espera_repuestos', label: 'Espera de repuestos', productive: false, blocksEta: true },
  { code: 'herramienta', label: 'Herramienta', productive: false, blocksEta: false },
  { code: 'soporte_tecnico', label: 'Soporte técnico', productive: true, blocksEta: false },
  { code: 'prueba', label: 'Prueba', productive: true, blocksEta: false },
  { code: 'refrigerio', label: 'Refrigerio', productive: false, blocksEta: false },
  { code: 'incidencia', label: 'Incidencia', productive: false, blocksEta: false },
  { code: 'otro', label: 'Otro', productive: false, blocksEta: false },
] as const;

/** Cuestionario base, versión 1, del documento del cliente. */
export const SURVEY_QUESTIONS = [
  { code: 'p01', text: '¿Qué tan satisfecho quedó con la atención recibida?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p02', text: '¿Cómo calificaría la amabilidad y cordialidad del personal?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p03', text: '¿La explicación del servicio, reparación o producto fue clara?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p04', text: '¿Qué tan satisfecho está con el tiempo de atención y/o entrega?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p05', text: '¿Qué tan satisfecho quedó con la calidad del trabajo realizado?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p06', text: '¿Los costos finales fueron claros y acordes a lo informado?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p07', text: '¿Qué nivel de confianza le genera nuestra empresa?', type: 'scale_1_5', role: 'csat', weight: '1.00' },
  { code: 'p08', text: 'En general, ¿qué tan satisfecho está con su experiencia?', type: 'scale_1_5', role: 'csat', weight: '1.50' },
  { code: 'p09', text: 'Del 0 al 10, ¿qué tan probable es que nos recomiende?', type: 'scale_0_10', role: 'nps', weight: '0.00' },
  { code: 'p10', text: '¿Volvería a utilizar nuestros servicios?', type: 'single_choice', role: 'none', weight: '0.00', options: ['Sí', 'Tal vez', 'No'] },
  { code: 'p11', text: 'Comentario o sugerencia', type: 'free_text', role: 'none', weight: '0.00' },
] as const;

/** Clientes corporativos iniciales. */
export const CORPORATE_CLIENTS = [
  { code: 'MG', name: 'MG', legalName: 'MG Motor Perú S.A.C.', brandColor: '#C8102E' },
  { code: 'MITSUI', name: 'Mitsui', legalName: 'Mitsui Automotriz S.A.', brandColor: '#0A2A5E' },
  { code: 'RELSA', name: 'Relsa', legalName: 'Renting Latinoamérica S.A.', brandColor: '#00843D' },
  { code: 'INVETSA', name: 'Invetsa', legalName: 'Inversiones Vega S.A.', brandColor: '#5B2C6F' },
  { code: 'BBVA', name: 'BBVA', legalName: 'BBVA Perú S.A.', brandColor: '#004481' },
] as const;

/** Ajustes del negocio. Cambiarlos es administración, no despliegue. */
export const APP_SETTINGS: readonly { key: string; value: unknown; description: string }[] = [
  { key: 'system_name', value: 'Diana', description: 'Nombre visible del sistema' },
  { key: 'currency', value: 'PEN', description: 'Moneda de operación' },
  { key: 'tax_rate', value: 0.18, description: 'IGV aplicado por defecto a las líneas nuevas' },
  {
    key: 'progress.stage_weights',
    value: {
      recepcion: 5, diagnostico: 15, autorizacion: 10, repuestos: 15,
      reparacion: 40, calidad: 5, finales: 7, entrega: 3,
    },
    description: 'Pesos de las ocho etapas del porcentaje de avance (§33)',
  },
  { key: 'progress.repair_work_weight', value: 0.7, description: 'Peso del trabajo hecho dentro de la etapa de reparación' },
  { key: 'progress.repair_time_weight', value: 0.3, description: 'Peso del esfuerzo consumido dentro de la etapa de reparación' },
  { key: 'eta.delay_tolerance_minutes', value: 15, description: 'Tolerancia antes de avisar riesgo de retraso (§64)' },
  { key: 'traffic_light.warning_ratio', value: 0.2, description: 'Fracción de tiempo restante que pone el semáforo en ámbar' },
  { key: 'traffic_light.warning_margin_minutes', value: 30, description: 'Margen sobre la hora prometida que pone el semáforo en ámbar' },
  { key: 'authorization.link_ttl_days', value: 7, description: 'Vigencia del enlace del portal del cliente' },
  { key: 'authorization.max_views', value: 50, description: 'Aperturas máximas de un enlace del portal' },
  { key: 'authorization.require_otp', value: false, description: 'Exigir código OTP al confirmar la autorización' },
  {
    key: 'satisfaction.levels',
    value: { insatisfecho: [0, 49], regular: [50, 69], satisfecho: [70, 84], muy_satisfecho: [85, 100] },
    description: 'Cortes del nivel de satisfacción',
  },
  { key: 'satisfaction.followup_scale_threshold', value: 2, description: 'Respuesta ≤ este valor en escala 1–5 marca seguimiento' },
  { key: 'satisfaction.followup_nps_threshold', value: 6, description: 'NPS ≤ este valor marca seguimiento' },
  { key: 'evidence.max_image_mb', value: 10, description: 'Tamaño máximo de una fotografía' },
  { key: 'evidence.max_video_mb', value: 200, description: 'Tamaño máximo de un vídeo' },
];
