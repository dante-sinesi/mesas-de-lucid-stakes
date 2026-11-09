# 13 Jack: el reemplazo del Blackjack (diseño en conversación, todavía no programado)

**Decisión:** el 13 Jack reemplaza al Blackjack anterior. El Blackjack se retiró del proyecto (código, pruebas y documentos); su última versión completa está en `respaldos/blackjack-ultima-version.zip`. En la pantalla principal queda la tarjeta "13 Jack" con el ícono de las cartas, marcada como "Próximamente".

## Qué hace adictivo al Diez mil (el criterio)
- Una sola decisión por momento: tirar o plantarte.
- Se arriesga lo ya ganado en el turno, no una apuesta aparte.
- Carrera a un número, con última vuelta justa.
- Turnos cortos y todos ven todo.
- Lo variable son las piezas (dados), no las reglas.
- Cada uno juega su propia partida, aislado del resto: solo se cruzan en el puntaje. Funciona igual en solitario que con amigos.

## Descartadas (y por qué)
- **Comprar cartas o armar el mazo a lo grande:** es el eje de Balatro. (Ver "Cartas especiales" más abajo: lo que se acepta es mucho más acotado, como los dados especiales del Diez mil.)
- **Escalera de 21 (cobrar o seguir entre manos):** demasiado parecida al "tirar o plantarte" del Diez mil.
- **Contratos por mano:** ya hay eventos de mesa y misiones, y no cambian la dinámica.
- **Mano oculta y farol:** suma una capa de decisión; va contra lo que hace bueno al Diez mil.
- **Rey de la mesa (el campeón de la ronda):** gustó, pero con muchos jugadores los últimos casi no tienen chance (se probó la idea de que el trono se desgaste 1 punto por retador y de que el empate lo gane el retador) y, sobre todo, es muy difícil de adaptar al modo solitario.
- **Superá el número, Eliminación, Cooperativo, 21 como puntaje, Contrarreloj:** no convencieron (la última cambia demasiado el estilo; el 21 como puntaje es "el Diez mil con cartas").

## Guardada: Mercado de cartas
Cartas boca arriba en el centro de la mesa; pedir es llevarte una (se repone otra); el mercado crece con la mesa (jugadores + 2, mínimo 4). Se negaban cartas entre jugadores. **Defecto:** en solitario no hay a quién negarle cartas; salidas posibles: la casa como rival que se lleva la mejor carta, o mazo finito. Quedó de lado a favor del Mazo de 13, que resuelve el solitario.

## ELEGIDA: "13 Jack" (antes "Mazo de 13", que sigue siendo el nombre de trabajo en estas notas)
Nombre definitivo: **13 Jack** (13 cartas + la terminación de Blackjack). Para mantener la referencia al 21 conviene una frase debajo del título, por ejemplo "Llega a 21 con 13 cartas".


### La idea
Cada jugador tiene **su propio mazo de 13 cartas**: As, 2 a 10, J, Q, K, una de cada una (J, Q y K valen 10; el As vale 1 u 11). Se mezclan boca abajo. Las mismas 13 cartas para todos, pero **cada jugador con su orden** (si fuera el mismo orden, el que mira el turno de otro sabría qué cartas le van a salir).

Se juega con una sola decisión: **pedir o plantarte**. Las cartas usadas **no vuelven** al mazo, así que en todo momento se sabe exactamente qué cartas quedan (no el orden). La probabilidad exacta de no pasarse se calcula con las cartas que quedan.

### Una mano
Se piden cartas de a una o te plantas. Si te pasas de 21, la mano vale 0 (y las cartas gastadas se pierden). Si te plantas, la mano vale su total, con un bonus si es **21 exacto**.

### Un mazo (una "ronda")
Son **4 manos** por mazo, no "hasta que se acabe el mazo": así todos terminan en el mismo momento y se evita que unos acaben mucho antes que otros. Las 13 cartas alcanzan justo para 4 manos: si te quedas sin cartas en plena mano, te plantas; si sobran, se pierden. De ahí sale la tensión de las dos puntas: gastar bien las cartas sin pasarte.

