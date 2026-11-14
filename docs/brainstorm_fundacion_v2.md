# Fundación v2: brainstorming

Estado: **brainstorming, nada programado.** Regla de trabajo acordada: no se escribe código hasta que Dante lo autorice de forma explícita. Todo lo que él va diciendo se anota aquí, tal cual; después este documento se traduce a documentación (requisitos, flujo, diseño) y recién ahí empieza el código.

Convención: lo que dijo Dante va en **Ideas de Dante** y **Decisiones**; lo que agrego yo (consecuencias, dudas, propuestas) va aparte y marcado como mío, para que se pueda aceptar, corregir o descartar.

## Por qué se rehace

Fundación funciona, pero la experiencia no convence. Lo que se midió y se vivió:

- El dado de recursos agrega un paso extra incómodo (tirar, marcar, volver a tirar, reservar).
- En el final de la partida se traba: con la ciudad a 8 % por turno, hubo turnos de varios minutos sin poder hacer nada más que buscar una ciudad (`docs/fundacion_estadisticas.md`).
- Con 8 jugadores una partida dura casi dos horas estimadas (30 s por turno) y los demás miran sin hacer nada.
- Los menús y la pantalla (el HUD) se ven toscos; el mapa y los dibujos están bien.

## Ideas de Dante (en orden)

### 1. Fuera los dados de recursos

- Se eliminan los dados de recursos: dan un paso extra incómodo.
- A partir de ahora los recursos se consiguen **según el número que sale en los dados** y **las ciudades que están en contacto con ese hexágono**.
- **Cada recurso es una tarjeta** que aparece **por la parte de abajo** de la pantalla.

### 2. Rediseñar las vistas

- Se ve todo muy tosco. **No el mapa ni los dibujos: el HUD y cómo se presentan las cosas en pantalla.**
- Hay que rediseñar las vistas.

### 3. Misiones o pedidos, para solo y para multijugador

- Una idea de Dante: misiones del estilo «construye 5 caminos conectados: +1 punto de victoria», y así. Sirven **tanto para el modo solo como para el multijugador**.

## Decisiones

1. **Cobran todos con cada tirada** (no solo quien tiene el turno).
2. **Máximo de 6 tarjetas en la mano.** Si al empezar tu turno tienes más de 6, primero tienes que descartar hasta quedar en 6 y recién después puedes construir.
3. **Producción:** un pueblo da 1 unidad del recurso del hexágono; una ciudad da 2.
4. **No hay intercambio** (ni con jugadores ni con un banco).
5. **El bandido sigue bloqueando un hexágono** (el que sale con el 7). **Salta al azar, también en solitario: eso se queda** (da aleatoriedad al juego).
6. **Construcciones por turno: todas las que alcancen** con las tarjetas disponibles (ya no hay límite de una).
7. **Orden del turno:** se tiran los dados al empezar, **todos cobran**, después quien tiene el turno descarta (si tiene más de 6) y construye.
8. **Recursos y costos:** se mantienen los 5 recursos (madera, ladrillo, lana, trigo, mineral). Los costos se mantienen, **salvo la ciudad, que vuelve al costo original: 3 de mineral y 2 de trigo.** Es decir: camino 1 madera + 1 ladrillo; pueblo 1 madera + 1 ladrillo + 1 lana + 1 trigo; ciudad 3 mineral + 2 trigo; caballero 1 lana + 1 trigo + 1 mineral.
9. **Misiones:** la idea queda aceptada como dirección (ver Ideas de Dante, 3); falta definir cómo funcionan.

## Consecuencias que veo (mías, por confirmar)

- Desaparece todo lo que giraba en torno a los dados de recursos: la tirada con guardar y volver a tirar, las medallas de porcentaje, el tope de 4 dados fijos, la reserva de dados, los dados 3D de recursos y su tabla de probabilidades. También el **oro**, que era una cara de esos dados: con 5 recursos y sin comodín no queda ningún lugar para él (a confirmar). Los dos dados de número siguen siendo el motor de la producción.
- La mano de tarjetas es un ahorro natural (ataca el atasco de la ciudad a 8 %), pero con tope de 6 el ahorro es corto: una ciudad (5 tarjetas) más un camino (2) ya pasa de 6. Eso empuja a gastar rápido y acorta el juego.
- Con la ciudad en 5 tarjetas y el tope en 6, ahorrar para una ciudad ocupa casi toda la mano: conviene vigilar que no sea inalcanzable en una zona con poco mineral.
- Como se tira al empezar el turno, quien tiene el turno cobra y después descarta: la tirada puede obligarlo a descartar lo que acaba de ganar. Es una tensión del turno que hay que mirar.
- Como puede construir todo lo que alcance, los turnos con mucha mano son largos y los turnos con poca mano, rápidos: mejora el ritmo general.
- Cobrando todos, los demás dejan de mirar y se acorta la espera con 5 a 8 jugadores.
- Cambia la economía entera: hay que recalibrar producción, costos y metas, y volver a medir con bots (los simuladores existentes se rehacen). También cambian los bots y el servidor de Fundación (flujo del turno y lo que se envía al cliente).

## El mal reparto: cómo se soluciona sin intercambio (análisis mío, por decidir)

Dante preguntó cómo se soluciona esto también en el multijugador. Sin intercambio, si tus edificios no tocan un recurso, no lo tienes. Opciones (se pueden combinar):

