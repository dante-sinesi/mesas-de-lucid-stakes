# Mesas de Lucid Stakes

Mesas multijugador (hasta 8 amigos) para jugar en el navegador, en un servidor de Hostinger. Vive en esta carpeta, aparte del juego principal (`../Balatro x Catherine`): ese juego no se toca.
Hoy tiene el **Diez mil**. El **13 Jack** (el antiguo Blackjack, rehecho; ver `ideas_13_jack.md`) ya se puede jugar. El **Rulepoly** está en preparación: figura en la pantalla principal como "Próximamente".
El Blackjack anterior se retiró del proyecto; su última versión completa quedó en `respaldos/blackjack-ultima-version.zip` por si se quiere rescatar algo.

**Convenciones:** la interfaz va en español neutro (tuteo). Las claves de memoria del navegador siguen empezando con `bj_` (vienen de la primera versión): se mantienen para no borrarle a nadie lo que ya tiene guardado.

## Instalable como app (Android, iPhone y iPad)

- **Manifiesto** (`web/manifest.webmanifest`): nombre "Lucid Stakes", se abre a pantalla completa (sin la barra del navegador), con el fondo violeta del juego. **Íconos** con la cara de Farolín, hechos con el propio dibujo del juego: 192 y 512 px, una versión "maskable" (más chica, para los recortes redondos de Android) y `apple-touch-icon.png` de 180 px para iOS.
- **Service worker** (`web/sw.js`): lo que exige Chrome para instalar. La red va primero (una versión nueva llega apenas se abre) y las consultas del juego (`/api/`) nunca se tocan ni se guardan; lo estático queda de copia si la red falla un instante.
- **Android (Chrome)**: cuando el navegador avisa que se puede instalar, aparece en la entrada el botón "Instalar en tu celular" y se instala con un toque.
- **iPhone y iPad**: Apple no avisa ni deja instalar con un botón; el mismo botón abre una ventana con los 3 pasos por el menú Compartir de Safari («Añadir a pantalla de inicio»). El juego ya trae las marcas que usa iOS (`apple-mobile-web-app-*`), respeta la zona segura de arriba y abajo y evita el "arrastrar para recargar".
- El botón no aparece si ya está instalada o si el navegador no puede instalarla. **Hace falta HTTPS** (el dominio de Hostinger con su certificado), si no ningún navegador deja instalar.
- Prueba: `pruebas/test_sw.js` (la lógica del service worker con un entorno de mentira).

## Quien se va de la sala

- Quien cierra la página o pierde la conexión figura **Desconectado** a los 35 segundos sin consultas, y conserva su asiento y sus fichas por si vuelve (un clic sin querer, se quedó sin internet).
- Si no vuelve en **3 minutos**, el asiento se libera (con una mano en juego, al terminar la ronda).
- Si la sala está **llena** y alguien lleva más de **30 segundos** ausente, su lugar se lo queda quien llega.
- Una sala donde no queda nadie conectado se borra a la media hora (antes de las 24 h de siempre).
- Mientras alguien está desconectado, su turno lo juega solo: se planta.

## Si la partida se cuelga

- Cada consulta del navegador tiene un tope de 30 s: si no hay respuesta, se corta y se vuelve a pedir. También se reanuda sola al volver a la página (el celular duerme las conexiones al bloquear la pantalla), al recuperar internet y al volver desde la caché.
- El servidor ya no se cae por un error en un pedido o en un tic: lo anota y sigue (`uncaughtException`).
- Prueba de estrés (`herramientas`: se corrió con un script suelto): el anfitrión recarga 36 veces en 45 s mientras otros dos juegan; ninguno se cuelga (la espera más larga fue de 1,9 s) y el servidor no se cae.
- Si se reinicia el servidor, las salas se recuperan del archivo y los navegadores se reconectan solos.
- **Diagnóstico en Hostinger**: abrir la sala con `?diag=1` al final del enlace muestra abajo a la izquierda el número de proceso del servidor y cuántas veces cambió. Si cambia, hay más de un proceso (o se reinició) y las salas, que viven en la memoria de cada proceso, se separan.

## Cómo funciona por dentro (Hostinger)

El plan de Hostinger permite subir una **app web de Node.js** (panel > Sitios web > Crear sitio > App web > subir un .zip), pero según su documentación **no acepta WebSockets entrantes**, no deja procesos de fondo y corta cada petición a los 120 s.
Por eso:

