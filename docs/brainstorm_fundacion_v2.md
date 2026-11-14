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
9. **Misiones:** la idea queda aceptada como dirección (ver Ideas de Dante, 3); falta definir cómo funcionan (ver más abajo).
10. **Costo de la ciudad:** se arranca con el original (3 mineral + 2 trigo). **Cuando todo esté diseñado, un bot confirma si es alcanzable** con una mano de 6; si resulta inalcanzable, se queda como ahora: **2 de mineral y 2 de trigo**.
11. **El descarte obligatorio al empezar el turno se acepta tal cual**, aunque obligue a descartar lo que se acaba de ganar («es de lo más común en juegos de cartas»).
12. **Colocación inicial como herramienta:** aprobada. Al elegir un pueblo, la pantalla muestra qué recursos dará y cuáles faltan.
13. **Mapa justo por diseño:** aprobado. Al generar la isla se comprueba que cada recurso tenga hexágonos con números buenos (5 a 9) a su alcance y que no queden escondidos.
14. **El oro desaparece** junto con los dados de recursos.
15. **El caballero sigue protegiendo del bandido.**
16. **Contador de piezas en el HUD:** hay que mostrar cuántas piezas quedan del total de cada tipo (caballeros, ciudades, pueblos y caminos).

## Consecuencias que veo (mías, por confirmar)

- Desaparece todo lo que giraba en torno a los dados de recursos: la tirada con guardar y volver a tirar, las medallas de porcentaje, el tope de 4 dados fijos, la reserva de dados, los dados 3D de recursos y su tabla de probabilidades. También el **oro**, que era una cara de esos dados: con 5 recursos y sin comodín no queda ningún lugar para él (a confirmar). Los dos dados de número siguen siendo el motor de la producción.
- La mano de tarjetas es un ahorro natural (ataca el atasco de la ciudad a 8 %), pero con tope de 6 el ahorro es corto: una ciudad (5 tarjetas) más un camino (2) ya pasa de 6. Eso empuja a gastar rápido y acorta el juego.
- Con la ciudad en 5 tarjetas y el tope en 6, ahorrar para ella ocupa casi toda la mano. **Resuelto con la decisión 10** (lo confirma un bot y, si falla, vuelve a 2 + 2).
- Como se tira al empezar el turno, la tirada puede obligar a descartar lo que se acaba de ganar. **Aceptado** (decisión 11).
- Como puede construir todo lo que alcance, los turnos con mucha mano son largos y los turnos con poca mano, rápidos: mejora el ritmo general.
- Cobrando todos, los demás dejan de mirar y se acorta la espera con 5 a 8 jugadores.
- Cambia la economía entera: hay que recalibrar producción, costos y metas, y volver a medir con bots (los simuladores existentes se rehacen). También cambian los bots y el servidor de Fundación (flujo del turno y lo que se envía al cliente).

## El mal reparto: cómo se soluciona sin intercambio

Dante preguntó cómo se soluciona esto también en el multijugador. Sin intercambio, si tus edificios no tocan un recurso, no lo tienes. Estado de las opciones:

1. **La colocación inicial como herramienta principal.** **Aprobada** (decisión 12). Es el momento en que se elige dónde estar; la pantalla ayuda a elegir bien. Con la segunda ronda en serpiente, quien va último elige primero y compensa.
2. **Un mapa justo por diseño.** **Aprobado** (decisión 13).
3. **Expandirse con caminos** (aclaración pedida por Dante): no es una regla nueva. Es la forma que ya existe de cambiar lo que cobras: si te falta mineral, haces caminos hasta una esquina libre junto a un hexágono de mineral y ahí fundas un pueblo. Para que funcione, el camino tiene que ser barato y tiene que haber esquinas libres (la regla de distancia las limita). Se mide con bots; no cambia ninguna regla.
4. **Las misiones como válvula de escape.** En revisión: Dante preguntó si lo que propongo es que las misiones se completen a cambio de tarjetas de recursos. Ver «Misiones o pedidos».
5. **Una pequeña ayuda al azar** (por ejemplo, con el 7, quien no tiene ninguna tarjeta recibe una a elección). Sin decidir.
6. **Descartar con premio.** Se parece a un banco, que se descartó. Sin decidir.

Se mide todo con bots antes de cerrar: cuántas partidas quedan «trabadas» por falta de un recurso con cada combinación.

## Misiones o pedidos (por definir)

Ejemplo que dio Dante: «construye 5 caminos conectados: +1 punto de victoria». Dante preguntó: *¿dices que las misiones se completen a cambio de tarjetas de recursos?* Hay dos modelos distintos, y no es lo mismo:

