# Fundación (Catan de dados): flujo de crear sala y de un turno (versión 2)

Estado: **diseño cerrado, nada programado de la versión 2.** Sigue `catan_dados.md` (reglas) y `fundacion_v2_pantallas.md` (pantallas), y reutiliza la entrada, las salas y los bots que ya existen (`entrada_y_salas`, `diseno.md`). Nombre: **Fundación** (id interno `fundacion`). La primera versión (con dados de recursos) sigue implementada en `feature/fundacion` hasta que se rehaga según `fundacion_v2_plan.md`.

## 1. Cómo se llega a una partida (sin cambios)

- **Con amigos → Crear sala:** aparece «Fundación» como tercera tarjeta (13 Jack, Diez mil, Fundación). Se elige Privada o Pública y se crea la sala con las reglas por omisión; el anfitrión las cambia en la sala de espera.
- **Solo:** se elige Fundación y después el modo: **Mejor marca** (sin rivales: llegar a la meta en la menor cantidad de turnos) o **Con bots** (de 1 a 7). Las reglas son las mismas.
- **Mapa de mesas y lista:** las mesas de Fundación se ven con su icono (pueblo y ciudad) y se entra como a cualquier otra mesa.
- **La sala de espera es común a todos los juegos** y no se rediseña.

## 2. Reglas de la sala (las cambia el anfitrión)

| Regla | Opciones | Por omisión |
|---|---|---|
| Jugadores | 1 a 8 (con 1 es el modo Solo; el mapa es de 19 hexágonos hasta 4 y de 37 de 5 a 8) | 4 |
| Tiempo por turno | Normal (**45 s**) · Extendido (90 s) · Sin límite | Normal |
| Meta | Corta (8 puntos) · Clásica (10) · Larga (12); **por recalibrar** | Clásica |

Bots: se agregan y quitan desde la sala de espera, como en los otros juegos (jugadores + bots no pasan de 8). La isla no se elige: se mezcla al empezar. **Desaparece** la regla anterior «Tiempo por fase (dados + construir)».

## 3. La partida

1. **Inicio:** el servidor mezcla la isla (mapa justo), sortea el orden, reparte los colores y arma el grupo de misiones y pedidos.
2. **Colocación inicial, en serpiente:** cada jugador pone un pueblo y un camino; después, en orden inverso, otro pueblo y otro camino. Al elegir el pueblo se ve qué recursos daría y cuáles faltan. Reloj propio (Normal 30 s por pieza).
3. **Turnos** (uno tras otro). Cada turno tiene tres momentos:
   1. **Tirada (automática, sin reloj):** se tiran los 2 dados de número en el centro de la pantalla («Sale 8»).
      - **Con un 7:** el bandido se mueve solo, de su casilla anterior a una nueva elegida al azar; **nadie cobra**.
      - **Con otro número:** se resaltan los hexágonos con ese número que no estén bloqueados. **Cobran todos** los que tengan un pueblo (1 tarjeta) o una ciudad (2) junto a ellos. Cada jugador que cobra ve salir sus tarjetas de sus edificios; después se muestran las ganancias de todos y las tarjetas se acomodan solas en cada mano. Un caballero protege a su dueño del bandido.
   2. **Descarte** (solo el jugador del turno, solo si tiene más de 6 tarjetas): elige cuáles descartar hasta quedar en 6.
   3. **Construir y entregar** (con reloj): el jugador hace todas las acciones que le alcancen, en cualquier orden.
      - **Construir:** elige el edificio (solo se ofrecen los que alcanzan; si no alcanza ninguno, la ventana lo dice y el botón es «Pasar»), después el lugar (la cámara se acerca; en el celular, si hay demasiados lugares, primero la zona) y confirma. Puede construir varias veces.
      - **Entregar un pedido:** elige un pedido que pueda cumplir; la ventana muestra las tarjetas que se entregan (no se eligen) y los botones «Atrás» y «Entregar». Un pedido que no puede cumplir no abre la ventana: avisa.
      - **Pasar:** termina el turno.
4. **Fin del turno:** se recalculan las misiones de condición y las carreras; si hubo un pedido entregado, **se repone al terminar el turno de quien lo entregó**; se cuenta un turno más para el vencimiento de cada pedido.
5. **Meta:** cuando alguien llega, se completa la vuelta para que todos jueguen los mismos turnos. Gana quien tiene más puntos; el empate lo gana quien llegó con menos turnos.
6. **Solo:** termina al llegar a la meta de puntos; el resultado son los turnos y se guarda la mejor marca.
7. **Pantalla final:** igual a la del Diez mil y 13 Jack (ranking, «Nueva partida», «Compartir» como PNG, «Salir»).

## 4. Lo que ven los demás en un turno ajeno
La tirada y la cobranza son iguales para todos. Después ven el nombre del jugador del turno en el reloj («Turno de Ana»), su ficha resaltada, **lo que hace** (por ejemplo «Ana descarta 2 tarjetas» con dorsos, la pieza que coloca), y el botón «Esperando a Ana». **Su mano propia** sigue visible, y de los demás solo ven **cuántas tarjetas** tienen (como dorsos), nunca cuáles.

## 5. Casos límite
- **Tiempo agotado (decidido: se pasa solo):** el turno pasa sin más acciones. Si había un descarte obligatorio sin hacer, se descartan al azar las necesarias (**por confirmar**). Ya no juega un bot esa jugada.
- **Ausencia y desconexión:** como en los otros juegos, un bot toma el lugar y lo conserva; si el jugador vuelve, retoma. Las pantallas «Otro se desconecta» y «Reconectando» están en `fundacion_v2_pantallas.md`.
- **Recargar la página:** vuelve a su momento con el estado actual (incluida su mano privada).
- **Piezas agotadas** (15 caminos, 5 pueblos, 4 ciudades, 3 caballeros por jugador): ese edificio no se ofrece.
- **Sin lugares válidos** para un edificio que alcanza: no se ofrece.
- **Sin nada que hacer** (no alcanza para construir ni entregar): el turno se puede pasar al instante («Pasar»).
- **Pedido sin tarjetas suficientes:** no abre la ventana (no se pierde tiempo de turno).
- **Mano de más de 6 fuera de tu turno:** es válido hasta tu próximo turno.
- **Server autoritativo:** una máquina de estado propia (`MesaFundacion`, como `MesaDM` y `Mesa13`). La **mano de cada jugador es privada**: el servidor manda a cada uno su mano completa y a los demás solo la cantidad. Acciones: `descartar` (las tarjetas), `construir` (edificio) y `colocar` (lugar), `entregar` (pedido) y `pasar`; la tirada y la cobranza las hace el servidor al empezar el turno.

## 6. Decisiones
- **Reloj:** un solo reloj por turno (propuesta Normal 45 s, Extendido 90 s); se regula jugando.
- **Producción (decidido):** automática, compartida y sin reloj; cobran todos.
- **Tiempo agotado (decidido):** el turno se pasa solo.
- **Compartir (decidido):** como en los otros juegos, imagen PNG.

## 7. Las escenas en pantalla
Las 20 escenas de una partida (turno, tirada, descarte, construir, colocar, pedidos, entregas, colocación inicial, bandido, turno ajeno, victoria, desconexión y reconexión) están descritas en `fundacion_v2_pantallas.md`, con sus maquetas navegables en `docs/diseno_hud_v2/index.html`.