1. **La colocación inicial como herramienta principal.** Es el momento en que se elige dónde estar. Que la pantalla ayude: mostrar, al elegir un pueblo, qué recursos y con qué frecuencia dará (y qué te estaría faltando). Con la segunda ronda en serpiente, quien va último elige primero y compensa.
2. **Un mapa justo por diseño.** Al generar la isla, comprobar que cada recurso tiene al menos un par de hexágonos con números buenos (5 a 9) accesibles, y que no queden recursos «escondidos» o amontonados. Es la solución más barata y la más segura.
3. **Expandirse es la salida.** Los caminos (2 tarjetas) y los pueblos nuevos son la manera de llegar a lo que falta. Hay que calibrar que el camino sea barato y que haya pueblos disponibles.
4. **Las misiones como válvula de escape.** Si hay misiones con distintos perfiles de recursos (algunas de madera y ladrillo, otras de mineral y trigo, otras sin recursos concretos), cualquier reparto tiene un camino hacia los puntos. Es el uso más valioso de la idea de Dante.
5. **Una pequeña ayuda al azar.** Por ejemplo, cuando sale el 7 los jugadores sin ninguna tarjeta reciben una de su elección. Mantiene el azar y suaviza lo peor. Es solo una idea.
6. **Descartar con premio.** Descartar tarjetas de más no da nada hoy. Que el descarte diera algo (por ejemplo, una carta de otro tipo por tres iguales) se parece a un banco, que Dante descartó: solo se pone en la lista por completitud.

Se mide todo con bots antes de decidir: cuántas partidas quedan «trabadas» por falta de un recurso con cada combinación.

## Misiones o pedidos (primera idea, por definir)

Ejemplos que dio Dante: «construye 5 caminos conectados: +1 punto de victoria». Ideas mías para completarlo:

- **Cómo se reparten:** un grupo de misiones a la vista (3 o 4), compartido por todos: la primera persona que la cumple se la lleva y se repone con otra. En solitario funcionan igual, pero sin competencia: se cumplen todas las que se pueda, y el reloj es el de la partida.
- **Qué tipo de misiones:** de construcción («5 caminos conectados», «2 ciudades», «un pueblo junto a 3 terrenos distintos»), de posición («un caballero en 3 hexágonos distintos», «un camino hasta la costa»), de ritmo («cobrar 4 tarjetas de una vez») y de equilibrio («tener 3 recursos distintos en la mano al empezar el turno»).
- **Interacción con lo que ya existe:** el camino más largo y el ejército son, en el fondo, dos misiones permanentes que se disputan. Se pueden convertir en las dos primeras del grupo.
- **Equilibrio:** cada misión suma +1 punto, así que hay más fuentes de puntos: la meta (hoy 8, 10 o 12) se vuelve a calibrar.
- **Para evitar mal reparto:** que las misiones del grupo cubran perfiles distintos de recursos.

Por decidir: cuántas a la vez, cuántas por jugador, si una misión se puede reclamar solo con construir lo mismo que ya había o hay que hacerlo después de que aparezca, y si se muestran las misiones futuras (para planificar) o solo las actuales.

## Dudas abiertas (para Dante)

1. **Misiones:** ¿grupo compartido a la vista (carrera), misiones individuales, o las dos cosas? ¿Cuántas a la vez?
2. **Mal reparto:** ¿qué combinación de las seis opciones te convence? (Mi recomendación: 1 + 2 + 4.)
3. **El oro desaparece** junto con los dados de recursos: ¿confirmas?
4. **El caballero:** hoy protege de los efectos del bandido. ¿Sigue igual?
5. **Qué decisiones le quedan al jugador** en su turno: qué construir y dónde, qué descartar y qué misión perseguir. ¿Alcanza?
6. **Modo solo:** con misiones, ¿cómo se gana? (meta de puntos, reloj de rondas o las dos cosas).
7. **Duración objetivo:** ¿cuánto tiene que durar una partida con 2, 4 y 8 jugadores?

## Diseño de la pantalla (HUD)

Lo único dicho hasta ahora: está tosco y hay que rediseñarlo, y las tarjetas de recurso aparecen por abajo. Por contestar:

- ¿Qué es lo que se siente más tosco: el panel lateral, la ventana de producción, las tarjetas de los jugadores, los textos, los botones, todo?
- ¿En celular y en escritorio por igual?
- Se suma lo nuevo para mostrar: la mano de tarjetas abajo (con sus cantidades y el tope de 6), las misiones a la vista y la producción de cada tirada para todos.
- Cuando se defina el flujo del turno, el rediseño sigue el método de `senior-diseno`: briefing, tres alternativas que difieren en estructura (bosquejos HTML de escritorio y celular), feedback de Dante y evolución de la elegida. Reglas de siempre del proyecto: poco texto en pantalla, nada de scroll, arte en píxeles planos sin espacios, ayuda y textos de depuración fuera del HUD.

## Para después de las decisiones

1. Cerrar las reglas (misiones, mal reparto, oro, caballero, solo).
2. Traducir este documento a documentación: requisitos, flujo del turno y pantallas (`docs/catan_dados.md` y `docs/catan_flujo.md` se reescriben).
3. Diseñar las vistas con bosquejos A, B y C.
4. Recién ahí, con la autorización explícita de Dante, el código: reglas, mesa, bots, cliente y simuladores; y la calibración con partidas de bots.
