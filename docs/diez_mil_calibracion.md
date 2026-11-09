# Simulación del diez mil

Jugador automático con umbrales para plantarse; 2000 partidas por prueba, en solitario (una persona sola contra la meta de 10.000, entrando con 500 y llegando justo).

## 1. Línea de base: 5 dados comunes
- Turnos para llegar a 10.000: media 35.4, mediana 35, p10 27, p90 45, p99 54, máximo 68.
- Turnos quemados: 38.6 %. Partidas que terminan: 100.0 %.
- Fichas que se ganan por partida (economía: 4 por tirada superada, 20 de consuelo, 3 % de lo anotado): 829.1.

## 2. Cuánto pesa llegar justo a 10.000
- Turnos hasta llegar a 9.000: media 29.4, mediana 29, p10 21, p90 38, p99 47, máximo 56.
- Turnos hasta llegar justo a 10.000: media 35.4, mediana 35, p10 27, p90 45, p99 54, máximo 68.
- El tramo final (de 9.000 a justo 10.000) agrega en promedio 6.1 turnos (17.1 % de la partida).

## 3. Cuánto vale cada dado especial
Se reemplaza uno (o dos) de los 5 dados comunes y se mide cuántos turnos se ahorra en promedio respecto de los 5 comunes (35.4).

| Dado | Con 1 dado: turnos | Ahorro | Con 2 dados: turnos | Ahorro |
|---|---|---|---|---|
| Dado cargado | 30.7 | 4.8 | 25.3 | 10.1 |
| Dado de oro | 23.6 | 11.8 | 21.2 | 14.3 |
| Dado comodín | 24.2 | 11.3 | 11.6 | 23.9 |
| Dado salvavidas | 29.6 | 5.9 | 28.0 | 7.4 |
| Dado espejo | 31.3 | 4.2 | 28.9 | 6.6 |
| Dado pegajoso | 34.2 | 1.3 | 28.9 | 6.5 |
| Dado explosivo | 31.4 | 4.0 | 31.9 | 3.5 |
| Sexto dado (6 dados comunes) | 21.7 | 13.8 | - | - |
| (referencia) cargado + oro + comodín + espejo + salvavidas | 13.7 | 21.7 | - | - |

## 4. Precios propuestos y cuánto se compra por partida
Los dados cuestan según cuánto ahorran (tabla anterior): los de poco efecto, 50 a 110 fichas; los que cambian el juego (comodín, oro y sexto dado), 200 a 220. Solo se puede tener un dado de cada tipo especial.

| Dado | Ahorra (turnos) | Precio |
|---|---|---|
| Dado pegajoso | 1.3 | 50 |
| Dado espejo | 4.2 | 70 |
| Dado explosivo | 4.0 | 70 |
| Dado cargado | 4.8 | 90 |
| Dado salvavidas | 5.9 | 110 |
| Dado comodín | 11.3 | 200 |
| Dado de oro | 11.8 | 200 |
| Sexto dado | 13.8 | 220 |

Con la economía de prueba (4 por tirada superada, 20 de consuelo, 3 % de lo anotado) y un jugador **voraz** (compra lo mejor que puede pagar cada 5 turnos):
- Turnos para llegar a 10.000: media 25.4, mediana 25, p10 20, p90 31, p99 36, máximo 43.
- Ahorro frente a no comprar nada: 10.0 turnos (28.2 %).
- Compras por partida: 4.4. Fichas ganadas por partida: 642.7.
- Qué se compra (por partida): salvavidas 0.8, cargado 0.8, espejo 0.7, oro 0.5, sexto 0.5, explosivo 0.5, comodin 0.3, pegajoso 0.3.

Un jugador **ahorrador** (solo compra comodín, oro o sexto dado, y espera a juntar fichas):
- Turnos para llegar a 10.000: media 23.8, mediana 24, p10 19, p90 28, p99 32, máximo 35. Ahorro frente a no comprar: 11.6 turnos.
- Compras por partida: 2.3 (sexto 1.0, oro 1.0, comodin 0.3).

## 5. Cuántas fichas dar
Se prueban distintas economías con los mismos precios y la misma tienda (cada 5 turnos).

| Por tirada | Consuelo | % de lo anotado | Fichas por partida | Compras | Turnos (media) | Ahorro |
|---|---|---|---|---|---|---|
| 1 | 5 | 1 % | 215.5 | 2.4 | 32.5 | 3.0 |
| 2 | 10 | 2 % | 411.4 | 4.1 | 29.9 | 5.5 |
| 3 | 15 | 2 % | 499.7 | 4.4 | 28.6 | 6.9 |
| 4 | 20 | 3 % | 643.5 | 4.4 | 25.4 | 10.0 |
| 6 | 30 | 4 % | 818.1 | 3.8 | 21.8 | 13.6 |

## 6. Escalera de metas: turnos por etapa
Cada etapa sube la meta (10.000, 15.000, 20.000...) conservando los dados. Referencia: turnos que necesita un jugador con la tienda para llegar a 10.000 y a una meta mayor.
- Para 10.000 (con tienda): media 25.4, mediana 25, p10 20, p90 31, p99 36, máximo 43.
- En la escalera la tienda sigue cada 5 turnos y los dados se conservan; el límite de turnos por etapa se puede fijar cerca del percentil 75 de la etapa anterior más un margen.

## 7. Duración estimada
Un turno típico tiene unas 2.6 tiradas y dura entre 20 y 40 segundos con animaciones. Una partida de 25.4 turnos propios dura entre 8 y 17 minutos en solitario.

## Recomendación (lo que usa el juego)
- **Reglas del final:** llegar justo a 10.000 agrega unos 6 turnos (alrededor del 18 % de la partida): se puede dejar así.
- **Un dado de cada tipo especial** como máximo: con dos comodines o dos de oro el ahorro se dispara (24 y 14 turnos) y el juego se rompe.
- **Comodín:** el conjunto que completa vale la mitad. Con valor completo ahorraba 20 turnos con un solo dado (más que cualquier otro); a la mitad queda a la par del dado de oro y del sexto dado.
- **Precios:** dados de poco efecto 50 a 110 fichas (pegajoso 50, espejo 70, explosivo 70, cargado 90, salvavidas 110) y los tres grandes (comodín, oro, sexto dado) 200 a 220.
- **Economía:** 4 fichas por tirada superada, 20 de consuelo al quemarte y 3 % de lo anotado: unas 650 fichas por partida, con tienda cada 5 turnos, alcanza para 4 o 5 compras y ahorra entre 10 y 12 turnos (de 36 a 24 o 26).
- **Escalera de metas:** el límite fijo de 40 turnos por etapa alcanza para la primera (media 25 con tienda, máximo 42) y se va volviendo justo en las etapas siguientes: así la corrida termina sola cuando la meta crece más que tus dados.

