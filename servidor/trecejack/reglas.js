'use strict';
// Las reglas del 13 Jack: un mazo propio de 13 cartas (As, 2 a 10, J, Q y K) que se juega de a manos de 21, las cartas especiales y cómo se puntúa una mano.
// Todo son funciones puras: la mesa (mesa_13.js) las usa y las pruebas las revisan solas.

const RANGOS = 13;            // el mazo tiene una carta de cada rango: 1 (As), 2 a 10, 11 (J), 12 (Q) y 13 (K)
const MANOS_POR_MAZO = 4;
const BONO_21 = 30;           // lo que vale un 21 exacto (en vez de 21)
const PORCENTAJE_MULTIPLICADOR = 0.25;
const PORCENTAJE_ORO = 1.5;
const BONO_MAZO_VACIO = { 0: 25, 1: 15, 2: 6 };   // al terminar el mazo: según las cartas que sobran (ninguna +25, una +15, dos +6)   // la carta de oro: la mano vale 1,5 veces

// Las cartas especiales reemplazan a una de las 13 cartas (la carta sigue valiendo lo de su rango, y suma su efecto). Una de cada tipo por jugador. Los precios salen del simulador (simulador/trece_jack.js).
const ESPECIALES = {
  oro: { nombre: 'Carta de oro', precio: 30, desc: 'La mano que la incluye vale un 50 % más.' },
  comodin: { nombre: 'Comodín', precio: 40, desc: 'Vale lo que te convenga, del 1 al 11.' },
  salvavidas: { nombre: 'Salvavidas', precio: 36, desc: 'Si te pasarías, cuenta como 1.' },
  pegajosa: { nombre: 'Pegajosa', precio: 7, desc: 'Después de usarla vuelve a tu mazo.' },
  doble: { nombre: 'Doble', precio: 18, desc: 'Vale su valor o el doble, el que te convenga.' },
  vidente: { nombre: 'Vidente', precio: 12, desc: 'Mientras la tienes en la mano, ves la próxima carta de tu mazo.' },
  espejo: { nombre: 'Espejo', precio: 30, desc: 'Vale su valor o el opuesto (11 menos su valor), el que te convenga.' },
  fantasma: { nombre: 'Fantasma', precio: 36, desc: 'Si te pasarías, se descarta y no suma.' },
  multiplicador: { nombre: 'Multiplicador', precio: 18, desc: 'Suma un 25 % extra a lo que vale la mano.' },
  ancla: { nombre: 'Ancla', precio: 28, desc: 'Vale 0, pero cuenta para los patrones (palo, escalera, cinco cartas).' },
  camaleon: { nombre: 'Camaleón', precio: 30, desc: 'Para los patrones toma el palo y el número que más te convengan.' },
  borrador: { nombre: 'Borrador', precio: 36, desc: 'Si te pasarías, borra la carta más alta de tu mano.' },
  diamante: { nombre: 'Diamante', precio: 22, desc: 'Vale 10. Si te plantas con ella, +12 puntos; si te pasas, -5.' },
  cofre: { nombre: 'Cofre', precio: 30, desc: 'Vale 0. Si no te pasas, la mano suma +6 puntos.' },
  racha: { nombre: 'Racha', precio: 16, desc: 'Si no te pasas, suma +2 puntos por cada carta de tu mano.' },
  adelanto: { nombre: 'Adelanto', precio: 20, desc: 'La mano siguiente empieza con una carta ya puesta.' },
  mecenas: { nombre: 'Mecenas', precio: 26, desc: 'Gana +4 fichas cada vez que sale en una mano.' },
  ruleta: { nombre: 'Ruleta', precio: 12, desc: 'Al salir, su valor se sortea del 1 al 11.' },
  retroceso: { nombre: 'Retroceso', precio: 32, desc: 'Si te pasas, la última carta vuelve al mazo y te plantas con lo anterior.' },
};
const ORDEN_ESPECIALES = Object.keys(ESPECIALES);

const valorBase = r => (r === 1 ? 1 : Math.min(r, 10));   // (el As vale 1, y 11 si conviene)

