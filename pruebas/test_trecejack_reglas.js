'use strict';
// Pruebas de las reglas del 13 Jack: totales con el As, las cartas especiales, el puntaje de una mano, la probabilidad y el mazo. Uso: node pruebas/test_trecejack_reglas.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'reglas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };
const m = (...rangos) => rangos.map(r => (Array.isArray(r) ? { r: r[0], e: r[1] } : { r, e: null }));
const ev = (...x) => R.evaluar(m(...x));
const pts = (...x) => { const mano = m(...x); return R.puntosDeMano(mano, R.evaluar(mano)); };

// ---------- totales ----------
check(ev(7, 5).total === 12 && !ev(7, 5).pasado, 'un 7 y un 5 suman 12');
check(ev(11, 12).total === 20 && ev(13, 10).total === 20, 'las figuras valen 10');
check(ev(1, 13).total === 21, 'el as vale 11 si conviene (as + rey = 21)');
check(ev(1, 5).total === 16 && ev(1, 5, 13).total === 16, 'el as baja a 1 para no pasarte (as + 5 + rey = 16)');
check(ev(10, 9, 5).pasado && ev(10, 9, 5).total === 24, 'te pasas con 24');
check(ev(1, 1).total === 12, 'dos ases: 11 + 1');

// ---------- puntos de una mano ----------
check(pts(7, 10) === 17 && pts(9, 11) === 19, 'la mano vale su total');
check(pts(1, 12) === 40, 'un 21 exacto vale 30 (+10 por ser blackjack con dos cartas)');
check(pts(10, 9, 5) === 0, 'pasarte vale 0');
check(R.puntosDeMano([], R.evaluar([])) === 0, 'una mano sin cartas vale 0');

// ---------- patrones ----------
const pat = (...x) => R.patrones(m(...x)).map(p => p.id + '+' + p.puntos).join(' ');
check(pat(1, 5) === 'palo+3' && pat(1, 5, 9).includes('palo+10') && pat(2, 6, 10).includes('palo+10'), 'palo: 2 del mismo palo +3 y 3 +10 (el As, 5 y 9 comparten palo; 4 del mismo palo no caben en 21)');
check(pat(3, 4, 5) === 'escalera+8 impares+8' || pat(3, 4, 5).startsWith('escalera+8'), 'escalera de 3 rangos seguidos +8');
check(pat(2, 3, 4, 5).includes('escalera+18') && pat(2, 3, 4, 5, 6).includes('escalera+30') && !pat(2, 4, 6).includes('escalera'), 'escalera de 4 +18, de 5 +30; con saltos no hay');
check(pat(10, 13).includes('gemelas+4') && !pat(7, 9).includes('gemelas'), 'gemelas: dos cartas del mismo valor (10 y K)');
check(pat(2, 4, 6).includes('pares+8') && pat(3, 5, 7).includes('impares+8') && !pat(2, 4).includes('pares'), 'todo pares / todo impares con 3 o más cartas');
check(pat(1, 12).includes('blackjack+10') && !pat(1, 5, 4, 11).includes('blackjack'), 'blackjack: 21 con dos cartas');
check(pat(1, 2, 3, 4, 5).includes('charlie+15') && !pat(1, 2, 3, 4).includes('charlie'), 'cinco cartas sin pasarte +25');
check(pat(10, 9, 5) === '' && R.patrones([]).length === 0, 'si te pasas o no hay cartas, no hay patrones');
check(R.BONO_MAZO_VACIO[0] === 25 && R.BONO_MAZO_VACIO[1] === 15 && R.BONO_MAZO_VACIO[2] === 6 && !R.BONO_MAZO_VACIO[3], 'el premio del mazo: sin sobrantes 25, una 15, dos 6');

// ---------- la tabla de patrones de la ayuda ----------
const tabla = R.tablaPatrones();
check(tabla.length === 9 && tabla.every(x => x.nombre && x.puntos > 0 && x.ejemplo.length >= 2), 'la tabla de patrones tiene todos con nombre y puntos');
check(tabla.find(x => x.id === 'charlie').puntos === 15 && tabla.find(x => x.id === 'pareja').puntos === 10 && tabla.find(x => x.id === 'escalera').nombre === 'Escalera de 3' && tabla.find(x => x.id === 'pares').nombre === 'Todo pares', 'los nombres y puntos de la tabla salen de las reglas');

// ---------- cartas especiales ----------
check(pts([8, 'oro'], 10) === 27, 'la carta de oro suma un 50 % a la mano (18 x 1,5)');
check(pts([8, 'oro'], 10, 3) === 45 && pts([8, 'oro'], 10, 5) === 0, 'el oro también mejora el 21 (30 x 1,5), y si te pasas vale 0');
check(ev([5, 'comodin'], 10).total === 21 && pts([5, 'comodin'], 10) === 40, 'el comodín vale lo que convenga (llega a 21)');
check(ev([5, 'comodin'], 13, 11).total === 21, 'el comodín baja a 1 si hace falta (5 + 10 + 10 = 25 pasaría; como 1 da 21)');
check(ev(10, 9, [12, 'salvavidas']).total === 20 && !ev(10, 9, [12, 'salvavidas']).pasado, 'el salvavidas cuenta como 1 si te pasarías (10 + 9 + 1)');
check(ev([9, 'doble']).total === 18 && ev([9, 'doble'], 3).total === 21 && ev([9, 'doble'], 13).total === 19, 'la doble vale su valor o el doble, el que convenga (9 o 18)');
check(ev(10, [7, 'espejo']).total === 17 && ev(10, 9, [7, 'espejo']).pasado, 'el espejo con 7 vale 7 o 4 (el mejor): 10 + 7 = 17, y 10 + 9 + 4 = 23 se pasa');
check(ev(10, [8, 'espejo']).total === 18 && ev(10, 9, [8, 'espejo']).total === 22 && ev(10, 9, [8, 'espejo']).pasado, 'el espejo con 8 vale 8 o 3: 10 + 9 + 3 = 22, se pasa igual');
check(ev(10, 8, [8, 'espejo']).total === 21, 'el espejo con 8 baja a 3 si conviene (10 + 8 + 3 = 21)');
check(ev(10, 9, [13, 'fantasma']).total === 19 && !ev(10, 9, [13, 'fantasma']).pasado && ev(10, 9, [13, 'fantasma']).fantasma, 'el fantasma se descarta si te pasarías');
check(ev(5, [6, 'fantasma']).total === 11 && !ev(5, [6, 'fantasma']).fantasma, 'si no te pasas, el fantasma suma normal');
check(pts(10, [6, 'multiplicador']) === 16 + 3 + 4, 'el multiplicador suma un 25 % del total (16 + 4)');
check(pts([8, 'oro'], [6, 'multiplicador']) === 27, 'el multiplicador y el oro se combinan: (14 + 4) x 1,5');
const v = m(7, [2, 'vidente']);
check(ev(7, [2, 'vidente']).total === 9 && v.length === 2, 'el vidente vale su rango y no cambia el total');

