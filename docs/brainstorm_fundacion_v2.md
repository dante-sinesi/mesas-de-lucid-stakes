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
17. **Misiones: conviven las dos clases y todas son compartidas.** A (condición, p. ej. «5 caminos conectados») y B (pedidos pagados con tarjetas). Un solo grupo a la vista para todos. **A:** se la lleva quien la cumple primero. **B:** se la lleva el primero que, en su turno, decide entregar las tarjetas.
18. **Las misiones vencen por turnos, no por rondas, y también en multijugador.** Motivo: con rondas, en una mesa de 4 y un vencimiento de 3 rondas, cuando llega el cuarto jugador ya se reiniciaron todas. Cada misión lleva su propia cuenta de turnos desde que apareció (se cuenta cada turno de cualquier jugador), así las reposiciones quedan escalonadas. En solitario un turno es una ronda.
19. **La ayuda al azar con el 7 se descarta.**
20. **La meta de puntos (hoy 8, 10 o 12) se recalibra con partidas simuladas** una vez que las tarjetas y las misiones estén definidas: con más fuentes de puntos probablemente baje la cantidad de turnos y haya que subir la meta. No se fija ahora.

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
4. **Las misiones como válvula de escape.** **Aprobada**: los pedidos (B) se pagan con tarjetas y convierten lo que sobra en puntos (decisión 17).
5. **Una pequeña ayuda al azar** (por ejemplo, con el 7, quien no tiene ninguna tarjeta recibe una a elección). **Descartada** (decisión 19).
6. **Descartar con premio.** Se parece a un banco, que se descartó. Sin decidir.

Se mide todo con bots antes de cerrar: cuántas partidas quedan «trabadas» por falta de un recurso con cada combinación.

## Misiones y pedidos (definidas a grandes rasgos)

Decisiones 17 y 18. Resumen:

- **Dos clases en un solo grupo compartido a la vista.** A: de condición (se cumplen haciendo algo en el mapa). B: pedidos (se cumplen entregando tarjetas; son un banco de puntos que convierte lo que sobra y resuelve el mal reparto).
- **Quién se la lleva:** A, quien la cumple primero. B, quien primero la entrega en su turno. Cada una se lleva una sola vez y se repone.
- **Vencimiento por turnos** (decisión 18), con cuenta propia por misión. Vale en solitario y en multijugador.
- Ideas mías, sin confirmar: 4 a la vista (2 de cada clase); el camino más largo y el ejército pasan a ser las dos primeras misiones de condición; cada misión suma +1 punto; cubrir perfiles de recursos distintos.

Por decidir (mío):
- **Cuántos turnos dura cada misión (K).** Propuesta: proporcional a la cantidad de jugadores (p. ej. 2 vueltas completas = 2 × jugadores turnos), para que cada jugador tenga el mismo número de oportunidades en cualquier mesa. En solitario saldría 2 turnos, que es muy poco: ahí habría que fijar un mínimo (p. ej. 6).
- Si se ven las misiones futuras o solo las actuales, y cuántas puede llevarse una persona.

## Dudas abiertas (para Dante)

1. **Vencimiento de misiones:** ¿te sirve el criterio «2 vueltas completas, con mínimo en solitario»? ¿O prefieres un número fijo de turnos?
2. **Solo:** ¿se gana por meta de puntos, por reloj o por las dos cosas?
3. **Qué decisiones le quedan al jugador** en su turno: qué construir y dónde, qué descartar, qué misión perseguir. ¿Alcanza?
4. **Duración objetivo:** ¿cuánto tiene que durar una partida con 2, 4 y 8 jugadores? (Sirve de objetivo para calibrar la meta de puntos.)

## Diseño de la pantalla (HUD)

Lo único dicho hasta ahora: está tosco y hay que rediseñarlo, y las tarjetas de recurso aparecen por abajo. Por contestar:

- ¿Qué es lo que se siente más tosco: el panel lateral, la ventana de producción, las tarjetas de los jugadores, los textos, los botones, todo?
- ¿En celular y en escritorio por igual?
- Se suma lo nuevo para mostrar: la mano de tarjetas abajo (con sus cantidades y el tope de 6), las misiones a la vista, la producción de cada tirada para todos y **el contador de piezas que quedan** de cada tipo (caballeros, ciudades, pueblos y caminos).
- Cuando se defina el flujo del turno, el rediseño sigue el método de `senior-diseno`: briefing, tres alternativas que difieren en estructura (bosquejos HTML de escritorio y celular), feedback de Dante y evolución de la elegida. Reglas de siempre del proyecto: poco texto en pantalla, nada de scroll, arte en píxeles planos sin espacios, ayuda y textos de depuración fuera del HUD.

## Para después de las decisiones

1. Cerrar las reglas (vencimiento de misiones, solo, duración y meta de puntos, esta última con simulaciones).
2. Traducir este documento a documentación: requisitos, flujo del turno y pantallas (`docs/catan_dados.md` y `docs/catan_flujo.md` se reescriben).
3. Diseñar las vistas con bosquejos A, B y C.
4. Recién ahí, con la autorización explícita de Dante, el código: reglas, mesa, bots, cliente y simuladores; y la calibración con partidas de bots.
