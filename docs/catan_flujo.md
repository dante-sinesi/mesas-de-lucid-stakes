# Fundación (Catan de dados): flujo de crear sala y de un turno

Estado: **diseño cerrado, en programación.** Sigue `catan_dados.md` (reglas) y reutiliza la entrada, las salas y los bots que ya existen (`entrada_y_salas`, `diseno.md`). Nombre: **Fundación** (id interno `fundacion`).

## 1. Cómo se llega a una partida

- **Con amigos → Crear sala:** aparece «Fundación» como tercera tarjeta (13 Jack, Diez mil, Fundación). Se elige Privada o Pública y se crea la sala con las reglas por omisión; el anfitrión las cambia en la sala de espera.
- **Solo:** se elige Fundación y después el modo: **Mejor marca** (sin rivales: llegar a la meta en la menor cantidad de turnos) o **Con bots** (se elige cuántos, de 1 a 7). Las reglas son las mismas.
- **Mapa de mesas y lista:** las mesas de Fundación se ven con su icono (pueblo y ciudad) y se entra como a cualquier otra mesa.

## 2. Reglas de la sala (las cambia el anfitrión)

| Regla | Opciones | Por omisión |
|---|---|---|
| Jugadores | 1 a 8 (con 1 es el modo Solo; el mapa es de 19 hexágonos hasta 4 y de 37 de 5 a 8) | 4 |
| Tiempo por fase | Normal (25 s dados + 25 s construir) · Extendido (45 s + 45 s) · Sin límite | Normal |
| Meta | Corta (8 puntos) · Clásica (10) · Larga (12) | Clásica |

Bots: se agregan y quitan desde la sala de espera, como en los otros juegos (jugadores + bots no pasan de 8). La isla no se elige: se mezcla al empezar.

## 3. La partida

1. **Inicio:** el servidor mezcla la isla, sortea el orden y reparte los colores.
2. **Colocación inicial, en serpiente:** cada jugador pone un pueblo y un camino; después en orden inverso, otro pueblo y otro camino.
3. **Turnos** (uno tras otro):
   1. **Producción (automática):** se tiran 2 dados de número. Con 7, el bandido salta a un hexágono al azar. Con otro número, los hexágonos de ese número que toquen tus edificios te dan ese recurso (por ejemplo «ganas 1 madera»), que aparece como un dado fijado (máximo 4).
   2. **Dados:** completas hasta 6, guardas y vuelves a tirar, hasta 3 tiradas, con el % del edificio que apuntas a la vista.
   3. **Construir:** si alcanza para algo, eliges el edificio (si alcanza para más de uno) y el lugar (la cámara se acerca sola; si hay demasiados lugares, primero la zona) y confirmas. Si no alcanza, el turno pasa sin construir.
4. **Fin del turno:** se recalculan «Camino más largo» (5 caminos o más) y «Ejército más grande» (2 caballeros o más, el que tenga más).
5. **Meta:** cuando alguien llega, se completa la vuelta para que todos jueguen los mismos turnos. Gana quien tiene más puntos; el empate lo gana quien llegó con menos turnos.
6. **Solo:** termina al llegar a la meta; el resultado son los turnos y se guarda la mejor marca.

## 4. Lo que ven los demás en un turno ajeno
Los dados de número, los hexágonos que producen (resaltados), el bandido saltando, los dados de recursos con lo que se guarda y se vuelve a tirar, y la pieza que se coloca. Todo sin carteles de texto.

## 5. Casos límite
- **Tiempo agotado (decidido):** la primera vez, un bot juega esa jugada (en dados guarda para el mejor edificio y pasa a construir; en construir construye lo mejor que pueda). Si al turno siguiente tampoco actúas, te reemplaza un bot hasta que vuelvas a conectarte, como en Diez mil y 13 Jack.
- **Desconexión:** el bot toma el lugar y lo conserva, como en los otros juegos; si vuelve, retoma.
- **Recargar la página:** vuelve a su turno con el estado actual.
- **Piezas agotadas** (15 caminos, 5 pueblos, 4 ciudades y 3 caballeros por jugador): ese edificio no se ofrece.
- **Sin lugares válidos** para el edificio que alcanzas: no se ofrece; si no queda ninguno, el turno pasa.
- **Server autoritativo:** una máquina de estado propia (`MesaFundacion`, como `MesaDM` y `Mesa13`) con las acciones `tirar` (con los dados que se guardan), `construir` (edificio), `colocar` (lugar) y `pasar`.

