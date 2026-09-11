# 1. Arquitectura propuesta

## 1.1 Forma general

Una **aplicación Next.js monolítica y modular** desplegada en Vercel, con
PostgreSQL gestionado en Supabase como única fuente de verdad.

```
 Recepción (tablet)   Taller (tablet/móvil)   Compras (desktop)   Cliente (móvil, sin sesión)
        │                     │                      │                        │
        └─────────────────────┴──────────┬───────────┴────────────────────────┘
                                    HTTPS │
┌─────────────────────────────────────────▼──────────────────────────────────┐
│ Vercel Edge · middleware: renovación de sesión + primera barrera de ruta    │
├────────────────────────────────────────────────────────────────────────────┤
│ Next.js 16 App Router                                                      │
│   Server Components  → lectura (los filtros se resuelven en el servidor)   │
│   Server Actions     → escritura (Zod → sesión → permiso → alcance → SQL)  │
│   Route Handlers     → PDF, Excel, URLs firmadas, salud, webhooks          │
│   Client Components  → formularios, cronómetro, galería, gráficos          │
├────────────────────────────────────────────────────────────────────────────┤
│ Dominio puro (src/features/*/services) · sin Next, sin Supabase            │
│   máquina de estados · progreso · ETA · semáforo · CSAT/NPS · totales      │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │ PostgREST con el JWT del usuario
┌─────────────────────────────────▼──────────────────────────────────────────┐
│ Supabase                                                                   │
│   PostgreSQL + Row Level Security   ← la frontera de seguridad real        │
│   Funciones SECURITY DEFINER        ← portal del cliente, PII, agregados   │
│   Auth (JWT con rol en app_metadata) · Storage privado · Realtime          │
└────────────────────────────────────────────────────────────────────────────┘
```

No hay backend separado. En Next.js moderno el servidor **ya está ahí**: las
Server Actions y los Route Handlers *son* el backend, en el mismo repositorio y
con los mismos tipos. Un servicio Express aparte añadiría un despliegue, un
contrato HTTP que mantener y tipos duplicados, sin resolver ningún problema que
este sistema tenga.

## 1.2 Las cinco capas

| Capa | Dónde vive | Responsabilidad |
| --- | --- | --- |
| Presentación | `src/app`, `src/components` | Render, los cuatro estados de pantalla, accesibilidad, responsive |
| Módulos de negocio | `src/features/<modulo>` | Acciones, consultas, esquemas y componentes de cada dominio |
| **Dominio puro** | `src/features/<modulo>/services` | Reglas de negocio **sin dependencias**: estados, progreso, ETA, métricas |
| Infraestructura | `src/lib` | Sesión, permisos, clientes Supabase, errores, entorno, storage, formato |
| Datos | `db/`, PostgreSQL | Esquema, migraciones, índices, RLS, funciones de agregación |

La regla que sostiene todo: **`services/` no importa Next.js ni Supabase**.
Decidir si una transición de estado es válida, calcular el porcentaje de avance
de una orden o clasificar un NPS son funciones puras que reciben datos y
devuelven datos. Eso permite probarlas sin levantar la aplicación, reutilizarlas
tal cual en el generador de PDF, y —lo más importante— **portarlas a SQL sin
ambigüedad** cuando el tablero necesita calcular lo mismo sobre miles de filas.

> Prueba de que la regla se cumple: `npm run test` ejecuta la máquina de estados
> y los cálculos de progreso **sin base de datos y sin servidor**.

## 1.3 Las cuatro decisiones que definen el sistema

### (a) La autorización se resuelve en la base de datos

Cada consulta viaja con el JWT del usuario y choca contra las políticas RLS de
PostgreSQL. Si mañana una consulta del tablero olvidara filtrar por empresa,
BBVA seguiría sin poder ver datos de Mitsui: la base de datos lo impide.

Ocultar elementos en el frontend es comodidad visual. El permiso se verifica
**además** en cada Server Action antes de tocar nada. Son tres capas
independientes y la última —la de la base— es la que se puede afirmar sin dudar.

### (b) El sistema es un workflow, no un conjunto de pantallas

La entidad central es `service_orders`, y su columna `status` es una **máquina
de estados con transiciones validadas**, no un campo de texto. Ninguna pantalla
cambia un estado directamente: invoca una transición, que comprueba origen,
permiso y guardas de negocio.

Cada transición escribe una fila en `status_history` mediante **disparador de
base de datos**, no desde la aplicación. Así la línea de tiempo del vehículo
(§34) está completa por construcción: no depende de que alguien se acordara de
registrarla.

### (c) La configuración del negocio vive en tablas

Tipos de servicio, categorías e ítems del checklist, motivos de pausa, umbrales,
reglas de servicios finales, roles y permisos son **filas**. El código lee ese
catálogo. Las constantes que existen en `src/lib/**` son **semillas
reproducibles** del seed inicial y están comentadas como tales.

### (d) Lo que ya se reportó no se reescribe

Una cotización enviada no se edita: se emite una versión nueva (§61). Una
encuesta enviada no se modifica: se anula. Los importes guardan la tasa de
impuesto aplicada en el momento. Un cambio futuro de IGV o de umbrales no puede
alterar retroactivamente un documento que un cliente ya tiene en la mano.

## 1.4 Dónde se calcula cada cosa, y por qué

Es la decisión que más afecta al rendimiento, así que conviene fijarla explícita:

