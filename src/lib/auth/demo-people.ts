/**
 * Quién es cada puesto en la demostración, y con qué identificador entra.
 *
 * Vive fuera de `session.ts` por una razón concreta: aquello importa
 * `next/headers` y no se puede cargar desde un componente de cliente ni desde
 * una prueba de Node. La pantalla que ASIGNA la orden a un técnico necesita
 * justo dos cosas de aquí —el nombre y el identificador— y las necesita en el
 * navegador.
 *
 * ⚠️ El identificador tiene que ser EL MISMO que devuelve `userForRole`,
 * porque la guarda de la máquina de estados compara
 * `assignedTechnicianId === actor.profileId`. Si los dos sitios lo formaran
 * cada uno por su cuenta, asignar la orden al técnico la dejaría asignada a
 * nadie y el técnico no podría empezar el trabajo: un fallo que no avisa y
 * que solo se ve andando el recorrido entero.
 */

import type { RoleCode } from './permissions';

export const DEMO_PEOPLE: Readonly<Record<RoleCode, string>> = {
  super_admin: 'Andrea López',
  admin: 'Ricardo Salazar',
  asesor: 'Andrea López',
  tecnico: 'Carlos Mendoza',
  planchado_pintura: 'Luis Ramírez',
  compras: 'Patricia Vega',
  calidad: 'Rosa Huamán',
  lavado: 'Miguel Ccahuana',
  alineamiento: 'Miguel Ccahuana',
  analista: 'Diego Salas',
  cliente_corporativo: 'Juan Pérez',
};

/** El identificador con el que entra quien elige ese puesto. */
export function demoProfileId(role: RoleCode): string {
  return `demo-${role}`;
}
