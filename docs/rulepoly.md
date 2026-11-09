# Rulepoly: el juego (diseño acordado)

> **En revisión (9 nov 2026):** Dante sintió que este diseño está trabado (se parece al Diez mil, tiene demasiados sistemas y el modo solo no cerraba). Se exploraron otros caminos y se eligió partir de un juego de dados al estilo Catan: ver `investigacion_juegos.md` y `catan_dados.md`. Este documento queda como historial.

Estado: **diseño conversado y acordado, nada programado.** Los números son puntos de partida: se calibran midiendo partidas de bots (como el Diez mil, ver `diez_mil_calibracion.md`). Lo que se descartó está al final. Sigue los `principios_diseno.md`.

## La idea en una frase
Una ruleta de casillas con dueño. En tu turno giras **tu** bola: según dónde caiga, sumas, te quemas o cobras, y después decides si giras otra vez o te plantas. Es el Monopoly sin tablero ni dados (girar es «moverte») y con la tensión de pedir o plantarse del Diez mil.

## La rueda
- Las casillas dependen de los jugadores: **13** si juegas solo, 16 con 2, 22 con 4, 28 con 6 y **37** con 8 (unas 4 o 5 por jugador).
- **La mitad se puede comprar; la otra mitad nunca se vende** (son las casillas «normales»). Eso pone un piso a la seguridad: aunque se venda todo lo comprable, siempre hay una zona segura (56 % seguro con 8 jugadores).
- **El verde (0)** es el **pozo** (ver abajo).

## El turno
1. Giras tu bola. Según donde caiga:
   - **Casilla libre comprable o normal:** sumas puntos a lo que llevas en el turno (el acumulado). Las normales traen un efecto (ver abajo).
   - **Casilla tuya:** sumas más, y se aplica su modificador si tiene.
   - **Casilla de otro:** **te quemas**: pierdes el acumulado del turno. El dueño se lleva una parte y el resto va al pozo.
   - **Verde:** te llevas el pozo.
2. Si no te quemaste, **decides**: girar otra vez o **plantarte** (guardas el acumulado; lo guardado no se toca).
3. **Las casillas apagan:** cada giro seguro apaga la casilla donde cayó y sus dos vecinas hasta que termines el turno. Quedan menos casillas seguras, así que el riesgo **sube con cada giro**, y el juego muestra el porcentaje de quemarte antes de cada decisión, como el del Diez mil. En una rueda chica el cambio es grande; en una grande, suave.
4. **Premio por casilla segura:** crece un poco con cada giro del turno y es **menor cuanto más jugadores hay** (menos con 8 que con 1 o 2), para que el balance entre partidas chicas y grandes se mantenga. Se calibra con bots.

## Casillas normales (las que nadie compra)
Cada una trae un efecto visible desde el principio, y no todas valen lo mismo:
- **Premio chico variable:** +10, +20, +30 según la casilla.
- **Gira de nuevo:** una vez por turno, sin que cuente como giro.
- **Escudo:** te protege de la próxima quemada.

## El pozo (el verde)
Una parte de lo que pierde quien se quema (la que no se lleva el dueño) se acumula en el verde. Quien cae en el verde se lleva todo el pozo. Es raro y dramático, y ayuda al que va último.

## La tienda
- Cada cierto número de turnos (a definir), todos a la vez. **Tres ofertas propias** por jugador: **2 casilleros y 1 especial**. Si ya no quedan casilleros, los huecos se llenan con especiales. El servidor reparte casilleros distintos a cada uno, así nadie compite por el mismo.
- Se paga con **fichas**. Como en el 13 Jack, las fichas **no se apuestan ni se manejan**: se ganan solas (unas por turno y **más si te quemaste**, el consuelo del Diez mil) y solo sirven en la tienda. Lo único que se mira para ganar son los **puntos**.
- **Celdas especiales** (en lugar de casas): un modificador por casilla propia, como los dados y cartas especiales. Ejemplo: «quien cae paga doble». **Pendiente repensarlos** para el giro individual (algunos, como «si cae todos pagan», ya no aplican).

## Que nadie quede afuera
- No hay bancarrota ni eliminación: lo guardado nunca se pierde, y siempre juegas tu turno.
- Quien va atrás junta más fichas (consuelo) y compra antes.
- El pozo premia al que cae en el verde, sea quien sea.
- **Vuelta completa:** al llegar alguien al objetivo, todos juegan los mismos turnos. Siempre se prioriza que todos tengan las mismas posibilidades de ganar. Quedan ideas para sostener la tensión hasta el final (ocultar el ranking en las últimas vueltas).

## Pendiente
- **Duración y puntaje objetivo:** se definen midiendo partidas de bots, después de cerrar las reglas.
- Cuánto se lleva el dueño de lo que pierde quien se quema, y cuánto va al pozo (propuesta: mitad y mitad).
- Los modificadores de las celdas especiales y sus precios.
- Cuántos turnos pasan entre tienda y tienda.
- Cuánto cuestan las casillas y cómo se reparte el premio según los jugadores.
- La mesa (rueda, la bola, el apagado de casillas) y su interfaz, con poco texto y sin scroll.
- Rivales automáticos para el modo solo: ya existen los bots de las salas.

## Lo que se descartó (y por qué)
- **Apostar a números, colores, pares, docenas y sus pagos de la casa**, y la fase de apuestas simultáneas: es una decisión por giro que cuesta puntos sin que se vea por qué.
- **Una bola general para toda la mesa:** al dejar de apostar, cada jugador gira la suya.
- **El rojo y el negro** como decisión (quedan, a lo sumo, de adorno).
- **Grupos con multiplicador** (docenas, colores): sin comercio no tienen sentido.
- **Compra hostil, intercambios e hipotecas:** no debe haber comercio entre jugadores; complicaría el juego.
- **Casas y hoteles:** reemplazados por celdas especiales.
- **Bancarrota y eliminación:** que nadie mire la partida desde afuera.
- **Comprar al caer, tablero y dados, cárcel, cartas de suerte:** no encajan con la ruleta.
