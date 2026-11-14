# Fundación v2: índice de requisitos

Los requisitos de Fundación v2 viven **uno por archivo** en `docs/requisitos/` (reglas del juego = negocio `RN`, pantallas = usuario `RU`, servidor = funcional `RF`, calidad = no funcional `RNF`). Esta tabla es solo el índice y la equivalencia con los identificadores del primer borrador (FU2-…). Reglas: `catan_dados.md`; flujo: `catan_flujo.md`; pantallas: `fundacion_v2_pantallas.md`; plan: `fundacion_v2_plan.md`; trazabilidad: `trazabilidad_fundacion_v2.md`.

| Antes | Ahora | Requisito | Verificación |
|---|---|---|---|
| FU2-R-01 | [[RN-001]] | Sin dados de recursos ni oro | `test_fundacion_reglas.js` |
| FU2-R-02 | [[RN-002]] | Cada recurso es una tarjeta | `test_fundacion_reglas.js` |
| FU2-R-03 | [[RN-003]] | Con cada tirada cobran todos | `test_fundacion_reglas.js` |
| FU2-R-04 | [[RN-004]] | Con un 7 no cobra nadie y el bandido salta | `test_fundacion_reglas.js` |
| FU2-R-05 | [[RN-005]] | El caballero protege de un bandido | `test_fundacion_reglas.js` |
| FU2-R-06 | [[RN-006]] | El bandido bloquea un hexágono | `test_fundacion_reglas.js` |
| FU2-R-07 | [[RN-007]] | Mano máxima de 6 y descarte | `test_fundacion_reglas.js`, `test_fundacion.js` |
| FU2-R-08 | [[RN-008]] | Sin techo duro fuera del turno | `test_fundacion.js` |
| FU2-R-09 | [[RN-009]] | No hay intercambio | `test_fundacion.js` (no hay acción de intercambio) |
| FU2-R-10 | [[RN-010]] | Todas las acciones que alcancen en un turno | `test_fundacion.js` |
| FU2-R-11 | [[RN-011]] | Costos de los edificios | `test_fundacion_reglas.js`, `test_fundacion_cliente.js` |
| FU2-R-12 | [[RN-012]] | Piezas por jugador | `test_fundacion_reglas.js` |
| FU2-R-13 | [[RN-013]] | Mapa justo | `test_fundacion_reglas.js` |
| FU2-R-14 | [[RN-014]] | Colocación inicial en serpiente y asistida | `test_fundacion_reglas.js` |
| FU2-R-15 | [[RN-015]] | Misiones de condición | `test_fundacion_misiones.js` |
| FU2-R-16 | [[RN-016]] | Pedidos | `test_fundacion_misiones.js`, `test_fundacion.js` |
| FU2-R-17 | [[RN-017]] | Un pedido que no se puede cumplir no se abre | `test_fundacion.js` |
| FU2-R-18 | [[RN-018]] | Camino más largo y ejército más grande | `test_fundacion_reglas.js` |
| FU2-R-19 | [[RN-019]] | Meta, vuelta completa y modo solo | `test_fundacion.js` |
| FU2-R-20 | [[RN-020]] | Un solo reloj por turno | `test_fundacion.js` |
| FU2-R-21 | [[RN-021]] | Al agotarse el reloj el turno se pasa solo | `test_fundacion.js` |
| FU2-R-22 | [[RN-022]] | Desconexión y ausencia | `test_fundacion.js` |
| FU2-S-01 | [[RF-001]] | El servidor decide todo | `test_fundacion.js` |
| FU2-S-02 | [[RF-002]] | La mano de cada jugador es privada | `test_fundacion.js` |
| FU2-S-03 | [[RF-003]] | Las ganancias de la tirada son públicas | `test_fundacion.js` |
| FU2-S-04 | [[RF-004]] | La tirada y la cobranza las hace el servidor | `test_fundacion.js` |
| FU2-S-05 | [[RF-005]] | Los bots juegan por los ausentes | `test_fundacion.js`, simulador |
| FU2-C-01 | [[RF-006]] | Simulador de calibración | se ejecuta a mano (`docs/fundacion_v2_calibracion.md`) |
| FU2-U-01 | [[RU-001]] | Pantalla horizontal «Mesa de Risk» | capturas (sin prueba automática) |
| FU2-U-02 | [[RU-002]] | Medidor de tiempo de turno | capturas |
| FU2-U-03 | [[RU-003]] | Tarjetas sin texto | revisión visual |
| FU2-U-04 | [[RU-004]] | Contador de piezas | captura |
| FU2-U-05 | [[RU-005]] | Visor de jugadores | `test_fundacion.js` (estado), capturas |
| FU2-U-06 | [[RU-006]] | Dados 3D en una franja | captura |
| FU2-U-07 | [[RU-007]] | Las ganancias salen de los edificios | captura |
| FU2-U-08 | [[RU-008]] | Descarte | capturas, `test_fundacion_cliente.js` (escena) |
| FU2-U-09 | [[RU-009]] | Construir | capturas |
| FU2-U-10 | [[RU-010]] | Entregas sin elegir tarjetas | capturas, `test_fundacion_cliente.js` |
| FU2-U-11 | [[RU-011]] | Colocación inicial asistida | captura |
| FU2-U-12 | [[RU-012]] | El bandido se mueve solo | captura |
| FU2-U-13 | [[RU-013]] | Turno de otro jugador | capturas |
| FU2-U-14 | [[RU-014]] | Final de partida como en los otros juegos | captura, `comun.js` |
| FU2-U-15 | [[RU-015]] | Entrada y sala de espera comunes | `test_fundacion.js` (salas), `test_sala_espera.js` |
| FU2-U-16 | [[RU-016]] | Interfaz con poco texto | revisión visual |
| FU2-S-02 | [[RNF-001]] | La mano ajena no viaja al cliente | `test_fundacion.js` |
| FU2-C-02 | [[RNF-002]] | Duración de una partida | simulador |
| FU2-C-03 | [[RNF-003]] | Partidas trabadas | simulador |
| FU2-C-04 | [[RNF-004]] | Pruebas en verde y service worker | `package.json`, `test_sw.js` |
| FU2-C-05 | [[RNF-005]] | Rendimiento en celular | sin verificar (prueba manual pendiente) |
