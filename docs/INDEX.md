# Índice de documentación

Archivo generado por `indexar_docs.py`. No editar a mano: se regenera.

## Negocio

- [[RN-001]] [Sin dados de recursos ni oro](requisitos/negocio/RN-001.md) — Fundación no tiene dados de recursos ni oro; los recursos son cinco: madera, ladrillo, lana, trigo y mineral.
- [[RN-002]] [Cada recurso es una tarjeta](requisitos/negocio/RN-002.md) — Cada unidad de recurso es una tarjeta; la mano de un jugador es una cuenta por recurso.
- [[RN-003]] [Con cada tirada cobran todos](requisitos/negocio/RN-003.md) — Con un número distinto de 7 cobran todos los jugadores: una tarjeta por cada pueblo y dos por cada ciudad que toque un hexágono con ese número que no esté bloqueado.
- [[RN-004]] [Con un 7 no cobra nadie y el bandido salta](requisitos/negocio/RN-004.md) — Con un 7 no cobra nadie y el bandido salta a un hexágono al azar distinto del actual, también en solitario.
- [[RN-005]] [El caballero protege de un bandido](requisitos/negocio/RN-005.md) — Un caballero protege a su dueño del bandido en ese hexágono; a los demás jugadores no.
- [[RN-006]] [El bandido bloquea un hexágono](requisitos/negocio/RN-006.md) — El bandido bloquea el hexágono donde está hasta el próximo 7.
- [[RN-007]] [Mano máxima de 6 y descarte](requisitos/negocio/RN-007.md) — Al empezar su turno, ya cobrada la tirada, quien tiene el turno y más de 6 tarjetas debe descartar justo lo que sobra antes de construir o entregar.
- [[RN-008]] [Sin techo duro fuera del turno](requisitos/negocio/RN-008.md) — Fuera de su turno, un jugador puede tener más de 6 tarjetas sin límite; al llegarle el turno descarta hasta volver a 6.
- [[RN-009]] [No hay intercambio](requisitos/negocio/RN-009.md) — No hay intercambio de tarjetas entre jugadores ni con un banco.
- [[RN-010]] [Todas las acciones que alcancen en un turno](requisitos/negocio/RN-010.md) — En su turno, un jugador puede construir y entregar todo lo que le alcance, en cualquier orden, y termina el turno pasando.
- [[RN-011]] [Costos de los edificios](requisitos/negocio/RN-011.md) — Camino: 1 madera.
- [[RN-012]] [Piezas por jugador](requisitos/negocio/RN-012.md) — Cada jugador tiene 15 caminos, 5 pueblos, 4 ciudades y 3 caballeros; un edificio sin piezas o sin lugar válido no se ofrece.
- [[RN-013]] [Mapa justo](requisitos/negocio/RN-013.md) — Al generar la isla, cada recurso tiene al menos un hexágono con número de 5 a 9 y una suma mínima de puntitos (7 en la isla de 19 y 14 en la de 37).
- [[RN-014]] [Colocación inicial en serpiente y asistida](requisitos/negocio/RN-014.md) — La colocación inicial va en serpiente (1.º a último y último a 1.º), un pueblo y un camino cada vez; al elegir un vértice, el servidor informa qué recursos daría y cuáles faltan.
- [[RN-015]] [Misiones de condición](requisitos/negocio/RN-015.md) — Las misiones de condición no vencen; las gana el primer jugador que cumple la condición.
- [[RN-016]] [Pedidos](requisitos/negocio/RN-016.md) — Los pedidos se cumplen entregando tarjetas: 2 madera y 2 ladrillo, 2 lana y 2 trigo, 3 mineral, una de cada recurso, 3 tarjetas iguales o 3 tarjetas cualesquiera.
- [[RN-017]] [Un pedido que no se puede cumplir no se abre](requisitos/negocio/RN-017.md) — El servidor rechaza la entrega de un pedido que el jugador no puede cumplir, y el cliente no abre su ventana.
- [[RN-018]] [Camino más largo y ejército más grande](requisitos/negocio/RN-018.md) — El camino más largo (5 caminos o más) y el ejército más grande (2 caballeros o más, el que tenga más) dan 2 puntos cada uno y cambian de dueño si otro jugador los supera.
- [[RN-019]] [Meta, vuelta completa y modo solo](requisitos/negocio/RN-019.md) — La partida termina cuando alguien llega a la meta (8 por omisión; también 10 o 12 puntos) y se juega la vuelta completa; en el empate gana quien llegó con menos turnos.
- [[RN-020]] [Un solo reloj por turno](requisitos/negocio/RN-020.md) — El descarte, la construcción y la entrega comparten un reloj por turno: 45 segundos en Normal y 90 en Extendido, o sin límite; la colocación inicial tiene 30 segundos por pieza.
- [[RN-021]] [Al agotarse el reloj el turno se pasa solo](requisitos/negocio/RN-021.md) — Cuando se agota el reloj del turno, el turno se pasa solo; si había un descarte obligatorio sin hacer, se descartan al azar las tarjetas necesarias.
- [[RN-022]] [Desconexión y ausencia](requisitos/negocio/RN-022.md) — Si un jugador se desconecta o deja agotar el reloj dos veces seguidas, un bot toma su lugar y lo conserva; si el jugador vuelve, retoma.

