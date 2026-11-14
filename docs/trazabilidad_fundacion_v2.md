# Trazabilidad de Fundación v2

Cada requisito de `docs/fundacion_v2_requisitos.md` con el código que lo cumple y la prueba que lo verifica. Si un requisito no tiene prueba automática, la columna lo dice.

| Requisitos | Código | Prueba |
|---|---|---|
| [[RN-001]], [[RN-002]] (sin dados ni oro; mano por recurso) | `servidor/fundacion/reglas.js` | `pruebas/test_fundacion_reglas.js` |
| [[RN-003]] a [[RN-006]] (cobran todos; 7; caballero; bandido) | `reglas.js` (`produccion`, `moverBandido`) | `test_fundacion_reglas.js` |
| [[RN-007]], [[RN-008]] (mano máxima y descarte) | `reglas.js` (`manoMax`, `exceso`), `mesa_fundacion.js` | `test_fundacion_reglas.js`, `test_fundacion.js` |
| [[RN-009]] a [[RN-012]] (sin intercambio; acciones; costos; piezas) | `reglas.js`, `mesa_fundacion.js` | `test_fundacion_reglas.js`, `test_fundacion_cliente.js` |
| [[RN-013]], [[RN-014]] (mapa justo; colocación asistida) | `reglas.js` (`esJusto`, `recursosDeVertice`) | `test_fundacion_reglas.js` |
| [[RN-015]] a [[RN-017]] (misiones y pedidos) | `servidor/fundacion/misiones.js` | `test_fundacion_misiones.js`, `test_fundacion.js`, `test_fundacion_cliente.js` |
| [[RN-018]] (carreras) | `reglas.js` (`carreras`) | `test_fundacion_reglas.js` |
| [[RN-019]] (meta, vuelta, solo) | `mesa_fundacion.js` | `test_fundacion.js` |
| [[RN-020]], [[RN-021]] (reloj; tiempo agotado) | `mesa_fundacion.js` (`_fijarLimite`, `_agotado`) | `test_fundacion.js` |
| [[RN-022]] (desconexión y ausencia) | `mesa_fundacion.js` | `test_fundacion.js`, `test_salas.js` |
| [[RF-001]] a [[RF-005]], [[RNF-001]] (servidor, mano privada, bots) | `mesa_fundacion.js`, `bot.js`, `salas.js` | `test_fundacion.js` |
| [[RF-006]] (simulador) | `simulador/calibracion.js` | se ejecuta a mano |
| [[RU-001]] a [[RU-016]] (pantallas y HUD) | `web/fundacion.js`, `web/estilos.css`, `web/index.html`, `web/ayuda.js` | `test_fundacion_cliente.js` (escenas y datos); el dibujo se revisa con capturas (**sin prueba automática**) |
| [[RNF-002]], [[RNF-003]] (duración y partidas trabadas) | `simulador/calibracion.js` | simulador |
| [[RNF-004]] (suites y service worker) | `package.json`, `web/sw.js` | `test_sw.js` |
| [[RNF-005]] (rendimiento en celular) | — | **sin verificar** |
