import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { demoCustomers, demoCorporateClients, toSearchable } from './demo';
import { displayName } from './services/identity';
import { findDuplicates, searchCustomers } from './services/search';

const AHORA = new Date('2026-09-11T15:00:00');
const CARTERA = demoCustomers(AHORA);

describe('la cartera de demostración', () => {
  it('no repite teléfonos entre clientes distintos', () => {
    // ⚠️ Esta es la prueba que faltaba. Siete de las ocho órdenes heredaban el
    // teléfono de la plantilla, así que buscar «987654321» devolvía media
    // cartera y el control de duplicados avisaba siempre —que es exactamente
    // igual que no avisar nunca—. No dio la cara hasta que hubo un buscador.
    const vistos = new Map<string, string>();
    for (const c of CARTERA) {
      if (c.phone === null) continue;
      const previo = vistos.get(c.phone);
      assert.equal(
        previo,
        undefined,
        `«${displayName(c)}» comparte teléfono con «${previo ?? ''}»: ${c.phone}`,
      );
      vistos.set(c.phone, displayName(c));
    }
  });

  it('no repite el final del documento dentro del mismo tipo', () => {
    const vistos = new Map<string, string>();
    for (const c of CARTERA) {
      const clave = `${c.documentType}:${c.documentLast}`;
      const previo = vistos.get(clave);
      assert.equal(previo, undefined, `«${displayName(c)}» choca con «${previo ?? ''}» en ${clave}`);
      vistos.set(clave, displayName(c));
    }
  });

  it('no repite correos', () => {
    const correos = CARTERA.map((c) => c.email).filter((e) => e !== null);
    assert.equal(new Set(correos).size, correos.length);
  });

  it('no repite placas entre vehículos', () => {
    const placas = CARTERA.flatMap((c) => c.vehicles.map((v) => v.plate));
    assert.equal(new Set(placas).size, placas.length, 'hay una placa duplicada');
  });

  it('tiene clientes con y sin orden abierta', () => {
    // Una cartera donde todos están hoy en el taller no se parece a ninguna
    // cartera real, y hace que el buscador no tenga a quién encontrar.
    const conOrden = CARTERA.filter((c) => c.vehicles.some((v) => v.openOrderId !== null));
    const sinOrden = CARTERA.filter((c) => c.vehicles.every((v) => v.openOrderId === null));
    assert.ok(conOrden.length >= 5, 'pocos clientes con orden abierta');
    assert.ok(sinOrden.length >= 3, 'pocos clientes sin orden abierta');
  });

  it('tiene personas y empresas', () => {
    assert.ok(CARTERA.some((c) => c.kind === 'persona'));
    assert.ok(CARTERA.some((c) => c.kind === 'empresa'));
  });

  it('las empresas llevan RUC y las personas no', () => {
    for (const c of CARTERA) {
      if (c.kind === 'empresa') assert.equal(c.documentType, 'RUC', displayName(c));
      else assert.notEqual(c.documentType, 'RUC', displayName(c));
    }
  });

  it('cada empresa corporativa citada existe en el catálogo', () => {
    // Si un cliente apunta a una empresa que no está en `corporate_clients`,
    // el desplegable de la ficha no puede mostrar su valor actual.
    const catalogo = new Set(demoCorporateClients());
    for (const c of CARTERA) {
      if (c.corporateClient === null) continue;
      assert.ok(catalogo.has(c.corporateClient), `«${c.corporateClient}» no está en el catálogo`);
    }
  });
});

describe('la cartera contra la búsqueda', () => {
  const buscables = CARTERA.map(toSearchable);

  it('cada cliente se encuentra por su propio nombre', () => {
    for (const c of CARTERA) {
      const nombre = displayName(c);
      const encontrados = searchCustomers(buscables, nombre);
      assert.equal(encontrados[0]?.id, c.id, `«${nombre}» no sale primero al buscarse a sí mismo`);
    }
  });

  it('cada placa lleva a un solo cliente', () => {
    for (const c of CARTERA) {
      for (const v of c.vehicles) {
        const encontrados = searchCustomers(buscables, v.plate);
        assert.equal(encontrados.length, 1, `la placa ${v.plate} devuelve varios clientes`);
        assert.equal(encontrados[0]?.id, c.id);
      }
    }
  });

  it('cada teléfono lleva a un solo cliente', () => {
    for (const c of CARTERA) {
      if (c.phone === null) continue;
      const dup = findDuplicates(buscables, { phone: c.phone });
      assert.equal(dup.length, 1, `el teléfono de «${displayName(c)}» coincide con varios`);
    }
  });
});