- **Servidor: Node.js** (`server.js`, sin framework ni dependencias si se puede). Las reglas se escriben una vez en JavaScript y las usan el servidor y el navegador.
- **Conexión: long polling.** El navegador hace una consulta ("¿hay algo más nuevo que la versión N?") que el servidor deja abierta hasta ~25 s y contesta en el instante en que cambia algo. Se siente instantáneo, casi no hay consultas y queda por debajo del corte de 120 s. Los eventos del servidor (SSE) se prueban también, por si andan.
- **El servidor manda**: reparte (cartas al azar), cuenta y decide. El navegador solo muestra y envía acciones (apostar, pedir, plantarse, doblar, prestar).
- **Estado**: las salas viven en memoria y se guardan también en un archivo (SQLite o JSON), por si Hostinger reinicia el proceso: la partida sigue donde estaba.
- **Los temporizadores** (turno, tienda) los lleva el propio servidor.
- **Identidad**: el apodo y un código secreto se guardan en el navegador; si se recarga la página o se cae la conexión, vuelve a su asiento con sus fichas. Las salas sin uso se borran a las 24 h.
- **Plan B** si el long polling no aguanta en Hostinger: consultas cortas cada ~1,2 s (con el mismo servidor, o en PHP).

### Prueba de hosting (hecha antes de construir nada)

`pruebas/prueba_hosting/` (y `prueba_hosting.zip`, listo para subir): un contador compartido que se actualiza por long polling y por SSE a la vez, para confirmar en el Hostinger real que ninguno de los dos se corta. En esta PC pasa `probar_local.js` (6 comprobaciones, 0 fallos).

## Estructura de la carpeta
```
Mesas de Lucid Stakes (esta carpeta)
  server.js                 el servidor HTTP (Hostinger: archivo de entrada)
  servidor/                 Node: salas y long polling (salas.js) y el Diez mil (diezmil/: reglas.js y mesa_dm.js)
  web/                      lo que baja el navegador: index.html, comun.js (pantallas, conexión, ayuda, estadísticas, compartir), entrada.js, sala.js, mesas.js, diezmil.js, tutorial.js, voxel.js, sonido.js...
  pruebas/                  las pruebas (npm test)
  herramientas/             armar el paquete (npm run paquete) y generar las letras
  docs/                     estos documentos
  respaldos/                copias de versiones anteriores (el Blackjack retirado)
  simulador/                simulador del Diez mil
```

## Celular (prioridad)

La mayoría va a jugar desde el celular, así que en pantallas angostas (hasta 700 px) la mesa **no es un hexágono** sino una columna pensada para el pulgar:
- Debajo, los demás jugadores en una lista (nombre, fichas, estado y sus cartas a la derecha).
- **Barra de acciones fija al pie**, a la altura del pulgar: solo muestra lo que se puede hacer en ese momento (Apostar; Pedir, Plantarse y Doblar en tu turno; Pedir ayuda). Si no hay nada que hacer, dice qué se espera.
- **Compartir el enlace** abre la hoja de compartir del celular; **vibra** cuando te toca; el título de la pestaña dice "¡Tu turno!"; y se pide que la **pantalla no se apague** durante la mano.
- En pantallas grandes se mantiene la mesa hexagonal con tus cartas en el medio y los demás alrededor.

## Sin scroll

El juego nunca pasa del tamaño de la ventana, en escritorio ni en celular: la cabecera, la mesa y la barra de acciones se reparten justo el alto disponible. En escritorio el hexágono es el más grande que entra; en celular la mesa es una columna cuyo tamaño se mide con una unidad que sigue el ancho y el alto de la pantalla; con la ventana baja y ancha (celular acostado) las acciones pasan a una columna a la derecha. La pantalla de entrada también va centrada y sin barra lateral: en escritorio, el título arriba, el apodo y debajo, en dos columnas, "Entrar a una sala" y "Crear una sala nueva"; en celular, una sola columna; todo escalado para que entre en la ventana. Las deudas están en un botón de la cabecera que abre la lista. Si con muchos jugadores la mesa del celular no entra, todo se achica de a poco hasta que entre, y la entrada hace lo mismo. Comprobado sin scroll en 1920x1080, 1366x768, 1280x720, 1280x600, 375x812, 360x640, 320x568 y 812x375, con 8 jugadores.

## Estadísticas personales

- Se guardan solo en el dispositivo de cada persona (`localStorage`, clave `bj_stats`); el servidor no guarda nada de personas. Se ven con "Mis estadísticas" (en la pantalla de inicio y en el final de la partida).
- Al terminar una partida el cliente suma, una sola vez, los números de la partida de Diez mil (partidas, turnos, quemadas, mejor turno y récords) en la memoria del dispositivo (`web/estadisticas.js`).
- Muestra: partidas jugadas y ganadas, turnos jugados y quemados (con %), mejor turno y los récords de la carrera y de la escalera.
- Pruebas: `pruebas/test_estadisticas.js`.