| Cálculo | Dónde | Por qué ahí |
| --- | --- | --- |
| Validez de una transición | TypeScript puro | Se necesita en el servidor **y** para deshabilitar botones en la interfaz |
| Totales de una cotización | TypeScript puro + columna generada | Se muestran mientras el asesor escribe, antes de guardar |
| Progreso y ETA de **una** orden | TypeScript puro | Es la vista de detalle; los datos ya están cargados |
| Progreso y ETA de **todas** las órdenes del tablero | Función SQL | Traer 200 órdenes con sus sesiones de tiempo y sus ítems para calcular en JS sería recorrer decenas de miles de filas en la función serverless |
| KPIs del panel e informes | Función SQL `security invoker` | Una llamada, con RLS todavía aplicada, y **el PDF ejecuta exactamente la misma función que la pantalla**, así no pueden contradecirse |

Las dos implementaciones del progreso —TypeScript y SQL— son el único punto de
duplicación consciente del sistema. Se protege con una prueba que compara ambas
sobre los mismos casos; si divergen, falla.

## 1.5 Tecnologías y justificación

| Capa | Elección | Por qué esta y no otra |
| --- | --- | --- |
| Framework | **Next.js 16 (App Router)** | Los filtros se resuelven en el servidor: el navegador nunca recibe filas que no le corresponden. Runtime nativo de Vercel |
| Lenguaje | **TypeScript estricto** | `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`. El compilador es la primera prueba de regresión |
| Estilos | **Tailwind CSS v4** | Tokens en `@theme`, sin configuración JS. El bundle final solo contiene lo usado |
| Componentes | **Propios sobre CVA** | Sin dependencia que versionar, sin estética de plantilla |
| Base de datos | **PostgreSQL (Supabase)** | El dominio es intensamente relacional y necesita integridad referencial, agregaciones y RLS |
| Esquema | **Drizzle Kit** | Migraciones SQL legibles y revisables en el PR, sin motor binario en serverless |
| Acceso en runtime | **`@supabase/ssr`** | Cada consulta lleva el JWT y queda sujeta a RLS |
| Autenticación | **Supabase Auth** | `auth.uid()` es directamente utilizable dentro de las políticas RLS |
| Validación | **Zod v4** | Un esquema valida el formulario y la Server Action. El servidor decide |
| Archivos | **Supabase Storage privado** | URLs firmadas de caducidad corta, emitidas tras comprobar permiso |
| Gráficos | **Recharts + d3-scale** | La geometría se calcula una vez y se comparte con el PDF |
| PDF | **`@react-pdf/renderer`** | Vectorial, imprime perfecto, sin Chromium ni arranques en frío de 5 s |
| Excel | **ExcelJS** | Único que soporta lo que pide §11: celdas combinadas, anchos, bordes, área de impresión A4 y validación de datos |
| Despliegue | **Vercel `gru1`** | Junto a Supabase en `sa-east-1`. Separarlas añade ~150 ms por consulta |

### Lo que se descartó, y por qué

- **Prisma** — peso de arranque en frío en serverless y su capa propia estorba
  para convivir con RLS.
- **Chromium/Puppeteer para PDF** — ~50 MB de binario, 2–5 s de arranque en frío
  y una fuente constante de fallos en producción (memoria, sandbox, fuentes).
- **Backend separado (NestJS/Express)** — un despliegue más, un contrato más y
  tipos duplicados, sin ganancia para este alcance.
- **SheetJS/`xlsx`** para el Excel imprimible — la edición comunitaria no aplica
  estilos ni área de impresión, que es justo lo que §11 exige.
- **MongoDB** — el dominio es relacional y los informes son agregaciones.
- **Cronómetro en el cliente** — el tiempo lo fija el servidor
  (`repair_time_sessions` con `now()` de PostgreSQL). Si dependiera del reloj de
  la tablet, el indicador de productividad sería manipulable.

## 1.6 Rendimiento (§67)

| Medida | Implementación |
| --- | --- |
| Listas | Paginación por cursor (`keyset`), nunca `OFFSET` sobre tablas grandes |
| Imágenes | Miniatura generada **en el cliente** al subir y almacenada aparte; las listas cargan solo la miniatura |
| Vídeos | Nunca se descargan en una lista: se muestra el póster y se carga bajo demanda |
| Tablero | Una sola función SQL devuelve todas las órdenes con progreso, ETA y semáforo |
| Adjuntos | `loading="lazy"` + `IntersectionObserver` en la galería |
| Índices | Definidos por consulta real, no por intuición — ver `04-modelo-de-datos.md` |
| Caché | `revalidateTag` por orden: al cambiar una orden solo se invalida la suya |

## 1.7 Despliegue y entornos

| Entorno | Rama | Base de datos | Datos |
| --- | --- | --- | --- |
| Desarrollo | local | Supabase `dev` o Postgres en Docker | catálogo + DEMO |
| Preview | cada PR | Supabase `staging` | catálogo + DEMO |
| Producción | `main` | Supabase `prod` | solo datos reales |

`ENABLE_DEMO_DATA=false` en producción, y además cada fila DEMO lleva
`is_demo = true`, de modo que ninguna consulta de producción los mezcla.

Integración continua:

```
PR abierto
 ├── npm run typecheck        (tsc --noEmit)
 ├── npm run lint
 ├── npm run test             (dominio puro, sin base de datos)
 ├── npm run build
 ├── drizzle-kit check        (detecta migraciones divergentes)
 └── Vercel Preview + Supabase staging
merge a main
 ├── migraciones aplicadas por el workflow (no a mano, no desde el panel web)
 └── despliegue de producción
```

Las migraciones se aplican **antes** del despliegue y siempre hacia adelante:
una columna se añade opcional, se rellena, y solo entonces se vuelve
obligatoria. Nunca hay una ventana en la que el código nuevo espere un esquema
que aún no existe.

`SKIP_ENV_VALIDATION=true` existe como escape para que el build de CI no exija
secretos de producción.
