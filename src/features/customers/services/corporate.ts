/**
 * La empresa corporativa del cliente, cuando hay una.
 *
 * «Corporativo» aquí significa quién paga y bajo qué acuerdo: una flota de
 * renting, un banco que asegura el vehículo, un concesionario que manda su
 * garantía. No es el empleador del cliente ni un dato de marketing; decide si
 * el coche puede salir con el saldo pendiente y a quién se le factura.
 *
 * ── Por qué se puede escribir una que no está en la lista ──────────────────
 *
 * El catálogo lo mantiene administración, y cerrarlo del todo parece
 * prudente: nadie inventa empresas y los nombres quedan limpios. Pero el
 * cliente está DELANTE, con las llaves en la mano, y la empresa que lo manda
 * acaba de firmar un acuerdo que todavía no está cargado. Si la pantalla no
 * la deja escribir, el asesor hace lo único que puede hacer: dejarla en «sin
 * empresa» y avisar a alguien. Ese aviso no llega nunca, y el dato se pierde
 * justo en el momento en que alguien lo tenía.
 *
 * Así que se deja escribir, y el nombre nuevo se marca como tal para que
 * quien lo reciba sepa que hay una empresa por dar de alta de verdad —con su
 * RUC, su acuerdo y su color de marca— y no un nombre suelto más.
 *
 * ── Lo que sí se impide ────────────────────────────────────────────────────
 *
 * Crear «mitsui» al lado de «Mitsui». Es el fallo que rompe cualquier lista
 * abierta: a los seis meses hay cuatro formas de escribir la misma empresa y
 * ningún informe cuadra. Quien escribe un nombre que ya existe no recibe un
 * error —no ha hecho nada mal—: se le reconoce el que ya está.
 */

import { fold } from './search';

/**
 * El valor del `<option>` que abre el campo de texto.
 *
 * Empieza y acaba en `·`, que no es un carácter que nadie teclee en el nombre
 * de una empresa: así nunca choca con un nombre real del catálogo.
 */
export const NUEVA_EMPRESA = '·nueva·';

export interface CorporateNameCheck {
  readonly valid: boolean;
  /** Qué decirle a quien escribe. Vacío cuando es válido. */
  readonly problem: string;
}

/** Longitud máxima. `corporate_clients.name` es `varchar(120)`. */
const MAX = 120;

/**
 * Comprueba el nombre escrito a mano.
 *
 * Dos reglas, y ninguna sobre el formato del nombre: una empresa puede
 * llamarse «3M», «AJE» o «Renting Latinoamérica S.A.». Inventar aquí un
 * patrón de nombre corporativo solo serviría para rechazar empresas reales.
 */
export function checkCorporateName(value: string): CorporateNameCheck {
  const limpio = value.trim();
  if (limpio === '') return { valid: false, problem: 'Escribe el nombre de la empresa.' };
  if (limpio.length < 2) {
    return { valid: false, problem: 'El nombre es demasiado corto.' };
  }
  if (limpio.length > MAX) {
    return { valid: false, problem: `El nombre no puede pasar de ${String(MAX)} caracteres.` };
  }
  return { valid: true, problem: '' };
}

/**
 * Busca en el catálogo una empresa que sea LA MISMA que la escrita.
 *
 * Compara sin acentos, sin mayúsculas y sin signos —`fold`—, que es lo que
 * atrapa «mitsui», «MITSUI» y «Mitsui.». No intenta ir más lejos: «Mitsui
 * Automotriz» NO es «Mitsui» para esta función, porque podrían ser dos
 * acuerdos distintos de un mismo grupo y decidirlo no le toca a la pantalla.
 */
export function findCorporate(
  catalog: readonly string[],
  written: string,
): string | undefined {
  const clave = fold(written);
  if (clave === '') return undefined;
  return catalog.find((c) => fold(c) === clave);
}

export interface CorporateChoice {
  /** El nombre que se guarda, o `null` si el cliente no tiene empresa. */
  readonly name: string | null;
  /** `true` solo si hay que dar de alta la empresa además del cliente. */
  readonly isNew: boolean;
  /** Cuando lo escrito ya existía: el nombre del catálogo que se reconoció. */
  readonly matched?: string;
}

/**
 * Resuelve lo elegido en la lista y lo escrito a mano en una sola respuesta.
 *
 * Es la única función que decide si una empresa es nueva, y por eso está
 * aparte de la pantalla: el mismo criterio tiene que valer cuando la escriba
 * la recepción, cuando llegue de una importación y cuando la mande una
 * integración. Tres sitios decidiendo por su cuenta es cómo se llena el
 * catálogo de duplicados.
 */
export function resolveCorporate(
  catalog: readonly string[],
  selected: string,
  written: string,
): CorporateChoice {
  if (selected !== NUEVA_EMPRESA) {
    return { name: selected === '' ? null : selected, isNew: false };
  }

  const limpio = written.trim().replace(/\s+/gu, ' ');
  if (!checkCorporateName(limpio).valid) return { name: null, isNew: false };

  const existente = findCorporate(catalog, limpio);
  if (existente !== undefined) return { name: existente, isNew: false, matched: existente };

  return { name: limpio, isNew: true };
}
