# 14. Estrategia para PDF y Excel

## 14.1 PDF: `@react-pdf/renderer`, sin navegador

| Criterio | `@react-pdf/renderer` | Chromium headless |
| --- | --- | --- |
| Tamaño del despliegue | librería JS | ~50 MB de binario |
| Arranque en frío | despreciable | 2–5 s |
| Calidad de impresión | vectorial nativo | depende del rasterizado |
| Control de paginación | explícito (`break`, `fixed`, `wrap`) | reglas CSS de impresión, frágiles |
| Fallos en producción | raros | frecuentes (memoria, sandbox, fuentes) |

Los documentos se imprimen y se entregan al cliente en papel. Un PDF vectorial
no se pixela al imprimir: esa es la razón de fondo.

Ejecución en Route Handlers con `runtime = 'nodejs'` y `maxDuration = 60`
declarado **en la propia ruta**:

```ts
export const runtime = 'nodejs';
export const maxDuration = 60;
```

No con un patrón `functions` en `vercel.json`: un patrón que no casa con ningún
archivo hace fallar el despliegue entero, y estas rutas no existen hasta la
Fase 16. La configuración por segmento vive junto al código que la necesita y
no puede quedarse huérfana.

Si un informe superara ese tiempo, el camino correcto es precalcular el periodo
en una vista materializada, no subir el límite.

## 14.2 Los nueve documentos (§51)

| Documento | Ruta | Contenido esencial |
| --- | --- | --- |
| Checklist de recepción | `/api/reports/checklist` | Ítems por categoría, niveles, cocadas, diagrama de daños, documentos, **firmas** |
| Orden de servicio | `/api/reports/orden-servicio` | Cliente, vehículo, requerimiento, tipo de servicio, asignación |
| Diagnóstico | `/api/reports/diagnostico` | Ítems con sistema, hallazgo, prioridad, horas, miniaturas de evidencia |
| Cotización | `/api/reports/cotizacion` | Líneas con repuesto, mano de obra, descuento, impuesto, total. **Versión indicada** |
| Autorización del cliente | `/api/reports/autorizacion` | Decisión por ítem, totales, firma, IP, fecha y hora |
| Orden de compra | `/api/reports/orden-compra` | Proveedor, líneas, plazo, condiciones de pago |
| Reporte de repuestos | `/api/reports/repuestos` | Las seis cantidades de §62 por repuesto |
| Reporte de trabajo | `/api/reports/trabajo` | Trabajos, tiempos efectivo y de pausas, evidencias finales |
| Acta de entrega | `/api/reports/acta-entrega` | Trabajos realizados, repuestos instalados, garantía, firmas |

A los que se suma el **informe corporativo de satisfacción**
(`/api/reports/satisfaccion`): portada con ambos logos, resumen ejecutivo, KPIs,
evolución, resultados por pregunta, fortalezas, oportunidades, comentarios sin
datos personales, conclusiones y recomendaciones.

Nombre automático: `Informe_Satisfaccion_BBVA_Agosto_2026.pdf`.

## 14.3 Composición compartida

```
src/features/reports/
├── primitives/      Page, Header, Footer, Table, KpiBox, SignatureBox
├── documents/       ChecklistPdf, QuotationPdf, DeliveryActPdf, SatisfactionPdf…
└── data/            una función por documento: reúne y valida los datos
```

Tres reglas que evitan que los documentos se contradigan con la pantalla:

1. **Los datos se obtienen con las mismas consultas que la interfaz.** El
   informe de satisfacción ejecuta **la misma función SQL de agregación** que
   alimenta el panel: no puede contradecirlo porque leen del mismo sitio.
2. **Los gráficos comparten geometría.** `features/analytics/services/chart-geometry.ts`
   calcula escalas y rutas con `d3-scale`/`d3-shape`; la web las pinta con
   Recharts y el PDF con primitivos `<Svg><Path/></Svg>`. El gráfico del informe
   **no es una captura del panel**: es el mismo dato compuesto para papel.
3. **El texto analítico es determinista.** Fortalezas, oportunidades,
   conclusiones y recomendaciones salen de reglas sobre los indicadores
   —preguntas mejor y peor calificadas, variación contra el periodo anterior,
   proporción de detractores—. Nada generado al azar, nada que no se pueda
   reproducir.

Encabezado, pie y numeración de página en todos, con `fixed`. Fuentes
incrustadas (Archivo e IBM Plex) para que el documento se vea igual en cualquier
visor.

## 14.4 Excel: ExcelJS, dos archivos con propósitos opuestos (§11)

`exceljs` es el único que aplica estilos, celdas combinadas, anchos, bordes,
área de impresión y validación de datos — que es exactamente lo que exige el
archivo 1. Sin macros.

### Archivo 1 — `checklist-recepcion-a4.xlsx`

Réplica digital de la hoja física, **para imprimir y llenar a mano** cuando no
hay tablet o se cae la conexión.

| Aspecto | Especificación |
| --- | --- |
| Formato | A4 vertical, márgenes 1 cm, `fitToPage`, área de impresión fijada |
| Cabecera | Logo, datos del taller, número de orden, fecha y hora |
| Bloques | Datos del cliente · datos del vehículo · checklist por categorías · niveles y cocadas · documentos entregados · diagrama de daños · observaciones · firmas |
| Checklist | Tres columnas `OK` / `NC` / `NA` con borde para marcar, más columna de observación |
| Daños | Imagen del esquema del vehículo incrustada, con cuadrícula de referencia |
| Firmas | Dos recuadros con nombre, DNI, fecha y hora |
| Llenado | **Vacío.** Ningún dato del ejemplo queda como contenido permanente |

### Archivo 2 — `carga-masiva.xlsx`

Versión normalizada **para importar datos al sistema**.

| Hoja | Contenido |
| --- | --- |
| `clientes` | `document_type` · `document_number` · `first_name` · `last_name` · `business_name` · `email` · `phone` · `corporate_client_code` |
| `vehiculos` | `plate` · `brand` · `model` · `version` · `model_year` · `color` · `vin` · `engine_number` · `vehicle_type` · `customer_document` |
| `checklist_items` | `order_code` · `item_code` · `status` · `quantity` · `measure_value` · `notes` |
| `danios` | `order_code` · `damage_type` · `body_zone` · `side` · `description` |
| `_catalogos` | Hoja oculta con los valores válidos, referenciada por validación de datos |
| `_instrucciones` | Qué es obligatorio, formatos de fecha y número, ejemplos |

Una columna por dato, un dato por columna, sin celdas combinadas y sin formato
decorativo: es un archivo para máquinas. Los desplegables se alimentan de
`_catalogos`, de modo que **el archivo no acepta un valor que el sistema vaya a
rechazar** — el error se ve al escribir, no tras importar mil filas.

### Generación

```bash
npm run generate:templates   # scripts/generate-excel-templates.ts
```

Ambos se construyen **desde las tablas de catálogo** (`checklist_categories`,
`checklist_item_defs`). Añadir un ítem al checklist actualiza el formulario de
la tablet, el PDF y las dos plantillas Excel a la vez: **no pueden divergir**
(resolución de **I-10**).

Se publican en `public/plantillas/` y se sirven por `/api/plantillas/[archivo]`.

## 14.5 Registro

Toda generación escribe una fila en `documents` (tipo, código, ruta en Storage,
parámetros) y otra en `audit_logs` (quién, cuándo, con qué filtros, desde qué
IP). Los PDFs se archivan en Supabase Storage con enlaces firmados de caducidad
corta, nunca públicos.