## Usuario

- [[RU-001]] [Pantalla horizontal «Mesa de Risk»](requisitos/usuario/RU-001.md) — La pantalla es horizontal en celular y escritorio: el mapa ocupa toda la pantalla, los jugadores van a la derecha y las misiones a la izquierda, ambos centrados verticalmente bajo la barra de tiempo.
- [[RU-002]] [Medidor de tiempo de turno](requisitos/usuario/RU-002.md) — Una barra arriba de toda la pantalla muestra el tiempo del turno («Tu turno» o «Turno de X») en todos los turnos, también de bots, y queda gris cuando no hay tiempo que contar.
- [[RU-003]] [Tarjetas sin texto](requisitos/usuario/RU-003.md) — Las tarjetas de recurso se reconocen por su color y su dibujo, sin texto ni números, y hay una tarjeta por unidad.
- [[RU-004]] [Contador de piezas](requisitos/usuario/RU-004.md) — El HUD muestra, con el icono de cada pieza, cuántas tiene el jugador y el máximo (caminos 2/15, pueblos 2/5, ciudades 0/4, caballeros 0/3).
- [[RU-005]] [Visor de jugadores](requisitos/usuario/RU-005.md) — El jugador ve sus propias tarjetas en miniatura, de color y sin texto; de los demás ve solo cuántas tienen, como dorsos.
- [[RU-006]] [Dados 3D en una franja](requisitos/usuario/RU-006.md) — La tirada usa los dados 3D del Diez mil en una franja oscura de lado a lado en el centro, con «Sale N» y la suma a la derecha, y una sombra que sigue la perspectiva de la mesa.
- [[RU-007]] [Las ganancias salen de los edificios](requisitos/usuario/RU-007.md) — Las tarjetas que gana el propio jugador salen de su pueblo o ciudad, y después se muestran las ganancias de todos antes de acomodarse en la mano.
- [[RU-008]] [Descarte](requisitos/usuario/RU-008.md) — Con fondo en banda oscura y tarjetas grandes en el centro; obligatorio: «Faltan N» pasa a «Descartar»; opcional: «Pasar».
- [[RU-009]] [Construir](requisitos/usuario/RU-009.md) — Las cuatro opciones se ven siempre con su costo; las que no se pueden quedan apagadas con lo que falta, y si no se puede ninguna el título dice «No puedes construir nada» y el botón es «Pasar».
- [[RU-010]] [Entregas sin elegir tarjetas](requisitos/usuario/RU-010.md) — En la entrega de un pedido el jugador no elige tarjetas: se ven marcadas las que se entregan y solo hay «Atrás» y «Entregar»; un pedido que no se puede cumplir no abre la ventana y avisa.
- [[RU-011]] [Colocación inicial asistida](requisitos/usuario/RU-011.md) — Al elegir un lugar para el pueblo se ven los recursos que daría con su número y cuáles faltan, y en la segunda ronda se suman los que ya se cobran.
- [[RU-012]] [El bandido se mueve solo](requisitos/usuario/RU-012.md) — Cuando sale un 7, el bandido se ve desplazarse de su casilla a la nueva sin que el jugador lo mueva, y la cruz aparece al llegar, con el mensaje «Salió 7, el bandido se mueve».
- [[RU-013]] [Turno de otro jugador](requisitos/usuario/RU-013.md) — Durante el turno de otro jugador se ve su nombre en el reloj, su ficha resaltada y lo que hace, y el botón dice «Esperando a X».
- [[RU-014]] [Final de partida como en los otros juegos](requisitos/usuario/RU-014.md) — El final muestra título, subtítulo, una fila por jugador (puesto, nombre, detalle y puntos) y los botones «Nueva partida», «Compartir» (imagen PNG) y «Salir».
- [[RU-015]] [Entrada y sala de espera comunes](requisitos/usuario/RU-015.md) — La sala de espera, la entrada y el crear sala son los comunes de la sala; de Fundación solo cambian las reglas (tiempo por turno y meta).
- [[RU-016]] [Interfaz con poco texto](requisitos/usuario/RU-016.md) — Las pantallas de juego usan poco texto, sin desplazamiento (scroll), con arte de píxeles planos y sin textos de ayuda ni de depuración en el HUD.

