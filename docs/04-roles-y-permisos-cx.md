# 8. Roles y matriz de permisos

## 8.1 Los cinco perfiles

| Rol                     | Clave              | Para quién                                                    |
| ----------------------- | ------------------ | ------------------------------------------------------------- |
| **Super administrador** | `super_admin`      | Dueño técnico del sistema. Único que gestiona roles y permisos. |
| **Administrador**       | `admin`            | Responsable de operación: datos maestros, usuarios, informes.   |
| **Encuestador**         | `surveyor`         | Personal de taller. Busca la placa y registra la encuesta.      |
| **Analista**            | `analyst`          | Lee todo, no modifica nada. Genera informes.                    |
| **Cliente corporativo** | `corporate_client` | Externo. Ve exclusivamente su propia organización.              |

## 8.2 Matriz

`●` permitido · `○` denegado · `◐` limitado al alcance de su empresa

| Permiso                         | Super | Admin | Encuestador | Analista | Cliente corp. |
| ------------------------------- | :---: | :---: | :---------: | :------: | :-----------: |
| `scope:all_corporate_clients`   |   ●   |   ●   |      ●      |    ●     |       ○       |
| `vehicles:search`               |   ●   |   ●   |      ●      |    ●     |       ○       |
| `vehicles:read`                 |   ●   |   ●   |      ●      |    ●     |       ○       |
| `vehicles:write`                |   ●   |   ●   |      ●      |    ○     |       ○       |
| `customers:read`                |   ●   |   ●   |      ●      |    ●     |       ○       |
| `customers:write`               |   ●   |   ●   |      ○      |    ○     |       ○       |
| `customers:read_pii`            |   ●   |   ●   |      ○      |    ○     |       ○       |
| `surveys:create`                |   ●   |   ●   |      ●      |    ○     |       ○       |
| `surveys:read`                  |   ●   |   ●   |      ●      |    ●     |       ◐       |
| `surveys:read_comments`         |   ●   |   ●   |      ○      |    ●     |       ◐       |
| `surveys:void`                  |   ●   |   ●   |      ○      |    ○     |       ○       |
| `dashboard:read`                |   ●   |   ●   |      ○      |    ●     |       ◐       |
| `dashboard:read_all_clients`    |   ●   |   ●   |      ○      |    ●     |       ○       |
| `followups:read`                |   ●   |   ●   |      ○      |    ●     |       ◐       |
| `followups:write`               |   ●   |   ●   |      ○      |    ○     |       ○       |
| `reports:generate`              |   ●   |   ●   |      ○      |    ●     |       ◐       |
| `reports:read`                  |   ●   |   ●   |      ○      |    ●     |       ◐       |
| `corporate_clients:manage`      |   ●   |   ●   |      ○      |    ○     |       ○       |
| `branches:manage`               |   ●   |   ●   |      ○      |    ○     |       ○       |
| `advisors:manage`               |   ●   |   ●   |      ○      |    ○     |       ○       |
| `questionnaires:manage`         |   ●   |   ●   |      ○      |    ○     |       ○       |
| `users:manage`                  |   ●   |   ●   |      ○      |    ○     |       ○       |
| `roles:manage`                  |   ●   |   ○   |      ○      |    ○     |       ○       |
| `settings:manage`               |   ●   |   ●   |      ○      |    ○     |       ○       |
| `audit:read`                    |   ●   |   ●   |      ○      |    ○     |       ○       |

Esta matriz vive en `src/lib/auth/roles.ts` **como semilla** y se carga en
`role_permissions` al inicializar la base. A partir de ahí, la fuente de verdad
es la tabla: un administrador puede ajustar permisos sin desplegar código.

### El permiso de alcance, y por qué está separado

`scope:all_corporate_clients` decide sobre **qué empresas** trabaja un usuario;
`dashboard:read_all_clients` decide si puede abrir la **comparativa entre
empresas**. Son cosas distintas y mezclarlas rompe el sistema: un encuestador
atiende vehículos de cualquier cliente corporativo, pero no tiene por qué ver un
ranking entre ellos.

Al probar las políticas contra una base real, esa confusión dejaba al
encuestador sin ver un solo vehículo y sin poder registrar encuestas. Está
corregido en la migración `0005_scope_permission`.

## 8.3 El caso del cliente corporativo

Es el requisito con más riesgo del sistema, y por eso se defiende en tres capas
independientes:

1. **Menú** — no ve enlaces a administración ni a comparativas entre empresas.
   *Comodidad, no seguridad.*
2. **Server Action** — `assertPermission` rechaza la operación, y el alcance se
   restringe con `resolveCorporateScope` a los `corporate_client_ids` de su
   sesión. *Primera defensa real.*
3. **RLS en PostgreSQL** — la política solo devuelve filas cuya
   `corporate_client_id` figure en `user_corporate_clients` para ese `auth.uid()`.
   *Defensa definitiva: aunque fallaran las dos anteriores, la base de datos no
   entrega la fila.*

El caso que hay que poder afirmar sin dudar: si un usuario de BBVA edita la URL a
`/panel?empresa=<uuid-de-mitsui>`, la consulta devuelve **cero filas**. No un
error revelador, no datos ajenos: cero.

Esto no es una intención de diseño: está verificado contra PostgreSQL en
`db/tests/01-aislamiento-corporativo.sql`, con 136 encuestas de cinco empresas
cargadas. El usuario de BBVA ve 30 —las suyas— y cero de Mitsui.

## 8.4 Cómo se decide el rol

El rol viaja en `app_metadata` del JWT, que **solo el servidor puede escribir**
(a diferencia de `user_metadata`, modificable por el propio usuario). Al
autenticarse se leen `profiles.role_id` y `user_corporate_clients`, y los
permisos efectivos se resuelven desde `role_permissions`.

Un usuario desactivado (`profiles.is_active = false`) pierde el acceso en la
siguiente renovación de token, sin esperar a que caduque la sesión.
