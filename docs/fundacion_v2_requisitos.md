# Fundación v2: requisitos

Estado: **provisorios, derivados del brainstorming aprobado por Dante.** Los números marcados «(calibrar)» se miden con bots antes de cerrarlos. Cada requisito indica cómo se verifica. Reglas: `catan_dados.md`. Flujo: `catan_flujo.md`. Pantallas: `fundacion_v2_pantallas.md`. Plan: `fundacion_v2_plan.md`.

## Reglas del juego (FU2-R)

| ID | Requisito | Verificación |
|---|---|---|
| FU2-R-01 | No existen los dados de recursos ni el oro. Los recursos son 5: madera, ladrillo, lana, trigo y mineral. | Prueba de reglas: no hay API de dados de recursos; el estado no contiene oro. |
| FU2-R-02 | Cada recurso es una tarjeta; la mano de un jugador es una cuenta por recurso. | Prueba de reglas. |
| FU2-R-03 | Con un número de dados distinto de 7, **cobran todos los jugadores**: 1 tarjeta por pueblo y 2 por ciudad que toque un hexágono con ese número no bloqueado. | Pruebas con mapas fijos: pueblo, ciudad, hexágonos repetidos, varios jugadores. |
| FU2-R-04 | Con un 7 no cobra nadie y el bandido salta a un hexágono al azar distinto del actual (también en solitario). | Prueba con azar controlado. |
| FU2-R-05 | Un caballero protege a su dueño del bandido en ese hexágono; a los demás no. | Prueba. |
| FU2-R-06 | El bandido bloquea el hexágono donde está hasta el próximo 7. | Prueba. |
| FU2-R-07 | Mano máxima 6 al empezar el turno: tras la cobranza, quien tiene el turno y más de 6 tarjetas debe descartar hasta 6 antes de poder construir o entregar. | Prueba de la mesa: acciones rechazadas con descarte pendiente. |
| FU2-R-08 | Fuera de su turno, un jugador puede tener más de 6 tarjetas. Existe un techo duro si la calibración lo exige (calibrar). | Simulador. |
| FU2-R-09 | No hay intercambio entre jugadores ni con un banco. | Prueba: no existe la acción. |
| FU2-R-10 | En su turno, un jugador puede construir y entregar todo lo que alcance, en cualquier orden. | Prueba de la mesa. |
| FU2-R-11 | Costos: camino 1 madera + 1 ladrillo; pueblo 1 madera + 1 ladrillo + 1 lana + 1 trigo; **ciudad 3 mineral + 2 trigo (calibrar; plan B: 2 + 2)**; caballero 1 lana + 1 trigo + 1 mineral. | Pruebas de reglas; simulador de costo de ciudad. |
| FU2-R-12 | Piezas por jugador: 15 caminos, 5 pueblos, 4 ciudades, 3 caballeros; un edificio sin piezas o sin lugar válido no se ofrece. | Pruebas de reglas. |
| FU2-R-13 | El mapa se genera «justo»: cada recurso tiene hexágonos con números 5 a 9 accesibles (criterios a calibrar). | Prueba sobre muchas semillas. |
| FU2-R-14 | Colocación inicial en serpiente; el servidor calcula qué recursos daría cada vértice y cuáles faltan. | Pruebas. |
| FU2-R-15 | **Misiones de condición:** sin vencimiento; las gana el primero que cumple la condición. | Pruebas de misiones. |
| FU2-R-16 | **Pedidos:** se cumplen entregando tarjetas; los gana el primero que decide entregarlos en su turno; vencen a los 2 turnos de cada jugador (2 × jugadores turnos, cuenta propia por pedido); se reponen al terminar el turno de quien entregó. En solitario el mínimo de turnos se calibra. | Pruebas de vencimiento por turnos con 1, 2, 4 y 8 jugadores. |
| FU2-R-17 | Un pedido que el jugador no puede cumplir no se puede abrir ni entregar (el servidor lo rechaza). | Prueba. |
| FU2-R-18 | Camino más largo y ejército más grande se revisan junto con las misiones (qué puntos dan, si cambian de dueño) (calibrar). | Decisión de Dante tras simular. |
| FU2-R-19 | Meta 8/10/12 (calibrar) con vuelta completa; empate: menos turnos. En solitario se gana por meta de puntos y se guarda la mejor marca. | Simulador y pruebas. |
| FU2-R-20 | **Reloj por turno** (Normal 45 s, Extendido 90 s, Sin límite; calibrar) para descartar, construir y entregar; la colocación inicial tiene uno propio (Normal 30 s). La tirada no tiene reloj. | Pruebas con reloj falso. |
| FU2-R-21 | Al agotarse el reloj **el turno se pasa solo**; si había descarte obligatorio pendiente, se descartan al azar las necesarias (a confirmar). | Pruebas con reloj falso. |
| FU2-R-22 | Desconexión y ausencia: un bot toma el lugar y lo conserva; si vuelve, retoma (como en 13 Jack y Diez mil). | Pruebas existentes de salas. |

