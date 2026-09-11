#!/usr/bin/env bash
#
# Levanta un PostgreSQL local, aplica las migraciones reales y ejecuta las
# pruebas de RLS.
#
# Existe porque «las políticas están escritas» y «las políticas aíslan» son
# afirmaciones distintas, y solo la segunda importa. Sin esto, la única forma
# de comprobarlo es desplegar a Supabase y confiar.
#
#   ./scripts/db-local.sh          aplica migraciones, siembra y prueba
#   ./scripts/db-local.sh --keep   además deja la base en pie para inspeccionarla
#
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/var/lib/postgresql/diana}"
PGPORT="${PGPORT:-5433}"
DB="${DB:-diana}"
export PATH="$PGBIN:$PATH"

# El servidor no puede correr como root, así que el clúster vive bajo el
# usuario `postgres` aunque el script se invoque como cualquiera.
as_postgres() {
  if [ "$(id -u)" = "0" ]; then su postgres -c "PATH=$PGBIN:\$PATH $1"; else eval "$1"; fi
}

psql_db() { psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d "$DB" "$@"; }

echo "▸ Preparando clúster en $PGDATA"
as_postgres "pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true
rm -rf "$PGDATA"
mkdir -p "$PGDATA" /var/run/postgresql
chown -R postgres:postgres "$PGDATA" /var/run/postgresql 2>/dev/null || true
as_postgres "initdb -D $PGDATA -A trust -U postgres" >/dev/null
as_postgres "pg_ctl -D $PGDATA -l /tmp/diana-pg.log -o '-p $PGPORT' start" >/dev/null
sleep 2

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -Atc "create database $DB;" >/dev/null
echo "▸ Sustituto de plataforma (roles, esquema auth, auth.uid)"
psql_db -v ON_ERROR_STOP=1 -q -f db/local/00-supabase-shim.sql

echo "▸ Migraciones"
for f in db/migrations/*.sql; do
  printf '  %-46s' "$(basename "$f")"
  psql_db -v ON_ERROR_STOP=1 -q -f "$f" && echo "ok"
done

echo "▸ Semillas"
export DATABASE_URL="postgresql://postgres@127.0.0.1:$PGPORT/$DB"
export DOCUMENT_HASH_SECRET="${DOCUMENT_HASH_SECRET:-solo-para-pruebas-locales-no-es-un-secreto}"
export ENABLE_DEMO_DATA=true SKIP_ENV_VALIDATION=true
npx tsx scripts/seed-catalog.ts | tail -1
npx tsx scripts/seed-demo.ts | tail -1

echo "▸ Pruebas de RLS y reglas de negocio"
fallos=0
for f in db/tests/*.sql; do
  salida=$(psql_db -q -f "$f" 2>&1 | sed 's/^psql:[^ ]* //')
  echo "$salida" | grep -E '✓ PRUEBA|FALLO|ERROR' | sed 's/^NOTICE:  /  /'
  echo "$salida" | grep -qE 'FALLO|ERROR' && fallos=$((fallos + 1)) || true
done

if [ "${1:-}" != "--keep" ]; then
  as_postgres "pg_ctl -D $PGDATA stop -m fast" >/dev/null
  echo "▸ Clúster detenido. Usa --keep para dejarlo en pie."
else
  echo "▸ Base en pie:  psql -h 127.0.0.1 -p $PGPORT -U postgres -d $DB"
fi

if [ "$fallos" -gt 0 ]; then
  echo "✗ $fallos suite(s) con fallos"
  exit 1
fi
echo "✓ Todas las suites superadas"