## Página principal, clave de sala y Diez mil

- **Entrada y salas** (`web/entrada.js`, `web/sala.js`, `web/mesas.js`): ver la sección «Entrada y salas» al final.
- **Clave**: al crear una sala se puede activar; son 6 caracteres (A–Z y 2–9), se piden al entrar (sin distinguir mayúsculas) y quienes están dentro la ven en la cabecera. `GET /api/sala` dice si la sala tiene clave y de qué juego es.
- **Diez mil** (`servidor/diezmil/`, `web/diezmil.js`, `web/dados3d.js`): se entra con 500 puntos en un turno (300 tras dos quemadas) y hay que llegar justo a 10.000; ese **cupo de entrada** se elige al crear la sala con amigos (`cupo`, apagado por omisión: todos nacen "entrados" y se plantan con cualquier puntaje; en solitario y en el tutorial rige siempre). Los puntos (carrera) son aparte de las fichas (tienda cada 5 turnos propios: dados especiales, sexto dado y grabado). Modos: con amigos (hasta 8; tomar los dados y objetos hostiles se eligen al crear), Carrera y Escalera de metas (solo). Calibración en `docs/diez_mil_calibracion.md`.

## Tutorial guiado

- Cada juego tiene un tutorial de partida real (`web/tutorial.js`): una sala de práctica solitaria, sin relojes, donde el servidor reparte lo que manda el guion (acción `tut`, solo en salas con `tutorial`; no se guardan y se borran al salir). Un globo explica, un aro señala qué tocar y todo lo demás está bloqueado (la puerta de salir siempre funciona).
- Se ofrece la primera vez que se entra a cada juego (queda marcado en `bj_tut_<juego>`) y siempre está el botón "Tutorial" en la entrada. Los pasos son datos (`PASOS_BJ` y `PASOS_DM` en `tutorial.js`): texto, qué se puede tocar, qué prepara el servidor y cuándo se avanza.

## Lag que crece durante la partida (celulares)

Causa: cada botón (`V.boton`) se animaba mientras estaba "con el cursor encima". En el celular, tocar un botón dispara un `mouseenter` emulado que nunca se cancela, y cuando el botón se quitaba de la página (en el Diez mil los botones se rehacen en cada cambio) su bucle de `requestAnimationFrame` seguía redibujando el canvas para siempre. Cada toque sumaba un bucle: medido, 20 botones tocados y quitados daban unos 1.200 redibujados por segundo en reposo, hasta que todo (animaciones y botones) iba lento.
Arreglo (`web/voxel.js`): un botón quitado de la página deja de animarse; el toque con el dedo ya no cuenta como "encima" (se distingue con `pointerType`); y `pointercancel` limpia el estado. Con el arreglo, el mismo caso da unos 20 redibujados en total y 0 en reposo.
También se revisaron el DOM, los canvas, la memoria y las animaciones web durante partidas largas de los dos juegos: se mantienen estables.

## Muchos jugadores en el celular

- **Diez mil**: con más de 3 jugadores las tarjetas pasan a una versión compacta (nombre y puntos, 4 por fila): ocupan 88 px en vez de unos 260 con 8 jugadores. Antes, con 8 jugadores los botones quedaban justo al borde en 375x812 y fuera de la pantalla en cualquier celular más bajo.

## Diez mil: tiempo agotado
En las salas con amigos, si quien tiene el turno no actúa a tiempo (o se desconecta) el turno se quema y sigue el próximo, para no frenar la partida. En solitario (carrera, escalera) y en el tutorial el servidor sigue jugando solo lo que corresponda.

## Diez mil: compartir
Al terminar la partida, el botón Compartir arma una imagen PNG del ranking (con las letras de cubitos del juego) y la manda por el menú de compartir del teléfono; si no hay, la muestra para guardarla (`compartirImagen` en `juego.js`, `imagenRankingDM` en `diezmil.js`).

## Diez mil: dado multiplicador
Dado especial de la tienda (150 fichas, uno por jugador). Si lo apartas para puntuar, la jugada suma un 25 % extra de lo que llevas en el turno (lo ya apartado más esa jugada), redondeado a múltiplos de 50. Si con el extra te pasarías de la meta, no hace efecto. El porcentaje es `config.bonoMultiplicador` en `servidor/diezmil/reglas.js`.

