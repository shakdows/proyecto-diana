# Fotografías del checklist de inspección

Las cinco vistas sobre las que se marcan las piezas en la inspección visual
(`src/features/inspection/`). Una por ángulo:

| Archivo | Vista | Sale de |
|---|---|---|
| `superior.webp` | Plano general | `fotos/check list/arriba.png`, **girada 180°** |
| `frontal.webp` | Frente y luces | `fotos/check list/frontal.png` |
| `lateral-i.webp` | Costado izquierdo | `fotos/check list/izquierdo.png` |
| `lateral-d.webp` | Costado derecho | `fotos/check list/derecho.png` |
| `posterior.webp` | Cola y portón | `fotos/check list/atras.png` |

## Cómo se generaron

De los originales de `fotos/check list/` (PNG de ~1 MB cada uno), con
`sharp`: recorte del fondo blanco sobrante, margen del 5 % por lado,
conversión a WebP de calidad 82. Quedan entre 29 y 41 KB.

El margen NO es estético: sin él, el punto del paragolpes queda pegado al
borde redondeado del marco y su zona táctil de 44 px se sale del lienzo.

## Tres cosas que hay que respetar al cambiarlas

1. **La superior va con el morro ARRIBA.** Es como se lee un vehículo en un
   parte, igual que el diagrama de daños de la recepción. El original tiene
   el morro abajo; por eso se gira al convertir.
2. **La proporción manda.** `views.ts` declara el `ratio` (ancho ÷ alto) de
   cada foto y el marco se dibuja con esa proporción exacta. Si se cambia una
   foto por otra de distinta forma sin actualizar el `ratio`, la imagen queda
   centrada con bandas y los puntos —que se colocan en porcentaje del marco—
   señalan al lado de la pieza.
3. **Si se mueve el vehículo dentro del encuadre, hay que mover los puntos**
   (`src/features/inspection/services/placement.ts`). Los puntos son dibujo:
   moverlos no toca ningún registro guardado.

## Qué NO son

No son fotos del vehículo del cliente. Son de referencia: el punto señala la
PIEZA, no un píxel. La evidencia real del vehículo se toma pieza a pieza
desde el propio panel y es privada — ver `public/fotos-de-carros/README.md`.
