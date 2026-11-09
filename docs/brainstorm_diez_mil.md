# Diez mil: brainstorming

Estado: **idea para conversar, nada programado.** Todo lo que está marcado con `?` es una duda abierta; los números son puntos de partida para ajustar probando (con un simulador), no valores finales.

## Decisiones tomadas (con Dante)

**Reglas**
- Hay que sacar **500 puntos en un turno para «entrar»** la primera vez que anotas.
- **Hay que llegar justo a 10.000.** Si un turno te pasaría de 10.000, no anotas ese turno. El primero que llega justo gana al instante (no hay último turno).
- Puntúan: 1 (100), 5 (50), tríos (tres 1 = 1000; los demás, el número por 100), **cuatro iguales** (el doble del trío), **cinco iguales** (premio grande) y **escaleras** (1-2-3-4-5 = 500, 2-3-4-5-6 = 750).
- Si todos los dados puntúan, se vuelve a tirar con los 5 (dados calientes).

**Dados trampa:** entran todos los del catálogo: cargado, de oro, comodín, salvavidas, espejo, pegajoso, explosivo y sexto dado; y la tienda también vende el **grabado** de caras.

**Economía (puntos y fichas separados):** fichas **por riesgo, con un poco de lo anotado**: cada tirada que superas suma fichas, al quemarte hay un consuelo fijo, y una parte pequeña viene de lo que anotas. Los puntos solo cuentan para la carrera. La tienda se abre **cada 5 turnos propios**.

**Solitario:** **Carrera** (llegar a 10.000 en la menor cantidad de turnos, con récord) y **Escalera de metas** (10.000, luego más, conservando tus dados). En la escalera hay un **límite de turnos por etapa**: si no llegas, la corrida termina y el puntaje es la etapa alcanzada.

**Con amigos:** por turnos. **Tomar los dados** del que se quemó es una opción que se elige al crear la sala. La **interacción hostil** entre jugadores existe y se puede desactivar al crear la sala (como los objetos contra otros).

**Pendientes que decido yo salvo que digas otra cosa:** tiempo por tirada en multijugador (20 s), máximo de 8 jugadores, números exactos de la economía (se calibran con un simulador) y cuántos turnos por etapa en la escalera.

---

## 1. Qué es el diez mil (como lo entiendo)

Un juego de dados de «seguir tirando o plantarse».

- Se juega con **5 dados**. En tu turno tiras los 5.
- **Puntúan** algunos dados: cada **1 vale 100**, cada **5 vale 50**, y los **tríos** valen más (tres 1 = 1000; tres 2 = 200, tres 3 = 300, y así). `?` Cuatro y cinco iguales, escalera: qué valen.
- Separas los dados que puntúan y **vuelves a tirar los que quedaron**, o te **plantas** y anotas lo acumulado en el turno.
- Si en una tirada **ningún dado puntúa**, pierdes todo lo acumulado en ese turno (te «quemas»).
- Si **todos** los dados puntúan, vuelves a tirar los 5 con lo acumulado (dados calientes).
- Gana el primero en llegar a **10.000 puntos**.

Dudas de reglas para fijar juntos (cada mesa lo juega distinto):
1. `?` ¿Hace falta un mínimo (por ejemplo 500) para «entrar» la primera vez?
2. `?` ¿Hay que llegar justo a 10.000 o vale pasarse?
3. `?` Cuando alguien llega a 10.000, ¿los demás tienen un último turno?
4. `?` ¿Se puede «tomar los dados» del que se quemó y seguir desde ahí? (me gustaría para multijugador).

## 2. La idea de los «dados trampa»

Hoy, en el diez mil real, todos los dados son iguales y el juego es puro azar más decisión. La idea es que **tus 5 dados no sean iguales entre sí ni a los de los demás**: tienes una **bolsa de dados especiales** y los vas cambiando durante la partida. Así tu decisión de plantarte depende de qué dados tienes.

Cómo se arma: tienes **5 ranuras**. Empiezas con 5 dados normales. En la tienda reemplazas uno por un dado especial (el normal se va), o lo grabas.

### Catálogo inicial (borrador)