## Diez mil: nueve dados nuevos
Todos se compran en la tienda (uno de cada tipo por jugador). Reglas exactas en `servidor/diezmil/reglas.js`.
- **Imán** (120): su cara no puntúa. Apartado con una jugada, atrae a un dado cualquiera de la tirada (aunque no puntúe) y suma 50 por él.
- **Banco** (130): al apartarlo guarda el 30 % de lo acumulado (múltiplos de 50, solo si ya entraste). Si te quemas, conservas lo guardado.
- **Póquer** (250): un grupo de 3 o 4 dados iguales que lo incluya vale el triple.
- **Suerte** (120): una vez por turno lo vuelves a tirar (botón "Tirar dado de la suerte"), también en la ventana de la quemada.
- **Vampiro** (140, solo salas con objetos): al puntuar con él, roba 50 puntos a quien va primero si te lleva ventaja; se suman a tu turno.
- **Doble** (200): cuenta como dos dados de la misma cara.
- **Fantasma** (150): si te quemarías, no te quemas: se descarta y vuelves a tirar (una vez por turno).
- **Escalera** (140): completa una escalera si con los otros dados tienes cuatro de sus cinco caras.
- **Apostador** (90): antes de tirar apuestas par o impar (botón "Apuesta"); si aciertas y puntúa, su jugada vale el doble.
La probabilidad de no quemarse cuenta el fantasma, el imán, el doble y la escalera; no cuenta espejo ni suerte (salvan después).

## Diez mil: el turno de los demás
Mientras juega otro, la línea de información muestra "Turno de X · lleva N" y, debajo, las últimas 3 jugadas que fue apartando (los dados con sus caras y los puntos de cada una). El servidor las guarda en `Turno.historial` y las manda en `turno.historial`.

## Diez mil: se completa la ronda
En las salas con amigos, quien llega justo a la meta (10.000 o 5.000) no termina la partida de inmediato: los jugadores que juegan después de él en esa ronda tienen su último turno, para que todos hayan jugado la misma cantidad. Gana quien llegó primero a la meta, aunque otro también llegue en esa vuelta. Si llega el último de la ronda, termina enseguida. Un aviso lo cuenta y la línea de información muestra "Última vuelta". En solitario y en la escalera no cambia.

## Imagen para compartir
La imagen que se genera al terminar la partida copia la ventana del final: mismo marco y colores, título, filas de jugadores pegadas una a la otra y la fecha. Se dibuja a doble resolución con la letra del juego (`imagenRankingDM` en `diezmil.js`, con `imgLienzo` y `compartirImagen` de `comun.js`). El resumen no muestra los turnos de cada jugador.

## Diez mil: ventana de un jugador
Al tocar la tarjeta de un jugador se abre una ventana con sus puntos (sobre la meta), fichas, quemadas, mejor turno, objetos y sus dados (los especiales con borde dorado; al tocar uno se lee qué hace). Se actualiza en vivo y se cierra sola al terminar la partida o abrir la tienda (`abrirJugadorDM` en `diezmil.js`). El servidor manda `mejorTurno` de cada jugador.

## Creador de sala del Diez mil
El recuadro del modo ("Con amigos") ya no se estira: se dejó de reservar el alto del grupo "Solo", así que queda compacto y la ventana se acomoda un poco al cambiar entre "Con amigos" y "Solo".

## Sonido

Los efectos se generan por código con Web Audio (`web/sonido.js`): no hay archivos que bajar. Timbres limpios: campanitas con armónicos, osciladores con envolvente, ruido filtrado para el papel y los roces, y un eco corto. El navegador solo deja sonar después de un primer toque, que enciende el audio solo. Se eligieron escuchando `demo_sonidos/demo_sonidos.html` (compara los sonidos de antes con los nuevos; se arma con `herramientas/armar_demo_sonidos.py`).
- **Resultado**: `ganar` (arpegio de campanitas), `victoria` (arpegio largo, acorde y monedas), `perder` (dos notas blandas que bajan, "wah-wah").
- **Cartas**: `carta` (el papel) por cada una que sale del zapato y `flip` (dos roces) al dar vuelta la tapada.
- **Fichas**: `ficha` (clic de cerámica) al apostar, `moneda` al doblar y cuando vuela una donación; `usar` (destello) al recibirla y `robo` si te roban.
- **Turno**: `turno` (dos notas amables) cuando te toca y un `tic` de madera por segundo en los últimos 5.
- **Tienda y objetos**: `tienda` (timbre de puerta) al abrirse, `comprar` (caja registradora), `usar` al usar un objeto o espiar con Rayos X, `golpe` cuando te cae un objeto en contra y `clic` al soltar.
- **Botones**: `clic` y un `roce` suave con el mouse.
- En la cabecera, un **ícono de parlante** (con ondas si hay sonido; con una cruz roja si no) lo enciende y apaga, y se recuerda. Prueba: `pruebas/test_sonido.js` (arma cada receta sobre un audio de mentira y revisa que sea válida, y que todos los sonidos que pide el juego existan). La música no está (las pistas del juego pesan unos 9 MB cada una).

