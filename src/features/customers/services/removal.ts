/**
 * Quitar un cliente de la cartera.
 *
 * ── ⚠ LA CLAVE DE AQUÍ NO ES UNA CONTRASEÑA ───────────────────────────────
 *
 * Es un freno contra el clic accidental, como escribir el nombre de un
 * repositorio antes de borrarlo. Vive en el navegador, así que cualquiera que
 * abra las herramientas de desarrollo la lee en diez segundos: no protege
 * nada de nadie que quiera saltársela.
 *
 * Lo que SÍ protege: que alguien apoye el dedo en la pantalla de recepción y
 * se lleve por delante la ficha de un cliente con diez visitas. Ese es el
 * riesgo real de un taller, y para ese sirve.
 *
 * Cuando haya base de datos, borrar un cliente tiene que pasar por:
 *   · el permiso `customers:delete`, comprobado en el servidor;
 *   · una política RLS que decida si esa fila existe para quien pide;
 *   · una fila en `audit_logs` con quién, qué y cuándo;
 *   · y borrado lógico, no `DELETE`: un cliente con órdenes no se borra, se
 *     archiva, o las órdenes se quedan huérfanas y los informes dejan de
 *     cuadrar.
 *
 * Nada de eso lo hace esta pantalla. Esta pantalla solo evita el resbalón.
 *
 * La clave en sí vive en `lib/auth/confirm-code.ts`: la usan cosas que no
 * tienen nada que ver entre sí —borrar un cliente, borrar una evidencia— y
 * dos copias se separan el día que alguien cambia una.
 */

export { DELETE_CODE, checkDeleteCode } from '@/lib/auth/confirm-code';

/**
 * Qué pasa de verdad al borrar, según de dónde venga el cliente.
 *
 * No es lo mismo y la pantalla tiene que decirlo. Un cliente creado en la
 * prueba se va del todo —lo escribió este navegador y este navegador lo
 * quita—. Uno del catálogo sembrado NO se puede borrar: lo manda el servidor
 * en cada carga, así que lo único que cabe es dejar de enseñarlo aquí.
 * Llamar «eliminado» a las dos cosas sería mentir en una de ellas.
 */
export type RemovalKind = 'creado' | 'sembrado';

export function removalKind(id: string): RemovalKind {
  return id.startsWith('nuevo-') ? 'creado' : 'sembrado';
}

export function removalWarning(kind: RemovalKind, openOrders: number): string {
  if (openOrders > 0) {
    return openOrders === 1
      ? 'Tiene una orden abierta en el taller. Al quitarlo, esa orden se queda sin dueño en la lista de clientes.'
      : `Tiene ${String(openOrders)} órdenes abiertas en el taller. Al quitarlo, esas órdenes se quedan sin dueño en la lista de clientes.`;
  }
  return kind === 'creado'
    ? 'Se borra de este navegador y no se puede deshacer.'
    : 'Es un cliente del catálogo de demostración: no se borra, deja de aparecer en este navegador. Vuelve con «Comenzar de nuevo».';
}

/** El botón de confirmar dice lo que va a hacer, no «Aceptar». */
export function removalLabel(kind: RemovalKind): string {
  return kind === 'creado' ? 'Eliminar cliente' : 'Ocultar cliente';
}
