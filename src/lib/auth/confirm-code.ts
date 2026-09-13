/**
 * La clave que confirma lo que no tiene vuelta atrás.
 *
 * ── ⚠ NO ES UNA CONTRASEÑA ────────────────────────────────────────────────
 *
 * Vive en el navegador: cualquiera que abra las herramientas de desarrollo la
 * lee en diez segundos. No defiende de nadie que quiera saltársela.
 *
 * Lo que sí evita es el resbalón, que es el riesgo real de un taller: un dedo
 * apoyado en la tablet que borra la ficha de un cliente con diez visitas, o
 * la foto del golpe que el cliente va a reclamar dentro de dos meses. Para
 * eso —y solo para eso— sirve.
 *
 * Vive aquí, y no dentro de clientes, porque la usan cosas que no tienen nada
 * que ver entre sí: borrar un cliente y borrar una evidencia. Dos copias de
 * la misma clave se separan el día que alguien cambia una.
 *
 * Cuando haya base de datos, cada borrado pasa por su permiso comprobado en
 * el servidor, por RLS y por `audit_logs`. Nada de eso lo hace esta clave.
 */

export const DELETE_CODE: string =
  process.env.NEXT_PUBLIC_DIANA_DELETE_CODE?.trim() ?? '1234';

export interface CodeCheck {
  readonly valid: boolean;
  readonly problem: string;
}

export function checkDeleteCode(typed: string): CodeCheck {
  if (typed.trim() === '') return { valid: false, problem: 'Escribe la clave para confirmar.' };
  if (typed.trim() !== DELETE_CODE) return { valid: false, problem: 'La clave no es correcta.' };
  return { valid: true, problem: '' };
}