## 13 Jack (implementado)
Código: `servidor/trecejack/reglas.js` (mazo, totales, cartas especiales, puntos y probabilidad), `servidor/trecejack/mesa_13.js` (la sala) y `web/trecejack.js` (la pantalla). Pruebas: `test_trecejack_reglas.js` y `test_trecejack.js`.
- **Mazo:** cada jugador tiene su mazo de 13 cartas (una de cada rango), mezclado por su cuenta; las usadas no vuelven (salvo las pegajosas) y siempre se ven cuáles quedan.
- **Mano:** se pide o se planta. Pasarse de 21 vale 0; un 21 exacto vale 30 y planta solo; si el mazo se acaba en plena mano, se planta. Un mazo son 4 manos (una por jugador y por vuelta). La partida dura 3, 5 u 8 mazos y gana quien más puntos sume.
- **Fichas:** al terminar cada mazo, 1 ficha cada 5 puntos, +5 por cada 21 exacto y +3 por cada mano pasada. Hay un resumen del mazo y, cada 2 mazos (si hay cartas especiales), la tienda: 3 ofertas por jugador y se elige a cuál de las 13 cartas reemplazan.
- **Cartas especiales (9):** oro (la mano vale 1,5 veces), comodín, salvavidas, pegajosa, doble (vale su valor o el doble), vidente (muestra la próxima carta), espejo, fantasma y multiplicador (+25 %). Una de cada tipo por jugador. Los precios están en `reglas.js` y salen del simulador.
- **Tiempo:** si se acaba el turno, el servidor pide una carta (si no había) y se planta por el jugador.
- **Pantalla:** tu mazo a la vista (apagadas las usadas), la mano en juego, medalla con la probabilidad de no pasarte sobre "Pedir", turno de otro (su mano y sus manos anteriores), ventana de un jugador al tocar su tarjeta, resumen, tienda, final con imagen para compartir y estadísticas propias.
- **Sin tutorial por ahora:** la ayuda ("Cómo se juega") explica las reglas.

## Simulador y balance del 13 Jack
`node simulador/trece_jack.js [mazos]` juega miles de mazos con un jugador automático (pide mientras el puntaje esperado de pedir supere al de plantarse; usa al vidente) y mide el puntaje, las fichas y cuánto aporta cada carta especial puesta en su mejor lugar.
- **Sin especiales:** unos 69 puntos por mazo (~346 en 5 mazos), 0,4 veintiunos por mazo y unas 15,6 fichas por mazo (~31 hasta la primera tienda). El jugador automático casi nunca se pasa; una persona lo hará más.
- **Ajustes hechos con el simulador:** el oro pasó de x2 a x1,5 (sumaba +16 puntos por mazo), la doble pasó de "cuenta por dos" (perdía puntos) a "vale su valor o el doble", y se reajustaron los precios (oro 28, comodín 36, salvavidas 14, espejo 12, fantasma 14, multiplicador 16, doble 16, vidente 10, pegajosa 7).
- **Resultado:** todas rinden entre 0,5 y 0,9 puntos por ficha (contando 3 mazos de uso). Con la tienda cada 2 mazos alcanza para 1 carta (3 mazos), 2 (5 mazos) o 3 (8 mazos): suman un 4 a 8 % de puntos, así que son un toque de sabor y de decisión, no una ventaja que decida la partida.

## 13 Jack: la misma interacción que el Diez mil
Se llevó al 13 Jack lo que ya tenía el Diez mil: el cartel grande de lo propio ("TE PLANTASTE" con los puntos que suben, "¡21 EXACTO!" o "¡TE PASASTE!", con confeti o temblor y 1,5 s de duración); el cartel chico de lo que hacen los demás; los puntos flotando sobre la mesa al pedir una carta; el sonido y la vibración al empezar tu turno; el sonido de cada carta nueva (también las de otros); la cuenta regresiva "Quedan N s: jugaremos por ti"; las reacciones rápidas de un toque cuando no es tu turno; el aviso de quien entra con la partida en curso; la ventana de un jugador; la medalla de probabilidad y la imagen para compartir.

