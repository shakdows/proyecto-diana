# Automotive Customer Experience Platform

Plataforma de medición, análisis y reporte de la satisfacción de clientes de
servicios automotrices. Recorrido completo: **placa → cliente y vehículo →
encuesta → base de datos → panel → informe PDF corporativo**.

> El nombre del sistema es provisional y se cambia desde configuración, sin
> tocar código.

## Estado

**FASE 1 completa** — arquitectura y estructura del proyecto.
El plan completo y el criterio de "terminado" de cada fase están en
[`docs/00-plan-de-fases.md`](docs/00-plan-de-fases.md).

## Documentación

| Documento                                                    | Contenido                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| [`docs/00-plan-de-fases.md`](docs/00-plan-de-fases.md)       | Plan de las 12 fases y estado actual                               |
| [`docs/01-arquitectura.md`](docs/01-arquitectura.md)         | Arquitectura, stack justificado, diagramas, estrategia PDF y Vercel |
| [`docs/02-modelo-datos.md`](docs/02-modelo-datos.md)         | Modelo PostgreSQL, índices, RLS, protección del DNI, indicadores    |
| [`docs/03-rutas-y-estructura.md`](docs/03-rutas-y-estructura.md) | Carpetas, rutas de frontend, Server Actions y endpoints         |
| [`docs/04-roles-y-permisos.md`](docs/04-roles-y-permisos.md) | Los cinco roles y la matriz completa de permisos                   |

## Puesta en marcha

Requisitos: Node.js 22+ y un proyecto Supabase.

```bash
npm install
cp .env.example .env.local     # completar con las credenciales del proyecto
npm run dev                    # http://localhost:3000
```

Las variables se validan al arrancar: si falta alguna, la aplicación falla de
inmediato con el detalle de qué falta, en vez de romperse más tarde.

## Comandos

| Comando                  | Qué hace                                        |
| ------------------------ | ----------------------------------------------- |
| `npm run dev`            | Servidor de desarrollo                          |
| `npm run build`          | Compilación de producción                       |
| `npm run typecheck`      | `tsc --noEmit`                                  |
| `npm run lint`           | ESLint                                          |
| `npm run check`          | Tipos + lint (lo que exige CI)                  |
| `npm run db:generate`    | Genera migraciones SQL desde `db/schema`        |
| `npm run db:migrate`     | Aplica las migraciones pendientes               |
| `npm run db:seed:catalog`| Roles, permisos, cuestionario base y umbrales   |
| `npm run db:seed:demo`   | Datos de demostración (`is_demo = true`)        |

## Principios que el código respeta

1. **La base de datos es la frontera de seguridad.** RLS decide qué filas existen
   para cada usuario. El frontend solo acomoda la vista.
2. **Nada de negocio está cableado.** Empresas, preguntas, umbrales, roles y
   permisos son filas de tablas administrables.
3. **Las encuestas no se editan.** Cada respuesta queda ligada a la versión del
   cuestionario con la que se respondió.
4. **Un esquema, dos validaciones.** El mismo Zod corre en el navegador y en el
   servidor; el servidor es quien decide.
5. **Los datos DEMO nunca se mezclan.** Marcados en la fila y desactivables por
   entorno.
6. **Cuatro estados en cada pantalla**: cargando, vacío, con error y con datos.

## Despliegue

Vercel + Supabase, con las funciones en `gru1` y la base en `sa-east-1` para
mantener juntas función y datos. El detalle de entornos, migraciones en CI y
operación está en `docs/01-arquitectura.md`, sección 10.
