/**
 * De lo que se escribió en el formulario al cliente que ve la lista.
 *
 * ⚠️ ESTO NO GUARDA NADA. Solo da forma. Quien llama decide dónde va a parar
 * —hoy `localStorage` de la demostración, mañana un `INSERT` con RLS—, y por
 * eso esta función no toca ni el navegador ni la red: se puede probar entera
 * sin montar nada.
 *
 * ── Por qué el documento se trunca aquí ────────────────────────────────────
 *
 * `DemoCustomer` solo tiene `documentLast`, y no por descuido: la base guarda
 * el número completo con `REVOKE SELECT` a `authenticated` y una columna
 * generada con los tres últimos (docs/04 §4.9). La pantalla nunca ve el
 * entero. Si esta función guardara el documento completo en `localStorage`,
 * la demostración estaría filtrando en el navegador justo el dato que la base
 * protege con permisos, y cualquiera con la consola abierta lo leería.
 *
 * Así que se trunca en el momento de convertir, y el completo se queda en el
 * formulario, que muere al cerrarse el modal.
 */

import { normalizeDocument, type CustomerKind, type DocumentType } from './identity';
import type { DemoCustomer } from '../demo';

/** Lo que el formulario entrega. Deliberadamente no es `NewCustomerDraft`:
 *  esta capa no debe depender de un componente. */
export interface CustomerInput {
  readonly kind: CustomerKind;
  readonly documentType: DocumentType;
  readonly document: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly businessName: string;
  readonly tradeName: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email: string;
  readonly corporateClient: string | null;
}

/** Vacío es `null`, no `''`. Una cadena vacía se cuela en las pantallas como
 *  un dato presente y pinta etiquetas sin contenido. */
function orNull(value: string): string | null {
  const limpio = value.trim();
  return limpio === '' ? null : limpio;
}

/** Los tres últimos caracteres del documento. Lo único que la pantalla puede
 *  llegar a ver, y por tanto lo único que se guarda. */
export function documentLastOf(document: string): string {
  return normalizeDocument(document).slice(-3);
}

/**
 * Identificador del cliente nuevo.
 *
 * Lleva el sello `nuevo-` a propósito: mientras no haya base, cualquier cosa
 * que empiece así salió de este navegador y no del catálogo de demostración.
 * Cuando haya `INSERT`, el identificador lo pone Postgres y esta función
 * desaparece.
 */
export function newCustomerId(now: number, seed = ''): string {
  const sufijo = seed === '' ? Math.random().toString(36).slice(2, 6) : seed;
  return `nuevo-${String(now)}-${sufijo}`;
}

export function customerFromInput(
  input: CustomerInput,
  id: string,
): DemoCustomer {
  const empresa = input.kind === 'empresa';

  return {
    id,
    kind: input.kind,
    firstName: empresa ? null : orNull(input.firstName),
    /* En una empresa el contacto principal ES el nombre de quien atiende, y
       guardarlo como apellido de la empresa daría «Transportes del Sur Rosa
       Delgado» en cualquier pantalla que concatene. */
    lastName: empresa ? null : orNull(input.lastName),
    businessName: empresa ? orNull(input.businessName) : null,
    documentType: input.documentType,
    documentLast: documentLastOf(input.document),
    phone: orNull(input.phone),
    altPhone: null,
    email: orNull(input.email),
    address: null,
    /* Nadie lo ha elegido todavía. El teléfono es por donde se avisa del
       avance, así que WhatsApp es lo que de verdad se va a usar el primer
       día; se cambia desde la ficha. */
    contactPreference: 'whatsapp',
    corporateClient: input.corporateClient,
    /* No ha venido nunca: `null` es «sin visitas», que es la verdad. Un `0`
       diría «vino hoy» y pintaría al cliente como si ya hubiera pasado por
       el taller. */
    lastVisitDaysAgo: null,
    /* Sin vehículo: se le añade en la recepción, que es donde hay una placa
       delante. Pedirlo aquí obligaría a inventárselo. */
    vehicles: [],
    isDemo: true,
  };
}
