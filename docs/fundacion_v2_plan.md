# Fundación v2: plan de programación

Estado: **plan propuesto, nada programado.** El código solo empieza cuando Dante lo autorice de forma explícita. Reglas: `catan_dados.md`. Flujo: `catan_flujo.md`. Pantallas: `fundacion_v2_pantallas.md`. Requisitos: `fundacion_v2_requisitos.md`. Origen: `brainstorm_fundacion_v2.md`. La versión 1 (`fundacion_plan.md`) quedó implementada y se rehace.

## Cómo se trabaja (reglas de siempre)
- Una rama por cambio (`feature/fundacion-v2`, a partir de `main`), un commit por hito, `npm test` en «fallos: 0» antes de cada commit, el service worker sube de versión con cada cambio del cliente, paquete con `node herramientas/empaquetar.js`.
- **Nada viejo en el repositorio:** lo que la v2 deja de usar se borra (la historia queda en git).
- Sin atribución a Claude en commits ni PR; autor `dante-sinesi`.
- Diseño primero: lo que quede por decidir se conversa antes de programarlo.

## Fases

### Fase 1 · Las reglas (servidor, puro, sin red)
`servidor/fundacion/reglas.js` y `pruebas/test_fundacion_reglas.js`.
- **Se borra:** dados de recursos, oro, `probRec`, `probabilidad`, `tabla`, la reserva, `pagar` con dados, el tope de fijados.
- **Se agrega:** mano como cuenta por recurso; costos y `alcanza` sobre la mano; **cobranza de todos** (`produccion` por jugador: pueblo 1, ciudad 2, bandido, caballero); `descartar`; misiones de condición y pedidos (definición, estado, vencimiento por turnos, reposición); vértices con sus recursos y faltantes (colocación inicial); **mapa justo**; metas.
- Pruebas por regla (FU2-R-01 a FU2-R-19).

### Fase 2 · La mesa en el servidor
`servidor/fundacion/mesa_fundacion.js`, integración en `servidor/salas.js`.
- Fases: espera → colocación inicial → turno [tirada y cobranza → descarte → construir y entregar] → última vuelta → fin.
- Acciones: `descartar`, `construir`, `colocar`, `entregar`, `pasar`. **Se borran** `seguir`, `tirar` con dados guardados, `fin_dados`, la reserva y los relojes por fase de dados.
- **Un reloj por turno** (Normal 45 s, Extendido 90 s, Libre) y reloj de la colocación inicial; el **tiempo agotado pasa el turno** (con descarte al azar si estaba pendiente).
- **Estado privado:** cada jugador recibe su mano y de los demás solo la cantidad; las ganancias de la tirada son públicas.
- Reglas de la sala: `tiempo` (por turno) y `metaFU`. **Se borra** el tiempo por fase.
- **Migración:** las salas guardadas con la versión 1 (`datos/salas.json`) no sirven; al actualizar, las salas de Fundación se descartan.
- Pruebas: `test_fundacion.js` (partidas completas con una jugada guiada, privacidad, reloj, desconexión) y las de salas.

### Fase 3 · Los bots y el simulador, y la calibración
`servidor/fundacion/bot.js` y `simulador/`.
- **Bot nuevo:** descarta lo que menos sirve, construye lo mejor que alcance (varias veces), entrega pedidos cuando conviene, elige lugares por producción esperada y por lo que falta.
- **Simulador nuevo** (`simulador/fundacion.js`, `estadisticas.js`); **se borran** `reserva.js` y se rehace `costo_ciudad.js`.
- **Calibración (decide Dante con los números):** meta de puntos y duración con 1 a 8 jugadores; costo de la ciudad (3 + 2 o 2 + 2); techo de mano fuera de turno; cuántos pedidos y misiones, puntos de cada uno, mínimo de vencimiento en solitario; camino más largo y ejército; mal reparto con el mapa justo; peso del mapa.
- Entregable: un informe tipo `fundacion_estadisticas.md` con la v2.

### Fase 4 · El cliente
`web/fundacion.js`, `web/fu_arte.js`, `web/estilos`, `web/sw.js`.
- HUD «Mesa de Risk» horizontal en celular y escritorio: mapa a pantalla completa, jugadores a la derecha, misiones a la izquierda, contador de piezas, mano de tarjetas, medidor de tiempo de turno.
- Escenas: tirada con los dados 3D del diez mil, cartas que salen de los edificios, descarte, construir, colocar, misiones y pedidos, entregas, colocación inicial asistida, bandido que se mueve, turno ajeno, final con `compartirImagen` (PNG), desconexión y reconexión.
- Tarjetas con dibujos definitivos (ícono por recurso en `fu_arte.js`); mantener el arte de píxeles planos.
- `dados3d.js`: se **quitan** el modelo de 15 cubitos y los modos de fila y grilla si ya nada los usa (nada viejo en el repositorio).
- Pantalla horizontal también en celular: ver cómo se bloquea o sugiere la orientación en el resto de la sala (decisión de diseño aparte).
- Subir la versión del service worker y actualizar `pruebas/test_sw.js`.

### Fase 5 · Pruebas, calibración con personas y paquete
Pruebas de punta a punta con bots, partidas reales con Dante, ajuste del reloj, medir los dados 3D y las animaciones en un celular real y paquete para Hostinger.

## Puntos de decisión de Dante en el camino
1. Autorizar el código (ahora no).
2. Tras la Fase 3: meta, costo de la ciudad, techo de mano, misiones y pedidos.
3. Tras la Fase 4: estilo definitivo de las tarjetas y revisión del HUD en el celular.
4. Reloj: ajustar tras partidas reales.

## Riesgos
- Que **sin intercambio** el mal reparto frustre: mitigado con mapa justo, colocación inicial asistida, pedidos y expansión con caminos; se mide en la Fase 3.
- Que **8 jugadores** acumulen demasiadas tarjetas fuera de turno: medir y, si hace falta, techo duro.
- Que el cambio de **vertical a horizontal en celular** choque con el resto de la sala: resolver antes de la Fase 4.
- Que cobrar todos **acelere demasiado** la partida: ajustar meta y pedidos.

## Lo que se conserva de la v1
La isla y su generación por semilla (más el chequeo de mapa justo), los lugares válidos, la regla de distancia, la colocación en serpiente, los puntos y las carreras, el arte de píxeles planos (`fu_arte.js`), la cámara y la entrada y las salas comunes.
