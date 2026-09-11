# 0. Decisiones de alcance e inconsistencias detectadas

> Este documento se entrega **antes** que ningún otro porque resuelve la pregunta
> que condiciona todo lo demás: *¿qué se está construyendo exactamente?*
> Las decisiones de aquí están aplicadas en el resto de la documentación.

---

## 0.1 La decisión de fondo: un solo producto, dos contextos

El encargo llegó como **dos especificaciones distintas**:

| | Especificación A | Especificación B |
| --- | --- | --- |
| Producto | *Automotive Customer Experience Platform* | Gestión operativa de taller |
| Recorrido | placa → encuesta → panel → PDF | recepción → orden → diagnóstico → cotización → compras → reparación → entrega |
| Tablas | 19 | ~40 |
| Fases | 12 | 24 |
| Clientes | MG, Mitsui, Relsa, Invetsa, BBVA | genérico, con "empresa corporativa si corresponde" |

**No son dos sistemas. Son dos mitades del mismo sistema**, y construirlas por
separado sería el error más caro del proyecto.

La razón es concreta: ambas especificaciones necesitan **las mismas siete
tablas de núcleo** — `corporate_clients`, `branches`, `customers`, `vehicles`,
`profiles`, `roles`/`permissions`, `audit_logs` — y **el mismo modelo de
aislamiento multiempresa**. Duplicarlo significa mantener dos veces la parte más
delicada del sistema y aceptar que algún día diverjan. El día que diverjan, un
usuario de BBVA verá datos de Mitsui en uno de los dos.

### Resolución

Un único producto, **Diana**, con dos contextos sobre un núcleo compartido:

```
┌──────────────────────── NÚCLEO COMPARTIDO ────────────────────────┐
│  Identidad y multiempresa · Personas y vehículos · Auditoría      │
│  corporate_clients · branches · customers · vehicles · profiles   │
│  roles · permissions · user_corporate_clients · audit_logs        │
└───────────────┬───────────────────────────────┬───────────────────┘
                │                               │
   ┌────────────▼─────────────┐   ┌─────────────▼──────────────┐
   │  CONTEXTO: OPERACIONES   │   │  CONTEXTO: EXPERIENCIA     │
   │  (taller)                │   │  (satisfacción)            │
   │                          │   │                            │
   │  recepción · checklist   │   │  encuesta · CSAT · NPS     │
   │  orden · diagnóstico     │──▶│  panel · seguimiento       │
   │  cotización · compras    │   │  informe PDF corporativo   │
   │  reparación · entrega    │   │                            │
   └──────────────────────────┘   └────────────────────────────┘
              service_orders.id ──▶ surveys.service_order_id
```

**La costura entre ambos es una sola columna**: cuando una orden llega a
`ENTREGADO`, queda habilitada la encuesta de satisfacción de esa orden. Con eso
el sistema puede responder algo que ninguna de las dos mitades respondía sola:

> *"Los clientes cuyo vehículo esperó repuestos más de 48 horas puntúan el
> NPS 23 puntos por debajo del resto."*

Eso —cruzar operación con satisfacción— es el valor real de unificarlas, y es
gratis una vez que comparten el núcleo.

### Lo que esto cambia respecto a la especificación A

- El recorrido `placa → encuesta` **sigue existiendo** (encuesta suelta, sin
  orden previa: `surveys.service_order_id` es opcional). No se pierde nada.
- Los asesores de la especificación A (`service_advisors`) pasan a ser
  **usuarios reales** (`profiles` con rol `asesor`), porque en la
  especificación B el asesor opera el sistema, no es solo un dato de catálogo.
  Se conserva `service_advisors` para asesores históricos sin usuario.
- El cuestionario versionado, el CSAT/NPS almacenado, el índice de satisfacción
  y el informe PDF se mantienen **tal cual** fueron especificados.

---

## 0.2 Inconsistencias detectadas y cómo se resuelven

El encargo pedía explícitamente validar que no existan inconsistencias graves
antes de programar. Estas son las que aparecieron al modelar, ordenadas por
riesgo.

### ⚠️ Graves (afectan seguridad o corrección de datos)

#### I-1 · El portal del cliente no puede protegerse con RLS por `auth.uid()`

**El problema.** §3 y §23 establecen que el cliente *no necesita usuario
permanente*: recibe un enlace seguro. Pero toda la estrategia de seguridad se
apoya en Row Level Security evaluando `auth.uid()`. Un visitante anónimo no
tiene `auth.uid()`. Si se le da acceso de lectura a las tablas, RLS no lo
protege; y si no se le da, no puede ver su cotización.

