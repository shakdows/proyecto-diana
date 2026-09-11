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
