import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkActa,
  nextSequence,
  orderCodeFor,
  receptionCode,
  type CompletedReception,
} from './acta';

const HOY = new Date('2026-09-14T12:00:00Z');
const rec = (code: string): CompletedReception => ({
  code, plate: 'ABC123', vehicle: 'Toyota Hilux', customer: 'Juan Pérez', customerId: null,
  closedAt: HOY.toISOString(), checklistResolved: 42, checklistTotal: 42, damageCount: 0,
  photoCount: 6, customerSignature: null, advisorName: 'Ricardo', orderCode: 'OT-2026-0001',
});

const base = {
  checklistResolved: 42, checklistTotal: 42, signed: true,
  damagedWithoutPhoto: 0, generalShots: 6, generalShotsTotal: 6,
};

describe('el acta de recepción', () => {
  describe('los códigos', () => {
    it('son legibles: alguien los dice por teléfono', () => {
      assert.equal(receptionCode(HOY, 7), 'REC-2026-0007');
      assert.equal(orderCodeFor(HOY, 7), 'OT-2026-0007');
    });

    it('el correlativo continúa a partir de lo que ya hay', () => {
      assert.equal(nextSequence([]), 1);
      assert.equal(nextSequence([rec('REC-2026-0003'), rec('REC-2026-0011')]), 12);
    });

    it('un código ilegible no rompe el contador', () => {
      assert.equal(nextSequence([rec('sin-numero')]), 1);
    });
  });

  describe('qué impide cerrar', () => {
    /*
     * ESTA es la distinción que justifica el módulo.
     *
     * BLOQUEA lo que hace que el acta no pruebe nada: sin checklist terminado
     * no se sabe qué se revisó, y sin firma es un papel que nadie aceptó.
     */
    it('el checklist a medias y la firma que falta', () => {
      assert.deepEqual(
        checkActa({ ...base, checklistResolved: 40 }).blockers,
        ['Faltan 2 puntos del checklist por revisar.'],
      );
      assert.deepEqual(checkActa({ ...base, signed: false }).blockers, ['Falta la firma del cliente.']);
      assert.equal(checkActa(base).ready, true);
    });

    it('los dice en el orden en que hay que resolverlos', () => {
      // Primero se termina el checklist y DESPUÉS se firma: firmar algo que
      // todavía se puede cambiar es lo que una firma no puede permitir.
      const r = checkActa({ ...base, checklistResolved: 41, signed: false });
      assert.match(r.blockers[0] ?? '', /checklist/);
      assert.match(r.blockers[1] ?? '', /firma/);
    });
  });

  describe('qué solo avisa', () => {
    /*
     * Una foto puede faltar por una razón legítima —la zona no se ve, el
     * vehículo está pegado a la pared—. Bloquear por eso deja el coche en el
     * patio sin orden, que le cuesta más al taller que la foto que falta.
     */
    it('las fotos que faltan no bloquean', () => {
      const r = checkActa({ ...base, damagedWithoutPhoto: 2, generalShots: 4 });
      assert.equal(r.ready, true, 'las fotos no pueden bloquear el cierre');
      assert.equal(r.blockers.length, 0);
      assert.equal(r.warnings.length, 2);
      assert.match(r.warnings[0] ?? '', /2 daños marcados sin foto/);
      assert.match(r.warnings[1] ?? '', /2 tomas generales/);
    });

    it('sin nada que avisar, no inventa avisos', () => {
      assert.deepEqual(checkActa(base).warnings, []);
    });

    it('el singular se escribe en singular', () => {
      const r = checkActa({ ...base, damagedWithoutPhoto: 1, generalShots: 5 });
      assert.match(r.warnings[0] ?? '', /^Hay un daño/);
      assert.match(r.warnings[1] ?? '', /^Falta una toma/);
    });
  });
});
