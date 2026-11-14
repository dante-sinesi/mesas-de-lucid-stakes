# Fundación (Catan de dados): reglas de la versión 2

Estado: **diseño cerrado en el brainstorming (`brainstorm_fundacion_v2.md`), nada programado.** Reemplaza las reglas de la primera versión (con dados de recursos), que quedó implementada en `feature/fundacion` y que se rehace. Nació de *Catan: The Dice Game*, pero **no es una copia**: se inspira en el Catan de siempre y se lleva a **1 a 8 jugadores**. Los números son puntos de partida que se calibran con bots. Sigue `principios_diseno.md`; la investigación está en `investigacion_juegos.md`.

Qué es **decidido** y qué está **por calibrar** se marca en cada sección. Los requisitos numerados están en `fundacion_v2_requisitos.md`; el flujo, en `catan_flujo.md`; las pantallas, en `fundacion_v2_pantallas.md`; el plan de programación, en `fundacion_v2_plan.md`.

## La idea en una frase
Una isla común de hexágonos. Con cada tirada de dos dados **cobran todos** los jugadores que tienen un pueblo o una ciudad junto a los hexágonos con ese número; cada recurso es una **tarjeta** que va a tu mano (máximo 6). En tu turno **gastas tarjetas** en construir caminos, pueblos, ciudades y caballeros, o las **entregas** para cumplir pedidos. El primero en llegar a la meta de puntos gana.

## Qué cambia respecto de la versión 1
- **Se eliminan los dados de recursos** (guardar, volver a tirar, reserva, tope de 4 dados fijados, medallas de porcentaje) y el **oro**, que era una cara de esos dados.
- Los recursos vienen del **número que sale** y de los **edificios** que tocan ese hexágono.
- **Cobran todos** en cada tirada, no solo quien tiene el turno.
- Hay **mano de tarjetas** con tope de 6 y un **descarte** al empezar el turno.
- Se pueden hacer **todas las construcciones que alcancen** en un turno.
- Aparecen las **misiones y pedidos** (una fuente de puntos y una válvula contra el mal reparto).
- **No hay intercambio.**
- El turno pasa a tener un solo reloj y el **tiempo agotado pasa el turno solo**.

## La isla
- **19 hexágonos** hasta 4 jugadores y **37** de 5 a 8 (el mapa clásico agrandado una vuelta). Solo: 19.
- Bosque (madera), colinas (ladrillo), pastos (lana), campos (trigo), montaña (mineral) y un desierto, **mezclados al azar en cada partida** y con los números del Catan clásico (2 a 12, sin el 7). Cada número muestra sus **puntitos** (la probabilidad).
- **Mapa justo por diseño (decidido):** al generar la isla se comprueba que **cada recurso tenga hexágonos con números buenos (5 a 9) al alcance** y que ninguno quede escondido. Los criterios exactos se calibran con bots.
- **Mapa común:** todos construyen en la misma isla, así que los vértices se disputan.
- Reglas del mapa tomadas de Catan: **regla de distancia** (no se puebla pegado a otro pueblo) y **los caminos abren camino** (solo se puebla donde llega un camino tuyo). Cada jugador elige **dónde** pone cada pieza.
- **Colocación inicial en serpiente** (1.º, 2.º… último, y último, … 1.º): cada uno pone 1 pueblo y 1 camino, dos veces. Al elegir un pueblo, la pantalla muestra **qué recursos dará y cuáles faltan** (herramienta contra el mal reparto).

## Los recursos y la mano
- **Cinco recursos:** madera, ladrillo, lana, trigo y mineral. **Cada unidad es una tarjeta**; con 3 maderas hay 3 tarjetas de madera (sin números ni texto en las tarjetas: se identifican por color y dibujo).
- **Mano máxima: 6 tarjetas.** Si al empezar tu turno, ya cobrada la tirada, tienes más de 6, **primero descartas hasta quedar en 6** y recién después puedes construir. Puede obligarte a descartar lo que acabas de ganar: está aceptado.
- Las tarjetas son **privadas**: los demás ven **cuántas** tienes, no cuáles. Las **ganancias de cada tirada** sí se muestran a todos (se deducen del tablero).
- **No hay intercambio** (ni entre jugadores ni con un banco). Lo que sobra solo se descarta o se entrega en un pedido.