// Los valores que puede tomar cada "unidad" de una carta (la doble cuenta por dos unidades).
function unidades(carta) {
  const b = valorBase(carta.r);
  if (carta.e === 'ancla' || carta.e === 'cofre') return [[0]];   // (no suman nada)
  if (carta.e === 'diamante') return [[10]];
  if (carta.e === 'ruleta') return [[carta.v || 6]];   // (el valor sorteado; mientras sigue en el mazo se cuenta como 6)
  let ops = carta.r === 1 ? [1, 11] : [b];
  if (carta.e === 'comodin') ops = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  else if (carta.e === 'espejo') ops = Array.from(new Set(ops.concat(ops.map(x => 11 - x))));
  else if (carta.e === 'salvavidas') ops = Array.from(new Set(ops.concat([1])));
  ops = ops.filter(x => x >= 1);
  if (carta.e === 'doble') ops = Array.from(new Set(ops.concat(ops.map(x => x * 2))));
  return [ops];
}

// El mejor total de un grupo de cartas: el más alto que no pasa de 21 o, si todos pasan, el más bajo.
function totalDe(cartas) {
  let sumas = new Set([0]);
  for (const c of cartas) for (const ops of unidades(c)) {
    const nuevas = new Set();
    for (const s of sumas) for (const v of ops) nuevas.add(Math.min(s + v, 60));
    sumas = nuevas;
  }
  let mejor = -1, minimo = Infinity;
  for (const s of sumas) { if (s <= 21 && s > mejor) mejor = s; if (s < minimo) minimo = s; }
  return mejor >= 0 ? { total: mejor, pasado: false } : { total: minimo === Infinity ? 0 : minimo, pasado: true };
}

// Evalúa una mano: { total, pasado, fantasma, borrada } (el fantasma se descarta, o el borrador borra la carta más alta, si con eso no te pasas).
function evaluar(mano) {
  const r = totalDe(mano);
  if (!r.pasado) return { total: r.total, pasado: false, fantasma: false, borrada: false };
  if (mano.some(c => c.e === 'fantasma')) {
    const sin = totalDe(mano.filter(c => c.e !== 'fantasma'));
    if (!sin.pasado) return { total: sin.total, pasado: false, fantasma: true, borrada: false };
  }
  if (mano.some(c => c.e === 'borrador')) {
    const otras = mano.filter(c => c.e !== 'borrador');
    if (otras.length) {
      const bajo = c => Math.min(...unidades(c)[0]);
      const mayor = otras.reduce((m, c) => (bajo(c) > bajo(m) ? c : m), otras[0]);
      const sin = totalDe(mano.filter(c => c !== mayor));
      if (!sin.pasado) return { total: sin.total, pasado: false, fantasma: false, borrada: true };
    }
  }
  return { total: r.total, pasado: true, fantasma: false, borrada: false };
}

// Los palos de las cartas (los del juego: sol, cubo, hielo y bomba): las comunes tienen el de su rango; las especiales traen el suyo (`p`).
const palo = r => r % 4;
const paloDe = c => (c.p !== undefined && c.p !== null ? c.p : c.r % 4);
const NOMBRE_PALO = ['sol', 'cubo', 'hielo', 'bomba'];
const TABLA_PALO = { 2: 3, 3: 10, 4: 20, 5: 30, 6: 40 };
const TABLA_ESCALERA = { 3: 8, 4: 18, 5: 30 };

