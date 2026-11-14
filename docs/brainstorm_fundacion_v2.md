# Fundación v2: brainstorming

Estado: **brainstorming cerrado y traducido a la documentación (14 de noviembre de 2026), nada programado.** La documentación vigente es `catan_dados.md` (reglas), `catan_flujo.md` (flujo), `fundacion_v2_pantallas.md`, `fundacion_v2_requisitos.md` y `fundacion_v2_plan.md`; este documento queda como registro de cómo se decidió. Regla de trabajo acordada: no se escribe código hasta que Dante lo autorice de forma explícita. Todo lo que él va diciendo se anota aquí, tal cual; después este documento se traduce a documentación (requisitos, flujo, diseño) y recién ahí empieza el código.

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
18. **Vencimiento (corrige mi versión anterior).** **Las misiones de condición (A) no vencen:** se las lleva quien las cumple primero. **Los pedidos (B) sí vencen, por turnos, no por rondas:** cada pedido dura dos turnos para cada jugador (dos vueltas completas, 2 × jugadores turnos en total), con cuenta propia por pedido. Motivo de contar turnos: con rondas, en una mesa de 4 y 3 rondas, cuando llega el cuarto jugador ya se reiniciaron todos. **Reposición:** cuando alguien compra un pedido, se repone **al terminar el turno de quien lo compró**.
19. **La ayuda al azar con el 7 se descarta.**
21. **En solitario se gana por meta de puntos** (sin reloj).
22. **Qué decide el jugador:** se da por suficiente por ahora (qué construir y dónde, qué descartar, qué misión o pedido perseguir). Se pasa al rediseño completo del HUD.
24. **Reloj (cerrado):** un solo reloj por turno; se arranca con Normal 45 s, Extendido 90 s y Sin límite, y se regula después. **Al agotarse, el turno se pasa solo.** La duración de la partida y la meta de puntos se calibran con partidas simuladas y no se pueden cerrar hasta tener el juego y los bots.
23. **Duración de la partida (reemplazada por la 24):** el turno tiene solo dos partes: la tirada con la ganancia de recursos (compartida, cobran todos) y el turno propio de quien juega. Dante propone manejar el ritmo **como en los otros juegos de la sala** (reloj por turno). Falta confirmar con Dante cuál de esos mecanismos exactamente y qué tiempo.
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

1. **Duración:** confirmar el mecanismo de ritmo por turno (como en los otros juegos) y el tiempo; la meta de puntos se calibra después con simulaciones.

## Diseño de la pantalla (HUD)

Bosquejos en `prototipos/hud_v2/` (no se versiona): `index.html` muestra todas las escenas con botones arriba y un selector **Celular horizontal / Escritorio**; `hud_escenas.html` es la página de las escenas y `hud_abc.html` la primera ronda (A, B y C).

### Decisiones del HUD (de Dante)

