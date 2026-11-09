# Mesas de Lucid Stakes — resumen del proyecto

## 1. Nombre y propósito
**Mesas de Lucid Stakes** es un sitio web de mesas de juego multijugador (y en solitario) pensado para jugar en el celular con amigos, con la estética y las reglas de "casino de cubos" del juego Lucid Stakes (proyecto aparte en Godot, que **no** se toca desde aquí). Se entra con un apodo y un código de sala de 4 letras, sin cuentas ni registro. Es una PWA instalable, con interfaz en **español neutro** (tuteo, sin voseo).

Juegos disponibles:
- **Diez mil** (dados): se tiran dados, se acumula puntaje por turno y se decide plantarse o seguir; gana quien llega justo a 10.000 (o 5.000). Modos: con amigos, carrera, escalera. Tiene dados especiales, tienda, objetos, tutorial y reacciones.
- **13 Jack** (cartas): cada jugador tiene su propio mazo de 13 cartas (A, 2–10, J, Q, K) que se juega en manos de 21; se puntúa con patrones (palo, escalera, pareja, etc.), se compran cartas especiales en una tienda (19 tipos) y gana quien más puntos junta tras N mazos o al llegar a una meta de puntos. Reemplazó a un Blackjack anterior (respaldado en `respaldos/`).
- **Rulepoly**: aparece como "Próximamente".

## 2. Stack tecnológico
- **Servidor:** Node.js sin dependencias (solo módulos nativos: `http`, `fs`, etc.). `server.js` + `servidor/`.
- **Cliente:** HTML + JavaScript vanilla + CSS, sin frameworks ni bundler. Gráficos en `<canvas>` con un kit propio de "cubos/píxeles" (`web/voxel.js`) y dados 3D de voxeles (`web/dados3d.js`). Fuentes propias en `web/fonts/` (generadas con `herramientas/generar_glifos.py`).
- **PWA:** `manifest.webmanifest` + service worker (`web/sw.js`, caché versionada `bj-NN`; hay que subir el número en `sw.js` y `pruebas/test_sw.js` con cada cambio de cliente).
- **Tiempo real:** long polling (`/api/estado` con versión) + acciones por POST; no hay WebSockets.
- **Pruebas:** scripts de Node con contador "fallos: N" (`npm test` encadena 11 suites).
- **Despliegue:** hosting Node en Hostinger; `node herramientas/empaquetar.js` genera `paquete/mesas-lucid-stakes.zip` (sin datos guardados) para subir. No hay git en este proyecto.

## 3. Estructura
```
server.js                  Arranque HTTP: sirve web/ y enruta /api/* a Salas
servidor/
  salas.js                 Salas (códigos, claves, long polling, persistencia en datos/, catálogo, telemetría anónima)
  diezmil/reglas.js        Reglas puras de Diez mil (dados, puntuación, objetos)
  diezmil/mesa_dm.js       Máquina de estados de una mesa de Diez mil (MesaDM)
  trecejack/reglas.js      Reglas puras del 13 Jack (valores, patrones, 19 especiales, puntos, mazos)
  trecejack/mesa_13.js     Máquina de estados del 13 Jack (Mesa13)
web/
  index.html               Todas las pantallas y modales (inicio, Diez mil, 13 Jack, configuración, final…)
  comun.js                 Entrada a salas, configuración, bucle de conexión, ayuda, estadísticas, compartir como imagen, empates
  home.js                  Pantalla de inicio con las fichas de cada juego
  diezmil.js / trecejack.js  Cliente de cada juego (pintado, acciones, carteles, tienda, final)
  tutorial.js              Tutorial (solo Diez mil)
  ayuda.js                 Láminas de ayuda de cada juego
  voxel.js, dados3d.js     Dibujo de cartas, íconos, medallas, botones y dados
  estadisticas.js          Estadísticas locales (localStorage)
  sonido.js, farolin.js    Efectos de sonido sintetizados y el personaje Farolín
  qr.js                    QR para invitar; estilos.css; sw.js; manifest
pruebas/                   Tests de Node (reglas, mesas, salas, sonido, sw, QR…)
simulador/                 Bots para balancear (diez_mil.js, trece_jack.js: precios de cartas, puntaje esperado)
herramientas/              empaquetar.js, generar_glifos.py
docs/                      diseno.md (el diseño vigente, por secciones), brainstorms e ideas
datos/                     Salas guardadas y registros (no se empaquetan)
respaldos/, prototipos/    Copias de versiones anteriores y maquetas
paquete/                   Salida del empaquetado
```

