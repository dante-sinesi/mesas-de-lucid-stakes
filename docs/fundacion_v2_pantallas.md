# Fundación v2: pantallas y HUD

Estado: **diseño aprobado por Dante, nada programado.** Reglas en `catan_dados.md`, flujo en `catan_flujo.md`, requisitos en `fundacion_v2_requisitos.md`.

Las maquetas navegables están en `docs/diseno_hud_v2/`: abrir `index.html` (selector **Celular horizontal / Escritorio** y un botón por escena; también se cambia con las flechas ← y →). `hud_escenas.html` es la página de las escenas y usa `web/dados3d.js` de este repositorio para los dados reales. Son bosquejos de diseño: **no son el código del juego**, y los dibujos de las tarjetas son provisorios.

## Principios del HUD

| # | Decisión |
|---|---|
| H1 | **Estructura «Mesa de Risk»** (la referencia de Dante) en escritorio y celular: el mapa ocupa toda la pantalla y lo demás flota encima. **Jugadores a la derecha, misiones a la izquierda, ambos centrados verticalmente en todas las escenas.** Arriba a la izquierda, el contador de piezas (caballeros, ciudades, pueblos y caminos restantes). Abajo al centro, la mano; abajo a la derecha, los botones. |
| H2 | **Fundación es el primer juego horizontal también en el celular** (pantalla horizontal): se justifica por su mayor complejidad. |
| H3 | **Medidor de tiempo de turno:** una barra fina arriba de toda la pantalla, siempre visible aunque el fondo se oscurezca. Dice «Tu turno · 0:21» o «Turno de Ana», se vacía y se pone roja cuando queda poco. Está en las escenas de turno (propio y ajeno); **no** en la tirada de dados, que es automática y compartida. |
| H4 | **Las cartas de la mano son privadas.** En las fichas de los demás solo se ven dorsos (cuántas tienen). **Excepción:** las ganancias de cada tirada se muestran de frente, porque se deducen del tablero. |
| H5 | **Dados:** la misma escena 3D y la misma caída que el diez mil, en el centro, grandes, con «Sale x» y nada más. |
| H6 | **Ganancias de la tirada:** cada jugador que cobra ve su carta aparecer encima del pueblo o ciudad que la produjo; después se muestran las ganancias de todos al frente y se acomodan solas en las manos. |
| H7 | **Descarte:** fondo oscurecido, cartas grandes en el centro. «Descarta N tarjetas» y «Máximo 6». Obligatorio: botón «Faltan N» → «Descartar». Opcional: «Pasar» (y «Descartar» si se elige alguna). |
| H8 | **Construir:** siempre muestra las 4 opciones con su costo; las que no alcanzan quedan apagadas con lo que falta. Si no se puede ninguna: «No puedes construir nada» y botón «Pasar». La mano queda visible. Al elegir, el mapa marca los lugares válidos. |
| H9 | **Misiones y pedidos:** pantalla con las misiones de condición (con su avance, sin entrega) y los pedidos (con costo y lo que falta). |
| H10 | **Colocación inicial:** se marcan los lugares posibles; al elegir uno se ven los recursos que daría (con el número de cada uno) y cuáles faltan. |
| H11 | **Bandido (7):** el bandido se mueve solo: se ve su desplazamiento de la casilla anterior (tenue) a la nueva (marcada). Mensaje: «Salió 7, el bandido se mueve». Sin botón ni medidor. |
| H12 | **Turno ajeno:** el medidor dice «Turno de Ana», su ficha queda resaltada, un aviso dice qué hace («Ana descarta 2 tarjetas» con dorsos) y el botón es «Esperando a Ana». La mano propia sigue visible. |
| H13 | **Tarjetas sin texto:** una tarjeta por unidad, color del recurso y un dibujo (tronco, ladrillo, nube, espiga, roca). Con 3 maderas se ven 3 tarjetas de madera. Vale para mano, descarte, costos y entregas. |
| H14 | **Visor de jugadores (derecha):** el propio muestra tus tarjetas en miniatura, de color y sin texto; los demás, solo cuántas tienen (dorsos). |
| H15 | **Dados:** en la segunda parte solo se ve la carta que se lleva el propio jugador, encima de su pueblo o ciudad; en la tercera, las cartas de cada uno. |
| H16 | **Bandido:** no lo mueve el jugador. |
| H17 | **Entrega de pedidos:** el jugador **no elige tarjetas**: se ven marcadas las que se entregan y no se pueden cambiar; solo «Atrás» y «Entregar». Una opción que no se puede cumplir aparece apagada y, al tocarla, **no abre la ventana** y avisa («Necesitas 3 tarjetas iguales»), para no hacer perder tiempo de turno. Igual en Construir («Te falta 2 mineral y 1 trigo»). |
| H18 | **Final de partida:** igual a la del diez mil y el 13 Jack (título, subtítulo, una fila por jugador con puesto, nombre, detalle y puntos; «Nueva partida», «Compartir» como imagen PNG, «Salir») con `compartirImagen` de `comun.js`. |
| H19 | **Sala de espera:** no se rediseña; es común a todos los juegos. |

