# marca

El logotipo oficial de Romero Motors.

## Qué falta aquí

Un archivo con uno de estos nombres, por orden de preferencia:

    romero-motors.svg     ← el mejor: escala sin pixelarse y pesa poco
    romero-motors.webp
    romero-motors.png     ← si solo hay mapa de bits, que sea con fondo transparente
    romero-motors.jpg

En cuanto esté, corre:

    npm run assets

y la aplicación deja de dibujar la reconstrucción y usa el archivo real. Corre
solo antes de `npm run build`, así que un despliegue tampoco se queda atrás.

## Por qué hace falta

Hoy la marca de la interfaz **no es el logotipo**: es una reconstrucción que
imita su composición —«ROMERO» en mayúsculas pesadas con degradado de rojo a
negro, la barra inclinada cruzando la R, «MOTORS» debajo entre dos filetes—
usando la tipográfica del sistema. De lejos se parece; de cerca las letras no
son las originales.

Una reconstrucción está bien para maquetar. No está bien para un acta de
entrega que firma un cliente ni para un PDF que sale del taller con el nombre
de la empresa.

## El SVG, si puedes elegir

Si el diseñador entrega `.ai` o `.pdf`, pide el SVG exportado con:

- los textos **convertidos a curvas** (si no, el logotipo se descompone en
  cualquier ordenador que no tenga la tipográfica);
- sin capas ocultas ni marcos de recorte sobrantes;
- el lienzo ajustado al dibujo, sin aire alrededor —el aire lo pone la
  interfaz, y si viene dentro del archivo el logotipo se ve pequeño y
  descentrado en todos los huecos a la vez.

## El rojo

El logotipo real es rojo. En esta interfaz el rojo ya significa otra cosa:
entrega retrasada, aviso crítico, reparación pausada. Una marca roja junto a un
chip rojo de alarma le enseña al ojo que el rojo a veces no significa nada.

Por eso el color completo se reserva para los momentos de marca —login, portal
del cliente, documentos que se le entregan— y el armazón operativo lleva la
versión monocroma. Es práctica normal de identidad, no un apaño: cuando entre
el archivo oficial, esa separación se mantiene.