| Dado                   | Qué hace                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| **Cargado**            | Sale 1 o 5 más seguido (por ejemplo, caras 1, 1, 5, 5, y dos comunes). |
| **De oro**             | Si puntúa, vale el doble.                                              |
| **Comodín**            | Cuenta como la cara que más te convenga (para completar un trío).      |
| **Salvavidas**         | Si te quemarías, este dado cuenta como un 5 (una vez por turno).       |
| **Espejo**             | Después de tirar, puedes voltearlo a su cara opuesta (1↔6, 2↔5, 3↔4).  |
| **Pegajoso**           | No se vuelve a tirar solo: queda en su cara hasta que lo sueltes.      |
| **Explosivo**          | Si sale 1 vale +500, pero si sale 2 te quemas aunque otros puntúen.    |
| **Sexto dado** (raro)  | Ocupa una ranura extra: tiras con 6 dados.                             |
| **Grabado** (servicio) | Cambias una cara de un dado (un 3 pasa a ser un 5).                    |

`?` ¿Algún dado te parece que rompe demasiado el juego o que no aporta? Lo ajustamos.

### Ventana de 5 segundos
Cuando una tirada te quema, tienes unos segundos para usar el **Espejo** o el **Salvavidas** antes de perder el turno. Es el mismo respiro que ya tiene el Límite 24.

## 3. Economía: ¿de dónde salen las fichas y en qué se gastan?

Tengo que separar dos cosas:
- **Puntos** = la carrera hacia 10.000. Eso decide quién gana.
- **Fichas** = la moneda de la tienda. No cuentan para ganar.

Mantener las dos separadas evita que comprar dados te haga *retroceder* en la carrera. Tres opciones para ganar fichas:

| Opción | Cómo funciona | A favor | En contra |
|---|---|---|---|
| **A. Por lo anotado** | Cada anotación da fichas = puntos / 10. | Simple y se entiende. | Premia plantarse temprano, no el riesgo. |
| **B. Por riesgo** | Cada tirada que sobrevives suma fichas, y si te quemas recibes un consuelo. | Premia ir a fondo; el consuelo evita la espiral. | Más difícil de explicar. |
| **C. Pagar con puntos** | La tienda cobra puntos de tu carrera. | Dilema muy fuerte: ¿avanzo o mejoro? | Frustrante si comprar te deja atrás; riesgo de bucle. |

**Mi recomendación: B con un poco de A.** Fichas por cada tirada superada (el riesgo da dinero), un consuelo fijo al quemarte, y una pequeña parte de lo anotado. Se forma un ciclo: arriesgas, ganas fichas, compras mejores dados, y arriesgas más cómodo.

Orden de magnitud para empezar (a calibrar): 10.000 puntos son unos 25–35 turnos; con unas 8–12 fichas por turno, en una partida ganas ~300 fichas, suficientes para 3 o 4 compras. Precios en esa escala: dado común 40–80, de oro 120, comodín 150, sexto dado 250, grabado 60.

`?` ¿Tienda cada 3 turnos? Con turnos tan largos tal vez conviene **cada 4 o 5 turnos propios**.

## 4. En solitario

Opciones (se pueden combinar):
- **Carrera:** llegar a 10.000 en la menor cantidad de turnos. Hay récord personal.
- **Semilla del día:** todos los jugadores del mismo día reciben la misma secuencia de dados y comparan sus turnos. Es la forma de jugar «con amigos» sin estar conectados al mismo tiempo.
- **Fantasma:** juegas contra la partida guardada de tu mejor récord.
- `?` **Escalera de metas:** 10.000, luego 15.000, etc., conservando tus dados entre etapas (más roguelike).

## 5. Con amigos

- **Por turnos** (2 a 8 jugadores): temporizador por tirada (por ejemplo 20 s) para que el turno no se eternice; se ve cada tirada del que juega, con animación.
- **Tienda personal** (ofertas propias), con tiempo limitado entre rondas.
- **Reglas de interacción nativas del diez mil:** tomar los dados del que se quemó.
- **Cierre:** al llegar alguien a 10.000, los demás juegan un último turno.
- `?` **Contra otros jugadores (opcional, desactivable):** por ejemplo un dado pegajoso que le «pegas» al dado de otro, o un «robo» de una parte de lo acumulado en su turno. ¿Lo queremos?
- Reacciones, ranking y compartir imagen: ya existen.

## 6. Qué se reutiliza del código común

Salas con código, mesa en tiempo real, ranking final y compartir, reacciones, ayuda con láminas, ventana de configuración, tienda, avisos, estadísticas en el dispositivo, instalación como app. Cambian las reglas, el catálogo (dados en vez de habilidades y objetos) y la mesa (una zona de dados).

## 7. Qué quiero decidir con vos

1. Las reglas exactas (sección 1).
2. La economía (sección 3): ¿B con un poco de A?
3. El catálogo de dados (sección 2): qué sumar, qué sacar.
4. Qué modo solitario (sección 4).
5. Si en multijugador hay interacción hostil.
