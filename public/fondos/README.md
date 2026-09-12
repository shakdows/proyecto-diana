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

La imagen de la portada NO es una fotografía: son dos archivos montados con
`node scripts/hero-showroom.mjs`.

    vestíbulo rotulado     fotos/ChatGPT Image 12 sept 2026, 12_29_37.png
    camioneta recortada    fotos/ChatGPT Image 12 sept 2026, 11_52_31.png

El vestíbulo ya trae el rótulo, el lema y la lista de conceptos pintados en la
pared, en perspectiva. Una versión anterior los dibujaba con SVG sobre un
vestíbulo vacío: funcionaba, pero era texto plano sobre una pared inclinada y
se notaba.

El guion añade sombra de contacto y reflejo. No son adorno: un recorte pegado
sobre un fondo flota, y se nota antes de saber por qué —no hay sombra donde
las ruedas tocan el suelo, ni reflejo en un suelo que refleja todo lo demás—.

### El lienzo es más alto que la toma

La columna de la portada es más ALTA que ancha —ronda 1,15 en un monitor— y la
toma es 1,5. Recortar una dentro de la otra cortaba el morro de la camioneta.

No se arregla moviendo el encuadre: a la izquierda está el rótulo y no se
puede sacrificar. Se arregla ALARGANDO EL SUELO. El guion estira la franja
inferior hasta que el lienzo llega a 1,15, y funciona porque ese suelo es
mármol pulido: lo que hay son reflejos verticales, y en perspectiva un reflejo
se alarga hacia el espectador. Estirar una pared o un techo se notaría.

### Lo que no se monta

La banda de conceptos de abajo —«Confianza · en cada kilómetro» y las otras
tres— la pinta la pantalla en HTML. Ahí es mensaje y no decorado: escala, se
traduce y lo lee un lector de pantalla.

Si cambia el vestíbulo o la camioneta, se sustituye la pieza y se vuelve a
correr el guion.
