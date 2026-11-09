# Fundación: plan de programación

Reglas en `catan_dados.md`, flujo y pantallas en `catan_flujo.md`, arte y maquetas en `prototipos/` (`arte_catan`, `etapas_isla`). El id interno del juego es `fundacion`; el nombre que se ve es «Fundación». La sala de espera es **la misma de los otros juegos** (asientos, bots, reglas del anfitrión, invitar): solo cambia el contenido del cuadro de reglas.

Se trabaja en la rama `feature/fundacion`, con un commit por fase y las pruebas (`npm test`, «fallos: 0») antes de cada uno.

## Fase 1 · Las reglas (servidor, puro, sin red) — HECHA
`servidor/fundacion/reglas.js`, con pruebas en `pruebas/test_fundacion_reglas.js`.
- **El mapa**: se genera por semilla (19 hexágonos hasta 4 jugadores, 37 de 5 a 8), con tipos y números mezclados (sin 6 y 8 pegados), vértices, aristas y su vecindad (coordenadas enteras, el cliente las dibuja).
- **Dados de recursos**: 6 caras (madera, ladrillo, lana, trigo, mineral, oro). Costos y «¿alcanzan?», con el oro como comodín (2 oros = 1 recurso).
- **Probabilidad exacta** de lograr un edificio con los dados guardados y las tiradas que quedan (para las medallas de %).
- **Lugares válidos** de camino, pueblo, ciudad y caballero (distancia entre pueblos, caminos que abren camino, piezas agotadas).
- **Producción**: dos dados de número, 7 del bandido, recursos de cada jugador (pueblo 1, ciudad 2, tope de 4 dados fijados), el caballero que protege del bandido.
- **Puntos y carreras**: camino más largo (5 o más, por cantidad) y ejército (mínimo 2, el que tenga más), meta y cálculo del ganador.

## Fase 2 · La mesa en el servidor — HECHA
`servidor/fundacion/mesa_fundacion.js` (`MesaFundacion`, como `MesaDM` y `Mesa13`) y su integración en `servidor/salas.js`.
- Máquina de estados: espera → colocación inicial (serpiente) → turnos (producción, dados, construir, colocar) → última vuelta → fin.
- Relojes por fase, tiempo agotado (un bot juega esa jugada; al turno siguiente, un bot reemplaza hasta que vuelva), desconexión, recarga y estado público para cada jugador (versión para la consulta larga).
- Reglas de la sala: jugadores 1 a 8, tiempo por fase, meta (8, 10 o 12). Modo solo (mejor marca en turnos).
- Pruebas: `test_fundacion.js` (partidas completas con una jugada guiada) y las de salas.

## Fase 3 · Los bots y el simulador — HECHA (calibración pendiente con partidas reales)
- Bot de Fundación (guarda dados hacia el mejor edificio, elige lugares por producción esperada) que juega por los bots de la sala, los ausentes y el tiempo agotado.
- Simulador de partidas para medir y calibrar (`simulador/`): duración, costos, tope de 4 dados fijados, peso del mapa y el umbral de las carreras.

## Fase 4 · El cliente — HECHA (sw bj-101)
- **Dados 3D de recursos**: se generaliza `web/dados3d.js` (modelo de 15 cubitos por lado, modo en fila o en dos filas de 3, sin mesa, espaciado) sin cambiar los dados del Diez mil.
- **Pantalla de la partida** `web/fundacion.js`: mapa en canvas de píxeles planos con cámara (zoom en números enteros), jugadores con franja de color, etapas (producción, dados, construir, colocar, zonas en móvil, caballero), medallas, reloj y botones del juego.
- **Entrada y salas**: tarjeta en «crear sala» y «solo», icono (pueblo y ciudad) en mesas, lista y ficha, reglas de la sala, ayuda y estadísticas.
- `web/sw.js` (versión) y `docs/diseno.md`.

## Fase 5 · Pruebas, calibración y paquete
Pruebas de punta a punta con bots, partidas reales con Dante, ajuste de números y paquete para Hostinger (`node herramientas/empaquetar.js`).

