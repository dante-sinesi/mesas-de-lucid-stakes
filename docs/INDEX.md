# Índice de documentación

Archivo generado por `indexar_docs.py`. No editar a mano: se regenera.

## Decision

- [[ADR-001]] [Fundación v2 sin dados de recursos: tarjetas, cobran todos, sin intercambio](decisiones/ADR-001.md) — Los recursos son tarjetas que cobran todos con cada tirada; la mano es de máximo 6 y no hay intercambio.
- [[ADR-002]] [Servidor autoritativo con estado por jugador (mano privada)](decisiones/ADR-002.md) — El servidor decide todo y manda a cada jugador su mano completa y, de los demás, solo la cantidad de tarjetas.
- [[ADR-003]] [Misiones de condición y pedidos compartidos, con vencimiento por turnos](decisiones/ADR-003.md) — Un grupo compartido a la vista de misiones (se las lleva quien las cumple primero) y pedidos (se entregan tarjetas y vencen por turnos).
- [[ADR-004]] [Reloj único por turno; el tiempo agotado pasa el turno](decisiones/ADR-004.md) — Cada turno tiene un solo reloj (45 s Normal, 90 s Extendido); al agotarse, el turno se pasa solo.

## Otro

- [[2026-11-14-fundacion-v2]] [Cambio: Fundación v2](cambios/2026-11-14-fundacion-v2.md) — **Estado:** en curso (todo programado; falta decidir la economía y abrir el Pull Request) **Rama:** `feature/fundacion-v2` (sale de `docs/brainstorm-fundacion`,
- [[ESTADO]] [Estado del proyecto](ESTADO.md) — > Documento corto y vivo. Es lo primero que se lee al abrir una sesión y lo último que se actualiza.
- [[NOTAS]] [fundacion-dados: notas de la ronda (2026-11-14)](diseno/rondas/2026-11-14-fundacion-dados/NOTAS.md) — Una sola hoja para trabajos chicos (una pantalla, una landing, un formulario). Para proyectos medianos o grandes usar `crear_bosquejos.py --nombre ... --complet
- [[README]] [Documentación del proyecto](README.md) — Documentación viva: se actualiza con cada cambio y se indexa automáticamente.
- [[Sin título]] [Sin título](Sin título.md) — classDiagram class Animal { +String nombre +comer() void } class Perro { +ladrar() void } Animal <|-- Perro
- [[brainstorm_diez_mil]] [Diez mil: brainstorming](brainstorm_diez_mil.md) — Estado: **idea para conversar, nada programado.** Todo lo que está marcado con `?` es una duda abierta; los números son puntos de partida para ajustar probando 
- [[brainstorm_fundacion_v2]] [Fundación v2: brainstorming](brainstorm_fundacion_v2.md) — Estado: **brainstorming cerrado y traducido a la documentación (14 de noviembre de 2026), nada programado.** La documentación vigente es `catan_dados.md` (regla
- [[brainstorm_ruleta]] [Rulepoly: brainstorming (primera versión)](brainstorm_ruleta.md) — > **Reemplazado por `rulepoly.md`**, que recoge lo que se acordó después de conversarlo. Este texto queda como historia: parte de lo de acá (apuestas, grupos, c
- [[catan_dados]] [Fundación (Catan de dados): reglas de la versión 2](catan_dados.md) — Estado: **diseño cerrado en el brainstorming (`brainstorm_fundacion_v2.md`), nada programado.** Reemplaza las reglas de la primera versión (con dados de recurso
- [[catan_flujo]] [Fundación (Catan de dados): flujo de crear sala y de un turno (versión 2)](catan_flujo.md) — Estado: **diseño cerrado, nada programado de la versión 2.** Sigue `catan_dados.md` (reglas) y `fundacion_v2_pantallas.md` (pantallas), y reutiliza la entrada, 
- [[decisiones]] [Decisiones de diseño: Fundación v2](diseno/notas/decisiones.md) — Decisiones de interfaz tomadas por Dante (resumen; el detalle y las escenas están en `docs/fundacion_v2_pantallas.md`). Los ADR las citan por ID.
- [[deuda-tecnica]] [Deuda técnica](deuda-tecnica.md) — Decisiones pospuestas a propósito. Cada entrada debe incluir su **motivo** (el verificador lo exige), para distinguir una decisión consciente de un descuido.
- [[diez_mil_calibracion]] [Simulación del diez mil](diez_mil_calibracion.md) — Jugador automático con umbrales para plantarse; 2000 partidas por prueba, en solitario (una persona sola contra la meta de 10.000, entrando con 500 y llegando j
- [[diseno]] [Mesas de Lucid Stakes](diseno.md) — Mesas multijugador (hasta 8 amigos) para jugar en el navegador, en un servidor de Hostinger. Vive en esta carpeta, aparte del juego principal (`../Balatro x Cat
- [[fundacion_costo_ciudad]] [Costo de la ciudad: comparación con bots](fundacion_costo_ciudad.md) — > **Nota:** medición de la versión 1 (con dados de recursos); queda como historia. La calibración de la versión 2 está en `fundacion_v2_calibracion.md`.
- [[fundacion_estadisticas]] [Fundación: estadísticas con bots](fundacion_estadisticas.md) — > **Nota:** medición de la versión 1 (con dados de recursos); queda como historia. La calibración de la versión 2 está en `fundacion_v2_calibracion.md`.
- [[fundacion_plan]] [Fundación: plan de programación (versión 1)](fundacion_plan.md) — > **Nota:** este plan es de la primera versión, con dados de recursos, ya implementada. La versión 2 (sin dados de recursos, con mano de tarjetas, misiones y pe
- [[fundacion_v2_calibracion]] [Fundación v2: primera calibración con bots](fundacion_v2_calibracion.md) — Estado: **primeras mediciones, con un bot simple y muestras chicas (20 a 40 partidas por configuración).** Sirven para ver órdenes de magnitud y detectar proble
- [[fundacion_v2_pantallas]] [Fundación v2: pantallas y HUD](fundacion_v2_pantallas.md) — Estado: **diseño aprobado por Dante, nada programado.** Reglas en `catan_dados.md`, flujo en `catan_flujo.md`, requisitos en `fundacion_v2_requisitos.md`.
- [[fundacion_v2_plan]] [Fundación v2: plan de programación](fundacion_v2_plan.md) — Estado: **plan propuesto, nada programado.** El código solo empieza cuando Dante lo autorice de forma explícita. Reglas: `catan_dados.md`. Flujo: `catan_flujo.m
- [[fundacion_v2_requisitos]] [Fundación v2: requisitos](fundacion_v2_requisitos.md) — Estado: **provisorios, derivados del brainstorming aprobado por Dante.** Los números marcados «(calibrar)» se miden con bots antes de cerrarlos. Cada requisito 
- [[ideas_13_jack]] [13 Jack: el reemplazo del Blackjack (diseño en conversación, todavía no programado)](ideas_13_jack.md) — **Decisión:** el 13 Jack reemplaza al Blackjack anterior. El Blackjack se retiró del proyecto (código, pruebas y documentos); su última versión completa está en
- [[investigacion_juegos]] [Investigación: juegos de mesa para tomar ideas](investigacion_juegos.md) — Hecha el 9 de noviembre de 2026, al dejar el Rulepoly (ruleta + Monopoly) por no encontrar la mecánica que lo destrabe. Se buscaron juegos de **1 a 8 jugadores*
- [[pendientes]] [Bandeja de pendientes](pendientes.md) — Cosas que se notaron mientras se trabajaba en otra cosa y quedaron fuera del alcance. Se anotan aquí en vez de arreglarlas sin permiso o perderlas. Cada una se 
- [[principios_diseno]] [Principios de diseño de los juegos](principios_diseno.md) — Anotados el 9 de noviembre de 2026, a partir de lo que hace atractivos al Diez mil y al 13 Jack. Sirven de guía para el Rulepoly y para cualquier juego futuro: 
- [[rulepoly]] [Rulepoly: el juego (diseño acordado)](rulepoly.md) — > **En revisión (9 nov 2026):** Dante sintió que este diseño está trabado (se parece al Diez mil, tiene demasiados sistemas y el modo solo no cerraba). Se explo
- [[trazabilidad_fundacion_v2]] [Trazabilidad de Fundación v2](trazabilidad_fundacion_v2.md) — Cada requisito de `docs/fundacion_v2_requisitos.md` con el código que lo cumple y la prueba que lo verifica. Si un requisito no tiene prueba automática, la colu