H1. **Estructura «Mesa de Risk»** (la referencia de Dante) en escritorio y en celular: el mapa ocupa toda la pantalla y todo lo demás flota encima. **Los jugadores van a la derecha y las misiones a la izquierda, ambos centrados verticalmente en todas las escenas.** Arriba a la izquierda, el contador de piezas (caballeros, ciudades, pueblos y caminos). Abajo en el centro, la mano; abajo a la derecha, los botones.
H2. **Fundación es el primer juego horizontal también en celular**: se justifica por su mayor complejidad respecto de los demás juegos de la sala.
H3. **Medidor de tiempo de turno** en una barra fina arriba de toda la pantalla, sobre cualquier fondo oscurecido. Dice «Tu turno · 0:21» (o «Turno de Ana»), se vacía y se pone roja cuando queda poco. Está en todas las escenas de turno (propio y ajeno); **no** en la tirada de dados, que es automática y compartida.
H4. **Las cartas de la mano son privadas.** En las fichas de los demás jugadores no se lee el número de tarjetas: se ven como dorsos. **Excepción:** las ganancias de una tirada se muestran de frente a todos, porque se deducen del tablero.
H5. **Dados:** los mismos dados 3D de siempre, en el medio de la pantalla, con el «Sale x» y nada más.
H6. **Ganancias de la tirada:** las cartas salen de los pueblos y ciudades que tocan el número, se muestran al frente agrupadas por jugador y se acomodan solas en la mano.
H7. **Descarte:** fondo oscurecido y cartas grandes en el medio, fáciles de tocar. Título «Descarta N tarjetas» y «Máximo 6». Si es obligatorio, el botón dice «Faltan N» y pasa a «Descartar» al elegir las necesarias; si es opcional, dice «Pasar» (y «Descartar» si se elige alguna).
H8. **Construir:** muestra siempre las cuatro opciones con su costo, y las que no se pueden quedan apagadas con lo que falta. Si no se puede ninguna, avisa y el botón dice «Pasar». La mano queda visible debajo. Al elegir, se marcan en el mapa los lugares válidos.
H9. **Misiones y pedidos:** pantalla con las misiones de condición (con el avance, p. ej. 3 de 5 caminos; no se entregan) y los pedidos (con costo y lo que falta).
H10. **Colocación inicial:** se marcan los lugares posibles; al elegir uno se ven los recursos que daría y cuáles faltan («Te falta»).
H11. **Bandido (7):** se resaltan las casillas posibles y el botón dice «Elige una casilla».
H13. **Tarjetas sin texto:** cada tarjeta de la mano es una sola y se identifica por su color y un dibujo (tronco, ladrillo, nube, espiga, roca); con 3 maderas se ven 3 tarjetas de madera. Vale para la mano, el descarte, los costos y las entregas. Los dibujos son provisorios.
H14. **Visor de jugadores (derecha):** el propio muestra las tarjetas en miniatura, de color y sin texto; los demás muestran solo cuántas tienen, como dorsos.
H15. **Dados:** la tirada usa la misma escena 3D y la misma caída que el diez mil, en el centro de la pantalla, grandes, con «Sale x». En el segundo cuadro solo se ve la carta que se lleva el propio jugador, encima de su pueblo o ciudad. En el tercero se ven las cartas que se llevó cada uno.
H16. **Bandido:** no lo mueve el jugador, se mueve solo. Se ve su desplazamiento de la casilla anterior (tenue) a la nueva (marcada), con el mensaje «Salió 7, el bandido se mueve». Sin botón ni medidor.
H17. **Entrega de pedidos:** el jugador no elige tarjetas. Las que se entregan se muestran marcadas y no se pueden cambiar; solo hay «Atrás» y «Entregar». Una opción que no se puede cumplir aparece apagada y, al tocarla, no abre la ventana y avisa (p. ej. «Necesitas 3 tarjetas iguales»), para que el jugador no pierda tiempo de su turno. Lo mismo vale para las opciones apagadas de Construir.
H18. **Final de partida:** igual a la del diez mil y el 13jack (título, subtítulo, una fila por jugador con puesto, nombre, detalle y puntos; «Nueva partida», «Compartir» y «Salir»), con la misma función `compartirImagen` de `comun.js`. Ojo: esa función hoy exporta PNG.
H19. **Sala de espera:** no se rediseña; es común a todos los juegos de la sala.
H12. **Turno de otro jugador:** se ve su nombre en el medidor, su ficha resaltada y el botón «Esperando a Ana»; lo que hace se avisa arriba («Ana descarta 2 tarjetas»). La mano propia sigue visible.

### Escenas bosquejadas

Turno, Dados 1 a 3, Descarte (obligatorio, listo, opcional), Construir, Nada que construir, Colocar, Pedidos, Pedido no disponible, Entrega fija, Entrega de 3 iguales, Colocación inicial, Bandido, Turno ajeno, Ajeno descarta, Victoria, Otro se desconecta y Reconectando. **Aprobadas por Dante** (primera ronda de diseño de las vistas).

### Pendiente del HUD

- Revisar el celular: los textos de «Construir» y «Pedidos» se leen chicos, y las ganancias de la tirada ocupan mucho.
- Hay que confirmar la animación real de las cartas (los bosquejos son cuadros fijos).
- Después de este paso, el rediseño sigue el método de `senior-diseno`: estilo, evolución de la elegida y recién entonces la implementación, con la autorización explícita de Dante.

## Para después de las decisiones

1. Cerrar la duración y, con simulaciones, la meta de puntos (reglas del resto, cerradas por ahora).
2. Traducir este documento a documentación: requisitos, flujo del turno y pantallas (`docs/catan_dados.md` y `docs/catan_flujo.md` se reescriben).
3. Diseñar las vistas con bosquejos (hecho en una primera ronda; ver «Diseño de la pantalla»).
4. Recién ahí, con la autorización explícita de Dante, el código: reglas, mesa, bots, cliente y simuladores; y la calibración con partidas de bots.
