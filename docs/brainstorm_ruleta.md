# Rulepoly: brainstorming (primera versión)

> **Reemplazado por `rulepoly.md`**, que recoge lo que se acordó después de conversarlo. Este texto queda como historia: parte de lo de acá (apuestas, grupos, compra hostil, casas, bola general) se descartó.

Estado: **idea para conversar, nada programado.** Los `?` son dudas abiertas y los números son puntos de partida para ajustar probando.

## 1. La idea en una frase

Una ruleta de 37 casilleros (0 a 36) donde los jugadores pueden **comprar casilleros**. Cuando la bola cae en un casillero con dueño, **el dueño cobra**. Los casilleros son las propiedades de un Monopoly, pero sin tablero ni dados: el «movimiento» lo hace la bola.

## 2. La base: una ruleta normal

Antes de lo nuevo, la ruleta tal cual:
- Cada giro tiene una fase de **apuestas** (15 s), el **giro** y los **resultados**.
- Apuestas posibles al empezar: **pleno** (a un número, paga 35 a 1), **color** (rojo o negro, 1 a 1), **par o impar** (1 a 1) y **docena** (2 a 1). Más adelante: columnas, mitades, caballos.
- El 0 es de la casa: pierden las apuestas externas.
- Los pagos a los ganadores los hace la **casa**. Los jugadores no se pagan entre sí... salvo por lo que aporta la idea nueva.

## 3. Lo nuevo: casilleros con dueño

### Comprar
Un casillero libre se compra con fichas. Precio base (a calibrar): 10 veces la apuesta mínima, más caro en los que tienen más «valor» (por ejemplo, el 7, o los vecinos del 0).

### Cobrar (la «renta»)
Cuando la bola cae en un casillero **con dueño**:
- El dueño cobra una **comisión**: un porcentaje de lo que **perdieron** todos los jugadores en ese giro (por ejemplo 20 %).
- Importante: los perdedores **no pierden más**. Esa comisión sale de lo que habría ganado la casa. Por eso no es un castigo, es un «quién se queda con la ganancia».
- El dueño también puede apostar a su propio casillero con mejor pago si está mejorado.

### Mejorar (las «casas y hoteles»)
Un casillero tuyo se mejora pagando fichas:
| Mejora | Efecto |
|---|---|
| **Dorado** | El pleno a ese número paga 40 a 1 (para todos) y tu comisión sube. |
| **Trampa** | Quien apostó pleno ahí y perdió paga una pequeña tasa extra al dueño. |
| **Ancla** | Cobras también (la mitad) cuando la bola cae en sus vecinos. |

### Grupos (como los colores del Monopoly)
Tener **todos los casilleros de un grupo** da un multiplicador de comisión. Grupos naturales de la ruleta:
- Las **3 docenas**.
- Los **2 colores** (rojo y negro).
- **Par e impar**.
Un casillero pertenece a varios grupos a la vez (el 7 es rojo, impar, de la primera docena). Eso hace que cada compra importe por más de una razón.

### Interacción hostil
- **Compra hostil:** quedarte con un casillero ajeno pagando el doble de su precio (el dinero va al dueño anterior).
- `?` **Intercambios** entre jugadores (casillero por casillero o por fichas).
- `?` **Hipoteca** (vender a la casa por un valor bajo para sacar fichas rápido).

## 4. Ejemplo de una ronda

Mesa de 3 jugadores, apuesta mínima 10. Ana es dueña del 7, del 14 y del 21 (los tres son impares y de la primera y segunda docena). Beto es dueño del 32. Carla no tiene casilleros.
1. **Apuestas:** Ana apuesta 10 al 7 (pleno). Beto apuesta 20 a negro. Carla apuesta 10 al 21 y 10 a par.
2. **Giro:** la bola cae en el **21**.
3. **Resultados:**
   - Carla acertó el pleno del 21: la casa le paga 350 + su apuesta. Perdió el par (10).
   - Beto perdió los 20 de negro (el 21 es rojo).
   - Ana perdió su pleno al 7.
4. **Comisión:** el 21 es de Ana. Cobra el 20 % de todo lo que se perdió en el giro: (10 + 20 + 10) = 40, o sea **8 fichas**.
5. **Tienda** (cada 3 giros): Beto ve el 21 en oferta hostil por el doble. Ana ve una mejora «Dorado» para el 14.

## 5. La tienda: el «mercado de casilleros»

Cada **3 giros** aparecen 3 ofertas personales:
- Un casillero libre (barato).
- Un casillero de otro jugador (compra hostil).
- Una mejora para uno tuyo.
Además, un botón para **comprar un casillero libre en cualquier momento** a precio fijo. `?` ¿Subasta cuando alguien quiere uno que otro también?

## 6. En solitario

Juegas contra la casa:
- Tus casilleros te dan un **bonus fijo** cada vez que la bola cae en uno (en vez de una comisión sobre los demás, que no hay).
- Los dorados te permiten apostar a ese número con mejor pago.
- Los **grupos** te dan un multiplicador: esa es la parte «motor» de la partida (como armar un mazo).
- Objetivo: llegar a una meta de fichas en un **número limitado de giros** (por ejemplo 30).
- `?` **Rivales automáticos:** unos jugadores no humanos que compran casilleros, para que el solitario se sienta como un Monopoly. ¿Los queremos?

## 7. Con amigos

- Una sola bola para toda la mesa. Todos apuestan al mismo giro.
- Aparece el conflicto real: pelear por los casilleros buenos, cobrar de las pérdidas de los demás, robarse grupos.
- Final: meta de fichas **o** número fijo de giros (gana el que más tiene).
- `?` **Bancarrota:** si te quedas sin fichas, ¿eres eliminado o puedes pedir ayuda a tus amigos (donaciones)?

## 8. Cosas para romper (opcionales)

- **Eventos:** ruleta doble bola (dos números ganan), ruleta francesa (sin 0), la casa aporta al bote.
- **Misiones por giro:** «acierta un pleno», «gana en rojo y par» (premian con una mejora).
- **Ventana de 5 segundos:** después de que cae la bola, tienes unos segundos para usar un **Empujón** (corres la bola un casillero, solo para tus apuestas).

## 9. Qué se reutiliza del código común

Salas, mesa en tiempo real, ranking y compartir, reacciones, ayuda con láminas, ventana de configuración, tienda, avisos, estadísticas, instalación como app. Cambia la mesa (una rueda y un tapete de apuestas), el catálogo (casilleros y mejoras) y la economía.

## 10. Qué quiero decidir con vos

1. ¿La comisión es lo que entendiste del «alquiler» del Monopoly? ¿O la imaginabas pagada por los jugadores y no por la casa?
2. Los grupos (docenas, colores, par/impar): ¿te gustan como los «colores» del tablero?
3. Compra hostil, intercambios e hipoteca: ¿cuáles sí?
4. Solitario: ¿con rivales automáticos o solo contra la casa?
5. ¿Qué pasa con quien se queda sin fichas?
