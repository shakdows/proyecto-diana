# 11. Progreso, hora estimada de finalización y semáforo

§33 es explícito: *"El porcentaje no debe ser un valor manual arbitrario."*
Este documento fija las tres fórmulas. Las tres se implementan como **funciones
puras** en `src/features/repairs/services/`, se prueban sin base de datos, y se
replican en SQL para que el tablero calcule doscientas órdenes de una vez.

---

## 11.1 Porcentaje de avance

### Fórmula

El avance es la **suma ponderada del avance de ocho etapas**:

```
avance(orden) = Σ  peso(e) × completitud(e, orden)        ∈ [0, 100]
               e ∈ etapas
```

Los pesos son **filas** en `app_settings` (clave `progress.stage_weights`), no
constantes de código. Los valores de arranque:

| Etapa | Peso | Completitud: de dónde sale |
| --- | --: | --- |
| Recepción | 5 | ítems de checklist resueltos ÷ ítems obligatorios |
| Diagnóstico | 15 | 0 · **0,5** en curso · 1 completado |
| Autorización | 10 | ítems decididos ÷ ítems cotizados |
| Repuestos | 15 | `orderCoverage` de [§10](10-repuestos-y-compras.md) · **1** si no hay repuestos |
| Reparación | 40 | ver abajo |
| Calidad | 5 | 0 · **0,5** en curso · 1 aprobado |
| Servicios finales | 7 | etapas terminadas ÷ etapas configuradas · **1** si ninguna |
| Entrega | 3 | 0 · 1 entregado |

**Cinco de las ocho etapas se cuentan sobre hechos reales** (ítems resueltos,
decididos, unidades recibidas, trabajos hechos, etapas finales terminadas). Las
otras tres son binarias con crédito parcial, sencillamente porque dentro de
ellas no hay nada que contar de forma significativa. Está dicho aquí de forma
explícita para que nadie lo confunda con una estimación caprichosa.

### La etapa de reparación

Es la que más pesa y la que más tarda, así que combina trabajo hecho y esfuerzo
consumido:

```
completitud_reparación = 0,7 × (trabajos hechos ÷ trabajos aprobados)
                       + 0,3 × min(1, minutos efectivos ÷ minutos estimados)
```

- **0,7 al trabajo hecho**, porque es el hecho verificable.
- **0,3 al tiempo consumido**, porque sin eso una orden con un único trabajo
  largo se quedaría clavada en 0 % durante cuatro horas y el asesor no sabría si
  avanza.
- `min(1, …)` impide que pasarse del tiempo estimado empuje la barra por encima
  de lo realmente hecho.
- Vale exactamente **1** en `REPARACION_TERMINADA` y **0** antes de iniciar.

### Ejemplo trabajado

Orden `OS-2026-000154`, Toyota Hilux `ABC-123`, en `EN_REPARACION`:

| Etapa | Peso | Completitud | Aporte |
| --- | --: | --- | --: |
| Recepción | 5 | 1,00 (checklist completo) | 5,00 |
| Diagnóstico | 15 | 1,00 | 15,00 |
| Autorización | 10 | 1,00 (4 de 4 decididos) | 10,00 |
| Repuestos | 15 | 1,00 (cobertura completa) | 15,00 |
| Reparación | 40 | 0,7 × (3/4) + 0,3 × (134/182) = 0,746 | 29,85 |
| Calidad | 5 | 0,00 | 0,00 |
| Finales | 7 | 0,00 | 0,00 |
| Entrega | 3 | 0,00 | 0,00 |
| | | **Avance** | **74,9 % → 75 %** |

### Reglas de borde

| Situación | Avance |
| --- | --- |
| `ENTREGADO` o `CERRADO` | 100 % |
| `CANCELADO` | congelado en el último valor calculado |
| Rechazo en control de calidad | **baja** (el trabajo vuelve a estar incompleto) |
| Ampliación de cotización durante la reparación | **baja** (hay ítems nuevos sin decidir ni ejecutar) |

Que el avance pueda bajar es deliberado. Una barra que solo sube mentiría justo
cuando el asesor más necesita saber la verdad: cuando hay que volver a llamar al
cliente.

---

## 11.2 Hora estimada de finalización (§32)

### Fórmula

Todo se deriva de `repair_time_sessions`, la única verdad del tiempo:

