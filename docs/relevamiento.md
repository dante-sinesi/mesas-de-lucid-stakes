# Relevamiento automático de Blackjack Web

Informe generado por `relevar.py`: solo hechos, sin interpretación.

## Lenguajes

| Lenguaje | Archivos | Líneas |
|---|---|---|
| JavaScript | 82 | 14627 |
| HTML | 29 | 7662 |
| Python | 12 | 545 |
| CSS | 2 | 914 |

## Herramientas y manifiestos

- package.json → Node.js (npm)
- pruebas/prueba_hosting/package.json → Node.js (npm)

## Tests

- 15 archivos o carpetas con indicios de tests (ej.: pruebas/test_bots.js, pruebas/test_diezmil.js, pruebas/test_diezmil_reglas.js, pruebas/test_estadisticas.js).

## Integración continua y documentación

- Integración continua: no detectada.
- Documentación presente: README, docs

## Historial git

- Commits: 28; último: 2026-11-10 README: enlace a la página de las mesas (mesas.dsinesi.com).
- Archivos más modificados (últimos 200 commits): pruebas/test_sw.js (21), web/sw.js (21), web/fundacion.js (16), docs/fundacion_plan.md (9), web/estilos.css (8)

## Zonas de riesgo (por tamaño)

- docs/.obsidian/plugins/mermaid-tools/main.js: 2807 líneas
- prototipos/etapas_isla/index.html: 1916 líneas
- prototipos/arte_catan/index.html: 1246 líneas
- prototipos/iconos_catan/index.html: 1046 líneas
- prototipos/definicion_catan/index.html: 725 líneas
- servidor/diezmil/mesa_dm.js: 715 líneas
- web/diezmil.js: 657 líneas
- web/estilos.css: 650 líneas

## Marcas pendientes

- 3 marcas TODO/FIXME/HACK en el código.

> Nota: los conteos de arriba incluyen carpetas que no son del producto (`prototipos/`, ignorada por git, y `docs/.obsidian/`, la configuración de Obsidian). El producto real son `server.js`, `servidor/`, `web/`, `simulador/` y `pruebas/` (unas 7.800 líneas de JavaScript).

## Interpretación

### Arquitectura (en pocas líneas)

- `server.js` es el punto de entrada: un servidor HTTP de Node sin dependencias que sirve `web/` y enruta `/api/*` a `servidor/salas.js`.
- `Salas` administra las salas (código de 4 letras, clave opcional, lista pública), la consulta larga (`/api/estado` con versión), la persistencia en `datos/salas.json`, la desconexión de jugadores y el borrado de salas vacías o viejas.
- Cada juego tiene una mesa con su máquina de estados (`MesaDM`, `Mesa13`, `MesaFundacion`) y sus reglas puras en `reglas.js`; el servidor es autoritativo y avanza cada 500 ms (`tic()` y `avanzar()`). Los bots están en `servidor/bots.js` y `servidor/fundacion/bot.js`.
- El cliente son scripts globales sin módulos (el orden de carga está en `web/index.html`): un archivo por pantalla o juego, y el arte (píxeles, dados 3D, sonido) se dibuja por código. `web/sw.js` es el service worker con la caché versionada `bj-NNN`.
- `simulador/` juega partidas de Fundación solo con bots para medir duración y balance.

### Convenciones que el proyecto ya sigue

- Interfaz en español neutro (tuteo) y comentarios en español; sin librerías externas.
- Cada cambio de cliente sube la versión del service worker en `web/sw.js` y en `pruebas/test_sw.js` a la vez.
- Las pruebas son scripts de Node que terminan con «fallos: N»; `npm test` encadena 15 suites.
- Arte en píxeles planos y pegados, sin espacios entre píxeles.
- Lo generado y sin versionar va en `datos/`, `paquete/`, `respaldos/` y `prototipos/` (ignorados por git).

### Reglas de negocio por confirmar

Esto es lo que el código parece hacer; está por confirmar con el dueño del producto.

- **Fundación:** piezas por jugador 15 caminos, 5 pueblos, 4 ciudades y 3 caballeros; pueblo 1 punto, ciudad 2; el camino más largo (desde 5) y el ejército (desde 2) dan 2 puntos cada uno; metas de 8, 10 o 12; hasta 4 dados fijos; reserva de hasta 2 dados al turno siguiente; la ciudad cuesta 2 de mineral y 2 de trigo; el mapa es de 19 hexágonos hasta 4 jugadores y de 37 de 5 a 8.
- **Salas:** una persona figura desconectada tras 35 s sin consultas; tras dos turnos agotados un bot toma su lugar hasta que retome el control; una sala de espera vacía se borra a los 30 s y una sala sin uso a las 24 h; las salas públicas figuran en el lobby mientras existan.
- **Diez mil y 13 Jack:** sus reglas están documentadas en `docs/diseno.md` y cubiertas por pruebas, pero no se reconfirmaron en este relevamiento.

### Riesgos

1. **El cliente casi no tiene pruebas automáticas.** `web/fundacion.js`, `comun.js`, `diezmil.js` y `trecejack.js` solo se probaron a mano y con capturas. Solo hay pruebas de `sw.js`, sonido, estadísticas y QR.
2. **No hay integración continua.** Las pruebas solo se corren en la máquina de quien trabaja.
3. **Las salas guardadas pueden quedar incompatibles** si cambia la forma de una mesa (por ejemplo, al sumar la reserva de dados): `desde()` tiene que tolerar campos ausentes en las salas guardadas con una versión anterior.
4. **Hosting con consulta larga** (sin WebSockets) en un hosting compartido; el despliegue en Hostinger tuvo problemas de compilación pendientes con el soporte.
5. **Seguridad sin auditar:** las claves de sala y los identificadores de jugador viajan en pantalla y en el navegador; no se revisó si hay límite de tamaño o frecuencia en `/api/*`.
6. **Historial reescrito el 2026-11-10:** cambiaron los hashes de todas las commits y el autor; cualquier enlace antiguo a una commit ya no sirve.
7. **Archivos sin versionar:** los scripts de grabación y de capturas están en `presentacion/` (fuera de git), y `docs/.obsidian/` aparece sin seguimiento ni ignorado.

### Plan de tests de caracterización (por riesgo)

1. **Salas guardadas:** guardar una partida de Fundación con la versión anterior (sin `reserva`) y recuperarla con la actual.
2. **Reemplazo por bot y retomar el control:** `MesaFundacion`, `Mesa13` y `MesaDM` con un jugador desconectado o con dos turnos agotados.
3. **Lobby y vida de una sala:** una sala pública vacía sigue en la lista hasta los 30 s y después desaparece.
4. **Humo del cliente:** pasar los guiones de `presentacion/` (control de Edge sin pantalla) a `pruebas/ui/` para los flujos críticos: entrar a una sala, colocar, tirar los dados y terminar un turno.
5. **Partida completa con bots:** el simulador como prueba, con un tope de trabajo (no de tiempo) para que sea determinista.
