# Persistencia de la demostración

El trabajo hecho en las pantallas **sobrevive a la recarga**, y hay un botón
**«Comenzar de nuevo»** en la barra superior que lo borra todo.

## Dónde se guarda, y por qué ahí

En `localStorage`, el navegador. **No en Supabase**, y no por comodidad: sin
autenticación, `auth.uid()` es nulo y RLS bloquea a `anon` sobre todas las
tablas. Escribir en la base exigiría la clave `service_role`, que saltaría RLS
por completo — justo la frontera que existe para proteger esto.

Consecuencias que conviene tener claras:

- Es **por dispositivo**. Lo del móvil no aparece en el portátil.
- **Nadie más lo ve.** No es trabajo compartido.
- Una ventana privada lo pierde al cerrarse.

Cuando la sesión lleve un JWT real, esto se sustituye por consultas a Postgres
y `src/lib/demo/store.ts` desaparece.

## Trampas resueltas

**Un `Set` se serializa a `{}`.** La cotización guardaba las líneas incluidas
en un `Set`; `JSON.stringify` lo convierte en un objeto vacío sin error y sin
aviso. Al recargar aparecía con todo desmarcado y total cero. Ahora se guarda
la lista de identificadores y el `Set` se deriva.

**El cronómetro guarda el ancla, no el tic.** Persistir los segundos cada
segundo serían sesenta escrituras por minuto. Se guarda `{ base, desde }` y el
reloj se deriva de la hora del sistema. Efecto secundario buscado: **el tiempo
sigue corriendo con la pestaña cerrada**, que es como se comportará en
producción — las marcas las pone `now()` de PostgreSQL sobre
`repair_time_sessions`, y a esa tabla le da igual si la tablet se durmió.

**Cada orden tiene su propio espacio.** La clave lleva el identificador
(`cotizacion.os-154`). Sin eso, lo marcado en una orden aparecería en la
siguiente.

**Lo efímero no se guarda.** El diálogo de pausa abierto o el filtro de
sistema del diagnóstico no se restauran: reabrir un diálogo al recargar es
desconcertante.

**El formato va versionado.** `STORE_VERSION` en
`src/features/demo/services/persistence.ts`. Al cambiar la forma de lo
guardado hay que subirla: un objeto viejo al que le falta un campo nuevo no
revienta, renderiza mal y en silencio, que es peor. Con la versión subida, lo
viejo se descarta y la pantalla vuelve a su estado inicial.

**Toda lectura y escritura va en `try/catch`.** En ventana privada el acceso a
`localStorage` **lanza**; con la cuota agotada, escribir también. La pantalla
sigue funcionando con el estado en memoria: simplemente no sobrevive a la
recarga.

**La instantánea se cachea.** `useSyncExternalStore` compara por identidad; si
cada lectura parseara el JSON otra vez devolvería un objeto nuevo, la
comparación siempre fallaría y React entraría en un bucle infinito de
renderizado.

**Se escucha el evento `storage`.** Con la misma orden abierta en dos pestañas
y «Comenzar de nuevo» pulsado en una, la otra se entera.

## Qué persiste

| Pantalla | Qué se guarda |
| --- | --- |
| Cotización | Líneas incluidas |
| Autorización del cliente | Decisión por trabajo y confirmación |
| Solicitud de repuestos | Líneas pedidas y envío |
| Autorización de repuestos | Dictamen por línea y resolución |
| Compras | Proveedor elegido por línea y envío |
| Recepción de repuestos | Aceptadas, rechazadas y confirmación |
| Reparación | Pasos, reloj, pausa activa, evidencia y cierre |
| Calidad | Resultado por comprobación y resolución |
| Lavado y alineamiento | Estado de la cola |
| Vehículos listos | A quién se avisó |
| Entrega | Todo el formulario y la entrega |
| Encuesta | NPS, aspectos, comentario y envío |
| Diagnóstico | Notas generales |

## Cómo se añade a una pantalla nueva

Sustituir una línea:

```ts
const [estado, setEstado] = usePersistentState(`mi-pantalla.${orderId}`, inicial);
```

Misma forma que `useState`, incluido el actualizador funcional. Es deliberado:
si migrar costara reescribir el componente, la mitad de las pantallas se
quedaría sin persistir.
