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
