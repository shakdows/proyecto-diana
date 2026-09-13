import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AVISO_DIAS,
  LICENSE_CATEGORIES,
  canSaveLicense,
  categoryLabel,
  checkExpiry,
  checkLicenseNumber,
  daysUntil,
  expiryPhrase,
  licenseFrom,
  licenseStatus,
  normalizeLicense,
  type DriverLicense,
} from './license';

const HOY = new Date('2026-09-13T15:00:00Z');
const lic = (expiresOn: string | null): DriverLicense => ({
  number: 'Q43802725',
  category: 'A-I',
  expiresOn,
  restrictions: null,
});

describe('la licencia de conducir', () => {
  describe('el número', () => {
    it('se guarda comparable', () => {
      assert.equal(normalizeLicense('q-4380 2725'), 'Q43802725');
    });

    /*
     * ESTA es la prueba que justifica no validar el patrón peruano nuevo.
     *
     * El número suele ser una letra y ocho cifras, pero no siempre: las
     * antiguas y las extranjeras no lo siguen, y el taller atiende a quien
     * entra por la puerta. Exigir el formato nuevo dejaría fuera licencias
     * válidas y quien la tiene delante acabaría tecleando cualquier cosa con
     * la forma correcta para poder guardar.
     */
    it('acepta licencias que no son del formato nuevo', () => {
      for (const n of ['Q43802725', '12345678', 'B1234567', 'ESP-0099123']) {
        assert.equal(checkLicenseNumber(n).valid, true, n);
      }
    });

    it('rechaza lo que no puede ser un número de licencia', () => {
      assert.equal(checkLicenseNumber('').valid, false);
      assert.equal(checkLicenseNumber('Q123').valid, false);
      assert.equal(checkLicenseNumber('Q'.repeat(16)).valid, false);
    });
  });

  describe('la fecha', () => {
    it('es opcional', () => {
      assert.equal(checkExpiry('').valid, true);
    });

    it('pide el formato con el que se escribe una fecha', () => {
      for (const v of ['14/03/2027', '2027-3-14', 'marzo']) {
        assert.equal(checkExpiry(v).valid, false, v);
      }
      assert.equal(checkExpiry('2027-03-14').valid, true);
    });

    it('rechaza un año que es un error de tecleo', () => {
      assert.equal(checkExpiry('0227-03-14').valid, false);
    });
  });

  describe('el vencimiento', () => {
    it('cuenta los días que faltan', () => {
      assert.equal(daysUntil('2026-09-13', HOY), 0);
      assert.equal(daysUntil('2026-09-14', HOY), 1);
      assert.equal(daysUntil('2026-09-03', HOY), -10);
    });

    /*
     * El estado es lo que de verdad opera. Una licencia vencida convierte una
     * prueba de ruta en un problema del TALLER, no del cliente, y para eso hay
     * que verlo antes de sacar el coche a la calle.
     */
    it('avisa antes de que venza, no cuando ya venció', () => {
      assert.equal(licenseStatus(lic('2026-09-12'), HOY), 'vencida');
      assert.equal(licenseStatus(lic('2026-09-13'), HOY), 'por-vencer');
      assert.equal(licenseStatus(lic('2026-11-12'), HOY), 'por-vencer', `${String(AVISO_DIAS)} días`);
      assert.equal(licenseStatus(lic('2026-11-13'), HOY), 'vigente');
      assert.equal(licenseStatus(lic(null), HOY), 'sin-fecha');
    });

    it('lo dice en días, que es con lo que se decide', () => {
      // «Vence el 2027-03-14» no le dice nada a nadie de pie en el mostrador.
      assert.equal(expiryPhrase(lic('2026-09-13'), HOY), 'Vence hoy');
      assert.equal(expiryPhrase(lic('2026-09-14'), HOY), 'Vence mañana');
      assert.equal(expiryPhrase(lic('2026-09-25'), HOY), 'Vence en 12 días');
      assert.equal(expiryPhrase(lic('2026-09-12'), HOY), 'Vencida ayer');
      assert.equal(expiryPhrase(lic('2026-09-03'), HOY), 'Vencida hace 10 días');
      assert.equal(expiryPhrase(lic('2027-03-14'), HOY), 'Vigente hasta el 2027-03-14');
      assert.equal(expiryPhrase(lic(null), HOY), 'Sin fecha de vencimiento');
    });
  });

  describe('las categorías', () => {
    it('dicen qué conduce, no repiten el código', () => {
      // Quien rellena esto reconoce «A-IIb»; quien lee la ficha después
      // necesita saber si esa persona puede mover el camión del patio.
      assert.match(categoryLabel('A-IIb'), /[Cc]arga/);
      assert.match(categoryLabel('B-I'), /[Mm]otocicleta/);
    });

    it('devuelve el código cuando no conoce la categoría', () => {
      assert.equal(categoryLabel('Z-9'), 'Z-9');
    });

    it('no tiene códigos repetidos', () => {
      const codigos = LICENSE_CATEGORIES.map((c) => c.code);
      assert.equal(new Set(codigos).size, codigos.length);
    });
  });

  describe('al guardar', () => {
    it('sin número no hay licencia', () => {
      // Media licencia es peor que ninguna: la ficha la enseñaría como si
      // existiera, con el número en blanco.
      assert.equal(licenseFrom('', 'A-I', '2027-03-14', ''), null);
    });

    it('dejarlo todo vacío es válido: la licencia es opcional', () => {
      assert.equal(canSaveLicense('', ''), true);
    });

    it('con fecha pero sin número, no', () => {
      assert.equal(canSaveLicense('', '2027-03-14'), false);
    });

    it('arma la licencia con lo escrito', () => {
      const l = licenseFrom('q-4380 2725', 'A-IIb', '2027-03-14', 'Lentes');
      assert.deepEqual(l, {
        number: 'Q43802725',
        category: 'A-IIb',
        expiresOn: '2027-03-14',
        restrictions: 'Lentes',
      });
    });

    it('lo que se deja en blanco queda en null', () => {
      const l = licenseFrom('Q43802725', 'A-I', '', '   ');
      assert.equal(l?.expiresOn, null);
      assert.equal(l?.restrictions, null);
    });
  });
});
