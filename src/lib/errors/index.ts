/**
 * Jerarquía de errores del dominio y contrato de retorno de las Server Actions.
 *
 * Regla: una Server Action **nunca lanza hacia el cliente**. Toda excepción se
 * convierte en `ActionResult`. Un error no controlado devuelve un mensaje
 * genérico con un identificador de incidencia — nunca una traza que revele la
 * estructura interna del sistema.
 */

export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'BUSINESS_RULE'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  /** Código HTTP equivalente, para los Route Handlers. */
  abstract readonly status: number;
  /** `true` si el mensaje puede mostrarse tal cual al usuario. */
  readonly safeMessage: boolean = true;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

/** Los datos de entrada no cumplen el esquema Zod. */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION' as const;
  readonly status = 422;
  /** Un mensaje por campo, para pintarlo junto al control correspondiente. */
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;

  constructor(
    message = 'Los datos enviados no son válidos.',
    fieldErrors: Readonly<Record<string, readonly string[]>> = {},
  ) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

/** No hay sesión, o el JWT no es válido. */
export class UnauthenticatedError extends AppError {
  readonly code = 'UNAUTHENTICATED' as const;
  readonly status = 401;
  constructor(message = 'Debes iniciar sesión para continuar.') {
    super(message);
  }
}

/** Hay sesión, pero le falta el permiso o el alcance corporativo. */
export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN' as const;
  readonly status = 403;
  constructor(message = 'No tienes permiso para realizar esta acción.', permission?: string) {
    super(message, permission === undefined ? undefined : { permission });
  }
}

/**
 * El recurso no existe **o** está fuera del alcance del usuario.
 *
 * Los dos casos devuelven lo mismo a propósito: distinguirlos permitiría
 * averiguar qué órdenes existen en otra empresa probando identificadores.
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND' as const;
  readonly status = 404;
  constructor(message = 'No se encontró el recurso solicitado.') {
    super(message);
  }
}

/** La acción no está declarada para el estado actual de la orden. */
export class InvalidTransitionError extends AppError {
  readonly code = 'INVALID_TRANSITION' as const;
  readonly status = 409;

  constructor(from: string, action: string, message?: string) {
    super(message ?? `La acción «${action}» no está disponible en el estado «${from}».`, {
      from,
      action,
    });
  }
}

/** La transición existe y el permiso también, pero falta un requisito. */
export class BusinessRuleError extends AppError {
  readonly code = 'BUSINESS_RULE' as const;
  readonly status = 409;
  /** Qué guardas fallaron, para poder listarlas en la interfaz. */
  readonly unmet: readonly string[];

  constructor(message: string, unmet: readonly string[] = []) {
    super(message, { unmet });
    this.unmet = unmet;
  }
}

/** Escritura concurrente sobre el mismo registro. */
export class ConflictError extends AppError {
  readonly code = 'CONFLICT' as const;
  readonly status = 409;
  constructor(message = 'Otro usuario modificó este registro. Vuelve a cargarlo.') {
    super(message);
  }
}

/** Demasiados intentos (acceso, portal del cliente, OTP). */
export class RateLimitedError extends AppError {
  readonly code = 'RATE_LIMITED' as const;
  readonly status = 429;
  constructor(
    message = 'Demasiados intentos. Espera unos minutos.',
    readonly retryAfterSeconds = 60,
  ) {
    super(message, { retryAfterSeconds });
  }
}

/** Cualquier fallo no previsto. Su mensaje NO se muestra al usuario. */
export class InternalError extends AppError {
  readonly code = 'INTERNAL' as const;
  readonly status = 500;
  override readonly safeMessage = false;
  constructor(
    message: string,
    readonly incidentId: string,
  ) {
    super(message, { incidentId });
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de retorno
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionFailure {
  readonly ok: false;
  readonly code: ErrorCode;
  readonly message: string;
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  readonly unmet?: readonly string[];
  readonly incidentId?: string;
}

export interface ActionSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function ok<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function fail(error: AppError): ActionFailure {
  const base = {
    ok: false as const,
    code: error.code,
    message: error.safeMessage
      ? error.message
      : 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  };

  if (error instanceof ValidationError) {
    return { ...base, fieldErrors: error.fieldErrors };
  }
  if (error instanceof BusinessRuleError) {
    return { ...base, unmet: error.unmet };
  }
  if (error instanceof InternalError) {
    return { ...base, incidentId: error.incidentId };
  }
  return base;
}
