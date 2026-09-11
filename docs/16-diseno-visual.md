# 16. Diseño visual y experiencia por rol

## 16.1 Qué NO debe parecer

El sistema se usa ocho horas al día en un taller premium, delante del cliente.
No debe parecer un ERP antiguo, un formulario genérico, una plantilla
administrativa gratuita ni un proyecto académico. Debe parecer **software
empresarial caro**, que es lo que es.

Tres consecuencias concretas de eso:

1. **El color informa, no decora.** El color de señal está reservado al estado
   del indicador. Si todo es azul corporativo excepto lo que requiere atención,
   lo que requiere atención se ve desde el otro lado del taller.
2. **La jerarquía es real.** Radios y sombras tienen varios niveles con
   significado —chip, control, panel, modal—, no un valor único aplicado a todo.
3. **Las cifras no bailan.** `font-variant-numeric: tabular-nums` en todo KPI y
   toda tabla: un contador que se actualiza no debe mover la columna.

## 16.2 Tokens

Declarados una vez en `@theme` de Tailwind v4. **Si se declara `--radius-panel`,
la clase es `rounded-panel`** — `rounded-[--radius-panel]` no resuelve la
variable.

### Color

| Familia | Uso |
| --- | --- |
| `graphite` 950→50 | Fondos, superficies y bordes. La base del sistema |
| `steel` 700→200 | Texto secundario, separadores, estados inactivos |
| `brand` 700→100 | **Único color de marca.** Acción primaria, foco, selección |
| `signal-ok` | Satisfecho · dentro de tiempo · conforme |
| `signal-warn` | Atención · riesgo de retraso · observado |
| `signal-crit` | Crítico · retrasado · rechazado |
| `signal-wait` | En espera de un tercero (el gris del semáforo) |

Superficies semánticas: `--color-surface`, `-raised`, `-sunken`, `-overlay`;
texto: `--color-fg`, `-muted`, `-subtle`, `-inverted`. Los componentes usan los
nombres semánticos, nunca el número de la escala: así el tema claro y el oscuro
se resuelven en un solo sitio.

### Tipografía

| Familia | Dónde | Por qué |
| --- | --- | --- |
| **Archivo** | Títulos e interfaz | Grotesca condensada, densa y con carácter. Aguanta cifras grandes sin parecer decorativa |
| **IBM Plex Sans** | Texto corrido, formularios, tablas | Diseñada para lectura prolongada en pantalla |
| **IBM Plex Mono** | **Placas, códigos, VIN, identificadores** | Son códigos de ancho fijo: `ABC-123` y `OS-2026-000154` se leen y se comparan mejor alineados |

### Radios y sombras

```
--radius-chip    0.375rem   estados, etiquetas
--radius-control 0.5rem     botones, campos
--radius-panel   0.75rem    tarjetas, paneles
--radius-modal   1rem       modales, drawers

--shadow-raise    sutil, para lo que flota un poco (tarjeta sobre fondo)
--shadow-panel    media, para paneles con contenido
--shadow-overlay  marcada, para lo que se superpone (modal, drawer, menú)
```

## 16.3 Componentes

`components/ui/` — Button, IconButton, Input, Select, Textarea, Checkbox, Radio,
Switch, Badge, **StatusChip**, **ProgressBar**, **TrafficLight**, Card, Panel,
Table, Tabs, Tooltip, Modal, Drawer, Avatar, Skeleton, Separator, Kbd, **Plate**.

`components/feedback/` — `LoadingState`, `EmptyState`, `ErrorState` y
`DataState`, que compone los cuatro:

```tsx
<DataState data={ordenes} loading={loading} error={error}
           empty={{ title: 'Sin órdenes', hint: 'Registra una recepción' }}>
  {(rows) => <OrdersTable rows={rows} />}
</DataState>
```

Los cuatro estados no son una recomendación: son el contrato del componente. Una
pantalla que no los tenga los cuatro no pasa revisión.

`components/data/` — DataTable con orden y paginación, FilterBar sincronizada
con la URL, Timeline, EvidenceGallery, SignaturePad, VehicleDamageMap.

## 16.4 Pantalla por rol (§42, §45, §46, §63)

| Rol | Inicio | Está optimizada para |
| --- | --- | --- |
| Asesor | `/tablero` | Ver **muchos** vehículos a la vez y saber cuál necesita acción hoy |
| Técnico | `/taller` | **Una** orden a la vez, botones grandes, tablet con guantes |
| Compras | `/compras` | Comparar proveedores en una tabla densa, desktop |
| Calidad · Lavado · Alineamiento | su cola | Dos acciones: empezar y terminar |
| Analista · Cliente corporativo | `/panel` | Lectura, gráficos, exportación |

Tarjetas del tablero del asesor (§42): recepcionados · en diagnóstico ·
esperando cliente · esperando repuestos · repuestos parciales · listos para
reparación · en reparación · control de calidad · en lavado · en alineamiento ·
listos para entrega.

Fila del control tower (§43):

```
OS-154 │ ABC-123 │ Hilux │ Juan Pérez │ Ana │ Carlos │ Reparación │ ███████░░ 75 % │ 48 m │ 16:25 │ 🟩
```

## 16.5 Responsive (§56)

Se prueba en **1920 · 1440 · 1366 · 1024 · 768 · 430 · 390 px**.

| Ancho | Comportamiento |
| --- | --- |
| ≥ 1440 | Barra lateral fija, tablas completas, panel de detalle lateral |
| 1366 · 1024 | Barra lateral colapsada a iconos; columnas secundarias ocultas |
| 768 (tablet, asesor y técnico) | Sin barra lateral; navegación inferior; **objetivos táctiles ≥ 44 px**; el checklist pasa a una columna |
| 430 · 390 (móvil, cliente) | Portal de autorización a pantalla completa, una tarjeta por ítem, botones al ancho |

El formulario de recepción y el de encuesta se optimizan para **tablet**: se
usan de pie, frente al cliente, a veces con guantes. Campos grandes, poco
desplazamiento, teclado numérico donde corresponde, y guardado por secciones
para que una conexión intermitente no borre veinte minutos de trabajo.

## 16.6 Accesibilidad

- Contraste **AA** como mínimo en texto y controles.
- Foco visible por teclado, siempre. Nunca `outline: none` sin sustituto.
- `prefers-reduced-motion` respetado: las transiciones se reducen a opacidad.
- El color **nunca es el único portador de información**: el semáforo lleva
  forma e texto además de color, porque en un taller hay daltónicos como en
  cualquier sitio.
- Etiquetas reales en los formularios, no `placeholder` como etiqueta.
- Regiones ARIA en vivo para el cronómetro y las notificaciones.
