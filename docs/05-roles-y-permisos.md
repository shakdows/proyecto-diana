# 5. Matriz de roles y permisos (RBAC)

## 5.1 Los once perfiles

| Rol | Clave | Para quién |
| --- | --- | --- |
| Super administrador | `super_admin` | Dueño técnico. Único que gestiona roles y permisos |
| Administrador | `admin` | Responsable de operación: usuarios, catálogos, configuración, informes |
| Asesor de servicio | `asesor` | Recibe el vehículo, cotiza, comunica con el cliente, entrega |
| Técnico / mecánico | `tecnico` | Diagnostica, repara, registra tiempos y evidencias |
| Planchado y pintura | `planchado_pintura` | Técnico especializado en carrocería |
| Compras | `compras` | Cotiza a proveedores, emite órdenes de compra, recibe repuestos |
| Control de calidad | `calidad` | Verifica antes de liberar el vehículo |
| Lavado | `lavado` | Registra inicio y fin del lavado |
| Alineamiento | `alineamiento` | Registra inicio y fin del alineamiento |
| Analista | `analista` | Lee todo, no modifica nada. Indicadores e informes |
| Cliente corporativo | `cliente_corporativo` | Externo. Ve exclusivamente su propia organización |

> **El cliente final no es un rol.** No tiene usuario (§3): entra por enlace
> firmado al portal de autorización, que no usa RBAC sino verificación de token.
> Ver [`09-autorizacion-del-cliente.md`](09-autorizacion-del-cliente.md).

## 5.2 Matriz

`●` permitido · `○` denegado · `◐` limitado al alcance de su empresa · `◑` limitado a sus propias órdenes

| Permiso | SA | AD | ASE | TEC | P&P | COM | CAL | LAV | ALI | ANA | CLI |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **Alcance** |
| `scope:all_corporate_clients` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ○ |
| `scope:all_branches` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ● | ○ |
| **Órdenes de servicio** |
| `orders:read` | ● | ● | ● | ◑ | ◑ | ● | ● | ◑ | ◑ | ● | ◐ |
| `orders:create` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `orders:assign` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `orders:advance` | ● | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ |
| `orders:deliver` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `orders:close` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `orders:close_empty` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `orders:cancel` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Recepción y checklist** |
| `receptions:read` | ● | ● | ● | ● | ● | ○ | ● | ○ | ○ | ● | ◐ |
| `receptions:write` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Diagnóstico** |
| `diagnostics:read` | ● | ● | ● | ● | ● | ● | ● | ○ | ○ | ● | ◐ |
| `diagnostics:write` | ● | ● | ○ | ◑ | ◑ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Evidencias** |
| `evidence:read` | ● | ● | ● | ● | ● | ● | ● | ○ | ○ | ● | ◐ |
| `evidence:upload` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ○ | ○ |
| `evidence:delete` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Cotización** |
| `quotations:read` | ● | ● | ● | ● | ● | ● | ● | ○ | ○ | ● | ◐ |
| `quotations:read_cost` | ● | ● | ● | ○ | ○ | ● | ○ | ○ | ○ | ● | ○ |
| `quotations:write` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `quotations:send` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `quotations:void` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Autorización del cliente** |
| `authorizations:read` | ● | ● | ● | ● | ● | ○ | ○ | ○ | ○ | ● | ◐ |
| `authorizations:register` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `authorizations:revoke_link` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Repuestos** |
| `parts:read` | ● | ● | ● | ● | ● | ● | ○ | ○ | ○ | ● | ○ |
| `parts:request` | ● | ● | ○ | ◑ | ◑ | ○ | ○ | ○ | ○ | ○ | ○ |
| `parts:authorize_quote` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Compras** |
| `purchases:read` | ● | ● | ● | ● | ● | ● | ○ | ○ | ○ | ● | ○ |
| `purchases:quote` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| `purchases:authorize` | ● | ● | ● | ○ | ○ | **○** | ○ | ○ | ○ | ○ | ○ |
| `purchases:write` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| `purchases:receive` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| `purchases:override_scope` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Reparación** |
| `repairs:read` | ● | ● | ● | ● | ● | ○ | ● | ○ | ○ | ● | ◐ |
| `repairs:execute` | ● | ● | ○ | ◑ | ◑ | ○ | ○ | ○ | ○ | ○ | ○ |
| `repairs:reassign` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Calidad y servicios finales** |
| `quality:read` | ● | ● | ● | ● | ● | ○ | ● | ○ | ○ | ● | ◐ |
| `quality:approve` | ● | ● | ○ | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ |
| `washing:execute` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ | ○ |
| `alignment:execute` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ |
| **Personas y vehículos** |
| `customers:read` | ● | ● | ● | ● | ● | ○ | ● | ○ | ○ | ● | ◐ |
| `customers:write` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `customers:read_pii` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `vehicles:search` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ◐ |
| `vehicles:read` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ◐ |
| `vehicles:write` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Tableros y analítica** |
| `dashboard:read` | ● | ● | ● | ◑ | ◑ | ● | ● | ◑ | ◑ | ● | ◐ |
| `dashboard:control_tower` | ● | ● | ● | ○ | ○ | ● | ● | ○ | ○ | ● | ○ |
| `dashboard:read_all_clients` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| `analytics:read` | ● | ● | ● | ○ | ○ | ● | ○ | ○ | ○ | ● | ◐ |
| `analytics:technician` | ● | ● | ● | ◑ | ◑ | ○ | ○ | ○ | ○ | ● | ○ |
| **Satisfacción** |
| `surveys:create` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `surveys:read` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ● | ◐ |
| `surveys:read_comments` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ● | ◐ |
| `surveys:void` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `followups:read` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ● | ◐ |
| `followups:write` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **Informes** |
| `reports:generate` | ● | ● | ● | ○ | ○ | ● | ○ | ○ | ○ | ● | ◐ |
| `reports:read` | ● | ● | ● | ○ | ○ | ● | ○ | ○ | ○ | ● | ◐ |
| **Administración** |
| `corporate_clients:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `branches:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `advisors:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `suppliers:manage` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| `parts_catalog:manage` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| `checklists:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `questionnaires:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `notifications:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `users:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `roles:manage` | ● | **○** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `settings:manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| `audit:read` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

