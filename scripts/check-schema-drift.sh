#!/usr/bin/env bash
# Verifies the fresh-project bootstrap (000_fresh_project_setup.sql) builds
# the same database as the incremental path (schema.sql + migrations
# 001..N), so the two can't silently drift apart.
#
# Needs a Postgres server reachable through the standard PG* env vars
# (PGHOST, PGPORT, PGUSER) with permission to create databases.
set -euo pipefail

cd "$(dirname "$0")/../lib/supabase"

# Minimal stand-ins for what Supabase provides: the API roles and auth.uid()
STUBS="
DO \$\$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
DO \$\$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
"

build() {
  local db=$1; shift
  dropdb --if-exists "$db"
  createdb "$db"
  psql -q -v ON_ERROR_STOP=1 -d "$db" -c "$STUBS" >/dev/null
  for f in "$@"; do
    psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f" >/dev/null
  done
  # Order-insensitive snapshot from the catalogs: columns added by a later
  # ALTER TABLE land at the end of the table, which is not a real difference
  psql -q -At -v ON_ERROR_STOP=1 -d "$db" -f - > "$db.dump" <<'SQL'
SELECT 'column ' || table_name || '.' || column_name || ' ' || data_type
       || ' null=' || is_nullable || ' default=' || coalesce(column_default, '-')
  FROM information_schema.columns WHERE table_schema = 'public'
UNION ALL
SELECT 'constraint ' || conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid)
  FROM pg_constraint WHERE connamespace = 'public'::regnamespace
UNION ALL
SELECT 'index ' || indexdef FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'rls ' || relname || ' ' || relrowsecurity
  FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
UNION ALL
SELECT 'policy ' || tablename || ' "' || policyname || '" ' || cmd || ' to=' || roles::text
       || ' using=' || coalesce(qual, '-') || ' check=' || coalesce(with_check, '-')
  FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'function ' || pg_get_functiondef(p.oid)
  FROM pg_proc p WHERE pronamespace = 'public'::regnamespace
UNION ALL
SELECT 'grant ' || routine_name || ' ' || grantee || ' ' || privilege_type
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
UNION ALL
SELECT 'trigger ' || pg_get_triggerdef(t.oid)
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal
ORDER BY 1;
SQL
}

trap 'rm -f schema_fresh.dump schema_incremental.dump' EXIT

build schema_fresh migrations/000_fresh_project_setup.sql
build schema_incremental schema.sql $(ls migrations/[0-9][0-9][0-9]_*.sql | grep -v '/000_')

if diff -u schema_incremental.dump schema_fresh.dump; then
  echo "Schema OK: 000_fresh_project_setup.sql matches schema.sql + migrations"
else
  echo "Schema drift: 000_fresh_project_setup.sql differs from schema.sql + migrations (diff above: - incremental, + fresh)" >&2
  exit 1
fi