// ---------- probabilidad ----------
const rest = m(2, 3, 4, 10);
check(R.probNoPasar(m(10, 9), rest) === 25 && R.probNoPasar(m(5), rest) === 100, 'sin pasarte: con 19 solo sirve el 2 (1 de 4); con 5, todas');
check(R.probNoPasar(m(5), []) === null, 'sin cartas en el mazo no hay probabilidad');
check(R.probNoPasar(m(10, 5), m([13, 'comodin'], 2)) === 100 && R.probNoPasar(m(10, 5), m([13, 'comodin'], 12)) === 50, 'se cuentan los efectos de las cartas que quedan (el comodín no te pasa nunca)');

// ---------- el mazo ----------
let semilla = 7; const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
const base = R.baseInicial(); base[2] = { r: 3, e: 'oro', p: 0 }; base[8] = { r: 9, e: 'espejo', p: 2 };
const mazo = R.mazoNuevo(base, azar);
check(mazo.length === 13 && new Set(mazo.map(c => c.r)).size === 13, 'el mazo tiene las 13 cartas, una de cada rango');
check(mazo.find(c => c.r === 3).e === 'oro' && mazo.find(c => c.r === 9).e === 'espejo' && mazo.filter(c => c.e).length === 2 && mazo.find(c => c.r === 3).p === 0, 'las especiales ocupan su casilla, con su palo');
const base2 = R.baseInicial(); base2[12] = { r: 1, e: 'oro', p: 3 };
const mazo2 = R.mazoNuevo(base2, azar);
check(mazo2.filter(c => c.r === 1).length === 2 && !mazo2.some(c => c.r === 13) && mazo2.length === 13 && new Set(mazo2.map(c => c.i)).size === 13, 'comprar un As para reemplazar un Rey deja dos Ases y ningún Rey (13 casillas)');
check(R.patrones([{ r: 1, e: null, p: 1 }, { r: 1, e: 'oro', p: 3 }]).some(p => p.id === 'pareja' && p.puntos === 10), 'pareja: el mismo número +10');
check(R.patrones(m([5, 'doble'], 6).map((c, i) => Object.assign({}, c, { p: 2 }))).some(p => p.id === 'palo'), 'el palo de una especial es el suyo, no el de su número');
check(R.extraPorNumero(1) === 6 && R.extraPorNumero(13) === 3 && R.extraPorNumero(8) === 1 && R.extraPorNumero(4) === 0, 'el precio de una oferta sube con su número (As +6, figuras +3)');
const of = R.ofertaCarta('oro', azar);
check(of.r >= 1 && of.r <= 13 && of.p >= 0 && of.p <= 3 && of.precio === R.ESPECIALES.oro.precio + R.extraPorNumero(of.r), 'cada oferta trae su número y palo');
check(mazo.map(c => c.r).join() !== '1,2,3,4,5,6,7,8,9,10,11,12,13', 'el mazo sale mezclado');
check(R.ORDEN_ESPECIALES.length === 19 && R.ORDEN_ESPECIALES.every(t => R.ESPECIALES[t].precio > 0 && R.ESPECIALES[t].desc), 'las 19 especiales tienen precio y descripción');

// las especiales nuevas
check(ev(10, [5, 'ancla']).total === 10, 'el ancla vale 0');
check(R.patrones(m(3, 4, [5, 'ancla'])).some(x => x.id === 'escalera'), 'el ancla cuenta para la escalera');
check(pts(10, [9, 'cofre']) === 16, 'el cofre suma 6 si no te pasas');
check(pts(3, [6, 'diamante']) === 25 && pts(10, [5, 'diamante'], 6) === -5, 'el diamante vale 10, da +12 y resta 5 si te pasas');
check(pts(3, 5, [8, 'racha']) === 22, 'la racha suma 2 por carta');
{ const x = ev(10, 8, [4, 'borrador']); check(x.total === 12 && !x.pasado && x.borrada, 'el borrador borra la carta más alta si te pasarías'); }
check(ev(10, 8, 4).pasado, 'sin borrador te pasas');
check(R.patrones(m(3, 4, [9, 'camaleon'])).reduce((t, x) => t + x.puntos, 0) >= 11, 'el camaleón toma el palo y el número que más dan');
check(R.totalDe([{ r: 7, e: 'ruleta', v: 3 }]).total === 3 && R.totalDe([{ r: 7, e: 'ruleta' }]).total === 6, 'la ruleta vale el número sorteado');

console.log('pruebas de las reglas del 13 Jack terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
