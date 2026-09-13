import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DOCUMENT_RULES,
  checkDocument,
  checkEmail,
  checkPhone,
  displayName,
  formatPhone,
  initialsOf,
  maskDocument,
  normalizeDocument,
  normalizePhone,
  phoneKey,
  ruleFor,
} from './identity';

describe('documento', () => {
  it('acepta un DNI de ocho dígitos', () => {
    assert.deepEqual(checkDocument('DNI', '43802725'), { valid: true, problem: '' });
  });

  it('dice cuántos dígitos faltan, no solo que está mal', () => {
    // «DNI inválido» obliga a contar a mano. Este mensaje no.
    const r = checkDocument('DNI', '4380272');
    assert.equal(r.valid, false);
    assert.match(r.problem, /8 dígitos; escribiste 7/u);
  });

  it('rechaza letras en un DNI', () => {
    assert.equal(checkDocument('DNI', '4380272A').valid, false);
  });

  it('acepta un RUC que empieza por 20', () => {
    assert.equal(checkDocument('RUC', '20100113610').valid, true);
  });

  it('rechaza un RUC que empieza por algo imposible', () => {
    const r = checkDocument('RUC', '99100113610');
    assert.equal(r.valid, false);
    assert.match(r.problem, /empieza por 10, 15, 17 o 20/u);
  });

  it('NO finge validar el dígito verificador', () => {
    // Un RUC con formato correcto pasa aunque no exista. Fingir aquí una
    // validación fuerte daría falsa seguridad de que el dato está comprobado.
    assert.equal(checkDocument('RUC', '20000000000').valid, true);
  });

  it('ignora guiones y espacios al validar', () => {
    assert.equal(checkDocument('DNI', '43 80 27 25').valid, true);
    assert.equal(normalizeDocument('43-80-27-25'), '43802725');
  });

  it('el carné de extranjería no tiene longitud fija pero sí mínimo', () => {
    assert.equal(checkDocument('CE', '00123').valid, false);
    assert.equal(checkDocument('CE', '001234567').valid, true);
  });

  it('un documento vacío no es válido', () => {
    assert.equal(checkDocument('DNI', '').valid, false);
    assert.equal(checkDocument('DNI', '   ').valid, false);
  });
});

describe('enmascarado', () => {
  it('deja ver solo los tres últimos', () => {
    assert.equal(maskDocument('DNI', '725'), '•••••725');
  });

  it('el largo corresponde al tipo, no a lo que recibió', () => {
    // La pantalla nunca ve el documento entero: el largo sale de la regla, así
    // un DNI se ve como un DNI aunque solo hayan llegado tres caracteres.
    assert.equal(maskDocument('DNI', '725').length, 8);
    assert.equal(maskDocument('RUC', '610').length, 11);
  });

  it('nunca deja pasar más de tres caracteres visibles', () => {
    // Si alguien arriba se equivoca y manda el documento entero, aquí se
    // recorta igual: la pantalla no lo enseña.
    assert.equal(maskDocument('DNI', '43802725'), '•••••725');
  });
});

describe('nombre', () => {
  it('junta nombre y apellidos de una persona', () => {
    assert.equal(
      displayName({ kind: 'persona', firstName: 'Juan', lastName: 'Pérez García' }),
      'Juan Pérez García',
    );
  });

  it('usa la razón social en una empresa', () => {
    assert.equal(
      displayName({ kind: 'empresa', businessName: 'Transportes del Sur S.A.C.' }),
      'Transportes del Sur S.A.C.',
    );
  });

  it('sin nombre, lo dice en vez de dejar un hueco', () => {
    assert.equal(displayName({ kind: 'persona' }), 'Cliente sin nombre');
    assert.equal(displayName({ kind: 'empresa', businessName: '  ' }), 'Empresa sin nombre');
  });

  it('las iniciales salen de las dos primeras palabras', () => {
    assert.equal(initialsOf('Juan Pérez García'), 'JP');
    assert.equal(initialsOf('Mitsui'), 'MI');
    assert.equal(initialsOf('   '), '··');
  });
});

describe('teléfono', () => {
  it('el mismo número escrito de tres formas es el mismo', () => {
    // Sin esto el sistema crea el mismo cliente tres veces sin avisar.
    assert.equal(phoneKey('+51 987 654 321'), '987654321');
    assert.equal(phoneKey('987654321'), '987654321');
    assert.equal(phoneKey('987-654-321'), '987654321');
  });

  it('conserva el prefijo internacional al normalizar', () => {
    assert.equal(normalizePhone('+51 987 654 321'), '+51987654321');
  });

  it('formatea en grupos de tres', () => {
    assert.equal(formatPhone('987654321'), '987 654 321');
    assert.equal(formatPhone('+51987654321'), '+51 987 654 321');
  });

  it('un fijo NO se agrupa como móvil', () => {
    // «01 234 5678» también tiene nueve dígitos. Partirlo en tres grupos lo
    // convierte en «012 345 678», que no lo reconoce nadie.
    assert.equal(formatPhone('01 234 5678'), '01 234 5678');
  });
});

describe('reglas', () => {
  it('cada tipo declara si es de persona o de empresa', () => {
    for (const r of DOCUMENT_RULES) {
      assert.ok(r.kind === 'persona' || r.kind === 'empresa');
      assert.ok(r.label.length > 0);
    }
  });

  it('un tipo desconocido falla en vez de devolver algo vacío', () => {
    // @ts-expect-error -- comprobación deliberada de un valor imposible
    assert.throws(() => ruleFor('CEDULA'));
  });
});

describe('el contacto', () => {
  it('un teléfono vacío no es un error: nadie lo pidió', () => {
    assert.equal(checkPhone('').valid, true);
    assert.equal(checkEmail('').valid, true);
  });

  it('acepta el teléfono como lo escribe la gente', () => {
    for (const v of ['987654321', '987 654 321', '+51 987 654 321', '(01) 642-8800']) {
      assert.equal(checkPhone(v).valid, true, v);
    }
  });

  it('rechaza lo que no es un teléfono', () => {
    assert.equal(checkPhone('12345').valid, false);
    assert.equal(checkPhone('9876543210987654').valid, false);
    assert.equal(checkPhone('987-ABC-321').valid, false);
  });

  it('el correo necesita arroba y dominio', () => {
    assert.equal(checkEmail('juan.perez@ejemplo.com').valid, true);
    assert.equal(checkEmail('flota@transportesdelsur.com.pe').valid, true);
    assert.equal(checkEmail('juan.perez').valid, false);
    assert.equal(checkEmail('juan@ejemplo').valid, false);
    assert.equal(checkEmail('juan @ejemplo.com').valid, false);
  });

  it('cada rechazo dice qué arreglar', () => {
    for (const check of [checkPhone('123'), checkEmail('nope')]) {
      assert.ok((check.problem ?? '').length > 0);
    }
  });
});
