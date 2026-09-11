# Rediseño de UI/UX — concepto, sistema y plan

Documento vivo. Complemento de [`UI-UX-AUDIT.md`](UI-UX-AUDIT.md), que
describe el punto de partida ruta por ruta.

---

## 1. Estado actual

| | |
| --- | --- |
| Rutas de aplicación | 19 |
| Construidas | 4 (`/tablero`, `/ordenes`, `/ordenes/[id]`, redirección `/`) |
| Marcadores de posición | 15 |
| Pantalla pública | 1 (`/presentacion`) |
| Autenticación | No existe |

El detalle, con clasificación A/B/C/D, está en la auditoría.

## 2. Problemas que resuelve el rediseño

| # | Problema | Estado |
| --- | --- | --- |
| P-1 | Sin navegación por debajo de 1024 px | **Resuelto** — panel lateral desde la barra superior |
| P-2 | No existía ningún componente de formulario | **Resuelto** — Field, Input, Select, Checkbox, Radio, Switch, ChoiceBar |
| P-3 | Elemento activo del menú: rectángulo azul saturado | **Resuelto** — barra vertical + fondo teñido + icono azul |
| P-4 | Tablero: ocho números en una franja, sin jerarquía | **Resuelto** — un indicador primario y tres secundarios |
| P-5 | Tabla plana estilo hoja de cálculo | **Resuelto** — filas de 84 px, dos hechos por columna |
| P-6 | Sin panel lateral de consulta rápida | **Resuelto** — drawer desde la fila |
| P-7 | Sin búsqueda real | **Resuelto** — paleta de comandos ⌘K |
| P-8 | Botón sin estado pulsado | **Resuelto** |
| P-9 | Carga por defecto: círculo giratorio | **Resuelto** — esqueleto |
| P-10 | Sin favicon | **Resuelto** — `src/app/icon.svg` |
| P-11 | Sin autenticación ni pantalla de entrada | Pendiente |
| P-12 | Recepción, técnico, compras y calidad no existen | Pendiente |
| P-13 | Recharts no instalado; no hay panel analítico | Pendiente |

## 3. Concepto

**DIANA · Automotive Operations Center.**

Barra lateral grafito, área de trabajo clara. El sistema se usa turnos
enteros: una interfaz oscura completa cansa, y una completamente blanca no
tiene dónde anclar la navegación.

Lo que NO debe parecer: ERP antiguo, plantilla administrativa, tabla con menú
lateral. Lo que sí: un centro de operaciones donde en tres segundos se sabe
qué vehículo requiere acción.

## 4. Tokens

Definidos en `src/app/globals.css`. Los componentes usan SIEMPRE el nombre
semántico (`bg-surface`, `text-fg-muted`), nunca el número de la escala.

### Color

| Familia | Papel |
| --- | --- |
| `graphite` 950→50 | Barra lateral, superficies, bordes, texto |
| `brand` 950→50 | Único color de marca. Acción, foco, selección |
| `ok` / `warn` / `crit` / `wait` | **Estado, nunca decoración** |

El azul bajó de `#1859bc` a `#164e9e`. El anterior era claro y saturado:
repetido en la fila activa del menú y en cada botón primario teñía la
pantalla y dejaba de significar «esto es accionable».

**Regla que no se negocia:** el color comunica ESTADO DE SALUD de la orden
—a tiempo, en riesgo, retrasada, esperando—, no la etapa en la que está. La
etapa ya la dice el texto del chip. Dos lenguajes de color a la vez
—uno por etapa y otro por salud— hacen que ninguno se lea.

### Movimiento y capas

Una sola curva (`--ease-snap`) y dos duraciones: 150 ms para respuesta al
puntero, 200 ms para lo que aparece o desaparece. Escala de capas declarada
(`--z-sticky` … `--z-toast`), que es lo que evita los `z-index: 9999`.

### Radios y sombras

`chip` 6 px · `control` 8 px · `panel` 12 px · `modal` 16 px. Sombras
tintadas en grafito, nunca negro puro.

## 5. Componentes

### Conservados

Badge · Panel · Plate · ProgressBar · StatusChip · TrafficLight · Skeleton ·
DataState · PageHeader.

### Nuevos