## Las escenas (20)

| Escena | Qué muestra | Reloj de turno |
|---|---|---|
| Turno | Mapa, jugadores, misiones, contador de piezas, mano y botones «Construir» y «Terminar turno» | sí |
| Dados 1 | Los dados 3D en el centro, con «Sale 8»; se resaltan los hexágonos con ese número | no |
| Dados 2 | La carta que se lleva el jugador aparece sobre su pueblo o ciudad | no |
| Dados 3 | Ganancias de la tirada de todos, al frente; la mano propia suma lo ganado | no |
| Descarte | Cartas grandes al centro, «Faltan N» | sí |
| Descarte listo | Con las N elegidas, botón «Descartar» | sí |
| Descarte opcional | «Descartar (opcional)», botón «Pasar» | sí |
| Construir | Cuatro opciones con costo; las no disponibles apagadas | sí |
| Nada que construir | Todas apagadas, título «No puedes construir nada» y botón «Pasar» | sí |
| Colocar | Puntos dorados con los lugares válidos y «Atrás» | sí |
| Pedidos | Misiones de condición (avance) y pedidos (costo y faltante) | sí |
| Pedido no disponible | Al tocar un pedido que no se puede cumplir, un aviso | sí |
| Entrega fija | Pedido con costo fijo: tarjetas marcadas, «Atrás» y «Entregar» | sí |
| Entrega de 3 iguales | Tres tarjetas iguales marcadas, «Atrás» y «Entregar» | sí |
| Colocación inicial | Lugares posibles, recursos que daría y cuáles faltan, «Poner aquí» | sí |
| Bandido (7) | Desplazamiento del bandido y «Salió 7, el bandido se mueve» | no |
| Turno ajeno | «Turno de Ana», «Esperando a Ana» | sí |
| Ajeno descarta | «Ana descarta 2 tarjetas» con dorsos | sí |
| Victoria | Ranking y «Nueva partida», «Compartir», «Salir» | no |
| Otro se desconecta / Reconectando | Aviso de desconexión con el bot que lo reemplaza; pantalla de reconexión propia | no |

(La sala de espera no está porque es común.)

## Mobile horizontal
Se probó el diseño en 812 × 375. Lo que queda por pulir: los textos de «Construir» y «Pedidos» se leen chicos en esa medida, y las ganancias de la tirada ocupan mucho. Ver «Pendiente» en `brainstorm_fundacion_v2.md`.

## Pendiente del HUD
- Pulir el celular horizontal (tamaños de texto y de tarjetas).
- Dibujos definitivos de las tarjetas y animación real (los bosquejos son cuadros fijos).
- Después de la documentación, el diseño sigue el método de `senior-diseno` (estilo y evolución de la elegida) y recién entonces la implementación, con la autorización explícita de Dante.
