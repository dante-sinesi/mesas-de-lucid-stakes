# Fundación v2: primera calibración con bots

Estado: **primeras mediciones, con un bot simple y muestras chicas (20 a 40 partidas por configuración).** Sirven para ver órdenes de magnitud y detectar problemas, no para cerrar números. La meta y los demás valores por calibrar (`catan_dados.md`, «Por calibrar») se cierran con el bot mejorado y con partidas de personas. Se mide con `node simulador/calibracion.js [partidas] [meta] [mineral de la ciudad] [pedidoMin] [jugadores]`.

El bot de esta calibración: coloca sus pueblos buscando recursos que todavía no cobra, construye lo mejor que alcance (ciudad, pueblo, pedido, caballero, camino), entrega pedidos cuando puede y descarta primero lo que le sobra del recurso más abundante. No planifica expansión ni ahorra para una ciudad.

## Qué se midió y qué salió

### Duración (meta 10, ciudad 3 mineral + 2 trigo)
| Jugadores | Rondas (promedio) | Turnos de toda la partida | Estimación con personas (≈ 25 a 30 s por turno) |
|---|---|---|---|
| 2 | 28,8 a 30,3 | ~57 | ~25 min |
| 4 | 20,4 a 20,8 | ~78 | ~35 min |
| 8 | 11,5 a 11,8 | ~85 | ~38 min |

La duración en turnos totales queda casi constante (60 a 90) sea cual sea la cantidad de jugadores, porque cobran todos. Esto mejora lo que preocupaba de la v1 (8 jugadores, casi dos horas). **Por confirmar con personas:** el tiempo por turno real.

### La meta (4 jugadores, ciudad 3 + 2)
| Meta | Rondas | Turnos totales |
|---|---|---|
| 8 | 16,0 | 60 |
| 10 | 20,4 | 78 |
| 12 | 24,5 | 94 |

Cada punto de meta suma unos 2 rondas (≈ 8 turnos) con 4 jugadores. Hoy no hay motivo medido para mover las metas 8, 10 y 12; la decisión de duración objetivo es de Dante.

### El costo de la ciudad (4 jugadores, meta 10)
| Costo | Ciudades por jugador | Rondas |
|---|---|---|
| 3 mineral + 2 trigo | 0,34 | 20,8 |
| 2 mineral + 2 trigo | 0,72 | 18,7 |

**Es alcanzable** con 3 + 2 (un jugador de cada tres levanta una ciudad), pero rara. Con 2 + 2 hay el doble de ciudades y la partida es unas 2 rondas más corta. Por la decisión de Dante, se mantiene 3 + 2 salvo que parezca inalcanzable; **no lo parece**, pero queda a la vista como palanca.

### Lo que preocupa
1. **Turnos en los que el jugador no hace nada: 38 % (8 jugadores) a 72 % (2 jugadores).** Con el bot simple, la mayoría de los turnos pasan sin construir ni entregar. La racha máxima de turnos vacíos: mediana de 7 turnos seguidos con 2 a 4 jugadores (p90: 14 a 19). Parte es el bot (no planifica la expansión), pero es la señal del «mal reparto» sin intercambio: hace falta ver si una persona lo vive igual.
2. **La mano se acumula, sobre todo con muchos jugadores.** Mano máxima al empezar un turno: mediana 9 (2 jugadores), 11 (4) y **17 (8), con p90 de 22**. Con 8 jugadores cada uno descarta unas 7 veces por partida, de 4 tarjetas cada una. Está decidido que no haya techo, pero con 8 se tira mucho: es una señal para revisar (el tope de 6 puede ser demasiado bajo con mesas grandes, o cobrar menos).
3. **Los pedidos pesan mucho en los puntos:** 1,7 a 3,4 pedidos entregados por jugador en una partida de 10 puntos, a 1 punto cada uno y 3 a 5 tarjetas. Hoy dan casi tanto como construir pueblos (que casi no se construyen: 2,1 pueblos por jugador, o sea los 2 iniciales). Hay que mirar si conviene que cuesten más o den menos, o que haya más lugares de expansión.
4. **Hay partidas que no terminan:** con 2 jugadores, 1 de cada 40 llegó al límite de la simulación (trabada).
5. **El mapa de 19 hexágonos limita la expansión.** Con 4 jugadores casi nadie suma pueblos nuevos (distancia + caminos): la expansión está frenada.
6. **Los caballeros** (1,8 por jugador) son el gasto que más se desperdicia del bot: no dan puntos salvo la carrera del ejército.

### Colocación inicial y mapa justo (60 partidas de 4 jugadores)
- Con el bot que **suma recursos nuevos** en su segundo pueblo, el 56 % de los jugadores cobra los 5 recursos y el 97 % cobra al menos 4. Sin esa regla, solo el 12 % cubría los 5 y el 33 % no tenía ladrillo, el 31 % no tenía mineral. Es el argumento a favor de la colocación inicial asistida (H10), que la pantalla de personas debe mostrar.
- El mapa justo se cumple en el 100 % de las semillas probadas (ver `test_fundacion_reglas.js`).

