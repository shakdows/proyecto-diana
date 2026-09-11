# 7. Rutas del sistema, Server Actions y endpoints

## 7.1 Rutas de página

`○` público · `◐` sesión · `★` además exige permiso

### Autenticación `○`

| Ruta | Pantalla |
| --- | --- |
| `/ingresar` | Acceso |
| `/recuperar-clave` | Solicitud de recuperación |
| `/restablecer-clave` | Nueva contraseña (token de Supabase) |

### Portal del cliente `○`

| Ruta | Pantalla |
| --- | --- |
| `/autorizacion/[token]` | Cotización, evidencias compartibles, decisión por ítem |
| `/autorizacion/[token]/confirmar` | Resumen, OTP opcional, firma |
| `/autorizacion/[token]/comprobante` | Comprobante de autorización (PDF) |

### Operación `◐`

| Ruta | Permiso | Pantalla |
| --- | --- | --- |
| `/` | — | Redirige al inicio del rol |
| `/tablero` ★ | `dashboard:control_tower` | Control tower: todas las órdenes vivas, progreso, semáforo |
| `/buscar` ★ | `vehicles:search` | Búsqueda universal (§57) |
| `/recepcion` ★ | `receptions:read` | Recepciones del día |
| `/recepcion/nueva` ★ | `orders:create` | Formulario de recepción (tablet) |
| `/recepcion/[id]` ★ | `receptions:read` | Checklist, daños, niveles, firmas |
| `/ordenes` ★ | `orders:read` | Listado con filtros (§58) |
| `/ordenes/[id]` ★ | `orders:read` | Detalle: resumen, progreso, acciones disponibles |
| `/ordenes/[id]/checklist` ★ | `receptions:read` | Checklist de recepción |
| `/ordenes/[id]/diagnostico` ★ | `diagnostics:read` | Ítems y evidencias |
| `/ordenes/[id]/cotizacion` ★ | `quotations:read` | Versiones V1…Vn y totales |
| `/ordenes/[id]/repuestos` ★ | `parts:read` | Cobertura y trazabilidad (§62) |
| `/ordenes/[id]/reparacion` ★ | `repairs:read` | Trabajos, cronómetro, pausas |
| `/ordenes/[id]/calidad` ★ | `quality:read` | Checklist final y hallazgos |
| `/ordenes/[id]/entrega` ★ | `orders:read` | Acta y firmas |
| `/ordenes/[id]/linea-tiempo` ★ | `orders:read` | Trazabilidad completa (§34) |
| `/taller` ★ | `repairs:read` | Bandeja del técnico (§45) |
| `/compras` ★ | `purchases:read` | Tablero de compras (§46) |
| `/compras/solicitudes` · `/cotizaciones` · `/ordenes` · `/recepciones` ★ | `purchases:*` | |
| `/calidad` ★ | `quality:read` | Cola de control de calidad |
| `/lavado` ★ | `washing:execute` | Cola de lavado |
| `/alineamiento` ★ | `alignment:execute` | Cola de alineamiento |
| `/vehiculos` · `/vehiculos/[id]` ★ | `vehicles:read` | Ficha e historial (§49), recomendaciones rechazadas (§50) |
| `/clientes` · `/clientes/[id]` ★ | `customers:read` | Ficha con DNI enmascarado |
| `/notificaciones` ◐ | — | Centro de notificaciones |

### Satisfacción e informes `◐`

| Ruta | Permiso | Pantalla |
| --- | --- | --- |
| `/encuestas` ★ | `surveys:read` | Listado |
| `/encuestas/nueva` ★ | `surveys:create` | Cuestionario (tablet) |
| `/panel` ★ | `dashboard:read` | KPIs, filtros en URL, gráficos |
| `/seguimiento` ★ | `followups:read` | Clientes que requieren seguimiento |
| `/informes` ★ | `reports:read` | Generación e histórico |

### Administración `◐★`

`/admin/usuarios` · `/roles` · `/empresas` · `/sedes` · `/bahias` ·
`/tipos-servicio` · `/checklist` · `/cuestionario` · `/proveedores` ·
`/catalogo-repuestos` · `/motivos-pausa` · `/notificaciones` · `/ajustes` ·
`/auditoria`

> **Los filtros viven en la URL**, siempre. `/panel?desde=2026-08-01&empresa=…`
> es compartible, marcable, y —lo importante— **el PDF se genera con el mismo
> estado que se está viendo**, porque recibe exactamente esos parámetros.

## 7.2 Server Actions por módulo

Firma uniforme: `(input: unknown) => Promise<ActionResult<T>>`.

