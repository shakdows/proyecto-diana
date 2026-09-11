# Auditoría de UI/UX — estado real antes del rediseño

Fecha: 2026-09-11 · Commit base: `8ce6445`

Este documento existe porque el encargo pide «rediseñar 25 pantallas» y la
primera obligación es decir qué hay de verdad detrás de cada ruta. No hay 25
pantallas. Hay **4 construidas, 1 landing y 15 marcadores de posición**.

---

## 1. Inventario de rutas (`src/app`)

Clasificación: **A** terminada · **B** necesita ajustes · **C** necesita
rediseño · **D** marcador de posición (no existe la pantalla).

| Ruta | Archivo | Líneas | Clase | Qué hay hoy |
|---|---|---:|:--:|---|
| `/` | `(app)/page.tsx` | 8 | — | Redirección por rol. Sin interfaz. **Ya cumple §60.** |
| `/tablero` | `(app)/tablero/page.tsx` | 104 | **B** | Control tower real: tira de etapas, tabla de 6 columnas, tarjetas < xl. Le falta jerarquía de KPI, filtros, drawer y acciones de fila. |
| `/ordenes` | `(app)/ordenes/(lista)/page.tsx` | 83 | **C** | Lista de enlaces sin filtros, sin orden, sin paginación, sin densidad. Duplica el tablero sin aportar. |
| `/ordenes/[id]` | `(app)/ordenes/[id]/page.tsx` | 275 | **B/C** | Lo más completo: avance por 8 etapas, tiempos, cobertura de repuestos, acciones de la máquina de estados. **Falta lo que la convierte en ficha: línea de tiempo, evidencias, cotización, cabecera fija.** |
| `/presentacion` | `presentacion/page.tsx` | 297 | **A** | Landing pública. Recién construida. |
| `/recepcion` | — | 21 | **D** | `PhasePlaceholder` · fase 5 |
| `/taller` | — | 20 | **D** | `PhasePlaceholder` · fase 12 |
| `/calidad` | — | 20 | **D** | `PhasePlaceholder` · fase 13 |
| `/lavado` | — | 19 | **D** | `PhasePlaceholder` · fase 13 |
| `/alineamiento` | — | 19 | **D** | `PhasePlaceholder` · fase 13 |
| `/compras` | — | 21 | **D** | `PhasePlaceholder` · fase 11 |
| `/clientes` | — | 20 | **D** | `PhasePlaceholder` · fase 4 |
| `/vehiculos` | — | 20 | **D** | `PhasePlaceholder` · fase 4 |
| `/buscar` | — | 20 | **D** | `PhasePlaceholder` · fase 4 |
| `/encuestas` | — | 20 | **D** | `PhasePlaceholder` · fase 15 |
| `/panel` | — | 20 | **D** | `PhasePlaceholder` · fase 15 |
| `/seguimiento` | — | 19 | **D** | `PhasePlaceholder` · fase 15 |
| `/informes` | — | 20 | **D** | `PhasePlaceholder` · fase 16 |
| `/admin` | — | 21 | **D** | `PhasePlaceholder` · fase 3 |
| `/admin/auditoria` | — | 20 | **D** | `PhasePlaceholder` · fase 16 |
| `/login` | **no existe** | — | — | Hay que crearla entera (§8). |

**Resumen: A=1 · B=2 · C=1 · D=15.**

Consecuencia directa: en 15 rutas no cabe «rediseñar». Cabe **construir**. Y
construir una pantalla operativa de verdad exige datos; hoy solo existen los de
demostración del tablero (`src/features/demo/board.ts`, 8 órdenes).

---

## 2. Defectos reales encontrados (no cosméticos)

### D-1 · Sin navegación por debajo de 1024 px — GRAVE

`src/app/(app)/layout.tsx`:

```tsx
<div className="hidden lg:block">
  <Sidebar … />
</div>
```

La barra lateral desaparece y **no hay nada que la sustituya**: ni drawer, ni
menú en la topbar, ni navegación inferior. En la tablet de 768 px que la propia
especificación fija para el asesor (§56), el usuario queda encerrado en la
pantalla en la que esté. Solo puede moverse por enlaces dentro del contenido.

Es un fallo funcional, no de estilo.

### D-2 · No existe autenticación ni pantalla de entrada

`getSessionUser()` devuelve un asesor fijo. No hay `/login`. La aplicación se
abre directamente en el tablero. Para una demostración a un cliente, no hay
puerta de entrada.

**A favor:** los 11 roles, sus permisos y `homeRouteFor()` ya están escritos y
probados. Un selector de rol de demostración es barato.

### D-3 · El catálogo de componentes cubre un tercio de lo necesario

Existen 8: `Badge`, `Button`, `Panel`, `Plate`, `ProgressBar`, `Skeleton`,
`StatusChip`, `TrafficLight`.

**No existe ninguno de formulario**: `Input`, `Textarea`, `Select`, `Checkbox`,
`Radio`, `Switch`. Tampoco `Table`, `Tabs`, `Tooltip`, `Modal`, `Drawer`,
`Avatar`, `Separator`, `Timeline`, `FilterBar`, `CommandPalette`, `KpiCard`.

Sin componentes de formulario no se puede construir recepción, diagnóstico,
cotización ni autorización. Es el cuello de botella de todo lo demás.

