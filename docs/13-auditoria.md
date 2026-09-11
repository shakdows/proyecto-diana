# 13. Estrategia de auditoría

## 13.1 Dos mecanismos, porque protegen de cosas distintas

| Mecanismo | Qué registra | Por qué ahí |
| --- | --- | --- |
| **Disparadores de base de datos** | Cambios de estado, cambios de precio en cotización, revelación de DNI, borrados lógicos | **No se pueden saltar.** Ni desde un script de corrección, ni desde `psql`, ni desde una migración mal escrita |
| **Capa de aplicación** | Intención: quién, desde qué IP, con qué navegador, con qué motivo | La base de datos no conoce la IP ni el propósito de la acción |

Solo con disparadores se pierde el contexto; solo con la aplicación, el registro
es opcional en la práctica — y lo que es opcional se olvida el día que corre
prisa. Los dos juntos dan un registro completo y no evitable.

## 13.2 Qué se audita siempre (§59)

| Evento | Antes / después |
| --- | --- |
| Cambio de estado de la orden | `from_status` → `to_status` (además en `status_history`) |
| Creación y emisión de cotización | Versión, líneas, totales |
| **Cambio de precio de una línea** | Importe anterior → nuevo |
| Aplicación de descuento | Importe y motivo |
| Decisión del cliente por ítem | Estado anterior → nuevo, canal, IP |
| Autorización de compra | Monto, proveedor, autorizador |
| Modificación de una solicitud de repuestos | Cantidad anterior → nueva |
| Recepción de repuestos | Cantidades recibidas y rechazadas |
| **Revelación de un DNI completo** | Quién, qué cliente, cuándo |
| Eliminación lógica de una evidencia | Archivo, ancla, motivo |
| Alta, baja y cambio de rol de usuario | Rol anterior → nuevo |
| Cambio de permisos de un rol | Permisos antes → después |
| Cambio de un ajuste del sistema | Valor anterior → nuevo |
| Generación de un informe | Tipo, filtros, alcance |
| Acceso al portal con token | Token, IP, user-agent |
| Cierre y cancelación de orden | Motivo |

## 13.3 La fila

```
audit_logs
  actor_profile_id     nullable — nulo en acciones del portal y del sistema
  actor_kind           usuario | portal_cliente | sistema
  entity               'quotation_items'
  entity_id            uuid
  action               'precio_modificado'
  before               jsonb  {"unit_price": 450.00}
  after                jsonb  {"unit_price": 520.00}
  reason               texto, obligatorio en acciones sensibles
  ip                   inet
  user_agent           texto
  service_order_id     desnormalizado: permite ver "todo lo ocurrido en OS-154"
  corporate_client_id  desnormalizado: permite aplicar RLS sin joins
  created_at
```

`before` y `after` guardan **solo los campos que cambiaron**, no la fila
entera. Una fila completa por cada cambio multiplica el tamaño de la tabla por
el número de columnas sin añadir información: lo que se quiere saber es qué
cambió.

## 13.4 Reglas de la tabla

| Regla | Cómo se hace cumplir |
| --- | --- |
| **Solo se inserta** | Sin políticas `UPDATE` ni `DELETE`. Ni el `super_admin` puede editarla |
| Se lee con permiso | `audit:read`, y RLS limita al alcance corporativo |
| No guarda secretos | Nunca contraseñas, tokens ni `document_number` completo — se registra *que* se reveló, no el valor |
| Se conserva | Mínimo 5 años; particionada por mes cuando el volumen lo pida |
| No bloquea | Si el registro de auditoría falla, se registra el fallo y la operación continúa — salvo en revelación de PII, donde **sin auditoría no hay revelación** |

Esa última excepción es la que importa: en todo lo demás la auditoría acompaña a
la operación; en el acceso a datos personales, la condiciona.

## 13.5 Pantalla de auditoría

`/admin/auditoria`, con permiso `audit:read`. Filtros por usuario, entidad,
acción, orden de servicio, rango de fechas y cliente corporativo. Cada fila
muestra el antes y el después en forma de diferencia legible, no de JSON crudo.

Desde el detalle de una orden, `/ordenes/[id]/linea-tiempo` combina
`status_history` (el recorrido) y `audit_logs` (las modificaciones) en un solo
hilo cronológico. Es la pantalla que responde a "¿qué pasó exactamente con este
vehículo?" sin tener que cruzar nada a mano.