## El turno
1. **Tirada (automática y compartida).** Se tiran 2 dados de número al empezar el turno. Con un número distinto de 7, **cobran todos**: cada hexágono con ese número, no bloqueado, da a cada jugador **1 tarjeta de su recurso por cada pueblo** y **2 por cada ciudad** que lo toque. Con 7, ver «El bandido». La tirada no tiene reloj.
2. **Descarte** (solo quien tiene el turno y solo si tiene más de 6).
3. **Construir y entregar:** el jugador hace **todas las acciones que le alcancen**, en el orden que quiera: construir, entregar pedidos, y después **pasar** (o se le acaba el reloj).

Cuenta regresiva del turno: ver «El reloj».

## Los edificios
| Edificio | Cuesta | Puntos | Requisito |
|---|---|---|---|
| Camino | **1 madera** | 0 | contiguo a un camino o pueblo tuyo |
| Pueblo | 1 madera + 1 ladrillo + 1 lana + 1 trigo | 1 | llega un camino tuyo y se respeta la distancia |
| Ciudad | **3 mineral + 2 trigo** | +1 (mejora un pueblo suyo) | un pueblo tuyo |
| Caballero | 1 lana + 1 trigo + 1 mineral | 0 | sobre un hexágono donde tengas un edificio: si el bandido cae ahí, no te afecta |

Piezas por jugador: 15 caminos, 5 pueblos, 4 ciudades y **3 caballeros** (uno por jugador en cada hexágono, sin moverse). Un edificio sin piezas o sin lugar válido **no se ofrece**.

**Por confirmar con un bot (decisión de Dante):** con el tope de 6 tarjetas, la ciudad a 5 tarjetas casi llena la mano. Cuando todo esté diseñado, un bot comprueba si es alcanzable; **si no lo es, la ciudad se queda como en la versión 1: 2 mineral + 2 trigo.**

## Misiones y pedidos
Un solo grupo **compartido y a la vista** de todos (en solitario, el mismo grupo). Dos clases:
- **Misiones de condición (A):** se cumplen **haciendo algo en el mapa** (por ejemplo, «5 caminos conectados»). **No vencen.** **Se las lleva quien las cumple primero.**
- **Pedidos (B):** se cumplen **entregando tarjetas** (por ejemplo, «2 madera + 2 ladrillo», «3 tarjetas iguales» o «3 tarjetas cualesquiera»). Son un **banco de puntos**: convierten lo que sobra en puntos y resuelven el mal reparto. **Se los lleva el primero que, en su turno, decide entregarlos.** **Vencen por turnos**, no por rondas: cada pedido dura **dos turnos para cada jugador** (2 × jugadores turnos en total) y lleva su propia cuenta, para que no se reinicien todos a la vez. Cuando alguien entrega uno, **se repone al terminar el turno de quien lo entregó**.
- Cada misión o pedido da puntos al cumplirse (en las maquetas, +1).

**Por calibrar:** cuántos a la vez (maqueta: 2 de cada clase), cuántos puntos da cada uno y qué pasa con «Camino más largo» y «Ejército más grande» (ver «Las carreras»). **En solitario**, «dos turnos» es muy poco: probablemente haga falta un mínimo mayor; se mide con bots.

## El bandido
- Empieza en el desierto. **Cada vez que sale un 7 salta a un hexágono al azar**, también en solitario (da aleatoriedad; está decidido). Ese hexágono **no produce para nadie** hasta el próximo 7.
- **No lo mueve el jugador:** el bandido se mueve solo. No roba nada.
- El **caballero** protege a su dueño: si el bandido cae donde tiene un caballero, ese jugador sigue cobrando de ahí.
- Con un 7 **no cobra nadie** esa tirada.

## Las carreras
Dos marcadores que **cambian de dueño** si otro jugador los supera, como en Catan (reglas de la versión 1, **por revisar** junto con las misiones de condición):
- **Camino más largo:** 5 caminos o más (se cuenta el total). +2 puntos.
- **Ejército más grande:** quien tenga **más caballeros**, con un **mínimo de 2** (tope de 3 por jugador). En empate se queda con él quien ya lo tenía. +2 puntos.