### D-4 · El estado activo del menú es un rectángulo azul saturado

`bg-brand-600 text-white` a sangre. Es exactamente el patrón que §11 pide
sustituir por algo más fino: fondo tenue, línea lateral, icono marcado.

### D-5 · El botón no tiene estado pulsado

`src/components/ui/button.tsx` define `hover:` y `disabled:`, pero no `active:`.
En una tablet que se usa de pie y con guantes, la confirmación táctil importa
más que en un escritorio.

### D-6 · `LoadingState` usa un círculo giratorio

§43 pide esqueletos. `TableSkeleton` existe pero `LoadingState` —el que se usa
por defecto— es un spinner centrado.

### D-7 · Sin notificaciones, sin breadcrumb, sin paleta de comandos

La topbar tiene búsqueda (inerte), badge de demostración y usuario. Falta todo
lo de §12 y §51.

### D-8 · Recharts no está instalado

`package.json` no incluye `recharts` ni `d3-scale`. El panel analítico (§37) no
puede construirse sin añadir la dependencia.

---

## 3. Lo que está BIEN y no se toca

No todo es deuda. Estas decisiones son buenas y el rediseño las conserva:

- **Tokens semánticos con indirección.** Los componentes usan `bg-surface`,
  `text-fg-muted`; el tema claro y el oscuro se resuelven en un único sitio.
  Es la base correcta para crecer.
- **Jerarquía real de radios y sombras** (`chip`/`control`/`panel`/`modal`),
  en vez de un valor único repetido.
- **Sombras tintadas en grafito**, no negro puro.
- **Cifras tabulares** (`font-variant-numeric: tabular-nums`) en tablas y en
  todo lo marcado `data-numeric`: los números no bailan al actualizarse.
- **Foco visible garantizado** en `:focus-visible`, sin `outline: none`.
- **`prefers-reduced-motion` respetado** en `globals.css`.
- **`DataState`** compone los cuatro estados y evita que una pantalla olvide uno.
- **El semáforo ya distingue gris de rojo**, con color + texto, nunca solo color.
- **Tres familias tipográficas con papeles distintos**: Archivo para títulos y
  cifras, IBM Plex Sans para texto, IBM Plex Mono para identificadores.

---

## 4. Trampa que el rediseño NO debe pisar

**No añadir `src/app/(app)/loading.tsx`.**

Un `loading.tsx` en ese nivel hace que Next confirme HTTP 200 y empiece a
transmitir el armazón antes de que el componente decida. A partir de ahí
`notFound()` ya no puede devolver 404: una orden inexistente respondería 200
con la página de error dentro.

Está comprobado empíricamente y documentado en `docs/07` §7.4:

| Dónde | Respuesta de `/ordenes/no-existe` |
|---|---|
| `(app)/loading.tsx` | 200 ❌ |
| `ordenes/loading.tsx` | 200 ❌ |
| `ordenes/(lista)/loading.tsx` | 404 ✅ |

Los esqueletos de §43 van **por segmento hoja**, nunca en el armazón.

---

## 4 bis · Trampa encontrada al construir el sistema

**`peer-checked:` no alcanza a los descendientes.**

Tailwind lo compila a `:is(:where(.peer):checked ~ *)` —hermano general, nunca
descendiente—. Poner la variante sobre el icono que va DENTRO del cuadrado
parece lo natural y no aplica jamás: la casilla, el radio y el conmutador se
verían siempre sin marcar, en una interfaz que compila y pasa el linter.

Comprobado sobre el CSS generado, no supuesto:

```
.peer-checked\:bg-brand-600:is(:where(.peer):checked~*){          ← hermano: sí
.peer-checked\:\[\&_svg\]\:opacity-100:is(:where(.peer):checked~*) svg{  ← descendiente: así sí
```

La variante va sobre el hermano y alcanza al hijo con `[&_svg]` o `[&>span]`.
Queda escrito en `src/components/ui/choice.tsx`, donde se volverá a leer.

---

## 5. Lenguaje visual de referencia

Extraído de `controlvalvula.vercel.app`, que es del mismo propietario y el
registro correcto para Diana (`nattiva` es editorial: Fraunces, Jost, cremas y
píldoras de 100 px — otro producto, otro problema).

| | Referencia | Diana hoy |
|---|---|---|
| Tipografía | IBM Plex Sans + Mono | Archivo + IBM Plex Sans + Mono |
| Azul de marca | `#102d69` · `#16306b` | `#1859bc` |
| Grafito | `#101418` · `#1a1d21` | `#090c10` · `#0f141a` |
| Acero | `#5b6470` · `#8a929c` | `#415062` · `#8695a7` |
| Bordes | `#e4e7ea` · `#cfd4d9` | `#dce3ea` · `#b4c0cc` |
| Verde / rojo | `#1a7f52` · `#c0392b` | `#1e9e6a` · `#d0342c` |
| Superficie | `#fafbfc` · `#eef0f2` | `#ffffff` · `#f2f5f8` |

**Conclusión:** la familia es la misma. La diferencia real es que el azul de
Diana está **más saturado y más claro** que el de la referencia, y que Diana usa
blanco puro donde la referencia usa un blanco roto. Ambas cosas van en la
Fase UI 1.
