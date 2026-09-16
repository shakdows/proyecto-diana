import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkCredentials, checkEmail, signInError } from './credentials';

describe('el correo', () => {
  it('acepta lo que es una dirección', () => {
    for (const ok of ['a@b.pe', 'andrea.lopez@romeromotors.com', 'x+y@sub.dominio.com.pe']) {
      assert.equal(checkEmail(ok), true, ok);
    }
  });

  it('rechaza lo que no lo es', () => {
    for (const mal of ['', 'andrea', 'andrea@', '@romeromotors.com', 'a b@c.pe', 'a@b']) {
      assert.equal(checkEmail(mal), false, mal);
    }
  });

  it('no se queja por espacios alrededor', () => {
    assert.equal(checkEmail('  andrea@romeromotors.com  '), true);
  });
});

describe('validar antes de preguntar al servidor', () => {
  it('el campo vacío se responde al instante, sin viaje', () => {
    assert.deepEqual(checkCredentials('', 'x'), { valid: false, error: 'Escribe tu correo.' });
    assert.deepEqual(checkCredentials('a@b.pe', ''), {
      valid: false,
      error: 'Escribe tu contraseña.',
    });
  });

  it('avisa del formato antes de mandar nada', () => {
    const r = checkCredentials('andrea', 'clave');
    assert.equal(r.valid, false);
    assert.ok(r.error?.includes('formato'));
  });

  it('con los dos campos bien, deja pasar', () => {
    assert.deepEqual(checkCredentials('andrea@romeromotors.com', 'clave'), {
      valid: true,
      error: null,
    });
  });

  it('no valida la contraseña contra ninguna regla de forma', () => {
    // La regla de complejidad la pone Supabase al CREAR la cuenta. Aplicarla
    // también al entrar dejaría fuera a quien tenga una contraseña antigua.
    assert.equal(checkCredentials('a@b.pe', 'x').valid, true);
  });
});

describe('el error que se enseña', () => {
  it('NO dice cuál de los dos campos falló', () => {
    const msg = signInError('Invalid login credentials');
    assert.equal(msg, 'Correo o contraseña incorrectos.');
    assert.ok(!msg.toLowerCase().includes('no existe'), msg);
  });

  it('traduce los casos que se reconocen', () => {
    assert.ok(signInError('Email not confirmed').includes('no está confirmado'));
    assert.ok(signInError('Too many requests').includes('Demasiados intentos'));
    assert.ok(signInError('User is banned').includes('desactivada'));
  });

  it('deja pasar el mensaje raro en vez de tragárselo', () => {
    const msg = signInError('Something exploded upstream');
    assert.ok(msg.includes('Something exploded upstream'), msg);
  });

  it('no distingue mayúsculas al reconocer', () => {
    assert.equal(signInError('INVALID LOGIN CREDENTIALS'), 'Correo o contraseña incorrectos.');
  });
});
