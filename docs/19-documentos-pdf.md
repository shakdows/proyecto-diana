# Documentos PDF

Nueve documentos, servidos por `GET /api/documentos/<tipo>/<id>`.

| Tipo | Destinatario | Qué resuelve |
| --- | --- | --- |
| `checklist` | Cliente | Estado del vehículo al ingresar |
| `orden` | Taller | Acompaña al vehículo por las bahías |
| `diagnostico` | Cliente | Hallazgos, ordenados por prioridad |
| `cotizacion` | Cliente | Importes a autorizar |
| `compra` | Proveedor | Qué se le compra y a qué precio |
| `repuestos` | Interno | Qué falta para poder reparar |
| `trabajo` | Interno | Tiempo efectivo, pausas y pasos |
| `entrega` | Cliente | Acta de conformidad |
| `informe` | Cliente corporativo | Satisfacción del periodo |

La orden de compra acepta `?proveedor=<id>`: hay **una orden por proveedor**.

## Reglas que no son de maquetación

**Ningún documento recalcula.** Los importes salen de `totalsOf`, las métricas
de `computeKpis`, la cobertura de `orderCoverage`, el reloj de `clockView`. Si
el PDF sumara por su cuenta, bastaría un cambio en el IGV para que el papel y
el sistema dijeran cosas distintas — y el cliente cree al papel, porque es lo
que tiene en la mano.

**Lo interno no viaja al cliente.** `visibility.ts` poda costo interno,
proveedor y notas del técnico, construyendo un objeto nuevo con los campos
permitidos en vez de borrar los prohibidos: un campo que se añada mañana al
tipo no aparece en el PDF del cliente hasta que alguien lo añada a propósito.
Encima, `assertSafeForCustomer` recorre el documento armado y falla nombrando
el campo culpable. Es redundante a propósito: un PDF se manda por correo y ya
no se puede retirar.

**El checklist imprime los 42 ítems, también los conformes.** Una hoja que solo
listara los problemas no probaría que lo demás se revisó, y «no está en la
lista» admite dos lecturas opuestas cuando alguien reclama un rayón.

**El diagnóstico va por prioridad, no por sistema.** Quien lo lee decide qué
autorizar con un presupuesto limitado: lo primero que ve debe ser lo que no
puede esperar.

**El acta enmascara el documento de identidad.** Un acta se fotocopia y acaba
en un archivador.

**El pie numera «Página X de Y»** resolviendo el total en `render`: una hoja
suelta de un acta debe decir si falta algo detrás.

## Tres decisiones técnicas

- **Runtime Node, no Edge.** `@react-pdf/renderer` necesita `Buffer` y
  streams; en Edge fallaría solo al desplegar.
- **Helvetica incorporada**, no la fuente de la marca: registrarla obligaría a
  descargarla en cada arranque en frío, a cambio de un detalle que nadie nota
  en papel impreso.
- **`Cache-Control: no-store`**, o el segundo asesor vería los importes del
  primero. Y `inline`, no `attachment`: forzar la descarga de un PDF que solo
  se quería ojear llena la carpeta de descargas de borradores.

## Cómo comprobar qué dice un PDF

```bash
node scripts/pdf-text.mjs documento.pdf
```

Extrae el texto sin abrirlo a mano. Con él se verificó que la cotización
imprime los mismos importes que la pantalla y que el informe imprime el mismo
NPS que el panel. Un PDF que cuadra «a ojo» no cuadra.