## 6. Decisiones
- **El reloj (decidido: B):** una cuenta regresiva por fase. Dados y construir tienen la suya; la colocación inicial tiene una más larga (30 s Normal, 60 s Extendido). Las cifras se calibran jugando.
- **Tiempo agotado (decidido):** ver «Casos límite».
- **La producción (decidido: C):** los 2 dados de número se tiran solos al empezar tu turno, y el turno espera a que toques «Seguir» para pasar a los dados de recursos.

## 7. Las 4 etapas del turno en pantalla
Maqueta en `prototipos/etapas_isla/index.html` (copia en la carpeta de contexto, `maquetas/etapas_isla.html`), con la CSS, los botones, las tarjetas de jugador, la medalla y el reloj reales del proyecto, y el arte de píxeles planos. Móvil y escritorio, ambos con la opción C (cámara automática, panel inferior en el móvil y paneles flotantes en el escritorio).
1. **Producción:** los 2 dados de número se tiran solos y se ven con su suma; los hexágonos con ese número se resaltan (borde dorado) y los que tocan tus edificios muestran el dado que te dan. La bandeja de 6 lugares muestra el dado fijado (con candado). Botón «Seguir». Sin reloj.
2. **Dados:** mesa de fieltro con los 6 dados (fijado, guardados y libres), los 4 edificios con su % en la medalla del juego (el apuntado resaltado), «Tirada 2 de 3», el reloj de la fase y los botones «Tirar» (con su medalla de %) y «Construir».
3. **Construir:** solo si los dados alcanzan para más de un edificio: dos tarjetas (camino y pueblo) con sus dados de costo; el mapa se apaga. Botón «Elegir lugar» y reloj.
4. **Colocar:** la cámara se acerca a los lugares válidos (puntos dorados); el elegido muestra la pieza. «Atrás» y «Confirmar», con reloj.

### Ajustes pedidos sobre esas pantallas
- **Dados de recursos en 3D, en fila:** usan la misma escena y la misma animación que los dados del diez mil (caen, ruedan y se levantan los guardados). Para eso hace falta un **modelo nuevo de dado de 15 × 15 × 15 cubitos** (el del diez mil es de 8), con marco de marfil y una cara de color por recurso (valor 1 a 6: madera, ladrillo, lana, trigo, mineral, oro) y la escena en modo «fila» también en el móvil. El fijado lleva candado y los guardados un aro dorado. Se probó en la maqueta con una copia parcheada de `dados3d.js` (la web real no se tocó).
- **Construir:** se ofrecen solo los edificios que alcanzan; se puede **pasar** (el turno sigue sin construir). La ciudad pide 3 de mineral, 2 de trigo y un pueblo propio para mejorar.
- **Colocar:** el mapa se oscurece para que resalten los puntos dorados. En el móvil, cuando los lugares válidos están muy repartidos (colocación inicial, caminos), hay un paso previo de **zonas**: el mapa completo con las zonas marcadas y su cantidad de lugares, flechas ‹ › para pasar de zona, y al tocar una la cámara se acerca.
- **Color del jugador:** ya no es un cuadradito bajo el puntaje. Se probaron tres: A) una casita de su color junto al nombre, B) una franja de su color arriba de la tarjeta, C) el nombre escrito con su color. **Elegido: B, la franja.**
- **Dados sobre el tablero:** se tiran directamente sobre el mapa (sin fieltro), en fila y con más espacio entre ellos; el mapa se oscurece un poco para que se lean y la fila ocupa solo la franja de abajo.
- **Los % de los edificios (etapa Dados):** son la probabilidad de lograr ese edificio en este turno con los dados que guardaste y las tiradas que quedan (el resaltado es el que apuntas; el mismo número va en la medalla de «Tirar»).
- **Dados en dos filas de 3**, directo sobre el tablero (sin fieltro). La etapa 1 también muestra el dado fijado sin fieltro, con el candado completo.
- **Texto de la producción:** «Salió 9 · ganas 1 madera» (el recurso que se ganó, no «un dado»). Con varios hexágonos: «+1 madera, +1 lana».
- **Zonas (móvil):** se eligen tocando la zona en el mapa (sin selector 1/6): la cámara se acerca a ella y después se toca el punto.
- **El caballero (decidido):** es una pieza que **se pone sobre un hexágono donde ya tienes un edificio**; si el bandido cae en ese hexágono, **no te afecta** (tu producción de ahí no se bloquea; a los demás sí). Sigue contando para «Ejército más grande». Colocarlo es tocar un hexágono (se resaltan los posibles) y confirmar (maqueta, etapa 4c). Decidido: **un caballero por jugador en cada hexágono**, **no se pueden mover** una vez puestos y **tope de 3 caballeros por jugador**. «Ejército más grande»: mínimo 2 y se supera con más caballeros.