## Decisiones técnicas
- **Servidor autoritativo**: el cliente solo envía acciones (`tirar` con los dados que se guardan, `fin_dados`, `construir` con el edificio, `colocar` con el lugar, `pasar`, `seguir`).
- **Los %**: el servidor los calcula y los manda ya hechos (como el Diez mil): una tabla por edificio y por conjunto de dados guardados, para que cambien en vivo al tocar un dado.
- **Mapa**: coordenadas enteras (centro del hexágono en `2q + r` y `3r`; esquinas a ±1 en X y −2, −1, 1, 2 en Y), sin números decimales para identificar vértices y aristas.

## Estado (rama `feature/fundacion`)
- Fase 1: `servidor/fundacion/reglas.js` y `pruebas/test_fundacion_reglas.js`.
- Fase 2: `servidor/fundacion/mesa_fundacion.js` (`MesaFundacion`), integrada en `servidor/salas.js` (crear, entrar, acciones `seguir`, `tirar` con los dados que se guardan, `terminar`, `elegir`, `atras`, `colocar`, `pasar`, mapa de mesas y recuperación) y `pruebas/test_fundacion.js` (partidas completas de 4 y 6 jugadores y en solitario, tiempo agotado, guardar y recuperar, reglas de la sala y red).
- Tiempos por fase: Normal 25 s para dados y para construir (colocar incluido), 30 s la colocación inicial y 10 s la producción; Extendido el doble (50 s) y Sin límite.
- Se juega una partida entera en pruebas con bots y un humano simple; la vuelta completa y el fin por meta funcionan.


## Simulador (`node simulador/fundacion.js [partidas] [meta]`)
Partidas solo de bots, 100–150 por configuración: todas terminan. Rondas promedio con meta 10: 23 (1 jugador), 27 (2), 27 (3), 28 (4), 28 (6), 32 (8). Con meta 8: 10, 13, 15, 17, 18. El primer asiento gana de más con pocos jugadores (4 jugadores, meta 10: 31/31/21/17 %). Por jugador: ~3–4 pueblos, 1–2 ciudades, 12–15 caminos, ~3 caballeros. El ranking final puede quedar bajo la meta si una carrera se pierde en la última ronda.

## Pendiente
Calibrar costos y ritmo con partidas reales; compensar el orden de turno; zonas táctiles en móvil sin probar en un teléfono; sin reacciones, estadísticas ni dibujos de ayuda propios; diseño entre 1024 y 1100 px por revisar.

- Producción (bj-102): al empezar cada turno se ve una ventana con los dos dados comunes que caen, la suma, y qué pasó (recursos ganados que quedan fijos, el bandido que salta o por qué no se gana nada), con botón «Continuar» (15 s). Los dados de recursos muestran las filas de edificios con su costo en dados y el %.

- bj-103: los dos dados de puntos son 3D; la tirada de recursos dice qué se construye y apaga los recursos que faltan; al poner se ve qué edificio se coloca; jugadores en grilla compacta; cuando un bot jugó por alguien (desconexión o dos tiempos agotados en Fundación) sale el aviso «Un bot jugó por ti» con «Retomar el control» (acción `retomar`, los tres juegos); una sala pública que se quedó sin nadie sigue en la lista hasta que se borra (30 s).

- bj-106: los bots (y quien tiene el turno jugado por un bot) esperan 5,5 s tras la tirada de números, 2,8 s entre tiradas de recursos y 2,2 s al elegir y colocar, para que todos vean; al terminar un turno en una sala con otros el resultado queda 2,6 s (3,6 s si jugó un bot). Quien construye se ve en el panel («Ana construyó un pueblo») y en el mapa, con la cámara acercada y un aro en el lugar (`turno.lugar`).

- bj-107: si quien armó una sala de espera se va, los bots y las reglas se quedan 30 s y la sala sigue en la lista; quien entra encuentra la sala como estaba (en plena partida, sin humanos, la sala se cierra como antes).