**Por qué es grave.** Es la única superficie del sistema expuesta a internet sin
autenticación, y tiene enfrente datos personales y precios. Resolverlo "en la
Server Action" dejaría a la base de datos sin su última defensa, justo donde más
falta hace.

**Resolución.** El rol `anon` **no recibe `SELECT` sobre ninguna tabla**. El
portal lee y escribe exclusivamente a través de funciones `SECURITY DEFINER`
—`portal_get_quotation(token)`, `portal_submit_decisions(token, …)`— que:

1. verifican el *hash* del token contra `authorization_links`;
2. comprueban vigencia, revocación y número de usos;
3. devuelven **solo la proyección apta para el cliente** (§65): sin costos
   internos, sin proveedores, sin notas privadas del técnico, sin márgenes.

La frontera sigue estando en la base de datos: aunque el código del portal
tuviera un fallo, no existe consulta que pueda leer una fila de más, porque el
permiso de objeto no existe. Detalle completo en
[`09-autorizacion-del-cliente.md`](09-autorizacion-del-cliente.md).

#### I-2 · `APROBADO_CON_MODIFICACIONES` permitiría al cliente fijar precios

**El problema.** §21 define cuatro estados de autorización por ítem, entre ellos
`APROBADO CON MODIFICACIONES`, pero no dice **qué** puede modificar el cliente.
La lectura literal —que modifique cantidad o precio— convierte el portal en un
formulario donde el cliente decide cuánto paga.

**Resolución.** El cliente **nunca escribe importes ni cantidades**. El estado se
define como *aprobado con observación*: aprueba el ítem y adjunta una nota en
texto libre. La orden no ejecuta ese ítem hasta que un asesor marca la
observación como atendida. Si la observación implica un cambio real de alcance o
de precio, el camino es el que ya exige §61: **una nueva versión de cotización**,
nunca una edición silenciosa de la vigente.

#### I-3 · No existe estado para "el cliente rechazó todo"

**El problema.** §20 y §21 permiten rechazar cada ítem individualmente, luego
permiten rechazarlos todos. §54 no tiene estado para esa salida: `APROBADO` y
`APROBACION_PARCIAL` presuponen al menos un trabajo aprobado. Una orden con todo
rechazado quedaría atascada.

**Resolución.** Transición explícita `cerrar_sin_trabajos`, disponible desde
`ESPERANDO_CLIENTE` cuando el recuento de ítems aprobados es cero, que lleva
directamente a `LISTO_PARA_ENTREGA`: el vehículo se devuelve sin intervención.
Los ítems rechazados quedan en el histórico y alimentan las **recomendaciones
pendientes** de la siguiente visita (§50).

#### I-4 · Se puede comprar un repuesto de un trabajo rechazado

**El problema.** §60 lo prohíbe, pero §25–§28 describen el flujo de repuestos
sin atarlo al resultado de la autorización. Un repuesto suele servir a varios
trabajos; si uno se aprueba y otro se rechaza, ¿cuánto se compra?

**Resolución.** La cantidad requerida de un repuesto es
**Σ de las cantidades de los ítems aprobados que lo consumen**, y solo esa. Un
repuesto cuyos consumidores estén todos rechazados tiene cantidad requerida 0 y
la solicitud de compra lo excluye. Comprarlo de todos modos exige el permiso
`purchases:override_scope` y deja registro en `audit_logs`. La fórmula está en
[`10-repuestos-y-compras.md`](10-repuestos-y-compras.md).

### ◐ Moderadas (afectan el modelo, no la seguridad)

#### I-5 · `COTIZACION_ENVIADA` y `ESPERANDO_CLIENTE` son casi el mismo estado

**Resolución.** Se conservan los dos, con semántica distinta y útil:

| Estado | Significa |
| --- | --- |
| `COTIZACION_ENVIADA` | El enlace se emitió y se entregó. **El cliente aún no lo ha abierto.** |
| `ESPERANDO_CLIENTE` | El cliente abrió el enlace. Está decidiendo. |

La transición entre ambos la dispara la primera apertura del portal. Esto
convierte una redundancia en un indicador operativo real: *cotizaciones enviadas
que el cliente nunca abrió* — que es un problema de comunicación, no de precio, y
se corrige de forma distinta.

#### I-6 · `REPARACION_PAUSADA` como estado compite con el cronómetro

**El problema.** §31 pide pausas con motivo y cálculo de tiempo bruto / pausas /
efectivo. §54 pide además un *estado* `REPARACION_PAUSADA`. Con dos registros de
la misma verdad, tarde o temprano no cuadran.

