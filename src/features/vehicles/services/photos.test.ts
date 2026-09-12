import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { demoOrders } from '@/features/demo/board';
import { PHOTO_CUTOUTS, PHOTO_MANIFEST } from './manifest';
import {
  expectedName,
  findPhoto,
  isCutout,
  isPhotoFile,
  missingFor,
  slugify,
} from './photos';

describe('nombre de archivo', () => {
  it('convierte el modelo en algo que sirve como URL', () => {
    assert.equal(slugify('Toyota Hilux SRV'), 'toyota-hilux-srv');
    assert.equal(slugify('MG ZS'), 'mg-zs');
  });

  it('quita acentos antes de filtrar', () => {
    // Sin esto, «Citroën» sería `citro-n` y no casaría nunca.
    assert.equal(slugify('Citroën C4'), 'citroen-c4');
    assert.equal(slugify('Škoda Octavia'), 'skoda-octavia');
  });

  it('no deja guiones sueltos en los extremos', () => {
    assert.equal(slugify('  Kia  Sportage  '), 'kia-sportage');
    assert.equal(slugify('¡Nissan!'), 'nissan');
  });

  it('un nombre sin letras ni números da cadena vacía', () => {
    assert.equal(slugify('—'), '');
  });
});

describe('buscar la foto', () => {
  const manifest = [
    'toyota-hilux.jpg',
    'toyota-corolla.webp',
    'mitsubishi-l200.jpg',
    'kia.png',
    'cat-320d.jpg',
  ];

  it('encuentra la exacta', () => {
    assert.equal(findPhoto(manifest, 'Mitsubishi L200'), '/fotos-de-carros/mitsubishi-l200.jpg');
  });

  it('un nombre genérico sirve para las variantes', () => {
    // `toyota-hilux.jpg` cubre «Toyota Hilux SRV» y «Toyota Hilux 4x4».
    assert.equal(findPhoto(manifest, 'Toyota Hilux SRV'), '/fotos-de-carros/toyota-hilux.jpg');
    assert.equal(findPhoto(manifest, 'Toyota Hilux 4x4'), '/fotos-de-carros/toyota-hilux.jpg');
  });

  it('gana el más específico cuando hay dos que casan', () => {
    const conEspecifica = [...manifest, 'toyota-hilux-srv.jpg'];
    assert.equal(
      findPhoto(conEspecifica, 'Toyota Hilux SRV'),
      '/fotos-de-carros/toyota-hilux-srv.jpg',
    );
  });

  it('no casa a medias de palabra', () => {
    // `kia.png` sirve para «Kia Sportage»…
    assert.equal(findPhoto(manifest, 'Kia Sportage'), '/fotos-de-carros/kia.png');
    // …pero un prefijo que corta una palabra, no.
    assert.equal(findPhoto(['toyo.jpg'], 'Toyota Corolla'), null);
  });

  it('sin foto devuelve null para que se dibuje la ilustración', () => {
    assert.equal(findPhoto(manifest, 'Hyundai Tucson'), null);
    assert.equal(findPhoto([], 'Toyota Hilux SRV'), null);
  });

  it('un vehículo sin nombre no casa con nada', () => {
    assert.equal(findPhoto(manifest, ''), null);
    assert.equal(findPhoto(manifest, '—'), null);
  });

  it('respeta la extensión que tenga el archivo', () => {
    assert.equal(findPhoto(manifest, 'Toyota Corolla'), '/fotos-de-carros/toyota-corolla.webp');
  });
});

describe('extensiones', () => {
  it('acepta los formatos de la web', () => {
    assert.equal(isPhotoFile('x.jpg'), true);
    assert.equal(isPhotoFile('X.WEBP'), true);
    assert.equal(isPhotoFile('x.avif'), true);
  });

  it('rechaza lo que no es imagen', () => {
    assert.equal(isPhotoFile('README.md'), false);
    assert.equal(isPhotoFile('x.heic'), false);
  });
});

