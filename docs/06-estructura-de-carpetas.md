# 6. Estructura de carpetas

## 6.1 Raíz

```
proyecto-diana/
├── db/
│   ├── schema/          Drizzle: definición del esquema (fuente de verdad)
│   ├── migrations/      SQL versionado + políticas RLS + funciones
│   ├── seed/            Catálogos reproducibles (roles, permisos, checklist…)
│   ├── tests/           Pruebas SQL de aislamiento y permisos
│   └── client.ts        Conexión `postgres` — solo para scripts, nunca runtime
├── docs/                Esta documentación
├── public/
│   └── plantillas/      Excel generados (checklist A4 y carga masiva)
├── scripts/             tsx: seeds, generación de plantillas, utilidades
└── src/                 La aplicación
```

## 6.2 `src/`

```
src/
├── app/
│   ├── (auth)/                    ingresar · recuperar-clave · restablecer-clave
│   ├── (app)/                     todo lo que exige sesión
│   │   ├── tablero/               control tower
│   │   ├── recepcion/             [id] · nueva
│   │   ├── ordenes/               [id]/{checklist,diagnostico,cotizacion,
│   │   │                                 repuestos,reparacion,calidad,
│   │   │                                 entrega,linea-tiempo}
│   │   ├── taller/                bandeja del técnico
│   │   ├── compras/               solicitudes · cotizaciones · ordenes · recepciones
│   │   ├── calidad/ lavado/ alineamiento/
│   │   ├── vehiculos/ clientes/ buscar/
│   │   ├── encuestas/ panel/ seguimiento/ informes/
│   │   ├── notificaciones/
│   │   └── admin/                 usuarios · roles · empresas · sedes · catalogos ·
│   │                              checklist · cuestionario · proveedores · ajustes · auditoria
│   ├── (public)/
│   │   └── autorizacion/[token]/  portal del cliente, sin sesión
│   └── api/
│       ├── health/                monitoreo externo
│       ├── reports/[tipo]/        PDF (runtime nodejs, maxDuration 60)
│       ├── plantillas/[archivo]/  descarga de Excel
│       └── storage/signed-url/    URL firmada tras comprobar permiso
│
├── components/
│   ├── ui/                        primitivos: Button, Card, Badge, Table, Input…
│   ├── layout/                    AppShell, Sidebar, Topbar, PageHeader
│   ├── feedback/                  Loading, Empty, ErrorState, Skeleton
│   └── data/                      DataTable, Pagination, FilterBar, Timeline
│
├── features/<modulo>/
│   ├── actions/                   Server Actions  → escritura
│   ├── queries/                   Server-only     → lectura
│   ├── schemas/                   Zod             → cliente + servidor
│   ├── services/                  ★ dominio PURO, sin Next ni Supabase
│   ├── components/                pantallas del módulo
│   └── types.ts
│
├── hooks/                         useDebounce, useCountdown, useSignaturePad…
├── lib/
│   ├── auth/                      sesión, permisos, alcance corporativo
│   ├── supabase/                  clientes server / browser / middleware / admin
│   ├── errors/                    jerarquía de errores + ActionResult
│   ├── storage/                   rutas, URLs firmadas, validación de archivos
│   ├── audit/                     escritura en audit_logs
│   ├── notifications/             despacho + adaptadores de canal
│   ├── env.ts                     variables públicas (seguro en cliente)
│   ├── env.server.ts              variables del servidor, perezosas + server-only
│   └── utils/                     fechas, moneda, placa, formato
├── types/
├── instrumentation.ts             valida el entorno al arrancar el servidor
└── middleware.ts                  renovación de sesión + barrera de ruta
```

## 6.3 Los módulos de `features/`

