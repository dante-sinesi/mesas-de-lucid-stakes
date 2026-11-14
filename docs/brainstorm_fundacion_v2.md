# Fundación v2: brainstorming

Estado: **brainstorming, nada programado.** Regla de trabajo acordada: no se escribe código hasta que Dante lo autorice de forma explícita. Todo lo que él va diciendo se anota aquí, tal cual; después este documento se traduce a documentación (requisitos, flujo, diseño) y recién ahí empieza el código.

Convención: lo que dijo Dante va en **Ideas de Dante**; lo que agrego yo (consecuencias, dudas, propuestas) va aparte y marcado como mío, para que se pueda aceptar, corregir o descartar.

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

## Consecuencias que veo (mías, por confirmar)

- Desaparece todo lo que giraba en torno a los dados de recursos: la tirada con guardar y volver a tirar, las medallas de porcentaje, el tope de 4 dados fijos, la reserva de dados, el costo de la ciudad pensado para dados, los dados 3D de recursos y su tabla de probabilidades. El turno se parece mucho más a un Catan clásico: tiras, cobras, construyes.
- Los dos dados de número siguen siendo el motor de la producción.
- La mano de tarjetas funciona como ahorro natural: si algo no alcanza, se junta para otro turno. Eso ataca de frente el problema de la ciudad a 8 % y de los turnos vacíos.
- Si todos cobran con cada tirada, los jugadores que no tienen el turno participan y se acorta la espera con 5 a 8 jugadores. Hoy solo cobra quien tiene el turno.
- Cambia la economía entera: hay que recalibrar costos, producción y metas, y volver a medir con bots (los simuladores existentes se rehacen).
- Los bots y el servidor de Fundación cambian en el flujo del turno y en lo que se envía al cliente.

## Dudas abiertas (preguntas para Dante)

1. **Quién cobra:** ¿cobra cada jugador con cada tirada (como Catan), o solo quien tiene el turno (como hoy)?
2. **Cuánto produce cada edificio:** ¿pueblo 1 tarjeta y ciudad 2? Dante dijo «las ciudades»: ¿los pueblos también producen?
3. **Qué pasa con el 7 y el bandido:** ¿sigue bloqueando un hexágono? ¿Hay descarte de tarjetas cuando hay demasiadas?
4. **Tope de mano:** ¿se pueden juntar tarjetas sin límite? ¿Hay un tope que cree decisiones?
5. **Los tipos de recurso:** ¿se mantienen los 5 (madera, ladrillo, lana, trigo, mineral)? ¿Y el oro, que era comodín en los dados?
6. **Intercambio:** ¿entre jugadores, con un banco (por ejemplo 4 por 1), con ambos o con ninguno? El intercambio es lo que más tiempo suma en un turno.
7. **Costos:** ¿se mantienen los actuales (camino 1+1, pueblo 1+1+1+1, ciudad 2 mineral + 2 trigo, caballero 1+1+1)? Se pensaron para dados, no para tarjetas.
8. **El caballero:** hoy protege de los efectos del bandido. ¿Sigue igual?
9. **Qué decisiones le quedan al jugador en su turno** si ya no hay que tirar y guardar (elegir qué construir, dónde y qué intercambiar): ¿alcanza o falta algo que lo haga interesante?
10. **Modo solo:** ¿cómo se juega solo ahora que no hay dados de recursos? Regla general de Dante: debe ser igual de jugable y divertido solo y con amigos, sin necesidad de bots.
11. **Duración objetivo:** ¿cuánto tiene que durar una partida con 2, 4 y 8 jugadores?

## Diseño de la pantalla (HUD)

Lo único dicho hasta ahora: está tosco y hay que rediseñarlo, y las tarjetas de recurso aparecen por abajo. Por contestar:

- ¿Qué es lo que se siente más tosco: el panel lateral, la ventana de producción, las tarjetas de los jugadores, los textos, los botones, todo?
- ¿En celular y en escritorio por igual?
- Cuando se defina el flujo del turno, el rediseño sigue el método de `senior-diseno`: briefing, tres alternativas que difieren en estructura (bosquejos HTML de escritorio y celular), feedback de Dante y evolución de la elegida. Reglas de siempre del proyecto: poco texto en pantalla, nada de scroll, arte en píxeles planos sin espacios, ayuda y textos de depuración fuera del HUD.

## Decisiones

(Ninguna todavía.)

## Para después de las decisiones

1. Cerrar las reglas (producción, costos, intercambio, bandido, solo).
2. Traducir este documento a documentación: requisitos, flujo del turno y pantallas (`docs/catan_dados.md` y `docs/catan_flujo.md` se reescriben).
3. Diseñar las vistas con bosquejos A, B y C.
4. Recién ahí, con la autorización explícita de Dante, el código: reglas, mesa, bots, cliente y simuladores; y la calibración con partidas de bots.
