# Fundación: estadísticas con bots

> **Nota:** medición de la versión 1 (con dados de recursos); queda como historia. La calibración de la versión 2 está en `fundacion_v2_calibracion.md`.


80 partidas por cantidad de jugadores, meta 10 puntos, reserva de dados 2, bots que juegan al máximo. Los minutos estiman 30 s por turno de una persona.

## Duración

| Jugadores | Terminan | Rondas (prom · mediana · p90 · máx) | Turnos por jugador | Minutos estimados (prom · p90) |
|---|---|---|---|---|
| 1 | 80/80 | 19.0 · 17 · 28 · 45 | 18.0 | 9.5 · 14.0 |
| 2 | 80/80 | 23.1 · 23 · 31 · 39 | 22.1 | 23.1 · 31.0 |
| 3 | 80/80 | 24.4 · 25 · 32 · 38 | 23.4 | 36.6 · 48.0 |
| 4 | 80/80 | 24.8 · 24 · 31 · 37 | 23.8 | 49.6 · 62.0 |
| 5 | 80/80 | 24.6 · 25 · 30 · 34 | 23.6 | 61.4 · 75.0 |
| 6 | 80/80 | 25.4 · 25 · 32 · 42 | 24.4 | 76.2 · 96.0 |
| 7 | 80/80 | 26.3 · 26 · 33 · 44 | 25.3 | 92.0 · 115.5 |
| 8 | 80/80 | 27.0 · 27 · 33 · 36 | 26.0 | 108.0 · 132.0 |

## Dónde se traba: turnos en los que no se construyó nada, según los puntos del jugador

| Jugadores | 0-3 pts | 4-6 pts | 7-9 pts | 10+ pts | Racha máx. sin construir (prom · p90 · máx) | Partidas con alguna racha de 6 o más |
|---|---|---|---|---|---|---|
| 1 | 5 % de 310 | 9 % de 330 | 30 % de 797 | — | 2.0 · 5 · 13 | 8 % |
| 2 | 4 % de 710 | 21 % de 1191 | 32 % de 1639 | — | 2.5 · 5 · 14 | 11 % |
| 3 | 6 % de 1234 | 18 % de 2352 | 35 % de 2024 | — | 2.4 · 5 · 12 | 21 % |
| 4 | 8 % de 1940 | 21 % de 3581 | 36 % de 2091 | — | 2.5 · 5 · 13 | 14 % |
| 5 | 6 % de 2370 | 22 % de 4328 | 34 % de 2732 | — | 2.4 · 4 · 9 | 20 % |
| 6 | 6 % de 3144 | 23 % de 5564 | 40 % de 3004 | — | 2.6 · 5 · 18 | 21 % |
| 7 | 8 % de 3922 | 24 % de 6993 | 43 % de 3239 | — | 3.0 · 6 · 18 | 43 % |
| 8 | 10 % de 4821 | 27 % de 8312 | 43 % de 3499 | — | 3.1 · 6 · 17 | 43 % |

## Por qué no se construye (turnos vacíos con 7 o más puntos): qué se podía construir en ese turno

| Jugadores | Solo ciudad | Ciudad y caballero | Nada | Otra cosa |
|---|---|---|---|---|
| 1 | 25 % | 0 % | 0 % | 75 % |   (236 turnos)
| 2 | 29 % | 0 % | 0 % | 71 % |   (531 turnos)
| 3 | 34 % | 0 % | 2 % | 64 % |   (699 turnos)
| 4 | 41 % | 0 % | 2 % | 57 % |   (757 turnos)
| 5 | 27 % | 0 % | 1 % | 72 % |   (925 turnos)
| 6 | 42 % | 0 % | 4 % | 54 % |   (1198 turnos)
| 7 | 43 % | 0 % | 9 % | 48 % |   (1377 turnos)
| 8 | 48 % | 0 % | 8 % | 43 % |   (1512 turnos)

## Qué se podía construir en los turnos vacíos con 7 o más puntos (todas las cantidades juntas)

| Se podía construir | Turnos vacíos |
|---|---|
| camino + ciudad | 40 % |
| ciudad | 39 % |
| camino + pueblo + ciudad | 11 % |
| nada | 5 % |
| pueblo + ciudad | 3 % |
| camino + ciudad + caballero | 1 % |
| camino | 1 % |
| camino + pueblo | 0 % |

## Turnos vacíos por tercio de la partida

| Jugadores | 1.er tercio | 2.º tercio | 3.er tercio |
|---|---|---|---|
| 1 | 7 % | 21 % | 34 % |
| 2 | 8 % | 24 % | 39 % |
| 3 | 7 % | 22 % | 37 % |
| 4 | 7 % | 22 % | 40 % |
| 5 | 8 % | 23 % | 37 % |
| 6 | 7 % | 24 % | 40 % |
| 7 | 8 % | 23 % | 45 % |
| 8 | 8 % | 24 % | 48 % |