- **A. Misiones de condición** (lo que decía el ejemplo): se cumplen **haciendo algo en el mapa** («5 caminos conectados», «2 ciudades», «un caballero en 3 hexágonos distintos»). No se pagan con tarjetas aparte; las tarjetas se gastan, como siempre, al construir. Dan un objetivo y una meta distinta a cada jugador.
- **B. Pedidos** (lo que pensaba yo al decir «válvula»): se cumplen **entregando tarjetas** («entrega 2 madera y 2 ladrillo: +1 punto», «entrega 3 tarjetas iguales: +1 punto»). Funcionan como un **banco de puntos**: convierten lo que te sobra en puntos. Eso resuelve el mal reparto (siempre hay un pedido que se paga con lo que tienes), le da otro uso a las tarjetas cuando la mano se llena de lo mismo y agrega decisiones (¿gasto en construir o en un pedido?).

Mi recomendación: **las dos clases conviven** en el mismo grupo de misiones a la vista.

Respuesta a «¿grupo compartido o individuales?» (Dante dijo que depende de lo anterior). Mi propuesta según lo que elijas:
- **Si hay pedidos (B):** grupo **compartido** a la vista; cada pedido se lleva una vez y se repone. Es una carrera con interacción (si alguien se lleva el que querías, te adaptas).
- **Solo con misiones de condición (A):** también compartido; se lleva quien la cumple primero.
- **En solitario:** el mismo grupo, sin competencia, y **cada misión vence a las K rondas** y se repone: así hay urgencia sin necesidad de rivales.

Ideas mías para completarlo:
- **Cuántas a la vez:** 4 a la vista (2 de condición y 2 pedidos), con reposición.
- **El camino más largo y el ejército** pasan a ser las dos primeras misiones de condición (permanentes y disputadas).
- **Equilibrio:** cada misión suma +1 punto, así que hay más fuentes de puntos: la meta (hoy 8, 10 o 12) se vuelve a calibrar.
- **Perfiles de recursos:** que el grupo cubra perfiles distintos.

Por decidir: cuántas a la vez, cuántas puede tener una persona, si se ven las misiones futuras (para planificar) o solo las actuales.

## Dudas abiertas (para Dante)

1. **Misiones:** ¿solo de condición (A), solo pedidos (B) o las dos clases juntas (recomendado)? De esto depende si el grupo es compartido, individual o ambos.
2. **Mal reparto:** ¿qué hacemos con la ayuda al azar (opción 5)? ¿Y con las misiones como válvula, según lo que elijas arriba?
3. **Solo:** ¿te convence que las misiones venzan a las K rondas (urgencia sin rivales)? ¿Se gana por meta de puntos, por reloj o por las dos cosas?
4. **Qué decisiones le quedan al jugador** en su turno: qué construir y dónde, qué descartar y qué misión perseguir. ¿Alcanza?
5. **Duración objetivo:** ¿cuánto tiene que durar una partida con 2, 4 y 8 jugadores?

## Diseño de la pantalla (HUD)

Lo único dicho hasta ahora: está tosco y hay que rediseñarlo, y las tarjetas de recurso aparecen por abajo. Por contestar:

- ¿Qué es lo que se siente más tosco: el panel lateral, la ventana de producción, las tarjetas de los jugadores, los textos, los botones, todo?
- ¿En celular y en escritorio por igual?
- Se suma lo nuevo para mostrar: la mano de tarjetas abajo (con sus cantidades y el tope de 6), las misiones a la vista, la producción de cada tirada para todos y **el contador de piezas que quedan** de cada tipo (caballeros, ciudades, pueblos y caminos).
- Cuando se defina el flujo del turno, el rediseño sigue el método de `senior-diseno`: briefing, tres alternativas que difieren en estructura (bosquejos HTML de escritorio y celular), feedback de Dante y evolución de la elegida. Reglas de siempre del proyecto: poco texto en pantalla, nada de scroll, arte en píxeles planos sin espacios, ayuda y textos de depuración fuera del HUD.

## Para después de las decisiones

1. Cerrar las reglas (misiones, ayuda al azar, solo, duración).
2. Traducir este documento a documentación: requisitos, flujo del turno y pantallas (`docs/catan_dados.md` y `docs/catan_flujo.md` se reescriben).
3. Diseñar las vistas con bosquejos A, B y C.
4. Recién ahí, con la autorización explícita de Dante, el código: reglas, mesa, bots, cliente y simuladores; y la calibración con partidas de bots.