// Los patrones de una mano (solo si no te pasaste): cada uno suma puntos extra. Se miran los rangos y palos de las cartas (las especiales cuentan como la carta que reemplazan).
//  Palo: 2 o más del mismo palo · Escalera: 3 o más rangos seguidos · Pareja: el mismo número · Gemelas: dos cartas del mismo valor con otro número (10, J, Q, K) · Pares / Impares: todos los rangos pares o todos impares (3 o más cartas)
//  Blackjack: 21 con dos cartas · Charlie: 5 o más cartas sin pasarte
function patrones(mano, ev) {
  ev = ev || evaluar(mano);
  if (!mano.length || ev.pasado) return [];
  const i = mano.findIndex(c => c.e === 'camaleon');
  if (i < 0) return patronesDe(mano, ev);
  let mejor = [], suma = -1;   // el camaleón toma el número y el palo que más puntos den
  for (let r = 1; r <= RANGOS; r++) for (let p = 0; p < 4; p++) {
    const m2 = mano.slice(); m2[i] = { r, e: 'camaleon', p };
    const x = patronesDe(m2, ev), s = x.reduce((t, q) => t + q.puntos, 0);
    if (s > suma) { suma = s; mejor = x; }
  }
  return mejor;
}
function patronesDe(mano, ev) {
  const out = [];
  const ranks = mano.map(c => c.r);
  // palo
  const porPalo = {};
  for (const c of mano) porPalo[paloDe(c)] = (porPalo[paloDe(c)] || 0) + 1;
  let pp = 0, mayor = 0;
  for (const k of Object.keys(porPalo)) { const n = porPalo[k]; if (n >= 2) { pp += TABLA_PALO[Math.min(n, 6)]; mayor = Math.max(mayor, n); } }
  if (pp) out.push({ id: 'palo', nombre: mayor >= 4 ? 'Palo de ' + mayor : (mayor === 3 ? 'Trío de palo' : 'Pareja de palo'), puntos: pp });
  // escalera
  const orden = Array.from(new Set(ranks)).sort((a, b) => a - b);
  let racha = 1, mejor = 1;
  for (let i = 1; i < orden.length; i++) { racha = orden[i] === orden[i - 1] + 1 ? racha + 1 : 1; mejor = Math.max(mejor, racha); }
  if (mejor >= 3) out.push({ id: 'escalera', nombre: 'Escalera de ' + mejor, puntos: TABLA_ESCALERA[Math.min(mejor, 5)] });
  // pareja (el mismo número) y gemelas (el mismo valor con otro número: 10 y K, por ejemplo)
  const hayPareja = ranks.some((r, i) => ranks.indexOf(r) !== i);
  if (hayPareja) out.push({ id: 'pareja', nombre: 'Pareja', puntos: 10 });
  const hayGemelas = ranks.some((r, i) => ranks.some((q, k) => k !== i && q !== r && valorBase(q) === valorBase(r)));
  if (hayGemelas) out.push({ id: 'gemelas', nombre: 'Gemelas', puntos: 4 });
  // pares / impares
  if (ranks.length >= 3 && ranks.every(r => r % 2 === 0)) out.push({ id: 'pares', nombre: 'Todo pares', puntos: 8 });
  if (ranks.length >= 3 && ranks.every(r => r % 2 === 1)) out.push({ id: 'impares', nombre: 'Todo impares', puntos: 8 });
  // blackjack y charlie
  if (ranks.length === 2 && ev.total === 21) out.push({ id: 'blackjack', nombre: 'Blackjack', puntos: 10 });
  if (ranks.length >= 5) out.push({ id: 'charlie', nombre: ranks.length === 5 ? 'Cinco cartas' : 'Seis o más cartas', puntos: ranks.length === 5 ? 15 : 25 });
  return out;
}

// La tabla de patrones para la ayuda: un ejemplo de cada uno, con el nombre y los puntos que da de verdad (sale de `patrones`, así que nunca se desfasa).
const EJEMPLOS_PATRONES = [
  ['palo', [[1, 1], [5, 1]]], ['palo', [[2, 2], [6, 2], [10, 2]]], ['escalera', [[3, 3], [4, 0], [5, 1]]], ['pareja', [[7, 3], [7, 2]]], ['gemelas', [[10, 2], [13, 1]]],
  ['pares', [[2, 2], [4, 0], [6, 2]]], ['impares', [[3, 3], [5, 1], [7, 3]]], ['blackjack', [[1, 1], [12, 0]]], ['charlie', [[1, 1], [2, 2], [3, 3], [4, 0], [5, 1]]],
];
function tablaPatrones() {
  return EJEMPLOS_PATRONES.map(([id, cartas]) => {
    const mano = cartas.map(([r, p]) => ({ r, e: null, p })), x = patrones(mano).find(q => q.id === id);
    return { id, nombre: x.nombre, puntos: x.puntos, ejemplo: cartas.map(([r, p]) => ({ r, p })) };
  });
}

