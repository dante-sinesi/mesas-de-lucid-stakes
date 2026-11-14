# Cambio: Fundación v2

**Estado:** en curso (todo programado; falta decidir la economía y abrir el Pull Request)
**Rama:** `feature/fundacion-v2` (sale de `docs/brainstorm-fundacion`, que ya está subida)
**Origen:** `docs/brainstorm_fundacion_v2.md` (decisiones de Dante), `docs/catan_dados.md` (reglas), `docs/catan_flujo.md` (flujo), `docs/fundacion_v2_pantallas.md` (HUD), `docs/fundacion_v2_requisitos.md` (requisitos)

## Alcance

Rehacer Fundación sin los dados de recursos: cada recurso es una tarjeta, cobran todos con cada tirada, la mano es privada y de máximo 6, hay misiones y pedidos compartidos, un solo reloj por turno y una pantalla horizontal «Mesa de Risk». Incluye el servidor, los bots, el simulador de calibración y el cliente. **No incluye** cambiar los otros juegos, la sala de espera común ni la entrada.

## Pasos

- [x] Reglas puras (`servidor/fundacion/reglas.js`): mano, cobranza de todos, mapa justo, descarte, vértices con recursos. Pruebas: `test_fundacion_reglas.js`.
- [x] Misiones y pedidos (`servidor/fundacion/misiones.js`) con vencimiento por turnos. Pruebas: `test_fundacion_misiones.js`.
- [x] Mesa (`mesa_fundacion.js`): turno en tres momentos, reloj único, tiempo agotado que pasa el turno, mano privada, salas guardadas con la v1 que no se recuperan (sin salas fantasma). Pruebas: `test_fundacion.js`.
- [x] Bot nuevo y simulador de calibración (`bot.js`, `simulador/calibracion.js`).
- [x] Cliente: HUD, tarjetas, tirada con dados 3D en franja, descarte, construir, misiones y pedidos, entregas, colocación inicial asistida, bandido, final, ayuda en láminas.
- [x] Pruebas de la lógica pura del cliente (`test_fundacion_cliente.js`).
- [x] Documentación: reglas, flujo, pantallas, 49 requisitos (uno por archivo), plan, calibración, ADR y trazabilidad.
- [x] Adoptar el camino de solo madera y el pedido de «3 cualesquiera» (ADR-005).
- [x] Meta de 8 puntos por omisión (ADR-006).
- [x] Partida de dos clientes distintos (dos navegadores): la barra de tiempo corre igual para quien espera, las manos no se filtran y las cantidades de tarjetas coinciden.
- [ ] Repetir la calibración con personas de verdad.
- [ ] Repetir la calibración con el bot mejorado y con partidas de personas; ajustar el reloj.
- [ ] Probar el celular horizontal con un teléfono real y medir los dados 3D.
- [ ] Abrir el Pull Request (texto en este archivo) y fusionar cuando Dante lo apruebe.

## Texto del Pull Request

**Título:** Fundación v2: tarjetas de recursos, misiones y pedidos, y pantalla horizontal

**Qué cambia**
- Fundación deja los dados de recursos y el oro. Con cada tirada de dos dados **cobran todos** (pueblo 1 tarjeta, ciudad 2); la mano es privada y de máximo 6 (se descarta al empezar el turno).
- **Misiones de condición y pedidos** compartidos a la vista; los pedidos vencen por turnos y se reponen al terminar el turno de quien los entregó.
- **Un solo reloj por turno** (45 s Normal, 90 s Extendido): al agotarse, el turno se pasa solo. La barra corre también en los turnos de bots.
- **Mapa justo** al generar la isla y **colocación inicial asistida** (se ven los recursos que daría cada pueblo).
- **Cliente nuevo**: pantalla horizontal, estructura «Mesa de Risk», tarjetas sin texto, dados 3D en una franja central, ventanas de descarte, construir, misiones y pedidos, entrega, bandido que se mueve solo, cámara y marca en lo que construye cada jugador, final como el del Diez mil y el 13 Jack.
- **Servidor autoritativo con estado por jugador**: cada uno recibe su mano y, de los demás, solo la cantidad.
- Simulador de calibración con variantes, y documentación de reglas, flujo, pantallas, requisitos, ADR y trazabilidad.

**Qué no cambia:** Diez mil, 13 Jack, la sala de espera, la entrada y las salas (solo se cambian las acciones de red de Fundación).

**Riesgos y puntos de atención**
- Las salas de Fundación guardadas con la v1 **en plena partida no se recuperan** al reiniciar el servidor (las que estaban en la sala de espera sí); además, una sala dañada en el archivo ya no hace perder a las demás.
- La economía aún no está calibrada: con bots, el 60 % de los turnos no construye (falta ladrillo o madera) y el final se arrastra. Hay palancas medidas, a decidir.
- `web/dados3d.js` suma opciones (`escalaMax`, `sinValores`, `sombraFiel`) que solo usa Fundación; los otros juegos no cambian.
- Seguridad: no hay claves ni datos personales; el servidor valida cada acción (turno, estado, entradas) y la mano de un jugador no viaja a los demás (prueba `test_fundacion.js`).

**Cómo se probó:** `npm test` (17 suites, «fallos: 0»), partidas completas de bots y de un humano simple, calibración con 100 partidas por configuración, y capturas del cliente en escritorio y celular horizontal.

**No verificado:** el celular horizontal en un teléfono real, la caída de los dados 3D en celular y el reloj con personas.