## 13 Jack: patrones y premio por vaciar el mazo
Una mano que no se pasó suma extra por sus cartas (funciones `patrones` y `puntosDeMano` en `reglas.js`; los palos son los del juego, uno por rango):
- **Palo:** 2 del mismo palo +3, 3 del mismo palo +10 (4 no caben en 21). **Escalera:** 3 rangos seguidos +8, 4 +18, 5 +30. **Gemelas:** dos cartas del mismo valor (10, J, Q, K) +4. **Todo pares / todo impares** (3 o más cartas) +8. **Blackjack:** 21 con dos cartas +10. **Cinco cartas** sin pasarte +15 (seis o más, +25).
- Se ven en vivo bajo el total mientras pides, en el cartel al plantarte y en el resumen del mazo. La ayuda tiene una lámina "Patrones".
- **Premio por vaciar el mazo:** al terminar el mazo, sin cartas sobrantes +25, con una +15, con dos +6.
- **Cartas especiales:** la que compras toma el número de la carta que reemplazas (la tienda la muestra de espaldas hasta que eliges cuál). Precios actuales: oro 30, comodín 40, salvavidas 36, fantasma 36, multiplicador 18, doble 18, espejo 12, vidente 12, pegajosa 7.
- **Balance (simulador):** los patrones suman unos 12 puntos por mazo (~83 en total por mazo). Las cartas que evitan pasarte (comodín, salvavidas, fantasma) rinden más que el resto (1,2 a 1,7 puntos por ficha); cuestan casi todas las fichas de la primera tienda a propósito.

## 13 Jack: cartas especiales con su propio número, palo y color
Cada oferta de la tienda trae su propio **número y palo** (al azar); al comprarla reemplaza la casilla del mazo que elijas, así que el mazo puede quedar con números repetidos (por ejemplo, dos Ases y ningún Rey). El precio sube con el número (As +6, figuras +3, 7 a 9 +1). Con números repetidos aparece el patrón "Pareja" (+10). Cada especial tiene su color de fondo y de borde (oro, comodín violeta, salvavidas verde, pegajosa naranja, doble rosa, vidente turquesa, espejo celeste, fantasma gris azulado, multiplicador rojizo). Las casillas del mazo se identifican por su lugar (`base` de cada jugador en `mesa_13.js`). El espejo pasó a costar 30 porque con un número alto (figura) se vuelve como un comodín chico.

## Solitario sin tiempo
En las salas de un solo jugador (13 Jack solitario y Diez mil carrera o escalera) el servidor ignora el tiempo pedido: los plazos son de una hora y no se muestran relojes. En el creador de sala, el campo "Tiempo por turno" se oculta cuando eliges "Solo".

## 13 Jack: objetivo por mazos o por puntos
Al crear la sala se elige el **objetivo**: por mazos (3, 5 u 8, como antes) o por puntos (250, 400 o 650). Por puntos, al terminar cada mazo se mira si alguien llegó a la meta (todos jugaron los mismos mazos): si es así, la partida termina y gana quien más puntos tiene; si nadie llega, sigue otro mazo (tope de 20 mazos). Las metas de puntos equivalen más o menos a 3, 5 y 8 mazos (unos 80 puntos por mazo). Las estadísticas guardan, por puntos, lo más rápido (menos mazos) para llegar a cada meta. Código: `objetivo` y `metaPuntos` en `mesa_13.js`, `objetivoTJ` y `puntosTJ` en `salas.js`.

## Sin el botón de reacciones en la cabecera
Se quitó el ícono de mensaje de la cabecera del Diez mil y del 13 Jack: las reacciones rápidas aparecen solas, en la barra de acciones, cuando no es tu turno. También se acortaron los textos de la ayuda de los dos juegos (una frase corta por lámina).

## Ayuda del 13 Jack más corta
Cada lámina tiene una frase de entre 24 y 57 caracteres (o ninguna), y la tabla de patrones se partió en dos láminas ("Patrones" y "Más patrones") para que ninguna fila se superponga con el texto de abajo. Se revisó cada lámina en 320 x 568 (el celular más chico): sin superposición ni scroll.

## 13 Jack en el celular (revisión a fondo)
- La cabecera muestra el mazo (`mazo 2/5` o `meta 400`); la línea de abajo queda corta: "Mano N de 4" en tu turno (el total y la probabilidad ya están en la mesa y en el botón Pedir) y, en el turno de otro, su nombre y mano más las últimas manos en miniatura.
- Cómo terminó la mano de otro (se plantó/se pasó, puntos y patrones) va en esa línea, no en un cartel sobre la mesa.
- El total va en la esquina de la mesa; las cartas se achican solas según el alto para no taparse con el total ni con los patrones.
- Las 13 cartitas de cada jugador van en dos renglones y no se salen de su casilla; con más de 3 jugadores las casillas son compactas.
- Resumen, tienda y ventana de jugador entran sin scroll desde 320x568 (ranking en dos columnas, datos del jugador en tres).
- La ventana de jugador elige la carta por casilla, no por número (puede haber números repetidos al comprar).