**Resolución.** **La verdad vive en `repair_time_sessions`** (una fila por tramo
trabajado, con motivo de pausa). El estado `REPARACION_PAUSADA` se mantiene
—porque el tablero necesita verlo— pero es **derivado**: la orden está pausada si
y solo si existe una sesión abierta marcada como pausa. Bruto, pausas y efectivo
se calculan siempre desde las sesiones, nunca desde el estado.

#### I-7 · El trabajo adicional descubierto durante la reparación no tiene camino

**El problema.** §61 exige que un trabajo adicional genere una cotización V2 sin
tocar la V1. Pero §54 no ofrece ninguna transición desde `EN_REPARACION` de
vuelta a la cotización. En un taller real esto pasa todos los días.

**Resolución.** Transición `ampliar_cotizacion`: `EN_REPARACION →
COTIZACION_EN_PREPARACION`, que **pausa automáticamente** la sesión de trabajo
con motivo `espera_autorizacion`. Así el tiempo de espera de la nueva
autorización no se le imputa al técnico como tiempo efectivo — que es justo lo
que §31 quiere medir bien.

#### I-8 · "Planchado y pintura" aparece como rol y como tipo de servicio

§3 lo lista entre los roles; §13 entre los tipos de servicio. Ambas son
correctas y no se contradicen: es **una especialidad del personal** y **una
línea de servicio**. Se modelan por separado (`technician_specialties` y
`service_types`) para que la asignación de la orden pueda filtrar al personal
capaz de ejecutarla.

#### I-9 · El checklist tiene ítems que no son "OK / No conforme / No aplica"

§6 fija tres valores por ítem, pero la hoja física registra además **cantidad**
en varios elementos (conos, triángulos, herramientas) y **medición** en otros
(§7: cocada, niveles). Un único campo de tres valores pierde esa información.

**Resolución.** Cada ítem del checklist tiene `status` (los tres valores
pedidos) **más** campos opcionales `quantity` y `measure_value` que se activan
según el `input_type` definido en el catálogo del ítem. El catálogo es
administrable (§6 pide categorías configurables), así que añadir un ítem con
medición no requiere desplegar.

#### I-10 · Dos artefactos para el mismo checklist: Excel A4 y PDF

§11 pide una plantilla Excel imprimible en A4 y §51 pide un *checklist de
recepción en PDF*. Son dos representaciones del mismo contenido y pueden
divergir.

**Resolución.** Ambos se generan desde **la misma definición de ítems en base de
datos**. El PDF es el documento operativo y legal (lleva las firmas digitales
capturadas); el Excel es la plantilla de contingencia para llenar a mano cuando
no hay tablet, y su hermano normalizado sirve para la carga masiva posterior.

### ○ Menores (decisiones tomadas, sin conflicto real)

| # | Punto | Decisión |
| --- | --- | --- |
| I-11 | Moneda e impuestos no especificados | `PEN` e `IGV 18 %` como **semilla** en `app_settings`; la cotización guarda la tasa aplicada en cada línea, para que un cambio futuro de IGV no reescriba cotizaciones ya emitidas |
| I-12 | Proveedor de WhatsApp/SMS/correo sin elegir (§41) | Patrón *outbox* + interfaz de canal. La elección de proveedor no bloquea ninguna fase |
| I-13 | §60 pide borrado lógico; la especificación A pide inmutabilidad | Se unifican: **maestros** con `deleted_at`; **documentos transaccionales** (cotización emitida, autorización, encuesta enviada, orden de compra) inmutables — se anulan con estado, nunca se editan ni se borran |
| I-14 | Nombre del sistema provisional | Vive en `app_settings.system_name`. Cambiarlo no toca código |
| I-15 | Separación alcance / panel | Se conserva `scope:all_corporate_clients` distinto de `dashboard:read_all_clients`, tal como advierte la trampa 6 de la especificación A |

---

## 0.3 Lo que este documento NO cambia

Para que quede explícito: se respetan sin reabrir el stack (Next.js 16, React,
TypeScript estricto, Tailwind v4, PostgreSQL/Supabase, Drizzle solo para
esquema, `@supabase/ssr` en runtime, Zod, `@react-pdf/renderer`, Vercel `gru1`),
las diez reglas de trabajo, las diez trampas ya detectadas, el cuestionario base
de once preguntas, las fórmulas de CSAT/NPS/índice, las rutas en español y el
criterio de diseño visual.
