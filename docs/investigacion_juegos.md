# Investigación: juegos de mesa para tomar ideas

Hecha el 9 de noviembre de 2026, al dejar el Rulepoly (ruleta + Monopoly) por no encontrar la mecánica que lo destrabe. Se buscaron juegos de **1 a 8 jugadores** (o de 1 a 4 que se puedan adaptar) con azar **predecible** (un mazo, una bolsa o dados, de modo que el juego pueda mostrar el porcentaje, como el 13 Jack y el Diez mil).

**Aviso:** las búsquedas en la web devolvieron casi solo tiendas y listas poco fiables. La lista sale sobre todo de memoria, así que **las cantidades de jugadores hay que confirmarlas en BoardGameGeek** antes de apoyarse en ellas.

## Criterios (de los `principios_diseno.md` y de Dante)
- Pocas decisiones, con consecuencias claras. Riesgo visible, con porcentaje.
- **Solo igual de jugable y divertido que con amigos, sin necesidad de bots** (regla para todos los juegos).
- Cada jugador juega su turno y los demás lo miran; nadie queda afuera.
- Hasta 8 jugadores.

## Los 20 juegos

**Dados**
1. **Generala / Yahtzee** (1 a muchos): guardas dados, vuelves a tirar hasta 3 veces y anotas una figura. Probabilidades exactas.
2. **Catan: The Dice Game** (1 a 4): 6 dados con recursos, hasta 3 tiradas guardando dados, y con el resultado construyes en tu planilla. Solo funciona bien. **Es la base elegida** (ver `catan_dados.md`).
3. **That's Pretty Clever** (1 a 4): dados que se anotan en una planilla con combinaciones.
4. **Qwixx** (2 a 5): todos usan la misma tirada y tachan números en su hoja.
5. **King of Tokyo** (2 a 6): dados de «tirar de nuevo» con combate.
6. **Dice Miner** (1 a 4): elegir dados, juntar y arriesgarse.

**Cartas**
7. **Skyjo** (2 a 8): cartas boca abajo y puntos bajos; el porcentaje se puede calcular.
8. **Diamant / Incan Gold** (3 a 8): explorar una cueva; seguir o volver con el botín.
9. **Port Royal** (2 a 5): descubrir cartas hasta que se repite un peligro.
10. **Sushi Go! Party** (2 a 8): elegir una carta y pasar el resto.
11. **7 Wonders** (2 a 7, con modo solo): armar tu civilización eligiendo cartas.

**Todos resuelven el mismo azar (roll & write)**
12. **Take It Easy** (1 a muchos): colocas fichas numeradas en tu tablero.
13. **Welcome To…** (1 a 100): construyes tu barrio con cartas.
14. **Cartographers** (1 a 100): dibujas tu mapa con formas que salen al azar.
15. **Railroad Ink** (1 a 6): dados que forman redes de caminos.
16. **Tiny Towns** (1 a 6): construyes con recursos que se anuncian.

**Bolsa, motor y colocación**
17. **Quacks of Quedlinburg** (2 a 4, 6 con expansión): sacas fichas de una bolsa sin pasarte y mejoras la bolsa.
18. **Sagrada** (1 a 4): eliges dados para armar un vitral con reglas.
19. **Machi Koro** (2 a 5): dados que activan edificios, con motor.
20. **Catan** (3 a 4): mapa con números, recursos y construcción.

## Lo que se aprendió
- Los juegos de **«todos resuelven el mismo azar»** (12 a 16) son los que mejor cumplen solo = acompañado y aceptan 8 jugadores sin cambios. A cambio, tienen poca interacción.
- Los de **cartas con riesgo** (7 a 9) comparten la tensión del Diez mil, pero se parecen demasiado a lo que ya hay.
- **Catan** aporta tres cosas que le faltaban al Rulepoly: el porcentaje de cada número está a la vista, construir es tener «casillas con dueño» y hay carreras por logros (camino más largo, ejército). Lo que lo complica es el comercio entre jugadores, las cartas de desarrollo y el ladrón.
- **Camino elegido:** partir de **Catan: The Dice Game** (dados que se guardan y se vuelven a tirar + una planilla que se va construyendo), ampliado a 8 jugadores. Diseño en `catan_dados.md`.

## Intentos descartados antes (Rulepoly)
Ver `rulepoly.md`. Resumen de por qué no cerró: se parecía demasiado al Diez mil (pedir o plantarse), tenía demasiados sistemas para una sola decisión y no terminaba de definirse el modo solo. Se probaron variantes con gajos de tamaño distinto, bola común, UNO con ruleta y otros cruces; ninguna convenció.

## Fuentes consultadas
- [Catan: The Dice Game](https://zatu.com/product/catan-dice-game-clamshell/)
- [Dice Miner](https://atlas-games.com/product_tables/AG1480)
- [Fill or Bust](https://jlericson.netlify.app/2022/02/15/fill_or_bust)