| Grupo | Componentes |
| --- | --- |
| Formulario | Field · FieldGrid · Input · Textarea · Select · IdentifierInput · Checkbox · Radio · Switch · ChoiceBar |
| Presentación | Avatar · AvatarGroup · Separator · Tooltip · Tabs · KpiCard · MetricDelta · Timeline · CorporateBadge |
| Superposición | Modal · Drawer · ToastProvider |
| Aplicación | Sidebar · Topbar · CommandPalette · ControlTower · OrderRow · OrderCard · PipelineStrip |

Decisiones que no son de estilo:

- Casilla, radio y conmutador van sobre un `<input>` real oculto, no sobre un
  `div` con `onClick`: el foco, la barra espaciadora y el envío del
  formulario llegan correctos de serie.
- Modal y Drawer van sobre `<dialog>` nativo: trampa de foco, Escape,
  bloqueo del fondo y capa inerte los da el navegador.
- `MetricDelta` no decide sola el sentido de una flecha. «Esperando repuestos
  +3» sube y es malo; «listos para entrega +3» sube y es bueno.
- El plegado de la barra lateral usa `useSyncExternalStore`, no un efecto con
  `setState`: leer `localStorage` en un efecto renderiza dos veces y la barra
  se ve saltar de ancho en cada carga.

## 6. Flota mixta

`src/features/equipment` es la única fuente de cómo se nombra cada cosa:

| | Vehículo | Maquinaria |
| --- | --- | --- |
| Identificador | Placa | Código de equipo |
| Contador | Kilometraje (km) | Horómetro (h) |
| Serie | VIN | N.º de serie |

Una lista mixta usa el término neutro, nunca el de la mayoría: si la cabecera
dijera «Placa», mentiría en las filas que no lo son. Dominio puro, 10 pruebas.

El sistema se presenta como taller **automotriz**; la capacidad de flota mixta
queda demostrada con una sola orden de maquinaria en los datos de ejemplo.

## 7. Trampas verificadas sobre el código generado

No son suposiciones: cada una se comprobó inspeccionando la salida.

### T-1 · `peer-checked:` no alcanza a los descendientes

Compila a `:is(:where(.peer):checked ~ *)` —hermano general—. La variante
puesta sobre el icono de dentro del cuadrado no aplica nunca: casilla, radio
y conmutador se verían siempre sin marcar, en código que compila y pasa el
linter. Se resuelve con `[&_svg]` / `[&>span]` sobre el hermano.

### T-2 · Los breakpoints arbitrarios en px se ordenan antes que los nombrados

Los nombrados van en `rem`. Escrito `min-[1750px]`, el bloque sale antes que
`lg` en la hoja y, a 1920 px, `lg:grid-cols-2` gana por orden. Escrito
`min-[109.375rem]` se ordena donde le toca. Orden verificado:
`640, 768, 1024, 1280, 1536, 1750`.

### T-3 · Un `loading.tsx` en el armazón rompe el 404

Confirma HTTP 200 y empieza a transmitir antes de que el componente decida,
así que `notFound()` ya no puede devolver 404. Los esqueletos van **por
segmento hoja**. Detalle en `docs/07` §7.4.

## 8. Plan

| Fase | Pantalla | Estado |
| --- | --- | --- |
| 1 | Sistema de diseño | ✅ |
| 2 | Armazón (barra lateral, superior, ⌘K, móvil) | ✅ |
| 3 | Centro de operaciones + torre de control | ✅ |
| 4 | Login | Siguiente |
| 5 | Nueva recepción | Pendiente |
| 6 | Detalle de orden | Pendiente |
| 7 | Técnico · Compras · Calidad · Servicios finales | Pendiente |
| 8 | Panel analítico | Pendiente — requiere instalar `recharts` |
| 9 | Responsive fino y pulido | Pendiente |

Tras cada fase: `npm run typecheck`, `lint`, `test`, `build`.

## 9. Activos que faltan

El entorno no descarga imágenes. Estos huecos están preparados en código y
se rellenan subiendo el archivo al repositorio:

| Archivo esperado | Dónde se usa |
| --- | --- |
| `public/marca/romero-motors.svg` | Barra lateral, login, documentos |
| `public/marca/taller.jpg` | Panel izquierdo del login |

Mientras no existan, se dibuja una composición equivalente en código.
