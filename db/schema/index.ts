/**
 * Esquema completo.
 *
 * Drizzle es la fuente de verdad del ESQUEMA y genera las migraciones SQL que
 * se revisan en el pull request. NO es la capa de acceso en runtime: la
 * aplicación consulta por `@supabase/ssr`, para que cada consulta viaje con el
 * JWT del usuario y quede sujeta a RLS.
 *
 * Lo que Drizzle no puede expresar —funciones SECURITY DEFINER, políticas RLS,
 * disparadores, secuencias de código legible, vistas— vive en migraciones
 * escritas a mano, de la 0001 en adelante.
 */
export * from './_shared';
export * from './enums';
export * from './core';
export * from './people';
export * from './orders';
export * from './receptions';
export * from './diagnostics';
export * from './quotations';
export * from './parts';
export * from './repairs';
export * from './notifications';
export * from './surveys';
