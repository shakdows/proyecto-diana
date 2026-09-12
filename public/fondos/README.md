# fondos

Las fotografías de ambiente de la guía de marca: taller, concesionario,
carretera, detalles de vehículo, personas.

## Nombres que espera la aplicación

Los de tus hojas de recursos, tal cual:

    hero-taller.jpg          1920 × 1080   login y portada
    taller-interior.jpg      1920 × 1080   secciones de taller
    concesionario.jpg        1920 × 1080   marca y presentación
    ruta-montana.jpg         1920 × 1080   mensajes de marca
    detalle-faro.jpg         1600 × 900    cabeceras y banners
    detalle-rueda.jpg        1600 × 900
    detalle-motor.jpg        1600 × 900
    detalle-posterior.jpg    1600 × 900
    interior-tablero.jpg     1600 × 900
    asesora.jpg              1024 × 1536   personas, fondo recortado
    tecnico.jpg              1024 × 1536
    cliente.jpg              1024 × 1536

Después: `npm run assets`.

## Lo que NO hace falta traer

De la guía, estos son **dibujo, no fotografía**, y ya están construidos en
`src/components/brand/surfaces.tsx`:

    patrón hexagonal · patrón de puntos · ondas azules · líneas de movimiento
    degradado azul · degradado oscuro · degradado claro · textura suave

No se importan como PNG a propósito. Dibujados pesan bytes en vez de cientos
de kilobytes, no se ven borrosos en pantalla de alta densidad ni cortos en un
monitor ancho, siguen el tema claro y oscuro con un solo juego, y se
recolorean solos si cambia el azul de marca. Un PNG de 1920 obliga a
reexportar los ocho cada vez que se toca un color, y siempre queda uno viejo.

## Peso

Estas fotos se descargan en cada visita. Antes de subirlas:

- reexporta a **WebP** si puedes (la mitad de peso a igual calidad);
- 1920 de ancho como máximo, calidad 75–80;
- ninguna por encima de **300 kB**.

Una portada de 4 MB tarda más en aparecer que toda la aplicación en arrancar.

## `hero-showroom.webp` — compuesta, no fotografiada

La imagen de la portada NO es una fotografía: son tres archivos montados con
`node scripts/hero-showroom.mjs`.

    vestíbulo vacío        fotos/ChatGPT Image 12 sept 2026, 11_34_12.png
    camioneta recortada    fotos/ChatGPT Image 12 sept 2026, 11_52_31.png
    rótulo de la pared     public/marca/romero-motors-claro.png

El rótulo sale de `public/marca/` y no de la hoja de recursos a propósito: la
copia de la hoja mide 202 px de ancho y en la pared se vería borrosa.

El guion añade sombra de contacto y reflejo. No son adorno: un recorte pegado
sobre un fondo flota, y se nota antes de saber por qué —no hay sombra donde
las ruedas tocan el suelo, ni reflejo en un suelo que refleja todo lo demás—.

Lo que NO se monta son los textos. La hoja original traía «MÁS QUE UN TALLER,
TU ALIADO EN EL CAMINO» y los cuatro conceptos dibujados dentro de la imagen;
la pantalla los pinta en HTML, donde escalan, se traducen y los lee un lector
de pantalla. Montarlos además saldría duplicado.

Si cambia el logotipo o la camioneta, se sustituye la pieza y se vuelve a
correr el guion.