### La partida
Varios mazos, como una carrera a una meta de puntos (cada mazo valdría unos 70 a 80 puntos; la meta, por ejemplo, 5 mazos o un número de puntos a calibrar). Se aplica el "se completa la ronda" del Diez mil: si alguien llega primero, los que juegan después en esa vuelta terminan su turno, para que todos hayan jugado lo mismo.

### Turnos
Por turnos, una mano cada uno, como en el Diez mil, y se ve lo que juegan los demás (qué pidió, cuánto suma, cuándo se plantó). Con 8 jugadores no hay esperas largas porque cada turno es una sola mano.

### Fichas y tienda
- **Fichas:** 1 ficha cada 5 puntos del mazo, +5 fichas por cada 21 exacto, y una consolación pequeña por cada mano en la que te pasaste.
- **Tienda:** cada **2 mazos**, con 3 ofertas por jugador (como ahora cada 3 rondas). Al terminar cada mazo hay un resumen corto con los puntos del mazo y las fichas ganadas.

### Modo solitario
Es la misma partida sin rivales: buscas tu mejor puntaje en una carrera a la meta, con récord personal. Es el punto fuerte de esta idea frente a las otras (no depende de nadie más).

### Cartas especiales (las "trampas")
Tienen que ser **cartas especiales, como los dados especiales del Diez mil**: cada una **reemplaza a una de las 13 cartas** (el jugador elige cuál), así que el mazo sigue teniendo 13 cartas. Se compran en la tienda, una de cada tipo por jugador. Ideas de efectos, a definir:
- **Carta de oro:** la mano que la incluye vale el doble.
- **Comodín:** vale lo que te convenga.
- **Salvavidas:** si te pasarías, cuenta como 1 (una vez por mano).
- **Pegajosa:** vuelve al mazo después de usarla.
- **Doble:** cuenta como dos cartas del mismo valor.
- **Vidente:** muestra cuál es la próxima carta.
- **Espejo:** cambia su valor por el opuesto (por ejemplo 3 por 8).
- **Fantasma:** si te pasarías, se descarta sin sumar.
- **Multiplicador:** suma un porcentaje de lo que llevas en la mano.
**Riesgo a vigilar:** esto se acerca a "personalizar el mazo" (lo que se descartó por parecerse a Balatro). La diferencia es que son pocas, de un tipo cada una, reemplazan una carta y no se acumulan multiplicadores permanentes.

### El mazo del día (extra, para después)
Cada día un mazo mezclado igual para todos, una sola partida diaria y una imagen para compartir el puntaje, como Wordle. Funciona sin salas ni servidor y reutiliza la imagen de compartir. Es la única variante donde el orden puede ser igual para todos, porque no se ve el turno de nadie.

### Riesgos
- Cada decisión pide más cálculo que en el Diez mil (sigue siendo pedir o plantarte, pero con información perfecta).
- Hay que calibrar: meta de puntos, valor del 21 exacto, fichas por puntos y precios de las cartas especiales.

## Diseño conceptual de la sala (referencias en imágenes, nada programado)
- **Creador de sala:** igual al del Diez mil ("Nueva sala · Mazo de 13"): dos botones arriba (Con amigos / Solo), el recuadro del modo con su descripción, y las opciones en dos columnas: Cartas especiales (Sí/No), Meta (Corta 3 mazos / Normal 5 / Larga 8), Tiempo por turno, y Clave de la sala. **No hay selector de cantidad de jugadores** (hasta 8, como en el Diez mil).
- **Pantallas de referencia:** tu turno (con el mazo de 13 a la vista, cartas usadas apagadas), turno de otro jugador (su mano en vivo y el resumen de sus manos anteriores), resumen del mazo (4 manos, puntos y fichas) y tienda (cartas especiales con precio y a cuál de las 13 reemplazan).
- **Ventana de otro jugador (también para el Diez mil):** al tocar a un jugador se abre una ventana con sus datos y su mazo. Mazo de 13: puntos / meta, fichas, mazo actual, mejor mano, manos pasadas y su mazo de 13 cartas (apagadas las que ya usó, con borde dorado las especiales y una etiqueta). Diez mil: puntos / meta, fichas, turnos, quemadas, mejor turno, objetos y sus dados (con borde dorado los especiales y el nombre debajo). Al tocar una carta o dado especial se lee qué hace.
