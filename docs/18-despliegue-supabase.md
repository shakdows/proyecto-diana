# Despliegue en Supabase

Estado: **el esquema está aplicado y verificado en el proyecto
`proyecto-diana` (región `sa-east-1`)**. Falta un paso manual, explicado abajo.

## Lo que ya está en la nube

| | |
| --- | --- |
| Tablas | 68, **todas con RLS activa** |
| Políticas | 195 |
| Funciones | 109 |
| Disparadores | 41 |
| Índices | 187 |
| Claves foráneas | 126 |
| Tablas o vistas legibles por `anon` | **0** |
| Funciones del esquema ejecutables por `anon` | **1** (`portal_get_quotation`) |

## Dos fallos que solo aparecieron al desplegar

Las cinco suites de `npm run db:local` daban verde y aun así la primera
aplicación contra Supabase falló. Las dos causas eran diferencias reales entre
un PostgreSQL corriente y la plataforma:

**1 · `pgcrypto` no vive en `public`.** En Supabase las extensiones se instalan
en el esquema `extensions`, así que `digest()` no estaba en el `search_path` de
`portal_resolve_link` y la función no se pudo crear. En local pasaba porque
`create extension` lo había puesto en `public`. Corregido con
`set search_path = public, extensions, pg_temp`: un esquema que no existe se
ignora en silencio, de modo que la misma migración sirve en los dos sitios.

**2 · Supabase concede TODO sobre los objetos nuevos de `public` a `anon`.**
`v_required_parts` y `v_parts_coverage` se crean en la migración 0006, después
del `revoke ... from anon` de la 0005, y heredaban esa concesión: el visitante
anónimo tenía SELECT —y nominalmente INSERT y UPDATE— sobre las dos vistas.
No filtraban filas, porque son `security_invoker` y `anon` no tiene políticas
sobre las tablas base; pero apoyarse en la segunda línea cuando la primera
debería existir es justo lo que no se hace con una frontera de seguridad.

Las dos correcciones están en las migraciones del repositorio, no solo en la
nube. Y para que no vuelva a pasar:

- `db/local/00-supabase-shim.sql` ahora **reproduce las concesiones por
  defecto de la plataforma**, de modo que el fallo se manifiesta en local.
- `db/tests/03-portal-anonimo.sql` incorpora la prueba 3.5, que falla si `anon`
  conserva permiso de objeto sobre cualquier tabla o vista.

## El paso que falta: sembrar el catálogo

Sin él no hay roles, permisos ni transiciones, y por tanto RLS no deja hacer
nada. **No se ha sembrado desde aquí a propósito**: este entorno no alcanza el
puerto 5432 de Supabase, y la alternativa —pegar un volcado de 80 KB— crearía
una copia congelada de algo que el script deriva del propio código. Un volcado
se desincroniza en cuanto cambia la matriz de permisos; el script, no.

Desde tu máquina:

```bash
# 1 · La contraseña de la base está en:
#     Supabase → proyecto-diana → Project Settings → Database → Connection string
#     (o «Reset database password» si no la tienes)

cat >> .env.local <<'ENV'
NEXT_PUBLIC_SUPABASE_URL="https://yhicfotjqucrgmzgppox.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_qOZA6pYeiFa3hmCLdXTKmQ_hb6aa760"
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@db.yhicfotjqucrgmzgppox.supabase.co:5432/postgres"
DOCUMENT_HASH_SECRET="$(openssl rand -base64 48)"
ENV

npm run db:seed:catalog     # permisos, roles, transiciones, checklist, cuestionario
npm run db:seed:demo        # opcional: 5 órdenes de ejemplo
```

`DOCUMENT_HASH_SECRET` **debe ser el mismo** en todos los entornos que
compartan base: es la clave HMAC con la que se deriva el hash de búsqueda del
documento. Si cambia, los clientes ya guardados dejan de encontrarse por DNI.

## Lo que NO está hecho

- **La aplicación sigue sin leer de esta base.** Las pantallas usan datos en
  memoria. Conectar las consultas es el trabajo siguiente.
- **No hay autenticación real.** La sesión es una cookie de rol sin
  contraseña, y por tanto `auth.uid()` es nulo: hoy RLS bloquearía TODO. La
  cookie sirve para demostrar la interfaz, no para entrar al sistema.
- La clave `service_role` no se ha usado ni guardado en ningún sitio desde
  aquí. Consíguela tú desde el panel cuando la necesites, y no la pongas en
  ninguna variable `NEXT_PUBLIC_`.
