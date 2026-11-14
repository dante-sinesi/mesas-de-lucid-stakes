# Estado del proyecto

> Documento corto y vivo. Es lo primero que se lee al abrir una sesión y lo último que se actualiza.

**Última actualización:** 2026-11-14

**Escala del proyecto:** pequeño-mediano (una persona, tres juegos, sin datos personales ni dinero). Método: liviano, con ficha para los cambios grandes.

## Dónde estamos

**Fundación v2** (sin dados de recursos, con mano de tarjetas, misiones y pedidos) está **programada y jugable en local** en la rama `feature/fundacion-v2` (servidor, bots, simulador y cliente nuevo). Ficha: `docs/cambios/2026-11-14-fundacion-v2.md`. El servidor y el cliente pasan sus pruebas (`npm test`, 17 suites). **No se abrió el Pull Request ni se fusionó a `main`**: espera la aprobación de Dante (y `gh` no está autenticado en esta máquina).

Ya probado con bots: la partida de 4 jugadores y meta 10 dura unos 74 turnos; el 60 % de los turnos no construye nada (falta ladrillo o madera); el final (de 7 a 10 puntos) se arrastra. Ver `docs/fundacion_v2_calibracion.md`.

## Próximo paso

Fusionar el Pull Request cuando Dante lo apruebe y jugar partidas con personas para ajustar el reloj y la economía. Ya están adoptados el camino de solo madera, el pedido de «3 cualesquiera» (ADR-005) y la meta de 8 puntos (ADR-006).

## En curso

- Ficha activa: `docs/cambios/2026-11-14-fundacion-v2.md`

## Bloqueos y preguntas abiertas

- Pull Request: abierto o por abrir con el texto de la ficha (si `gh` no está autenticado en esta máquina, se abre desde la página de comparación de GitHub).
- La rama `docs/relevamiento` tiene su propio `docs/ESTADO.md`: al fusionar habrá que reconciliarlos.
- Duración real del turno (45 s por omisión) y celular horizontal: falta jugarlos con personas.

## Cambios chicos recientes

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