## 13 Jack: 10 cartas especiales nuevas y rediseño de las cartas
- Ahora hay 19 especiales (una de cada tipo por jugador). Nuevas: **Ancla** (vale 0, cuenta para patrones), **Camaleón** (toma el palo y número que más puntos den en patrones), **Borrador** (si te pasarías, borra la carta más alta de la mano), **Diamante** (vale 10, +12 al plantarte, -5 si te pasas), **Cofre** (vale 0, +6 si no te pasas), **Racha** (+2 por carta de la mano), **Adelanto** (la mano siguiente empieza con una carta puesta), **Mecenas** (+4 fichas cada vez que sale), **Ruleta** (su valor se sortea del 1 al 11 al salir; la carta muestra "= N") y **Retroceso** (si te pasas, la última carta vuelve al mazo y te plantas con lo anterior, una vez por mazo).
- Precios (de la tabla del simulador, ajustados a mano para las que el bot no modela): Ancla 28, Camaleón 30, Borrador 36, Diamante 22, Cofre 30, Racha 16, Adelanto 20, Mecenas 26, Ruleta 12, Retroceso 32.
- Una mano pasada puede valer negativo (el Diamante): las fichas del mazo nunca bajan de 0 por eso.
- Rediseño: cada especial mezcla un color de fondo y otro de borde (por ejemplo oro = amarillo con borde marrón, comodín = violeta con borde lima), con damero suave, tachuelas del color del borde y etiqueta propia. Las comunes no cambian. Los colores están en `COLOR_ESP_TJ` (`web/trecejack.js`) y se dibujan en `V.cartaCanvas` (`web/voxel.js`).

## Empates en el resultado final
- El servidor agrega `fin.empatados` (asientos que comparten el primer puesto; vacío si no hay empate) en los dos juegos. En 13 Jack son los que tienen el mismo total máximo; en Diez mil, los que llegaron a la meta en la misma vuelta (antes ganaba solo el primero en llegar).
- El cliente (`infoEmpateFin` en `web/comun.js`) muestra "¡Empataste con X!" o "Empataron X y Y", marca a todos los empatados como líderes, les pone el mismo número de puesto (1, 1, 3…) y lo mismo en la imagen de compartir. Un empate por el primer puesto cuenta como partida ganada en las estadísticas.

## 13 Jack: el cartel de las manos de los demás
- Vuelve el cartel del diez mil sobre la mesa cuando otro jugador se planta o se pasa ("Pablo se plantó: +17" con los patrones debajo, en verde; "¡Leo se pasó!" en rojo). La mano baja y se achica mientras el cartel está visible (`.tjMesa.conCartel`), el total pasa abajo a la derecha y los patrones solo se ven en el cartel, así no se tapa nada (probado en 320x568 y 360x640). La línea de información vuelve a mostrar solo quién juega y su mano.

## 13 Jack en el celular con 5 o más jugadores
- En el celular se quitó el registro de jugadas (las miniaturas de manos anteriores) de la línea de información: esa línea ahora ocupa un renglón y solo crece a dos cuando hay un aviso largo (clase `avisoLargo`).
- Con 5 o 6 jugadores las casillas van de a 3 por renglón y con 7 u 8, de a 4, centradas (`#tjJugadores[data-n]`). Probado con 5 y 8 jugadores (bots) en 320x568 y 360x640: mesa, cartel, total, mazo y botones sin solaparse.


## Bots (Diez mil y 13 Jack)

- **Qué son:** jugadores del servidor (`servidor/bots.js`) que ocupan un asiento con un nombre de personaje (Juan, Gaby, Ama, Farolín, Dante, Catherine, Lucía, Bruno) y un icono de robot a la izquierda del nombre (`ponerNombre`, `.botIco`). Llevan `bot: true`; el estado los marca y nunca expone su token.
- **Cantidad:** se suman y se quitan en la sala de espera (el anfitrión toca un asiento libre: «Añadir bot»; «Quitar» en un bot), o se pide «Contra bots» en la puerta Solo (sala privada con 3 bots). Los modos solitarios clásicos (carrera, escalera, solo del 13 Jack) no llevan bots.
- **Lugar:** los bots ocupan los últimos asientos. Si entra un humano y la sala se llenaría, se va un bot (el último). Con 8 humanos no queda ninguno. Si un humano elige el nombre de un bot, el bot cambia de nombre. Si se va el último humano, los bots se van con él. Los bots no cuentan como conectados (la sala se cierra por abandono) ni pueden ser anfitriones.
- **Cómo juegan:** una acción cada 0,8 a 1,7 s (`Bots.demora`). Diez mil: el jugador automático de `reglas.js` (`elegirJugada`, `debePlantarse`) y toma los dados que dejó otro si son 350 o más; en la tienda compra lo más caro que le alcance (dados y sexto dado; nada de grabados ni objetos contra otros). 13 Jack: pide si lo que espera sumar supera lo que tiene (`botPide`, la misma regla del simulador) y en la tienda compra según un orden fijo de especiales. Un solo nivel.
- **Desconexión:** quien se desconecta en una sala con amigos sigue jugando con la misma lógica (conserva su lugar y su partida); ya no se quema el turno. Se le saca de la sala a los 3 minutos, como antes.
- **Pruebas:** `pruebas/test_bots.js` (cantidad, lugar, partidas completas con bots en los dos juegos, salas y guardado).