// Los puntos que vale una mano ya jugada: 0 si te pasaste; el total (30 si es 21 exacto) más los patrones; el multiplicador suma un 25 %; el oro la multiplica por 1,5.
function puntosDeMano(mano, ev) {
  ev = ev || evaluar(mano);
  if (!mano.length) return 0;
  if (ev.pasado) return mano.some(c => c.e === 'diamante') ? -5 : 0;   // (el diamante cobra caro pasarse)
  let p = (ev.total === 21 ? BONO_21 : ev.total) + patrones(mano, ev).reduce((t, x) => t + x.puntos, 0);
  if (mano.some(c => c.e === 'diamante')) p += 12;
  if (mano.some(c => c.e === 'cofre')) p += 6;
  if (mano.some(c => c.e === 'racha')) p += 2 * mano.length;
  if (mano.some(c => c.e === 'multiplicador')) p += Math.round(ev.total * PORCENTAJE_MULTIPLICADOR);
  if (mano.some(c => c.e === 'oro')) p = Math.round(p * PORCENTAJE_ORO);
  return p;
}

// Probabilidad (0 a 100) de no pasarte si pides: se conocen las cartas que quedan en el mazo (no su orden).
function probNoPasar(mano, restantes) {
  if (!restantes.length) return null;
  let bien = 0;
  for (const c of restantes) if (!evaluar(mano.concat([c])).pasado) bien++;
  return Math.round(bien / restantes.length * 100);
}

// El bot: ¿pide otra carta? Pide si lo que espera sumar al pedir supera lo que tiene ahora (con el vidente conoce la próxima carta). Es la misma regla que usa el simulador.
function botPide(mano, mazo) {
  if (!mazo.length) return false;
  if (!mano.length) return true;
  const ya = puntosDeMano(mano);
  let esperado;
  if (mano.some(c => c.e === 'vidente')) esperado = puntosDeMano(mano.concat([mazo[0]]));
  else { let suma = 0; for (const c of mazo) suma += puntosDeMano(mano.concat([c])); esperado = suma / mazo.length; }
  return esperado > ya;
}

// Las 13 casillas del mazo de alguien: al empezar, una carta de cada rango. Al comprar una especial, reemplaza una casilla (con su número y palo).
function baseInicial() {
  const base = [];
  for (let r = 1; r <= RANGOS; r++) base.push({ r, e: null, p: palo(r) });
  return base;
}
// Lo que cuesta una oferta de la tienda: el precio de la especial más un extra si su número es muy bueno (As y figuras).
const extraPorNumero = r => (r === 1 ? 6 : (valorBase(r) >= 10 ? 3 : (valorBase(r) >= 7 ? 1 : 0)));
function ofertaCarta(tipo, azar) {
  const r = 1 + Math.min(RANGOS - 1, Math.floor(azar() * RANGOS)), p = Math.min(3, Math.floor(azar() * 4));
  return { tipo, r, p, precio: ESPECIALES[tipo].precio + extraPorNumero(r) };
}
// Un mazo nuevo: las 13 casillas mezcladas (cada carta recuerda su casilla `i`).
function mazoNuevo(base, azar) {
  const mazo = (base || baseInicial()).map((c, i) => ({ r: c.r, e: c.e || null, p: paloDe(c), i }));
  for (let i = mazo.length - 1; i > 0; i--) { const k = Math.floor(azar() * (i + 1)); [mazo[i], mazo[k]] = [mazo[k], mazo[i]]; }
  return mazo;
}

module.exports = { tablaPatrones, baseInicial, ofertaCarta, extraPorNumero, paloDe, patrones, palo, NOMBRE_PALO, BONO_MAZO_VACIO, RANGOS, MANOS_POR_MAZO, BONO_21, PORCENTAJE_MULTIPLICADOR, ESPECIALES, ORDEN_ESPECIALES, valorBase, unidades, totalDe, evaluar, puntosDeMano, probNoPasar, botPide, mazoNuevo };
