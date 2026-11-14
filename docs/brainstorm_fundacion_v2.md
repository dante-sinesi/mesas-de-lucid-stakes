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

## Decisiones

1. **Cobran todos con cada tirada** (no solo quien tiene el turno).
2. **Máximo de 6 tarjetas en la mano.** Si al empezar tu turno tienes más de 6, primero tienes que descartar hasta quedar en 6 y recién después puedes construir.
3. **Producción:** un pueblo da 1 unidad del recurso del hexágono; una ciudad da 2.
4. **No hay intercambio** (ni con jugadores ni con un banco).
5. **El bandido sigue bloqueando un hexágono** (el que sale con el 7).

## Consecuencias que veo (mías, por confirmar)

- Desaparece todo lo que giraba en torno a los dados de recursos: la tirada con guardar y volver a tirar, las medallas de porcentaje, el tope de 4 dados fijos, la reserva de dados, el costo de la ciudad pensado para dados, los dados 3D de recursos y su tabla de probabilidades. Los dos dados de número siguen siendo el motor de la producción.
- La mano de tarjetas es un ahorro natural (ataca el atasco de la ciudad a 8 %), pero con tope de 6 el ahorro es corto: una ciudad (4 tarjetas) más un camino (2) llenan la mano. Eso empuja a gastar rápido y acorta el juego.
- El descarte solo se aplica al empezar tu turno, así que mientras juegan los demás tu mano puede pasar de 6. La presión por gastar aparece en tu turno.
- Sin intercambio ni banco, un mal reparto es **permanente**: si tu zona no da mineral, no hay forma de hacer una ciudad salvo conseguir un edificio nuevo cerca de un hexágono de mineral. Es la mayor fuente de frustración posible y hay que medirla con bots. Más abajo, ideas para amortiguarlo sin intercambio.
- Cobrando todos, los demás dejan de mirar y se acorta la espera con 5 a 8 jugadores.
- Cambia la economía entera: hay que recalibrar costos, producción y metas, y volver a medir con bots (los simuladores existentes se rehacen). También cambian los bots y el servidor de Fundación (flujo del turno y lo que se envía al cliente).

## Dudas abiertas (para Dante)

1. **Cuántas construcciones por turno:** hoy es una por turno porque salía de una tirada de dados. Con tarjetas, ¿se construye todo lo que alcance o sigue siendo una?
2. **Orden del turno:** ¿tiras los dados al empezar el turno (todos cobran) y después descartas y construyes? ¿O se descarta antes de tirar? Importa porque quien tira cobra y puede quedar con más de 6.
3. **Los tipos de recurso:** ¿se mantienen los 5 (madera, ladrillo, lana, trigo, mineral)? ¿Y el oro, que era comodín en los dados?
4. **Costos:** ¿se mantienen los actuales (camino 1+1, pueblo 1+1+1+1, ciudad 2 mineral + 2 trigo, caballero 1+1+1)? Se pensaron para dados, no para tarjetas.
5. **El caballero:** hoy protege de los efectos del bandido. ¿Sigue igual?
6. **Qué decisiones le quedan al jugador** en su turno: elegir qué construir y dónde, y qué descartar. ¿Alcanza o falta algo que lo haga interesante?
7. **Modo solo:** ver el análisis abajo.
8. **Duración objetivo:** ¿cuánto tiene que durar una partida con 2, 4 y 8 jugadores?

### El modo solo: cuál es el problema (análisis mío)

La regla de Dante es que solo debe ser igual de jugable y divertido que con amigos, sin necesidad de bots. Con estas reglas, los problemas son:

- **No hay contra quién jugar:** la tensión de Fundación venía de la carrera con los demás (el camino más largo, el ejército, llegar primero a la meta). Solo, esa carrera desaparece y queda «llegar a la meta en menos turnos».
- **Casi todo es suerte y orden de construcción:** sin tirar dados para elegir y sin intercambio, las decisiones se reducen a qué construir y dónde. Es muy poco para que una persona sola lo disfrute durante una partida entera.
- **Un mal reparto no tiene salida:** sin intercambio, si el mapa no da un recurso, solo no hay nadie a quien pedirle ni manera de compensar. Con amigos al menos el mapa se comparte.
- **El bandido no tiene dueño:** salta con el 7 al azar. Con amigos molesta a otro; solo, es ruido.
- **El descarte no genera decisión interesante** si no hay nada contra qué decidir.

Ideas para que solo funcione sin bots (a conversar, ninguna es decisión):
- **Misiones o pedidos** (una pila de encargos: «construye una ciudad junto a mineral», «5 caminos seguidos») que sustituyen a la carrera con los demás; da objetivos, decisiones y rejugabilidad.
- **Reloj de rondas** («llega a 10 puntos en 20 turnos»): da tensión sin necesitar a nadie.
- **Eventos del mapa** además del 7 (el bandido avanza, una tormenta bloquea un hexágono): el mapa pelea contra ti.
- **Variar el mapa y el objetivo** cada partida (mapa con semilla compartida, ranking diario): da motivo para volver.

## Diseño de la pantalla (HUD)

Lo único dicho hasta ahora: está tosco y hay que rediseñarlo, y las tarjetas de recurso aparecen por abajo. Por contestar:

- ¿Qué es lo que se siente más tosco: el panel lateral, la ventana de producción, las tarjetas de los jugadores, los textos, los botones, todo?
- ¿En celular y en escritorio por igual?
- Cuando se defina el flujo del turno, el rediseño sigue el método de `senior-diseno`: briefing, tres alternativas que difieren en estructura (bosquejos HTML de escritorio y celular), feedback de Dante y evolución de la elegida. Reglas de siempre del proyecto: poco texto en pantalla, nada de scroll, arte en píxeles planos sin espacios, ayuda y textos de depuración fuera del HUD.

## Para después de las decisiones

1. Cerrar las reglas (producción, costos, bandido, solo, orden del turno).
2. Traducir este documento a documentación: requisitos, flujo del turno y pantallas (`docs/catan_dados.md` y `docs/catan_flujo.md` se reescriben).
3. Diseñar las vistas con bosquejos A, B y C.
4. Recién ahí, con la autorización explícita de Dante, el código: reglas, mesa, bots, cliente y simuladores; y la calibración con partidas de bots.