## Qué sigue (propuesto)
1. Mejorar el bot (planificar expansión, ahorrar para una ciudad, no gastar en caballeros salvo la carrera) y repetir con 100 partidas por configuración.
2. Medir variantes de pedidos (menos puntos o más caros) y de misiones.
3. Decidir con Dante: meta, duración objetivo, si el tope de 6 se mantiene con 8 jugadores y si 3 + 2 se mantiene.
4. Confirmar el tiempo por turno con partidas de personas (cuando el cliente nuevo esté listo).

## Segunda medición (100 partidas por configuración, bot con colocación asistida)

Con `node simulador/calibracion.js 100 <meta> 3 4 4` (y 60 partidas con 2 y 8 jugadores). Ahora el simulador también dice **por qué** un jugador se queda sin hacer nada y **cuántos puntos tiene el que va primero en cada ronda**.

### Duración (ciudad 3 mineral + 2 trigo)
| Configuración | Rondas (promedio) | Turnos de la partida |
|---|---|---|
| 4 jugadores, meta 8 | 14,8 | 55 |
| 4 jugadores, meta 10 | 19,5 | 74 |
| 4 jugadores, meta 12 | 22,8 | 87 |
| 2 jugadores, meta 10 | 30,5 (p90 48; 1 de 60 no terminó) | 59 |
| 8 jugadores, meta 10 | 11,4 | 83 |

### Dónde se traban las partidas: la curva de puntos
Puntos del que va primero, con 4 jugadores y meta 10:

| Ronda | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 |
|---|---|---|---|---|---|---|---|---|
| Puntos | 2,9 | 4,2 | 5,6 | 7,1 | 8,0 | 8,4 | 8,8 | 9,3 |

La partida avanza bien hasta los 7 u 8 puntos (unos 0,9 puntos por ronda) y **después se arrastra**: de 8 a 10 puntos pasan 8 rondas o más. Con meta 8 el arrastre casi no se nota (se llega en 15 rondas); con 12 se alarga hasta casi las 23 rondas. **El final se traba a partir de los 7 u 8 puntos.**

### Por qué no se hace nada en un turno (4 jugadores)
- **87 %: falta algún recurso** (92 % con meta 8). El que más falta para un pueblo es el **ladrillo**, y después la madera (con 100 partidas: ladrillo 2498, madera 2001, trigo 1860, lana 1630).
- 10 %: tiene lo que cuesta pero **no hay lugar** para ponerlo (sube a 17 % con 8 jugadores, porque la isla se llena).
- 3 %: no tiene tarjetas.
- En total, **el 60 % de los turnos no construye ni entrega nada** con 4 jugadores (72 % con 2; 37 % con 8).

### Mano y descartes
Con 8 jugadores la mano máxima al empezar el turno es 17 (p90 22) y se descartan unas 4 tarjetas por turno: gran parte de lo que se cobra se tira.

### Lectura (a decidir con Dante)
1. **La meta de 8 o 10 puntos:** hoy el tramo final (7 a 10 puntos) es el más lento. Con meta 8 la partida termina antes del arrastre. Si se quiere mantener 10, hay que arreglar la economía del final.
2. **El problema de fondo es el reparto**, y en especial el **ladrillo y la madera**, que piden camino y pueblo. La isla de 19 hexágonos tiene solo 3 colinas (ladrillo).
3. Palancas posibles (todas se pueden medir con el simulador): más colinas y bosques en la isla; que el camino cueste menos; pedidos con «3 tarjetas cualesquiera»; dar más lugares de expansión; un tope de mano que crezca con la cantidad de jugadores.

## Variantes medidas (4 jugadores, meta 10, 100 partidas; 2 y 8 jugadores con 40 a 60)

`node simulador/calibracion.js 100 10 3 4 4 <variante>` (se suman con `+`). Ninguna está activada por omisión.

| Variante | Rondas | Turnos sin hacer nada | Puntos del primero a la ronda 12 | Notas |
|---|---|---|---|---|
| Base | 19,5 | 60 % | 7,1 | |
| `colinas` (4 colinas en la isla de 19) | 19,0 | 59 % | 7,0 | casi no cambia |
| `camino` (el camino cuesta solo 1 madera) | 16,7 | 49 % | 7,7 | ahora el cuello de botella pasa a ser la madera |
| `cualquiera` (pedido de 3 tarjetas cualesquiera) | 18,3 | 57 % | 7,4 | da una salida a quien está trabado |
| `mano` (el tope sube 1 por jugador desde el quinto) | = base con 4 | = base con 4 | = base | con 8 jugadores: 11,4 → 8,8 rondas y los descartes bajan de 7 a 3 por jugador |
| `camino+cualquiera+colinas` | 15,9 | 46 % | 7,8 | con 2 jugadores: 30,5 → 23,2 rondas y ninguna partida trabada (antes 1 de 60) |

**La partida de 2 que no terminó (semilla 1590):** cada jugador cobraba 4 de los 5 recursos, uno sin colinas (ladrillo) y el otro sin bosque (madera); los dos habían puesto sus 3 caballeros y nunca más pudieron construir un camino, así que ninguno pudo ampliarse. Es el **bloqueo mutuo de un mundo sin intercambio**; la variante con el pedido de «3 cualesquiera» da una salida (puntos sin depender de un recurso) y es la que lo evita.

**Lectura:** el camino de solo madera y el pedido de cualesquiera son las dos palancas que más ayudan; más colinas casi no cambia nada. El tope de la mano por jugadores solo importa con mesas grandes.
