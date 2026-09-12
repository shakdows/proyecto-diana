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

    toyota-hilux.webp       Toyota Hilux SRV      ✓ puesta
    mitsubishi-l200.webp    Mitsubishi L200       ✓ puesta
    nissan-frontier.webp    Nissan Frontier       ✓ puesta
    mg-zs.webp              MG ZS                 ✓ puesta
    cat-320d.webp           CAT 320D              ✓ puesta (excavadora)
    toyota-corolla.webp     Toyota Corolla        ✓ puesta
    hyundai-tucson.webp     Hyundai Tucson        ✓ puesta
    kia-sportage.webp       Kia Sportage          ✓ puesta

La flota está completa. Si mañana la demostración incorpora otro modelo, el
dibujo vectorial lo cubre solo y esta tabla vuelve a marcar el que falta.

## Aviso sobre la resolución

Las cinco primeras vienen recortadas de la hoja de recursos y miden unos
270 × 165 px, no los 1920 × 1080 que anuncia el índice del paquete. A ese
tamaño rinden en la miniatura del tablero (64 × 48) y en la ficha del cajón
lateral, y se quedan cortas en cualquier hueco grande.

Si algún día hacen falta a tamaño de portada, hay que pedir los originales.
Ampliar estas no sirve: no hay información que ampliar.

Las tres últimas —Corolla, Tucson, Sportage— sí llegaron a 1254 × 1254 con
fondo transparente. Están recortadas al contorno del vehículo y reescaladas a
1200 px de ancho: a esa resolución sirven igual para la miniatura de 64 px que
para una portada, y cada una pesa menos de 130 kB.

## 4 · Después de dejar los archivos

    npm run fotos

Reescribe el manifiesto que lee la aplicación
(`src/features/vehicles/services/manifest.ts`) y dice qué falta. También corre
solo antes de `npm run build`, así que un despliegue nunca se queda con un
manifiesto viejo.

Lo que no tiene foto **no se rompe**: se dibuja la ilustración vectorial de
siempre. Se puede subir de a una.
