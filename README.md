# Diana — Plataforma de gestión de taller automotriz

Sistema integral que controla el recorrido completo del vehículo, desde que
entra hasta que el cliente responde la encuesta:

```
recepción → checklist → orden de servicio → diagnóstico → evidencias →
cotización → autorización del cliente por ítem → repuestos → compras →
recepción parcial → reparación con control de tiempos → control de calidad →
lavado / alineamiento → entrega → encuesta de satisfacción → panel → informe PDF
```

> El nombre del sistema es provisional y se cambia desde configuración
> (`app_settings.system_name`), sin tocar código.

## Verlo funcionando

**https://proyecto-diana-blue.vercel.app** — desplegado desde `main`, en la
región `gru1`.

| Ruta | Qué muestra |
| --- | --- |
| [`/tablero`](https://proyecto-diana-blue.vercel.app/tablero) | Control tower: todas las órdenes vivas con avance, hora estimada y semáforo |
| [`/ordenes`](https://proyecto-diana-blue.vercel.app/ordenes) | Listado de órdenes |
| [`/ordenes/os-154`](https://proyecto-diana-blue.vercel.app/ordenes/os-154) | Detalle con el desglose del avance y las acciones que la máquina de estados permite |
| [`/api/health`](https://proyecto-diana-blue.vercel.app/api/health) | Salud del servicio, sin sesión |

> ⚠️ Las pantallas **todavía no leen de la base de datos**: eso llega en la
> Fase 3. Muestran su estructura real con datos marcados como de demostración,
> y el aviso ámbar de la esquina lo dice. Lo que sí es real es el cálculo: el
> avance, la hora estimada y el semáforo salen de las funciones del dominio,
> las mismas que la Fase 2 verificó contra SQL.
>
> No hay `index.html`: en Next.js con App Router las páginas se renderizan en
> el servidor. El archivo que hace ese papel es `src/app/(app)/page.tsx`, que
> redirige a la pantalla de inicio según el rol del usuario.

## Estado

| Fase | Entrega | Estado |
| :-: | --- | --- |
| 1 | Arquitectura, estructura, sistema de diseño y dominio puro | **Completa** |
| 2 | Modelo PostgreSQL: 68 tablas, índices, RLS, funciones, seeds | **Completa** |
| 3 | Autenticación, usuarios, roles y permisos | Siguiente |
| 4–16 | Ver [`docs/15-plan-de-fases.md`](docs/15-plan-de-fases.md) | Pendientes |

Verificado en esta entrega, contra **PostgreSQL 16 real** (no un esquema en
papel):

```
npm run typecheck    sin errores
npm run lint         sin errores ni advertencias
npm run test         97 pruebas de dominio, sin base de datos
npm run build        21 rutas

npm run db:migrate   9 migraciones aplicadas
npm run db:seed:*    catálogo (72 permisos · 80 transiciones · 50 ítems de checklist)
                     + demo (5 órdenes en 5 estados distintos)
npm run db:verify    5 pruebas SQL + paridad TypeScript ↔ SQL
```

Estado de la base después de migrar:

| | |
| --- | --- |
| Tablas | 68, **todas con RLS activa** |
| Políticas | 195, y **ninguna de DELETE** — §60 prohíbe borrar historial |
| Funciones `SECURITY DEFINER` | 24 |
| Índices | 191 |
| Disparadores | 37 |
| Vistas | 3 |

La orden de demostración recorre el flujo completo —recepción, checklist,
diagnóstico, cotización, **aprobación parcial**, compras, **recepción parcial y
total**, cronómetro con pausa, calidad, lavado, entrega y encuesta— usando las
transiciones reales. No inserta estados a mano: cada cambio pasa por el
disparador que valida el grafo, así que si la máquina de estados estuviera mal,
el seed fallaría.

## Documentación

Empieza por [`docs/00-decisiones-y-alcance.md`](docs/00-decisiones-y-alcance.md):
explica por qué esto es **un** sistema y no dos, y detalla las 15
inconsistencias detectadas al modelar, con su resolución.

El índice completo está en [`docs/README.md`](docs/README.md).

## Puesta en marcha

Requisitos: Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local     # completar cuando exista el proyecto Supabase
npm run dev                    # http://localhost:3000
```

Las variables se validan al arrancar, así que un despliegue mal configurado
falla de inmediato y con detalle, en vez de romperse a mitad de una recepción.
`SKIP_ENV_VALIDATION=true` es el escape para el build de CI.

### Con base de datos

Funciona con Supabase **y** con un PostgreSQL corriente: `db/local/` contiene
un sustituto del esquema `auth`, los roles `anon`/`authenticated` y
`auth.uid()`, de modo que las políticas RLS se pueden probar sin depender de la
nube. Ese archivo nunca se aplica en Supabase, donde todo eso ya existe.

```bash
export DATABASE_URL="postgresql://usuario@host:5432/diana"
npm run db:migrate -- --shim   # --shim solo en local
npm run db:seed:catalog
npm run db:seed:demo           # opcional
npm run db:verify
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Dominio puro, **sin base de datos ni servidor** |
| `npm run check` | Tipos + lint + pruebas (lo que exige CI) |
| `npm run db:generate` | Genera el SQL del esquema desde `db/schema` (Drizzle) |
| `npm run db:migrate` | Aplica las migraciones pendientes (`-- --shim` añade el sustituto local de Supabase) |
| `npm run db:seed:catalog` | Permisos, roles, transiciones, checklist, cuestionario, umbrales |
| `npm run db:seed:demo` | Datos de demostración (`is_demo = true`) |
| `npm run db:verify` | Pruebas SQL de aislamiento, reglas de negocio y portal + paridad de fórmulas |

## Principios que el código respeta

1. **La base de datos es la frontera de seguridad.** RLS decide qué filas
   existen para cada usuario. Ocultar componentes en el frontend no es control
   de acceso.
2. **Esto es un workflow, no un conjunto de pantallas.** `service_orders.status`
   es una máquina de estados con transiciones validadas en tres capas:
   interfaz, Server Action y disparador de PostgreSQL.
3. **El dominio es puro.** Las reglas de negocio no importan Next.js ni
   Supabase, y una regla de ESLint lo verifica: el lint falla si alguien lo
   intenta.
4. **Nada de negocio está cableado.** Tipos de servicio, ítems de checklist,
   motivos de pausa, umbrales, roles y permisos son filas administrables. Las
   constantes del código son semillas del seed, y están comentadas como tales.
5. **Lo que ya se reportó no se reescribe.** Una cotización emitida no se edita:
   se emite una versión nueva. Una encuesta enviada no se modifica: se anula.
6. **Un esquema Zod, dos validaciones.** El mismo esquema valida el formulario y
   la Server Action. El servidor decide.
7. **Cuatro estados en cada pantalla**: cargando, vacío, con error y con datos.
8. **Los datos DEMO nunca se mezclan.** Marcados en la fila y desactivables por
   entorno.

## Despliegue

Vercel + Supabase, con las funciones en `gru1` y la base en `sa-east-1` para
mantener juntas función y datos: separarlas añade unos 150 ms a cada consulta
del tablero, que hace varias. El detalle de entornos, migraciones en CI y
operación está en [`docs/01-arquitectura.md`](docs/01-arquitectura.md) §1.7.