| Módulo | Responsabilidad |
| --- | --- |
| `orders` | Orden de servicio, **máquina de estados**, línea de tiempo, asignación |
| `receptions` | Recepción, checklist, daños, niveles, documentos, firmas |
| `diagnostics` | Diagnóstico e ítems |
| `evidence` | Subida, miniaturas, galería, URLs firmadas |
| `quotations` | Cotización versionada, líneas, totales |
| `authorizations` | Enlaces firmados, portal, decisión por ítem, comprobante |
| `parts` | Catálogo, solicitudes, cobertura de repuestos |
| `purchases` | Proveedores, cotizaciones, órdenes de compra, recepciones |
| `repairs` | Trabajos, cronómetro, pausas, **progreso y ETA** |
| `quality` | Control de calidad y hallazgos |
| `finishing` | Lavado y alineamiento |
| `surveys` | Encuesta, **CSAT/NPS/índice**, seguimiento |
| `analytics` | KPIs, tableros, geometría de gráficos compartida con el PDF |
| `reports` | PDF y Excel |
| `notifications` | Centro de notificaciones y reglas |
| `admin` | Usuarios, roles, catálogos, ajustes, auditoría |

## 6.4 Cómo se corresponde con la separación pedida en §69

§69 pide separar `services` y `repositories`. Esta estructura lo hace, con otros
nombres y con una frontera más estricta:

| §69 pide | Aquí es | Regla |
| --- | --- | --- |
| `services` | `features/*/services/` | **Dominio puro.** Prohibido importar Next.js, Supabase o `server-only` |
| `repositories` | `features/*/queries/` (lectura) y `features/*/actions/` (escritura) | Único lugar donde se toca la base de datos |
| `schemas` | `features/*/schemas/` | Zod, compartido cliente-servidor |
| `api` | `src/app/api/` | Solo lo que no puede ser Server Action: PDF, Excel, webhooks, salud |
| `storage`, `notifications`, `auth`, `database` | `src/lib/*` | Infraestructura |

La frontera de `services/` **se verifica**: una regla de ESLint prohíbe importar
`next`, `@supabase/*` y `server-only` desde esa carpeta. No es una convención
que se respete por disciplina; el lint falla.

## 6.5 Anatomía de una Server Action

Todas siguen la misma secuencia, sin excepción:

```ts
export async function completarDiagnostico(input: unknown): Promise<ActionResult<Orden>> {
  return run(async () => {
    const data  = completarDiagnosticoSchema.parse(input);   // 1 · Zod        → ValidationError
    const user  = await requireSessionUser();                // 2 · sesión     → UnauthenticatedError
    assertPermission(user, 'diagnostics:write');             // 3 · permiso    → ForbiddenError
    const scope = await resolveCorporateScope(user);         // 4 · alcance    (RLS lo reaplica)

    const orden = await applyTransition({                    // 5 · ejecutar
      orderId: data.orderId, action: 'completar_diagnostico', actor: user, scope,
    });

    await audit({ actor: user, entity: 'service_orders',     // 6 · auditoría
                  entityId: orden.id, action: 'completar_diagnostico',
                  before: { status: orden.previousStatus }, after: { status: orden.status } });

    revalidateTag(`orden:${orden.id}`);                      // 7 · invalidar
    return orden;                                            // 8 · ActionResult<T>
  });
}
```

`run()` captura toda excepción y la convierte en `ActionResult<T>`:
**una Server Action nunca lanza hacia el cliente**. Un error no controlado en el
servidor se registra completo en el log y hacia fuera devuelve un mensaje
genérico con un identificador de incidencia — nunca una traza que revele la
estructura interna.

## 6.6 Convenciones

- **Nada de archivos gigantes.** Un componente que pase de ~200 líneas se parte.
- **Rutas y textos de interfaz en español**; identificadores de código en inglés.
  La frontera es exacta: `status: 'EN_REPARACION'` es dato, `"En reparación"` es
  presentación, y viven en sitios distintos.
- **Cuatro estados en cada pantalla**: cargando, vacío, con error, con datos.
- `any` es error de lint, no advertencia.