Esta matriz vive en `src/lib/auth/permissions.ts` **como semilla** y se carga en
`role_permissions` al inicializar la base. A partir de ahí la fuente de verdad
es la tabla: un administrador ajusta permisos sin desplegar código.

## 5.3 Las cuatro decisiones no obvias de esta matriz

### `scope:all_corporate_clients` va separado de `dashboard:read_all_clients`

Son cosas distintas y mezclarlas rompe el sistema:

- **`scope:all_corporate_clients`** decide **sobre qué empresas** trabaja un
  usuario. Un técnico repara vehículos de cualquier cliente corporativo.
- **`dashboard:read_all_clients`** decide si puede abrir la **comparativa entre
  empresas**. El técnico no tiene por qué ver un ranking entre clientes.

Atarlos deja al técnico sin ver un solo vehículo. Es una trampa ya conocida y
está resuelta aquí desde el diseño.

### Compras NO puede autorizar su propia compra

`compras` tiene `purchases:quote`, `:write` y `:receive`, pero **no**
`purchases:authorize`. Quien cotiza y quien recibe la mercadería no es quien
aprueba el gasto: es separación de funciones, y es la única defensa real contra
el fraude de compras en un taller. Autoriza el asesor (dueño de la orden) o un
administrador.

### `quotations:read_cost` existe para cumplir §65

§65 prohíbe mostrar al cliente costos internos, proveedores y márgenes. La misma
frontera aplica hacia dentro: el técnico ve la cotización —necesita saber qué
está aprobado— pero no el costo de compra ni el margen. El permiso separa *ver
la cotización* de *ver cuánto ganamos con ella*.

### El cliente corporativo se defiende en tres capas

1. **Menú** — no ve enlaces a administración ni a comparativas. *Comodidad, no
   seguridad.*
2. **Server Action** — `assertPermission` rechaza, y `resolveCorporateScope`
   restringe a sus `corporate_client_id`. *Primera defensa real.*
3. **RLS en PostgreSQL** — la política solo devuelve filas cuya
   `corporate_client_id` figure en `user_corporate_clients` para ese
   `auth.uid()`. *Defensa definitiva.*

## 5.4 Cómo se decide el rol

El rol viaja en `app_metadata` del JWT, que **solo el servidor puede escribir**
—a diferencia de `user_metadata`, que el propio usuario puede modificar—. Al
autenticarse se leen `profiles.role_id` y `user_corporate_clients`, y los
permisos efectivos se resuelven desde `role_permissions`.

Un usuario desactivado (`profiles.is_active = false`) pierde el acceso en la
siguiente renovación de token, sin esperar a que caduque la sesión.