## 4. Arquitectura y lógica central
- **Servidor autoritativo.** Cada juego es una máquina de estados (`MesaDM`, `Mesa13`) con la misma interfaz: `unirse`, `desconectar`, `salir`, `empezar`, `avanzar` (el paso del tiempo), `pausar/reanudar`, `guardar/desde` (persistencia), `estado(token)` (lo que ve cada jugador), `reaccionar`, `nuevaPartida`, `listo`, más las acciones propias del juego. Toda la lógica y los plazos viven ahí; las reglas son funciones puras en `reglas.js`, testeables aisladas.
- **Salas** (`servidor/salas.js`): crea/entra a salas por código (opcional con clave), guarda un token por jugador, reparte el estado por long polling y despacha `/api/accion` a la mesa. Endpoints: `/api/crear`, `/api/entrar`, `/api/estado`, `/api/accion`, `/api/catalogo` (catálogo de dados, cartas y patrones para el cliente).
- **Cliente delgado.** Cada poll devuelve el estado completo; `pintar*` repinta solo lo que cambió (claves JSON de comparación). El cliente nunca decide reglas: envía acciones y muestra el resultado. Las animaciones, sonidos y carteles son solo presentación.
- **13 Jack, reglas clave:** mano de 21 (pasarse = 0; 21 exacto = 30); 4 manos por mazo y un turno por jugador por vuelta; premio por mazo vacío (+25/+15/+6 según cartas sobrantes); fichas (1 por cada 5 puntos, +5 por 21, +3 por mano pasada); tienda cada 2 mazos con ofertas que traen su propio número y palo y reemplazan una de tus 13 casillas; 19 cartas especiales (oro, comodín, salvavidas, pegajosa, doble, vidente, espejo, fantasma, multiplicador, ancla, camaleón, borrador, diamante, cofre, racha, adelanto, mecenas, ruleta, retroceso); objetivo por mazos (3/5/8) o por puntos (250/400/650); empates declarados en `fin.empatados`.
- **Diez mil, reglas clave:** meta 10.000 (o 5.000), turnos con tiradas y plantarse, "quemarse" pierde lo acumulado, última vuelta cuando alguien llega a la meta (los que llegan juntos empatan), dados especiales y objetos comprables, modo carrera y escalera.
- **Tiempo:** cada fase tiene un reloj (turno, resumen, tienda) escalable (normal/extendido/libre); el solo no corre tiempo. Quien se queda sin tiempo es jugado automáticamente por el servidor.
- **Móvil primero:** la pantalla de juego nunca hace scroll; hay un diseño compacto a ≤700 px de ancho o ≤700 px de alto (probado en 320×568 y 360×640 con hasta 8 jugadores).

## 5. Estado actual y puntos clave
**Funciona:** Diez mil completo (3 modos, tutorial, tienda, ayudas, reacciones, compartir ranking como imagen, estadísticas locales); 13 Jack completo (solo y hasta 8 jugadores, objetivo por mazos o puntos, 19 especiales con tienda, patrones, reacciones, cartel de manos ajenas, ayuda, empates, imagen para compartir); salas con persistencia, QR de invitación, PWA instalable; 11 suites de pruebas en verde (`npm test`).

**Pendiente / ideas no implementadas:** Rulepoly ("Próximamente"); tutorial del 13 Jack; objetos hostiles entre jugadores en 13 Jack (Empujón, Barajar, Robo, Escudo); Adelanto, Mecenas y Retroceso no están modelados en el simulador (sus precios son a ojo, hay que calibrar con partidas reales).

**Dependencias y limitaciones:**
- Sin base de datos: el estado de las salas se guarda en archivos de `datos/`; el almacenamiento depende del hosting.
- Long polling + estado completo por poll: no está pensado para cientos de jugadores simultáneos.
- Sin cuentas: la identidad es un token en el navegador; estadísticas y récords viven en `localStorage` (por dispositivo).
- Cada cambio de cliente exige subir la versión del service worker (`web/sw.js` y `pruebas/test_sw.js`), si no los celulares siguen con la versión vieja.
- No hay control de versiones; los respaldos son zips manuales en `respaldos/`.

**Cómo correrlo:** `node server.js` (puerto por variable `PORT`), `npm test` para las pruebas, `node herramientas/empaquetar.js` para generar el zip. Simuladores: `node simulador/trece_jack.js [mazos]`.

**Convenciones del autor (Dante):** textos del juego en español neutro; poco texto en pantalla y sin scroll en la pantalla de juego; diseño conversado antes de programar los sistemas grandes; documentación viva en `docs/diseno.md` (se actualiza con cada cambio); balance con simuladores antes que a ojo cuando se puede.