## Entrada y salas

Se decidió con maquetas (`prototipos/entrada_salas/`, con la estética real del juego): poco texto, una pantalla a la vez (`Pantalla.ir`), sin scroll.

- **Entrada:** apodo, dos puertas (**Con amigos** y **Solo**) y «Entrar ya» (código de 4 letras; si la sala tiene clave, aparece su campo). Abajo, estadísticas e instalar; arriba, «Volver» si quedó una partida en curso.
- **Con amigos (el mapa):** el casino visto desde arriba, mesas redondas sobre el paño (6 en celular, 8 en escritorio). El centro de cada mesa lleva el icono del juego (dos cartas = 13 Jack; un dado normal y uno dorado = Diez mil, el mismo de «Crear sala»). Cada mesa es de madera con fieltro verde y tiene tantas sillas como asientos: ocupada = color del asiento, bot = celeste, libre = hueco. Borde punteado = mesa libre. Solo se ven las salas **públicas, sin clave y que esperan** (con alguien conectado); al empezar la partida la mesa sale del mapa y se entra por código. Se consulta `GET /api/salas` cada 4 s (sin conexiones abiertas); cada mesa dura unos 30 s y se reemplaza de a una, nunca la tocada; siempre hay al menos una de cada juego.
- **Ficha:** al tocar una mesa, juego, jugadores (n / asientos) y objetivo o meta, con Cerrar y Entrar. No dice quién armó la sala. Una **mesa libre** crea una sala pública con las reglas de siempre y quien la tocó es el anfitrión.
- **Lista:** desde el mapa, con filtros (todos, 13 Jack, Diez mil, mitad llena); muestra lo mismo que el mapa.
- **Crear sala:** dos tarjetas de juego (13 Jack arriba, Diez mil debajo: un tercero se suma sin rehacer nada), visibilidad y «Crear sala». Nace **privada**, con 6 asientos y reglas por omisión; todo lo demás se cambia en la sala.
- **Solo:** elegir juego y variante (13 Jack: solitario o contra bots; Diez mil: carrera, escalera o contra bots), más tutorial y «Cómo se juega».
- **La sala de espera:** un renglón por asiento (corona de cubitos en el anfitrión, ★ en ti, robot en los bots con «Quitar», robot atenuado en cada asiento libre con «Añadir bot»), reglas en etiquetas y visibilidad (pública o privada) y clave (sin / con, de 6 caracteres; con clave no es pública). Solo el **anfitrión** (el de menor asiento conectado; si se va, pasa al siguiente) edita las reglas (jugadores de 2 a 8, tiempo, y las de cada juego), suma o quita bots, cambia la visibilidad y empieza. Tras «Nueva partida» se vuelve a esta pantalla.
- **Servidor** (`servidor/salas.js`): `publica` por sala; asientos de 2 a 8 (`asientos`); acciones del anfitrión mientras espera (`config`, `visibilidad`, `clave`, `botmas`, `botmenos`); `GET /api/salas` (sin apodos ni identificadores). Una sala que espera y se queda sin humanos conectados se borra a los **30 s** (una mesa libre que se tomó y se dejó, por ejemplo). Pruebas: `pruebas/test_sala_espera.js`.

- **Apodo editable (bj-100):** el campo lleva la etiqueta «Tu apodo», borde punteado y un lápiz de cubitos, para que se entienda que se puede cambiar. El mapa ya no muestra «N mesas» (era información redundante).
- **Lección (CSS):** una llave `}` sobrante en `estilos.css` hacía que el navegador descartara la regla siguiente (`#dm.pantalla, #tj.pantalla`, el diseño en columna de la partida) y los dados y las cartas quedaban chicos. Al editar el CSS conviene revisar que las llaves estén balanceadas.

## Principios de diseño

Las reglas generales para pensar juegos nuevos (pocas decisiones con consecuencias, fácil de jugar y difícil de decidir, riesgo claro, competencia individual y motivos para volver) están en `docs/principios_diseno.md`.

El diseño acordado del Rulepoly (ruleta de casillas con dueño, sin apuestas ni comercio) está en `docs/rulepoly.md`.
