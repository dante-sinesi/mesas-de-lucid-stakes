# Estado del proyecto

> Documento corto y vivo. Es lo primero que se lee al abrir una sesión y lo último que se actualiza.

**Última actualización:** 2026-11-14

**Escala del proyecto:** pequeño-mediano (una persona, tres juegos, sin datos personales ni dinero). Método: liviano, con ficha para los cambios grandes.

## Dónde estamos

**Fundación v2** ya está en `main` (PR #1). En la rama `feature/ritmo-fundacion` (**PR #2**, abierto, sin fusionar) está el ritmo nuevo: 5 tiradas por ronda, una acción por turno, meta 20 (o 14) y jugadores del lateral por orden de ronda ([[ADR-007]]). El servidor y el cliente pasan `npm test` (17 suites). Con bots: 20 a 27 turnos por jugador y 22 a 34 % de turnos sin hacer nada con 1 a 8 jugadores. Primera pasada de diseño para celular horizontal (misiones y jugadores compactos).

## Próximo paso

Fusionar el PR #2 cuando Dante lo apruebe; seguir puliendo el celular horizontal (mapa más grande, botones, ventanas a 812x375) y jugar partidas con personas para confirmar el ritmo.

## En curso

- Rama `feature/ritmo-fundacion` (PR #2).

## Bloqueos y preguntas abiertas

- La rama `docs/relevamiento` tiene su propio `docs/ESTADO.md`: al fusionar habrá que reconciliarlos.
- Falta jugar con personas: secuencia de varias tiradas por turno, duración real del turno (45 s) y celular horizontal.

## Cambios chicos recientes

- 2026-11-14: nuevo ritmo (5 tiradas por ronda, una acción por turno, meta 20) y orden de jugadores por ronda ([[ADR-007]]).
- 2026-11-14: las salas de Fundación de la v1 en plena partida ya no se recuperan al reiniciar el servidor, y una sala dañada no hace perder a las demás.
- 2026-11-14: la meta por omisión pasa a 8 puntos (ADR-006).
- 2026-11-14: los requisitos pasan a un archivo por requisito (49) y se adopta el camino de solo madera y el pedido de «3 cualesquiera».
- 2026-11-14: la barra de tiempo corre también en los turnos de bots (reloj corto del bot).
- 2026-11-14: contador de piezas con icono y x/máximo; sprite propio del camino.
- 2026-11-14: los dados van en una franja central; las ventanas usan la misma banda oscura.

## Referencias

- Índice de la documentación: `docs/INDEX.md`
- Pendientes fuera de alcance: `docs/pendientes.md`
- Deuda técnica: `docs/deuda-tecnica.md`
- Decisiones de arquitectura: `docs/decisiones/` · de diseño: `docs/diseno/notas/decisiones.md`
- Trazabilidad de requisitos: `docs/trazabilidad_fundacion_v2.md`