## Privacidad y servidor (FU2-S)

| ID | Requisito | Verificación |
|---|---|---|
| FU2-S-01 | El servidor es autoritativo; el cliente solo envía acciones (`descartar`, `construir`, `colocar`, `entregar`, `pasar`). | Pruebas. |
| FU2-S-02 | La mano de cada jugador es privada: el estado que recibe cada uno incluye su mano completa y, de los demás, solo la cantidad. | Prueba: el estado de un jugador no contiene las tarjetas ajenas. |
| FU2-S-03 | Las ganancias de cada tirada son públicas (quién gana qué tarjetas). | Prueba. |
| FU2-S-04 | La tirada y la cobranza las hace el servidor al empezar el turno, de forma determinista con el azar de la mesa. | Prueba con azar controlado. |
| FU2-S-05 | Los bots juegan por los jugadores ausentes y los reemplazados (descartan, construyen, entregan). | Prueba y simulador. |

## Pantallas y HUD (FU2-U)

| ID | Requisito | Verificación |
|---|---|---|
| FU2-U-01 | Horizontal en celular y escritorio; estructura «Mesa de Risk» con jugadores a la derecha y misiones a la izquierda, ambos centrados verticalmente. | Capturas en 812 × 375 y 1280 × 720. |
| FU2-U-02 | Medidor de tiempo de turno arriba de toda la pantalla en las escenas de turno (propio y ajeno), no en la tirada. | Capturas. |
| FU2-U-03 | Tarjetas de recurso sin texto: una por unidad, con color y dibujo. | Revisión visual. |
| FU2-U-04 | Contador de piezas restantes (caballeros, ciudades, pueblos, caminos) en el HUD. | Captura. |
| FU2-U-05 | Visor de jugadores: mi mano en miniatura; la de los demás, solo cantidad (dorsos). | Capturas y prueba del cliente con estados de dos jugadores. |
| FU2-U-06 | Los dados son los 3D del diez mil con la misma caída, en el centro. | Captura; comparación visual con el diez mil. |
| FU2-U-07 | Las cartas ganadas salen de cada pueblo o ciudad que produjo (en el segundo cuadro solo las propias; en el tercero, las de todos) y se acomodan solas en la mano. | Captura y revisión de la animación. |
| FU2-U-08 | Descarte: fondo oscurecido, cartas grandes, «Faltan N» → «Descartar»; opcional: «Pasar». | Pruebas del cliente. |
| FU2-U-09 | Construir: opciones siempre visibles con lo que falta; si no hay ninguna posible, «No puedes construir nada» y «Pasar». | Pruebas. |
| FU2-U-10 | Entregas sin elección de tarjetas; solo «Atrás» y «Entregar». Una opción no disponible no abre la ventana y avisa. | Pruebas. |
| FU2-U-11 | Colocación inicial muestra los recursos que daría el vértice elegido y cuáles faltan. | Capturas. |
| FU2-U-12 | El bandido se ve moverse de la casilla anterior a la nueva con «Salió 7, el bandido se mueve»; el jugador no lo mueve. | Captura y prueba. |
| FU2-U-13 | Turno ajeno: nombre en el reloj, ficha resaltada, aviso de lo que hace y «Esperando a …». | Capturas. |
| FU2-U-14 | Final de partida igual al del diez mil y el 13 Jack; «Compartir» genera imagen PNG con `compartirImagen`. | Prueba y revisión visual. |
| FU2-U-15 | La sala de espera, la entrada y el crear sala son los comunes de la sala; solo cambian las reglas de la sala de Fundación (tiempo por turno y meta). | Pruebas existentes. |
| FU2-U-16 | Poco texto, nada de scroll, arte de píxeles planos sin espacios, sin textos de ayuda en el HUD de juego. | Revisión de diseño. |

## No funcionales y calibración (FU2-C)

| ID | Requisito | Verificación |
|---|---|---|
| FU2-C-01 | Existe un simulador de partidas de bots con la nueva economía para medir meta, duración, costo de ciudad, mal reparto, mano fuera de turno, misiones y peso del mapa. | `node simulador/...` |
| FU2-C-02 | Una partida con 8 jugadores no pasa de la duración objetivo (a definir con el simulador; hoy ~2 horas estimadas en la v1 es inaceptable). | Simulador. |
| FU2-C-03 | Ninguna partida simulada queda trabada por falta de un recurso más de lo aceptable (a definir). | Simulador. |
| FU2-C-04 | `npm test` queda en «fallos: 0» tras cada fase; el service worker sube de versión con cada cambio del cliente. | CI local. |
| FU2-C-05 | Dados 3D y animaciones fluidas en un celular real (medir). | Prueba manual en dispositivo. |
