# Fundación (Catan de dados): diseño

Estado: **diseño conversado, nada programado.** Nació de *Catan: The Dice Game* (1 a 4 jugadores) pero **no es una copia**: se inspira en el Catan de siempre y se lleva a **1 a 8 jugadores**. Los números son puntos de partida que se calibran con bots. Sigue `principios_diseno.md`; la investigación está en `investigacion_juegos.md`.

## La idea en una frase
Una isla común de hexágonos. En tu turno el mapa te da dados de recursos, tiras el resto guardando y volviendo a tirar, y con lo que sale **construyes** caminos, pueblos y ciudades en el mapa que comparten todos. El primero en llegar a 10 puntos gana. Solo es lo mismo, medido en turnos.

## La isla
- **19 hexágonos** hasta 4 jugadores y **37** de 5 a 8 (el mapa clásico agrandado una vuelta). Solo: 19.
- Bosque (madera), colinas (ladrillo), pastos (lana), campos (trigo), montaña (mineral) y un desierto, **mezclados al azar en cada partida** y con los números del Catan clásico (2 a 12, sin el 7). Cada número muestra sus **puntitos** (el %).
- **Mapa común:** todos construyen en la misma isla, así que los vértices se disputan.
- Reglas del mapa tomadas de Catan: **regla de distancia** (no se puebla pegado a otro pueblo) y **los caminos abren camino** (solo se puebla donde llega un camino tuyo). Cada jugador elige **dónde** pone cada pueblo, ciudad y camino.
- **Colocación inicial en serpiente** (1.º, 2.º… último, y último, … 1.º): cada uno pone 1 pueblo y 1 camino, dos veces, para que ir primero no sea ventaja.

## El turno (tres pasos, dos decisiones)
1. **Producción (automática):** tiras 2 dados de número. Cada hexágono con ese número que toque uno de **tus** edificios te da **un dado ya fijado** de su recurso (la ciudad da 2; **máximo 4 dados fijados**, así que siempre quedan al menos 2 para tirar). Solo produces tú, en tu tirada. Si sale **7**, ver «El bandido».
2. **Dados:** completas hasta **6 dados** con los de recursos (madera, ladrillo, lana, trigo, mineral y oro, **el oro es comodín**: 2 oros valen 1 recurso). Guardas los que quieres y vuelves a tirar el resto, **hasta 3 tiradas**. Mientras eliges, el juego muestra el **% de completar** el edificio que apuntas.
3. **Construir:** con los dados finales pagas un edificio y lo colocas en el mapa. **Lo que sobra no se guarda** (no hay banco de recursos). Un turno sin construir simplemente se pierde.

Hay una **cuenta regresiva** por turno, como el Diez mil. Meta de ritmo: unos 20 segundos por turno con 8 jugadores.

## Los edificios
| Edificio | Cuesta | Puntos | Requisito |
|---|---|---|---|
| Camino | madera + ladrillo | 0 | contiguo a un camino o pueblo tuyo |
| Pueblo | madera + ladrillo + lana + trigo | 1 | llega un camino tuyo y se respeta la distancia |
| Ciudad | 2 mineral + 2 trigo | +1 (mejora un pueblo suyo) | un pueblo tuyo |
| Caballero | lana + trigo + mineral | 0 | se pone sobre un hexágono donde tengas un edificio: si el bandido cae ahí, no te afecta |

Piezas por jugador: 15 caminos, 5 pueblos, 4 ciudades (como en Catan) y **3 caballeros** (uno por jugador en cada hexágono, sin moverse). (Costos tomados de Catan; se ajustan al medir.)

## El bandido
- Empieza en el desierto. **Cada vez que sale un 7** (probabilidad exacta de 1 en 6) **salta a un hexágono al azar**, y ese hexágono **no produce para nadie** hasta el próximo 7.
- No roba nada: es mala suerte pareja, que cambia qué puntos valen más.

## Las carreras
Dos marcadores que **cambian de dueño** si otro jugador los supera, como en Catan:
- **Camino más largo:** 5 caminos o más (se cuenta el total). +2 puntos.
- **Ejército más grande:** es de quien tenga **más caballeros**, con un **mínimo de 2** (tope de 3 por jugador): con 2 se tiene, y otro jugador se lo quita con 3. En caso de empate se queda con él quien ya lo tenía. +2 puntos.

## Fin de la partida
- **Objetivo: 10 puntos**, con vuelta completa para que todos tengan los mismos turnos.
- **Solo:** llegas a los 10 puntos y el resultado son los **turnos que tardaste**. Con amigos, gana el primero; si hay empate tras la vuelta completa, el que lo hizo en menos turnos.
- Las reglas son las mismas en cualquier modo; solo cambia contra quién te comparas.

## Por qué cumple los principios
- **Pocas decisiones, claras:** qué dados guardar mirando lo que quieres construir, y dónde ponerlo. Riesgo visible, con % y puntitos.
- **Solo = acompañado:** el mismo mapa, el mismo turno y las mismas reglas.
- **Cada uno juega lo suyo, mirado por los demás:** tiras tus dados en tu turno y todos ven qué te pasa. Hay disputa real por los vértices, pero sin comercio.
- **Nadie queda afuera:** no hay eliminación y lo construido no se pierde.
- **Variabilidad:** isla mezclada, bandido y dados distintos cada vez; solo, repites la isla para batir tu marca.