describe('qué falta por subir', () => {
  it('lista el nombre que hay que ponerle a cada archivo', () => {
    const faltan = missingFor(['toyota-hilux.jpg'], ['Toyota Hilux SRV', 'Kia Sportage']);
    assert.deepEqual(faltan, [{ vehicle: 'Kia Sportage', expected: 'kia-sportage.jpg' }]);
  });

  it('con la flota cubierta no falta nada', () => {
    assert.deepEqual(missingFor(['kia-sportage.jpg'], ['Kia Sportage']), []);
  });
});

describe('nombre esperado', () => {
  it('es el que se documenta en la carpeta', () => {
    assert.equal(expectedName('Nissan Frontier'), 'nissan-frontier');
  });
});

describe('la carpeta y el código dicen lo mismo', () => {
  // El README de `public/fotos-de-carros/` promete ocho nombres concretos.
  // Si alguien cambia un modelo de la demostración y no toca el README, quien
  // suba las fotos nombrará mal los archivos y no verá ningún error: la
  // aplicación dibujará, tan tranquila. Esta prueba es lo que lo impide.
  const documentados = readFileSync(
    new URL('../../../../public/fotos-de-carros/README.md', import.meta.url),
    'utf8',
  );

  it('cada vehículo de la demostración está en el README con su nombre exacto', () => {
    const flota = [...new Set(demoOrders(new Date()).map((o) => o.vehicle))];
    assert.equal(flota.length, 8);

    for (const vehiculo of flota) {
      const archivo = `${expectedName(vehiculo)}.jpg`;
      // O el nombre exacto, o uno más corto del que este es continuación:
      // el README documenta `toyota-hilux.jpg` para «Toyota Hilux SRV».
      const casa = documentados
        .split('\n')
        .flatMap((l) => l.trim().split(/\s+/u))
        .filter(isPhotoFile)
        .some((f) => findPhoto([f], vehiculo) !== null || f === archivo);

      assert.ok(casa, `«${vehiculo}» no está documentado en public/fotos-de-carros/README.md`);
    }
  });

  it('el manifiesto solo contiene archivos que existen en la carpeta', () => {
    const enDisco = new Set(
      readdirSync(new URL('../../../../public/fotos-de-carros/', import.meta.url)),
    );
    for (const archivo of PHOTO_MANIFEST) {
      assert.ok(enDisco.has(archivo), `${archivo} está en el manifiesto pero no en la carpeta`);
    }
  });

  it('todo archivo de la carpeta está en el manifiesto', () => {
    // El olvido típico: copiar la foto y no correr `npm run fotos`.
    const enDisco = readdirSync(
      new URL('../../../../public/fotos-de-carros/', import.meta.url),
    ).filter(isPhotoFile);
    for (const archivo of enDisco) {
      assert.ok(
        PHOTO_MANIFEST.includes(archivo),
        `${archivo} está en la carpeta pero no en el manifiesto: falta correr \`npm run fotos\``,
      );
    }
  });
});

describe('cómo se encaja cada foto lo decide la foto', () => {
  it('un recorte del manifiesto se reconoce por su ruta completa', () => {
    const cutouts = ['toyota-corolla.webp', 'kia-sportage.webp'];
    assert.equal(isCutout(cutouts, '/fotos-de-carros/toyota-corolla.webp'), true);
    assert.equal(isCutout(cutouts, '/fotos-de-carros/toyota-hilux.webp'), false);
  });

  it('sin foto no hay nada que encajar', () => {
    assert.equal(isCutout(['toyota-corolla.webp'], null), false);
  });

  it('casa por archivo, no por subcadena de la ruta', () => {
    // `corolla.webp` no es `toyota-corolla.webp`, aunque una acabe en la otra.
    assert.equal(isCutout(['corolla.webp'], '/fotos-de-carros/toyota-corolla.webp'), false);
  });

  it('cada recorte declarado existe en el manifiesto', () => {
    for (const file of PHOTO_CUTOUTS) {
      assert.ok(
        PHOTO_MANIFEST.includes(file),
        `«${file}» está marcado como recorte y no está en el manifiesto`,
      );
    }
  });
});
