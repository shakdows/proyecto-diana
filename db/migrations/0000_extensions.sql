-- Extensiones requeridas por el esquema.
--
-- `citext`  → códigos, placas y correos insensibles a mayúsculas. Sin esto la
--             búsqueda por placa necesitaría `lower()` sobre la columna, que
--             no usa el índice único.
-- `pg_trgm` → búsqueda por nombre de cliente (§57).
-- `pgcrypto`→ digest/hmac para el hash del documento y de los tokens.
--
-- Idempotentes: en Supabase varias ya vienen instaladas.

create extension if not exists citext;
--> statement-breakpoint
create extension if not exists pg_trgm;
--> statement-breakpoint
create extension if not exists pgcrypto;