## Pantallas (decidido: opción C)
Maqueta interactiva en `prototipos/catan_pantallas/index.html` (copia en la carpeta de contexto, `maquetas/catan_pantallas.html`).
- **Móvil:** el mapa ocupa toda la pantalla y **la cámara se acerca sola** a lo que importa (los hexágonos con el número que salió en la etapa 1, los lugares válidos en la 3). Los dados viven en un **panel inferior** que se abre en la etapa 2 y se cierra en las otras. Arriba, una barra compacta con tus puntos y el líder.
- **Escritorio:** mapa lo más grande posible (hexágono de unos 108 px con 37 hexágonos) y **paneles flotantes** (jugadores a la izquierda, acciones a la derecha) apoyados en el mar vacío; en la etapa 3 el panel se achica.
- **Construir en el móvil:** el edificio se elige primero solo si los dados alcanzan para más de uno. Después la cámara encuadra los lugares válidos (puntos dorados) y se toca uno y se confirma: **2 toques**. Si al encuadrarlos quedan a menos de **44 px entre vértices**, la cámara muestra todo el mapa con las zonas marcadas (con la cantidad de lugares), se toca una zona, la cámara se acerca y se toca el punto: **3 toques** (colocación inicial, caminos). Ayudas: flechas ‹ 2/3 › entre zonas, arrastrar y pellizcar, y «recentrar».

## Identidad y arte (decidido)
- **Icono: el A, «Pueblo y ciudad»** (una casita y una ciudad inclinadas, como las cartas y los dados). Páginas en `prototipos/arte_catan/` y `prototipos/definicion_catan/` (copias en la carpeta de contexto, `maquetas/`).
- **Nombre en la plataforma: «Fundación»** (id interno `fundacion`); elegido por la idea de que las ciudades y los caminos crecen. «Catan» es marca registrada y no se puede usar.
- **Píxeles planos y pegados, sin espacios entre ellos** (ni biseles) en todo el arte nuevo: hexágonos, dados, piezas, fichas, marcadores. Es una regla para el arte de este juego.
- **Definición elegida:** **dados de 15 × 15 píxeles** y **hexágonos de 32 de ancho** (`definicion_catan`). Madera, lana, trigo y oro (dados) y bosque, pastos, montaña y desierto (hexágonos) quedan como están. Las cuatro piezas que no se entendían se rehicieron y quedaron así: **dado de ladrillo = un ladrillo en perspectiva**, **dado de mineral = montón de piedras**, **hexágono de colinas = tres lomas en capas** y **hexágono de campos = espigas grandes de trigo**. El arte final de todo el juego está en `prototipos/arte_catan/` (copia en `maquetas/arte_isla.html`).
- **Caminos:** dejan un espacio antes de llegar a las esquinas (no van de nodo a nodo).
- **Bandido:** chico (del tamaño de un pueblo), parado junto a la ficha de número. El hexágono bloqueado se oscurece y su número se tacha en rojo.
- **Caballero (decidido):** pieza que se pone sobre un hexágono donde tengas un edificio; si el bandido cae ahí, no te afecta. Uno por jugador en cada hexágono, no se mueve y hay 3 por jugador. «Ejército más grande» pide un mínimo de 2 y se supera con más (ver «Las carreras»).

## Lo que falta pensar
- **Pantalla:** el arte final (cubitos) y los detalles de la cámara; en móvil el panel inferior no debe tapar casillas importantes.
- **Medir con bots:** que no se pueda quedar alguien encerrado sin lugar, cuántos turnos dura una partida de 8, los costos, el tope de 4 dados fijados y si el 10 es el objetivo justo.
- **Que el mapa pese:** se decidió **mantener los dados de recursos** (y no la producción pura de Catan, que guarda recursos y exige comercio con el banco) porque conservan la tensión de guardar o volver a tirar y el % a la vista. El costo es que el mapa influye menos (solo da dados fijados). Por eso el tope subió de 3 a 4. Medir con bots si quien puebla en números altos (6 y 8) gana claramente más que quien puebla en bajos; si no se nota, subir el tope o hacer que la ciudad dé más.
- **Los puntos bajo cada número** son su probabilidad, como en Catan: 6 y 8 = 5 puntos (14 %), 5 y 9 = 4 (11 %), 4 y 10 = 3 (8 %), 3 y 11 = 2 (6 %), 2 y 12 = 1 (3 %). El 7 no está en el mapa: lo usa el bandido (17 %). Al tocar un hexágono el juego puede mostrar el % escrito.
- **Parecido a la Generala:** hay que ver si basta con mapa, producción y carreras para que se sienta otro juego.
- **Descartado por ahora (suma demasiada complejidad):** cartas de desarrollo y objetivos secretos. La variabilidad la dan la isla mezclada, el bandido y los dados. Lo único que podría revisarse más adelante son dados especiales, como en el Diez mil.
- Aspecto en cubitos: hexágonos de cubitos con relieve por recurso, los dados con caras de recurso y las piezas de cada color (los de los asientos).

## Reserva de dados (bj-116)
Al terminar el turno, hasta 2 dados que no se gastaron se quedan para el turno siguiente: los marcados por el jugador (o, si no marcó, los que más acercan al edificio más valioso; así juegan los bots y el tiempo agotado) y los de la reserva anterior sin usar. Empiezan fijos antes que lo que gana la producción (tope de 4 fijos en total). Se ven en la tarjeta del jugador y en la ventana de producción. El número es `R.CFG.reservaMax`; `node simulador/reserva.js` compara 0 a 3 con bots.