## Funcional

- [[RF-001]] [El servidor decide todo](requisitos/funcional/RF-001.md) — El servidor es autoritativo: el cliente solo envía acciones (descartar, construir, colocar, entregar, pasar, seguir y atrás) y el servidor las valida.
- [[RF-002]] [La mano de cada jugador es privada](requisitos/funcional/RF-002.md) — El estado que recibe cada jugador incluye su mano completa y, de los demás, solo la cantidad de tarjetas.
- [[RF-003]] [Las ganancias de la tirada son públicas](requisitos/funcional/RF-003.md) — Las ganancias de cada tirada (quién gana qué tarjetas) se informan a todos los jugadores.
- [[RF-004]] [La tirada y la cobranza las hace el servidor](requisitos/funcional/RF-004.md) — El servidor hace la tirada y la cobranza al empezar el turno, de forma determinista con el azar de la mesa.
- [[RF-005]] [Los bots juegan por los ausentes](requisitos/funcional/RF-005.md) — Los bots juegan por los jugadores ausentes y los reemplazados: descartan, construyen, entregan y pasan.
- [[RF-006]] [Simulador de calibración](requisitos/funcional/RF-006.md) — Existe un simulador de partidas de bots que mide duración, razones de los turnos vacíos, curva de puntos, descartes y partidas trabadas, con variantes.

## No-funcional

- [[RNF-001]] [La mano ajena no viaja al cliente](requisitos/no-funcional/RNF-001.md) — El estado que recibe un jugador no debe contener las tarjetas de otro jugador (control iso 27002:2022 8.3, restricción del acceso a la información).
- [[RNF-002]] [Duración de una partida](requisitos/no-funcional/RNF-002.md) — Una partida de meta 10 debe terminar, en el promedio de las partidas simuladas, en no más de 90 turnos con cualquier cantidad de 1 a 8 jugadores (hoy 59 a 87).
- [[RNF-003]] [Partidas trabadas](requisitos/no-funcional/RNF-003.md) — Entre las partidas simuladas de 2 a 8 jugadores no debe haber ninguna que no termine antes de 5000 rondas (con la variante adoptada: 0 de 60).
- [[RNF-004]] [Pruebas en verde y service worker](requisitos/no-funcional/RNF-004.md) — Cada cambio debe dejar `npm test` en «fallos: 0» en las 17 suites, y cada cambio del cliente debe subir la versión del service worker.
- [[RNF-005]] [Rendimiento en celular](requisitos/no-funcional/RNF-005.md) — La escena de dados y las animaciones deben mantener al menos 30 cuadros por segundo en un celular de gama media (por medir en un teléfono real).

## Decision

