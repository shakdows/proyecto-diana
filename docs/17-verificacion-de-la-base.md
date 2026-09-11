# Verificación de la base de datos

> «Las políticas RLS están escritas» y «las políticas RLS aíslan» son
> afirmaciones distintas. Solo la segunda importa, y solo se comprueba
> ejecutándolas.

## Qué hace `npm run db:local`

Levanta un PostgreSQL local, aplica **las migraciones reales** —las mismas que
irán a Supabase—, siembra el catálogo y los datos de demostración, y ejecuta
las cuatro suites de `db/tests/`.

No necesita Supabase, ni credenciales, ni red. `db/local/00-supabase-shim.sql`
reproduce lo único que la aplicación asume de la plataforma: los roles `anon`,
`authenticated` y `service_role`, el esquema `auth` con su tabla `users`, y
`auth.uid()` leyendo el `sub` del JWT desde `request.jwt.claims`.

```
npm run db:local          # aplica, siembra, prueba y apaga
npm run db:local -- --keep  # deja la base en pie para inspeccionarla
```

## Qué se comprueba

**1 · Aislamiento entre empresas.** Con 5 órdenes en la base, el usuario de
BBVA ve 1: la suya. Filtrando explícitamente por Mitsui ve 0 —no un error: las
filas ajenas simplemente no existen para él—. Ve 0 líneas de cotización ajenas,
0 evidencias ajenas, 0 eventos de trazabilidad ajenos y 0 clientes propios del
taller. El analista interno ve las 5.

**2 · Reglas de negocio en la base, no en el formulario.** Se rechaza cambiar
de estado sin declarar la acción, una transición inválida
(`CERRADO --iniciar_trabajo--> EN_REPARACION`), editar importes de una
cotización ya emitida, ejecutar un trabajo que el cliente no aprobó, modificar
la auditoría, borrar la línea de tiempo, abrir una segunda sesión de tiempo,
pausar sin motivo, guardar una placa sin normalizar y subir evidencia sin ancla.

**3 · Portal anónimo.** El rol `anon` no puede leer `service_orders`,
`customers` ni `quotation_items`, no puede resolver un token internamente ni
ejecutar `reveal_document_number`. Un token inválido se rechaza.

**4 · Proyección para el cliente.** El portal devuelve la cotización con sus
ítems, el vehículo y los totales, y **no** filtra costos internos, proveedores
ni notas del técnico. La apertura queda registrada (`view_count`).

**5 · Matriz de permisos.** Compras cotiza, compra y recibe, pero **no**
autoriza el gasto; el asesor sí. El cliente corporativo no ve costos, márgenes,
PII ni otras empresas. Solo el super administrador gestiona roles. Un usuario
desactivado pierde el acceso de inmediato.

## Lo que esto NO significa

Que la aplicación use esa frontera. Hoy las pantallas leen datos de ejemplo en
memoria y la sesión es una cookie de rol sin contraseña. La base está lista y
probada; conectarla es la Fase 3.