```
efectivo = Σ duración de sesiones kind = 'trabajo'
pausado  = Σ duración de sesiones kind = 'pausa'
bruto    = ahora − inicio                        (= efectivo + pausado)
restante = max(0, estimado − efectivo)

ETA = ahora + restante          si está trabajando
ETA = ahora + restante          si está pausado por un motivo corto
ETA = null (indeterminada)      si está pausado por un motivo con blocks_eta
```

`pause_reasons.blocks_eta` marca las esperas que dependen de un tercero
—`espera_autorizacion`, `espera_repuestos`—. Ahí la hora de término no es
desconocida por falta de cálculo: es **genuinamente desconocida**, y decir "4:25
PM" sería inventar. El tablero muestra "en espera" y el semáforo pasa a gris.

Las marcas de tiempo las pone `now()` de **PostgreSQL**, nunca el reloj del
navegador. Si dependieran de la tablet, el indicador de productividad de §47
sería manipulable cambiando la hora del dispositivo.

### Ejemplo

```
Inicio                 10:00
Estimado             3 h 30 min  (210 min)
Efectivo a las 13:00   134 min
Pausado                 46 min   (refrigerio 30 + herramienta 16)
Restante             210 − 134 = 76 min
ETA                  13:00 + 76 min  →  14:16
```

Obsérvese que la ETA **no** es `inicio + estimado` (13:30): las pausas la
desplazan, que es exactamente lo que un asesor necesita para llamar al cliente
con un dato cierto.

### Aviso de retraso (§64)

```
riesgo_de_retraso  ⇔  ETA > hora_prometida + tolerancia   (tolerancia: 15 min por defecto)
```

Al cruzar el umbral —y **solo la primera vez**, para no convertir la alerta en
ruido— se marca la orden y se notifica al asesor, con la ETA anterior y la
nueva. El asesor se adelanta y avisa al cliente antes de que el cliente llame.

---

## 11.3 Semáforo operacional (§44)

Se evalúa en este orden y **gana la primera que se cumple**:

| Color | Condición | Significado |
| --- | --- | --- |
| ⬜ **GRIS** | El estado está en la lista de espera de terceros, **o** la ETA es indeterminada | Esperando a alguien que no es el taller: cliente, proveedor o autorización |
| 🟥 **ROJO** | `ahora > hora_prometida` **o** `ETA > hora_prometida + tolerancia` | Retrasada, o va a estarlo |
| 🟨 **AMARILLO** | `restante ≤ 20 % de estimado` **o** `hora_prometida − ETA ≤ 30 min` | Riesgo: sin margen |
| 🟩 **VERDE** | Todo lo demás | Dentro del tiempo previsto |

Estados que dan **gris**: `COTIZACION_ENVIADA`, `ESPERANDO_CLIENTE`,
`SOLICITUD_REPUESTOS`, `REPUESTOS_EN_COTIZACION`,
`COMPRA_PENDIENTE_AUTORIZACION`, `COMPRA_AUTORIZADA`, `ORDEN_COMPRA_GENERADA`,
`ESPERANDO_REPUESTOS`, `REPUESTOS_PARCIALES`.

**El gris va antes que el rojo a propósito.** Una orden lleva seis días parada
porque el cliente no contesta: pintarla de rojo la mezcla con las que el taller
está gestionando mal, y el tablero pierde su utilidad. En gris, el asesor ve de
un vistazo qué depende de él y qué depende de un tercero — que son dos listas de
tareas completamente distintas.

Los umbrales (20 %, 30 min, 15 min de tolerancia) viven en `app_settings`.

---

## 11.4 Las dos implementaciones, y cómo no divergen

| Dónde | Para qué |
| --- | --- |
| `src/features/repairs/services/progress.ts` | Detalle de **una** orden; datos ya cargados |
| `public.fn_order_progress(uuid[])` | Tablero: **todas** las órdenes vivas en una llamada |

Traer 200 órdenes con sus sesiones de tiempo, ítems y recepciones para calcular
en JavaScript sería recorrer decenas de miles de filas dentro de la función
serverless en cada carga del tablero. Por eso existe la versión SQL.

Es el **único punto de duplicación consciente** del sistema, y se protege así:
un conjunto de casos en `db/tests/03-progreso.sql` se ejecuta contra las dos
implementaciones y compara los resultados. Si divergen, la prueba falla. La
duplicación está permitida; la divergencia silenciosa, no.