- [[ADR-001]] [Fundación v2 sin dados de recursos: tarjetas, cobran todos, sin intercambio](decisiones/ADR-001.md) — Los recursos son tarjetas que cobran todos con cada tirada; la mano es de máximo 6 y no hay intercambio.
- [[ADR-002]] [Servidor autoritativo con estado por jugador (mano privada)](decisiones/ADR-002.md) — El servidor decide todo y manda a cada jugador su mano completa y, de los demás, solo la cantidad de tarjetas.
- [[ADR-003]] [Misiones de condición y pedidos compartidos, con vencimiento por turnos](decisiones/ADR-003.md) — Un grupo compartido a la vista de misiones (se las lleva quien las cumple primero) y pedidos (se entregan tarjetas y vencen por turnos).
- [[ADR-004]] [Reloj único por turno; el tiempo agotado pasa el turno](decisiones/ADR-004.md) — Cada turno tiene un solo reloj (45 s Normal, 90 s Extendido); al agotarse, el turno se pasa solo.
- [[ADR-005]] [Camino de solo madera y pedido de 3 tarjetas cualesquiera](decisiones/ADR-005.md) — Dos palancas de economía medidas con bots que se adoptan para reducir los turnos sin construir y evitar bloqueos mutuos.
- [[ADR-006]] [Meta de 8 puntos por omisión](decisiones/ADR-006.md) — La meta por omisión de Fundación pasa de 10 a 8 puntos, porque el tramo final de 8 a 10 puntos se arrastra.

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
- [[fundacion_v2_requisitos]] [Fundación v2: índice de requisitos](fundacion_v2_requisitos.md) — Los requisitos de Fundación v2 viven **uno por archivo** en `docs/requisitos/` (reglas del juego = negocio `RN`, pantallas = usuario `RU`, servidor = funcional 
- [[ideas_13_jack]] [13 Jack: el reemplazo del Blackjack (diseño en conversación, todavía no programado)](ideas_13_jack.md) — **Decisión:** el 13 Jack reemplaza al Blackjack anterior. El Blackjack se retiró del proyecto (código, pruebas y documentos); su última versión completa está en
- [[investigacion_juegos]] [Investigación: juegos de mesa para tomar ideas](investigacion_juegos.md) — Hecha el 9 de noviembre de 2026, al dejar el Rulepoly (ruleta + Monopoly) por no encontrar la mecánica que lo destrabe. Se buscaron juegos de **1 a 8 jugadores*
- [[pendientes]] [Bandeja de pendientes](pendientes.md) — Cosas que se notaron mientras se trabajaba en otra cosa y quedaron fuera del alcance. Se anotan aquí en vez de arreglarlas sin permiso o perderlas. Cada una se 
- [[principios_diseno]] [Principios de diseño de los juegos](principios_diseno.md) — Anotados el 9 de noviembre de 2026, a partir de lo que hace atractivos al Diez mil y al 13 Jack. Sirven de guía para el Rulepoly y para cualquier juego futuro: 
- [[rulepoly]] [Rulepoly: el juego (diseño acordado)](rulepoly.md) — > **En revisión (9 nov 2026):** Dante sintió que este diseño está trabado (se parece al Diez mil, tiene demasiados sistemas y el modo solo no cerraba). Se explo
- [[trazabilidad_fundacion_v2]] [Trazabilidad de Fundación v2](trazabilidad_fundacion_v2.md) — Cada requisito de `docs/fundacion_v2_requisitos.md` con el código que lo cumple y la prueba que lo verifica. Si un requisito no tiene prueba automática, la colu

## Trazabilidad

| Requisito | Tests | Código |
|---|---|---|
| RF-001 | — | — |
| RF-002 | — | — |
| RF-003 | — | — |
| RF-004 | — | — |
| RF-005 | — | — |
| RF-006 | — | — |
| RN-001 | — | — |
| RN-002 | — | — |
| RN-003 | — | — |
| RN-004 | — | — |
| RN-005 | — | — |
| RN-006 | — | — |
| RN-007 | — | — |
| RN-008 | — | — |
| RN-009 | — | — |
| RN-010 | — | — |
| RN-011 | — | — |
| RN-012 | — | — |
| RN-013 | — | — |
| RN-014 | — | — |
| RN-015 | — | — |
| RN-016 | — | — |
| RN-017 | — | — |
| RN-018 | — | — |
| RN-019 | — | — |
| RN-020 | — | — |
| RN-021 | — | — |
| RN-022 | — | — |
| RNF-001 | — | — |
| RNF-002 | — | — |
| RNF-003 | — | — |
| RNF-004 | — | — |
| RNF-005 | — | — |
| RU-001 | — | — |
| RU-002 | — | — |
| RU-003 | — | — |
| RU-004 | — | — |
| RU-005 | — | — |
| RU-006 | — | — |
| RU-007 | — | — |
| RU-008 | — | — |
| RU-009 | — | — |
| RU-010 | — | — |
| RU-011 | — | — |
| RU-012 | — | — |
| RU-013 | — | — |
| RU-014 | — | — |
| RU-015 | — | — |
| RU-016 | — | — |

**Requisitos sin test:** RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RN-001, RN-002, RN-003, RN-004, RN-005, RN-006, RN-007, RN-008, RN-009, RN-010, RN-011, RN-012, RN-013, RN-014, RN-015, RN-016, RN-017, RN-018, RN-019, RN-020, RN-021, RN-022, RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RU-001, RU-002, RU-003, RU-004, RU-005, RU-006, RU-007, RU-008, RU-009, RU-010, RU-011, RU-012, RU-013, RU-014, RU-015, RU-016
