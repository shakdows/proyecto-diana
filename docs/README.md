# Documentación — Proyecto Diana

Plataforma integral de gestión de taller automotriz y experiencia del cliente.

## Orden de lectura

| # | Documento | Responde a |
| :-: | --- | --- |
| 0 | [Decisiones de alcance e inconsistencias](00-decisiones-y-alcance.md) | **Empieza aquí.** Qué se construye y qué inconsistencias se detectaron |
| 1 | [Arquitectura](01-arquitectura.md) | Arquitectura propuesta · tecnologías · despliegue |
| 2 | [Flujo operativo](02-flujo-operativo.md) | Diagrama del flujo operativo |
| 3 | [Máquina de estados](03-maquina-de-estados.md) | 34 estados, 40 acciones, 76 transiciones, guardas |
| 4 | [Modelo de datos](04-modelo-de-datos.md) | 68 tablas, relaciones, índices, RLS |
| 5 | [Roles y permisos](05-roles-y-permisos.md) | Matriz RBAC completa |
| 6 | [Estructura de carpetas](06-estructura-de-carpetas.md) | Organización del código |
| 7 | [Rutas y endpoints](07-rutas-y-endpoints.md) | Rutas, Server Actions, API |
| 8 | [Almacenamiento multimedia](08-almacenamiento-multimedia.md) | Fotos y vídeos |
| 9 | [Autorización del cliente](09-autorizacion-del-cliente.md) | Portal con enlace firmado |
| 10 | [Repuestos y compras](10-repuestos-y-compras.md) | Recepción parcial y trazabilidad |
| 11 | [Progreso, ETA y semáforo](11-progreso-eta-y-semaforo.md) | Las tres fórmulas |
| 12 | [Notificaciones](12-notificaciones.md) | Eventos, canales, outbox |
| 13 | [Auditoría](13-auditoria.md) | Qué se registra y cómo |
| 14 | [Documentos PDF y Excel](14-documentos-pdf-y-excel.md) | Los nueve PDFs y las dos plantillas |
| 15 | [Plan de fases](15-plan-de-fases.md) | Las 16 fases y su criterio de cierre |
| 16 | [Diseño visual](16-diseno-visual.md) | Sistema de diseño y experiencia por rol |
| 17 | [Verificación de la base](17-verificacion-de-la-base.md) | Cómo comprobar que las políticas RLS aíslan de verdad |
| 18 | [Despliegue en Supabase](18-despliegue-supabase.md) | Estado del proyecto en la nube y el paso manual que falta |
| 19 | [Documentos PDF](19-documentos-pdf.md) | Los nueve documentos y las reglas que no son de maquetación |
| — | [Auditoría de UI/UX](UI-UX-AUDIT.md) | Estado real de cada ruta antes del rediseño |
| — | [Rediseño de UI/UX](UI-UX-REDESIGN.md) | Concepto, tokens, componentes y plan por fases |

## Documentos de la especificación de satisfacción

Se conservan porque su detalle sigue vigente y está integrado en el modelo
unificado:

- [Arquitectura CX](01-arquitectura-cx.md)
- [Modelo de datos CX](02-modelo-datos-cx.md)
- [Roles y permisos CX](04-roles-y-permisos-cx.md)

## Correspondencia con lo solicitado

| Pedido en §74 | Documento |
| --- | :-: |
| Arquitectura propuesta | 1 |
| Diagrama del flujo operativo | 2 |
| Máquina de estados | 3 |
| Modelo de base de datos · Relaciones entre tablas | 4 |
| Matriz de roles y permisos | 5 |
| Estructura de carpetas | 6 |
| Rutas del sistema | 7 |
| Almacenamiento de fotos y vídeos | 8 |
| Estrategia de autorización del cliente | 9 |
| Lógica de recepción parcial de repuestos | 10 |
| Lógica del porcentaje de avance · Hora estimada de finalización | 11 |
| Estrategia de notificaciones | 12 |
| Estrategia de auditoría | 13 |
| Estrategia para PDF y Excel | 14 |
| Plan completo de implementación | 15 |
