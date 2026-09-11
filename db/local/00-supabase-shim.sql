-- ─────────────────────────────────────────────────────────────────────────────
-- Sustituto local de la plataforma Supabase.
--
-- Este archivo NO es una migración y NUNCA se aplica en Supabase: allí todo
-- esto ya existe. Sirve para poder aplicar las migraciones reales y probar las
-- políticas RLS contra un PostgreSQL corriente, sin depender de la nube.
--
-- Reproduce exactamente lo que la aplicación asume de la plataforma:
--   · los roles `anon`, `authenticated` y `service_role`
--   · el esquema `auth` y la tabla `auth.users`
--   · `auth.uid()` leyendo el `sub` del JWT desde `request.jwt.claims`
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  -- Solo el servidor puede escribirlo. Aquí viaja el rol.
  raw_app_meta_data   jsonb not null default '{}'::jsonb,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Misma implementación que Supabase: lee el `sub` de los claims del JWT que
-- PostgREST fija por petición.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'anon'
  )
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Concesiones por defecto de la plataforma.
--
-- Supabase concede automáticamente TODO sobre los objetos nuevos de `public` a
-- `anon` y `authenticated`. Sin reproducirlo aquí, una vista creada después
-- del `revoke` de 0005 queda abierta a `anon` en producción y verde en local:
-- es exactamente lo que pasó con `v_required_parts` y `v_parts_coverage`.
-- ─────────────────────────────────────────────────────────────────────────────
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