| Módulo | Acciones |
| --- | --- |
| `orders` | `crearOrden` · `asignarTecnico` · `reasignar` · `aplicarTransicion` · `cancelarOrden` · `cerrarOrden` · `registrarEntrega` |
| `receptions` | `guardarRecepcion` · `guardarChecklist` · `registrarDanio` · `eliminarDanio` · `registrarDocumentos` · `firmarRecepcion` |
| `diagnostics` | `iniciarDiagnostico` · `crearItem` · `actualizarItem` · `eliminarItem` · `completarDiagnostico` |
| `evidence` | `solicitarSubida` · `confirmarSubida` · `marcarVisibleCliente` · `eliminarEvidencia` |
| `quotations` | `crearVersion` · `agregarLinea` · `actualizarLinea` · `eliminarLinea` · `emitirCotizacion` · `anularCotizacion` |
| `authorizations` | `generarEnlace` · `revocarEnlace` · `registrarDecisionInterna` · `confirmarObservacion` |
| `parts` | `crearSolicitud` · `actualizarLinea` · `enviarSolicitud` · `autorizarCotizar` · `solicitarCorreccion` · `rechazarSolicitud` |
| `purchases` | `registrarCotizacionProveedor` · `seleccionarLinea` · `enviarAAutorizacion` · `autorizarCompra` · `rechazarCompra` · `generarOrdenCompra` · `confirmarEnvio` · `registrarRecepcion` |
| `repairs` | `confirmarTiempoEstimado` · `iniciarTrabajo` · `pausar` · `reanudar` · `marcarItemHecho` · `terminarReparacion` · `ampliarCotizacion` |
| `quality` | `iniciarControl` · `guardarItem` · `aprobarControl` · `observarControl` |
| `finishing` | `iniciarLavado` · `terminarLavado` · `iniciarAlineamiento` · `terminarAlineamiento` |
| `surveys` | `registrarEncuesta` · `anularEncuesta` · `asignarSeguimiento` · `cerrarSeguimiento` |
| `notifications` | `marcarLeida` · `marcarTodasLeidas` |
| `admin` | `crearUsuario` · `actualizarUsuario` · `asignarEmpresas` · `actualizarPermisosRol` · CRUD de catálogos · `actualizarAjuste` |

### Acciones del portal (sin sesión)

`portalObtenerCotizacion(token)` · `portalGuardarDecision(token, itemId, decisión)` ·
`portalSolicitarOtp(token)` · `portalConfirmarAutorizacion(token, otp?, firma?)`

Estas **no** pasan por `requireSessionUser()`. Su control es la verificación del
token contra `authorization_links`, y detrás está la función `SECURITY DEFINER`
que limita lo que se puede leer. Ver [`09`](09-autorizacion-del-cliente.md).

## 7.3 Endpoints HTTP

Solo existe endpoint donde una Server Action no sirve: cuando hay que devolver
un **binario** o atender a un **tercero**.

| Método | Ruta | Runtime | Devuelve |
| --- | --- | --- | --- |
| `GET` | `/api/health` | edge | `{ status, version, db, time }` — sin sesión, para monitoreo |
| `POST` | `/api/reports/orden-servicio` | nodejs | PDF de la orden |
| `POST` | `/api/reports/checklist` | nodejs | PDF del checklist de recepción |
| `POST` | `/api/reports/diagnostico` | nodejs | PDF del diagnóstico |
| `POST` | `/api/reports/cotizacion` | nodejs | PDF de la cotización (versión concreta) |
| `POST` | `/api/reports/autorizacion` | nodejs | PDF del comprobante de autorización |
| `POST` | `/api/reports/orden-compra` | nodejs | PDF de la OC |
| `POST` | `/api/reports/acta-entrega` | nodejs | PDF del acta |
| `POST` | `/api/reports/satisfaccion` | nodejs | Informe corporativo de satisfacción |
| `POST` | `/api/reports/repuestos` · `/trabajo` | nodejs | Reportes operativos (PDF o Excel) |
| `GET` | `/api/plantillas/[archivo]` | nodejs | Excel: `checklist-a4` · `carga-masiva` |
| `POST` | `/api/storage/signed-url` | nodejs | URL firmada tras comprobar permiso y alcance |
| `POST` | `/api/webhooks/[proveedor]` | nodejs | Acuses de WhatsApp/email (fase de integración) |

Todos los de `/api/reports/*` declaran `maxDuration = 60` en la propia ruta, validan
sus parámetros **con el mismo esquema Zod de la pantalla**, comprueban permiso y
alcance, y registran la generación en `documents` y `audit_logs`.

## 7.4 `loading.tsx` y el código 404 — trampa verificada

Un `loading.tsx` convierte en **respuesta en streaming** a todo su segmento *y a
sus hijos*. La cabecera HTTP sale con `200` antes de que el componente termine,
y a partir de ese momento `notFound()` ya no puede fijar el `404`: renderiza la
pantalla correcta con el código equivocado.

Comprobado contra el servidor de producción de esta fase:

| Dónde está el `loading.tsx` | `/ordenes/no-existe` |
| --- | :-: |
| `(app)/loading.tsx` | **200** ❌ |
| `ordenes/loading.tsx` | **200** ❌ |
| `ordenes/(lista)/loading.tsx` | **404** ✅ |

**Regla del proyecto:** el estado de carga de un listado va en un **grupo de
rutas** propio, nunca en un segmento que contenga rutas de detalle. Las rutas
que resuelven si un recurso existe —`/ordenes/[id]`, `/vehiculos/[id]`,
`/autorizacion/[token]`— no pueden estar envueltas por un `loading.tsx`; lo que
tarde dentro de ellas va en un `<Suspense>` colocado **después** de la
comprobación de existencia.

Importa más de lo que parece: `/api/health` y el monitoreo externo distinguen
por código de estado, y una orden inexistente que responda 200 es una orden que
los registros dan por buena.

## 7.5 Middleware

`src/middleware.ts` hace exactamente dos cosas, y ninguna es control de acceso
definitivo:

1. **Renueva la sesión** con `@supabase/ssr`, usando `getUser()` y **no**
   `getSession()`: el primero valida el JWT contra el servidor de Auth; el
   segundo se limita a confiar en la cookie.
2. **Primera barrera de ruta**: sin sesión en `(app)` → `/ingresar`; con sesión
   en `(auth)` → inicio del rol.

El permiso fino se comprueba en cada página y cada acción, y RLS lo vuelve a
comprobar en la base. El middleware es comodidad y redirección, no la frontera.

`matcher` excluye `/api/health`, `/autorizacion/*`, estáticos e imágenes.
