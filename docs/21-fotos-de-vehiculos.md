# 21 · Fotografías de los vehículos

## Qué problema resuelve

Hasta ahora cada vehículo se dibujaba: `VehicleArt` elige una carrocería por el
modelo y la pinta en SVG. Es lo correcto en miniaturas y lo único posible en
recepción —la foto real del vehículo del cliente se toma *después* de esa
pantalla—, pero en los huecos grandes se nota que no es un coche de verdad.

Este trabajo permite **dejar caer fotos en una carpeta y que aparezcan solas**,
sin tocar código y sin romper nada de lo que no tenga foto.

## Dónde viven

    public/fotos-de-carros/

Carpeta pública, servida tal cual. El README de esa carpeta manda sobre todo lo
demás: licencias aceptadas, créditos obligatorios, nombres de archivo.

Dos reglas que no son negociables:

1. **Aquí no va evidencia.** Ni daños, ni piezas, ni el vehículo concreto de un
   cliente. Eso es prueba frente al cliente y va a almacenamiento privado con
   URL firmada (doc 8). Aquí solo van fotos genéricas de modelo.
2. **Solo licencia libre, con su fila en `CREDITOS.md`.** Subir una foto
   encontrada en internet es republicarla; sin licencia que lo permita, la
   infracción es del proyecto.

Por eso el middleware trata `/fotos-de-carros` como ruta pública: el cliente ve
la cotización sin sesión, y sin esa línea la foto le saldría rota.

## Cómo se casa una foto con un vehículo

El nombre del archivo *es* la clave. `slugify` pasa «Toyota Hilux SRV» a
`toyota-hilux-srv`, y `findPhoto` casa por **prefijo de segmento más largo**:

| Archivo | Casa con | No casa con |
| --- | --- | --- |
| `toyota-hilux.jpg` | Toyota Hilux SRV, Toyota Hilux 4x4 | Toyota Corolla |
| `toyota-hilux-srv.jpg` | Toyota Hilux SRV (gana al genérico) | Toyota Hilux 4x4 |
| `ki.jpg` | — | Kia Sportage (no es segmento completo) |

Así se puede empezar con una foto por marca-modelo y afinar después por versión
sin tocar una línea de TypeScript.

Los acentos se quitan **antes** de filtrar: sin eso, «Citroën» sería `citro-n`
y no casaría jamás con `citroen.jpg`. Es el fallo que nadie ve, porque no falla
nada: simplemente se dibuja.

## Por qué hay un manifiesto

`AssetImage` la usan componentes de cliente, así que termina en el paquete del
navegador, donde no hay disco que listar. `npm run fotos` lee la carpeta y
reescribe `src/features/vehicles/services/manifest.ts`.

Corre solo antes de `npm run build` (`prebuild`), de modo que un despliegue
nunca arrastra un manifiesto viejo. Y tres pruebas lo sujetan:

- el manifiesto no nombra archivos que no existen;
- ningún archivo de la carpeta queda fuera del manifiesto —el olvido típico es
  copiar la foto y no correr el script—;
- los ocho nombres que promete el README de la carpeta son los que la
  demostración busca de verdad.

## Orden de preferencia en pantalla

1. `src` explícito, cuando quien llama ya sabe qué archivo quiere.
2. La foto del modelo, si existe en la carpeta.
3. La ilustración dibujada.
4. Superficie plana, solo para fondos decorativos.

La foto siempre se recorta (`object-cover`): los huecos tienen alto y ancho
fijos y una foto encajada dejaría dos franjas vacías. El dibujo sigue
escalándose entero, que es como está pensado.

Lo que no tiene foto no se rompe ni se degrada: se dibuja. Se puede subir de a
una.
