# Trazabilidad de Fundación v2

Cada requisito de `docs/fundacion_v2_requisitos.md` con el código que lo cumple y la prueba que lo verifica. Si un requisito no tiene prueba automática, la columna lo dice.

| Requisito | Código | Prueba |
|---|---|---|
| FU2-R-01 a 02 (sin dados ni oro; mano por recurso) | `servidor/fundacion/reglas.js` | `pruebas/test_fundacion_reglas.js` («tarjetas, costos y descarte») |
| FU2-R-03 a 06 (cobran todos; 7; caballero; bandido) | `reglas.js` (`produccion`, `moverBandido`) | `test_fundacion_reglas.js` («cobranza de todos y el bandido») |
| FU2-R-07 a 08 (mano máxima y descarte) | `reglas.js` (`manoMax`, `exceso`), `mesa_fundacion.js` | `test_fundacion_reglas.js`, `test_fundacion.js` («descarte») |
| FU2-R-09 a 12 (sin intercambio; costos; piezas) | `reglas.js` | `test_fundacion_reglas.js` |
| FU2-R-13 a 14 (mapa justo; colocación asistida) | `reglas.js` (`esJusto`, `recursosDeVertice`) | `test_fundacion_reglas.js` |
| FU2-R-15 a 17 (misiones y pedidos) | `servidor/fundacion/misiones.js` | `test_fundacion_misiones.js`, `test_fundacion.js` |
| FU2-R-18 (carreras con las misiones) | `reglas.js` (`carreras`) | `test_fundacion_reglas.js` (decisión de puntos pendiente) |
| FU2-R-19 (meta, vuelta completa, solo) | `mesa_fundacion.js` | `test_fundacion.js` |
| FU2-R-20 a 21 (reloj; tiempo agotado) | `mesa_fundacion.js` (`_fijarLimite`, `_agotado`) | `test_fundacion.js` («tiempo agotado», «el reloj que se muestra») |
| FU2-R-22 (desconexión y ausencia) | `mesa_fundacion.js` | `test_fundacion.js`, `test_salas.js` |
| FU2-S-01 a 05 (servidor autoritativo, mano privada, bots) | `mesa_fundacion.js`, `bot.js`, `salas.js` | `test_fundacion.js` («mano privada») |
| FU2-U-01 a 16 (pantallas y HUD) | `web/fundacion.js`, `web/estilos.css`, `web/index.html`, `web/ayuda.js` | `test_fundacion_cliente.js` (escenas y datos copiados); el dibujo se revisa con capturas (**sin prueba automática**) |
| FU2-C-01 a 03 (calibración) | `simulador/calibracion.js` | se ejecuta a mano (`docs/fundacion_v2_calibracion.md`) |
| FU2-C-04 (`npm test`, service worker) | `package.json`, `web/sw.js` | `test_sw.js` |
| FU2-C-05 (rendimiento en celular real) | — | **sin verificar** (prueba manual pendiente) |
