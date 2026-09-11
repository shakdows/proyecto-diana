# fotos de carros

Fotografías reales de los vehículos. Todo lo que se deje aquí se publica en
`https://<dominio>/fotos-de-carros/<archivo>`: es una carpeta pública, servida
tal cual, sin firma ni permiso.

De ahí las dos reglas que siguen.

## 1 · Aquí NO va evidencia

Ni fotos de vehículos de clientes, ni daños, ni piezas, ni nada que se tome
dentro del taller. Esa evidencia es prueba frente al cliente y va a Storage
privado con URL firmada, nunca a un bucket público (§ seguridad del proyecto).

Aquí solo van fotos **genéricas de modelo** —«así es un Hyundai Tucson»— que
ilustran el catálogo y la demostración.

## 2 · Solo licencia libre, y se anota de dónde salió

Subir una foto encontrada en internet a este repositorio es republicarla. Si no
tiene licencia que lo permita, es una infracción de derechos de autor del
proyecto, no del que la encontró.

Fuentes que sí sirven:

| Fuente | Licencia | Exige atribución |
|---|---|---|
| [Wikimedia Commons](https://commons.wikimedia.org) | CC BY-SA / CC0 / dominio público (varía por archivo) | Casi siempre sí |
| [Openverse](https://openverse.org) | CC, filtrable | Según el archivo |
| [Unsplash](https://unsplash.com) | Licencia Unsplash | No, pero se agradece |
| [Pexels](https://pexels.com) | Licencia Pexels | No |
| Fotos propias del taller | Tuyas | No |

Fuentes que **no** sirven: resultados de Google Imágenes, fichas de concesionario,
prensa de marca, catálogos de terceros.

Por cada archivo que subas, añade una fila a `CREDITOS.md` (en esta carpeta) con
el autor, el enlace y la licencia. Sin esa fila, la foto no debería subirse:
dentro de seis meses nadie recuerda de dónde salió y la única salida segura es
borrarla.

## 3 · Cómo se llaman los archivos

El nombre del archivo **es** la forma de casarlo con el vehículo. Se pasa el
modelo a minúsculas, sin acentos, y los espacios se vuelven guiones:

    «Toyota Hilux SRV»  →  toyota-hilux-srv.jpg

Se casa por prefijo, así que `toyota-hilux.jpg` vale para «Toyota Hilux SRV» y
para «Toyota Hilux 4x4». Si más adelante subes `toyota-hilux-srv.jpg`, ese gana
sobre el genérico sin tocar código.

Extensiones aceptadas: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.

Formato recomendado: **PNG con fondo transparente**, o WebP con transparencia,
1200 px de ancho. Los recortes de la guía de marca —«VEHÍCULOS (PNG CON FONDO
TRANSPARENTE)»— son exactamente lo que va aquí: el vehículo de tres cuartos,
sin fondo, centrado. Sin transparencia también funciona, pero se verá un
rectángulo de estudio dentro de tarjetas que tienen su propio color.

Peso: por debajo de 150 kB cada una.

### Flota de la demostración

Estos son los ocho nombres que la demostración busca hoy:

    toyota-hilux.png        Toyota Hilux SRV      ← está en la guía
    hyundai-tucson.png      Hyundai Tucson        ← está en la guía
    kia-sportage.png        Kia Sportage          ← está en la guía
    toyota-corolla.png      Toyota Corolla        ← está en la guía
    mitsubishi-l200.png     Mitsubishi L200       ← FALTA en la guía
    nissan-frontier.png     Nissan Frontier       ← FALTA en la guía
    mg-zs.png               MG ZS                 ← FALTA en la guía
    cat-320d.png            CAT 320D              ← FALTA (excavadora)

La guía de marca trae ocho recortes, pero solo cuatro son de la flota de la
demostración. Los otros cuatro que trae —Land Cruiser, RAV4, Fortuner,
Prado— no corresponden a ninguna orden abierta, así que no se usarían.

Dos salidas, las dos válidas: pedir los cuatro que faltan, o cambiar la flota
de demostración a los vehículos que sí hay. Lo que NO hay que hacer es poner
la foto de un Land Cruiser bajo la placa de un L200: en un sistema cuya razón
de ser es probar en qué estado entró un vehículo, una foto que no es la del
vehículo es peor que ninguna foto.

## 4 · Después de dejar los archivos

    npm run fotos

Reescribe el manifiesto que lee la aplicación
(`src/features/vehicles/services/manifest.ts`) y dice qué falta. También corre
solo antes de `npm run build`, así que un despliegue nunca se queda con un
manifiesto viejo.

Lo que no tiene foto **no se rompe**: se dibuja la ilustración vectorial de
siempre. Se puede subir de a una.