## El reloj
- **Un solo reloj por turno** para descartar, construir y entregar. **Propuesta inicial (se regula jugando):** Normal **45 s**, Extendido **90 s**, Sin límite. La colocación inicial tiene uno más largo (Normal 30 s por pieza, Extendido 60 s).
- La tirada y la cobranza **no tienen reloj**: son automáticas y se ven un rato (como la producción de la versión 1).
- **Al agotarse el reloj, el turno se pasa solo** (decidido). Si había un descarte obligatorio sin hacer, **se descartan al azar las tarjetas necesarias** (decidido).
- Ausencia y desconexión siguen como en 13 Jack y Diez mil: un bot toma el lugar y lo conserva; si el jugador vuelve, retoma.

## Fin de la partida
- **Objetivo: la meta de puntos** (hoy 8, 10 o 12). Con **más fuentes de puntos** (misiones y pedidos) **probablemente haya que subirla**: **se calibra con partidas simuladas** y **no puede cerrarse hasta tener el juego y los bots hechos**.
- **Vuelta completa** cuando alguien llega, para que todos tengan los mismos turnos. Gana quien tiene más puntos; el empate lo gana quien llegó con menos turnos.
- **Solo:** se gana por **meta de puntos** (sin reloj de partida); el resultado son los **turnos que tardaste** y se guarda la mejor marca. Las reglas son las mismas en cualquier modo.
- La pantalla final es la de los otros juegos (ranking, **Nueva partida**, **Compartir** como imagen PNG, **Salir**).

## Por qué cumple los principios
- **Pocas decisiones, claras:** qué construir y dónde, qué descartar y qué pedido o misión perseguir. Riesgo visible: la probabilidad de cada número.
- **Solo = acompañado:** el mismo mapa, el mismo turno y las mismas reglas.
- **Nadie mira sin hacer nada:** como cobran todos en cada tirada, hay algo que mirar y algo que ganar en el turno ajeno.
- **Nadie queda afuera:** no hay eliminación y lo construido no se pierde.
- **Variabilidad:** isla mezclada, bandido, tiradas y misiones distintas cada vez.

## Identidad y arte (sin cambios)
- Nombre: **Fundación** (id interno `fundacion`); icono A «Pueblo y ciudad». Arte de **píxeles planos y pegados, sin espacios** (hexágonos de 32 de ancho, piezas, fichas). Caminos con un espacio antes de las esquinas. Bandido chico junto a la ficha de número; el hexágono bloqueado se oscurece y su número se tacha en rojo. Detalles en `prototipos/arte_catan/` y `prototipos/definicion_catan/`.
- **Tarjetas de recurso nuevas:** una tarjeta por unidad, color del recurso y un dibujo (tronco, ladrillo, nube, espiga, roca); los dibujos de las maquetas son provisorios.

## Descartado
- Dados de recursos y oro; intercambio con jugadores o banco; ayuda al azar con el 7 (quien no tiene tarjetas recibe una); descartar con premio (un banco); cartas de desarrollo y objetivos secretos.

## Por calibrar con bots (no se puede decidir hasta tener el juego)
1. **Meta de puntos** y **duración objetivo** con 2, 4 y 8 jugadores.
2. **Costo de la ciudad** (3 + 2 o 2 + 2) con el tope de 6.
3. **Mano en un turno ajeno:** **sin techo por ahora (decidido)**: quien cobra mucho sin ser su turno puede acumular más de 6 tarjetas y, cuando le toca, descarta hasta volver a 6. Solo se revisa si las partidas simuladas muestran un problema.
4. **Misiones y pedidos:** cuántos a la vez, puntos de cada uno, vencimiento mínimo en solitario.
5. **Mal reparto:** cuántas partidas se «traban» por falta de un recurso, con el mapa justo y la colocación inicial asistida.
6. **Peso del mapa:** si quien puebla en 6 y 8 gana claramente más que quien puebla en números bajos.
7. **Duración del reloj** (propuesta 45 s) jugando con personas.
