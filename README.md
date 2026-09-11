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

## Estado

**FASE 1 completa** — arquitectura, estructura, sistema de diseño y dominio puro.

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin errores ni advertencias |
| `npm run test` | 96 pruebas, 31 suites, 0 fallos |
| `npm run build` | 21 rutas compiladas |
| `/api/health` | responde sin sesión |

Lo que la Fase 1 **no** hace: no crea tablas, no conecta con Supabase y no
autentica. Eso es la Fase 2 y la 3. Las pantallas muestran su estructura real
con datos marcados como de demostración.

El plan completo y el criterio de cierre de cada fase está en
[`docs/15-plan-de-fases.md`](docs/15-plan-de-fases.md).

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

En la Fase 1 no hace falta base de datos: la aplicación arranca y se recorre
entera. Las variables se validan al arrancar, así que un despliegue mal
configurado falla de inmediato y con detalle, en vez de romperse a mitad de una
recepción. `SKIP_ENV_VALIDATION=true` es el escape para el build de CI.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Dominio puro, **sin base de datos ni servidor** |
| `npm run check` | Tipos + lint + pruebas (lo que exige CI) |
| `npm run db:generate` | Genera migraciones SQL desde `db/schema` *(Fase 2)* |
| `npm run db:migrate` | Aplica las migraciones pendientes *(Fase 2)* |
| `npm run db:seed:catalog` | Roles, permisos, checklist, cuestionario, umbrales *(Fase 2)* |
| `npm run db:seed:demo` | Datos de demostración (`is_demo = true`) *(Fase 2)* |

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
