'use strict';
// Simulador del 13 Jack: un jugador automático juega miles de mazos para medir el puntaje, las fichas y cuánto vale cada carta especial.
// Uso: node simulador/trece_jack.js [mazos por prueba]   (por omisión 20000)
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'reglas.js'));
const { FICHAS } = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'mesa_13.js'));

let semilla = 12345;
const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };

// El jugador automático: pide mientras el puntaje esperado de pedir una carta más supere al de plantarse ahora.
function jugarMano(mazo) {
  const mano = [];
  for (;;) {
    if (!mazo.length) break;
    if (mano.length) {
      const ya = R.puntosDeMano(mano);
      let esperado;
      if (mano.some(c => c.e === 'vidente')) esperado = R.puntosDeMano(mano.concat([mazo[0]]));   // el vidente muestra la próxima carta
      else { let suma = 0; for (const c of mazo) suma += R.puntosDeMano(mano.concat([c])); esperado = suma / mazo.length; }
      if (esperado <= ya) break;
    }
    mano.push(mazo.shift());
    const ev = R.evaluar(mano);
    if (ev.pasado || ev.total === 21) break;
  }
  const ev = R.evaluar(mano), puntos = R.puntosDeMano(mano, ev);
  for (const c of mano) if (c.e === 'pegajosa') mazo.splice(Math.floor(azar() * (mazo.length + 1)), 0, { r: c.r, e: c.e });
  const pat = R.patrones(mano, ev);
  return { puntos, pasado: ev.pasado, veintiuno: !ev.pasado && ev.total === 21, n: mano.length, pat };
}

// `especiales` puede ser { rango: tipo } (la carta toma el número de su casilla) o una lista de casillas completa (como en el juego).
function baseDe(especiales) {
  if (Array.isArray(especiales)) return especiales;
  const base = R.baseInicial();
  for (const r of Object.keys(especiales)) base[r - 1] = { r: Number(r), e: especiales[r], p: Number(r) % 4 };
  return base;
}
function jugarMazo(especiales) {
  const mazo = R.mazoNuevo(baseDe(especiales), azar);
  const r = { puntos: 0, pasadas: 0, veintiunos: 0, patrones: {}, puntosPatrones: 0, sobran: 0, bono: 0 };
  for (let i = 0; i < R.MANOS_POR_MAZO; i++) { const m = jugarMano(mazo); r.puntos += m.puntos; r.pasadas += m.pasado ? 1 : 0; r.veintiunos += m.veintiuno ? 1 : 0; for (const x of m.pat) { r.patrones[x.id] = (r.patrones[x.id] || 0) + 1; r.puntosPatrones += x.puntos; } }
  r.sobran = mazo.length; r.bono = R.BONO_MAZO_VACIO[mazo.length] || 0; r.puntos += r.bono;
  r.fichas = Math.floor(r.puntos / FICHAS.cada) + FICHAS.por21 * r.veintiunos + FICHAS.porPasada * r.pasadas;
  return r;
}

const N = Number(process.argv[2]) || 20000;
const media = (f, especiales) => { let s = 0; for (let i = 0; i < N; i++) s += f(jugarMazo(especiales)); return s / N; };
const base = { puntos: media(r => r.puntos, {}), pasadas: media(r => r.pasadas, {}), veintiunos: media(r => r.veintiunos, {}), fichas: media(r => r.fichas, {}) };
console.log('SIN ESPECIALES (por mazo): puntos ' + base.puntos.toFixed(1) + ' · pasadas ' + base.pasadas.toFixed(2) + ' · 21 exactos ' + base.veintiunos.toFixed(2) + ' · fichas ' + base.fichas.toFixed(1));
{
  const cuenta = {}; let pp = 0, bono = 0, sobran = 0, vacio = 0;
  for (let i = 0; i < N; i++) { const r = jugarMazo({}); for (const k of Object.keys(r.patrones)) cuenta[k] = (cuenta[k] || 0) + r.patrones[k]; pp += r.puntosPatrones; bono += r.bono; sobran += r.sobran; if (r.sobran === 0) vacio++; }
  console.log('PATRONES (veces por mazo): ' + Object.keys(cuenta).sort().map(k => k + ' ' + (cuenta[k] / N).toFixed(2)).join(' · '));
  console.log('Puntos por patrones: ' + (pp / N).toFixed(1) + ' por mazo · premio del mazo vacío: ' + (bono / N).toFixed(1) + ' (cartas sobrantes: ' + (sobran / N).toFixed(2) + ', mazos vaciados: ' + (vacio / N * 100).toFixed(0) + ' %)');
}
console.log('Una partida de 5 mazos: ~' + (base.puntos * 5).toFixed(0) + ' puntos. Fichas hasta la primera tienda (2 mazos): ~' + (base.fichas * 2).toFixed(0) + '\n');

// El valor de cada carta especial: cuánto sube el puntaje por mazo si la tienes (en un rango al azar), y cuánto cuesta.
console.log('carta           precio  mejor lugar  +puntos/mazo (mejor)  (en promedio)  +puntos por ficha (a 3 mazos de uso)');
const filas = [];
for (const tipo of R.ORDEN_ESPECIALES) {
  let acum = 0, mejor = -1e9, mejorR = 0;
  for (let r = 1; r <= R.RANGOS; r++) { const d = media(x => x.puntos, { [r]: tipo }) - base.puntos; acum += d; if (d > mejor) { mejor = d; mejorR = r; } }
  filas.push({ tipo, precio: R.ESPECIALES[tipo].precio, delta: mejor, medio: acum / R.RANGOS, mejorR });
}
filas.sort((a, b) => b.delta / b.precio - a.delta / a.precio);
for (const f of filas) console.log(f.tipo.padEnd(15), String(f.precio).padStart(5), String(f.mejorR).padStart(10), ('+' + f.delta.toFixed(1)).padStart(14), ('' + f.medio.toFixed(1)).padStart(14), (f.delta * 3 / f.precio).toFixed(2).padStart(10));
console.log('\nLas mejores cuestan lo mismo que las peores si "puntos por ficha" es parecido: eso es un buen equilibrio.');

// Una partida completa comprando según el valor medido (lo más rentable que alcance).
function partida(mazos, orden) {
  const base = R.baseInicial(); let fichas = 0, total = 0;
  for (let m = 1; m <= mazos; m++) {
    const r = jugarMazo(base); total += r.puntos; fichas += r.fichas;
    if (m < mazos && m % 2 === 0) {   // la tienda: 3 ofertas (cada una con su número y palo); compra la más rentable que pueda pagar y reemplaza una carta al azar
      const tengo = base.filter(c => c.e).map(c => c.e);
      const libres = orden.filter(t => !tengo.includes(t)), pool = libres.slice(), oferta = [];
      while (oferta.length < 3 && pool.length) oferta.push(R.ofertaCarta(pool.splice(Math.floor(azar() * pool.length), 1)[0], azar));
      for (const o of oferta) { if (fichas >= o.precio) { fichas -= o.precio; const libresIdx = base.map((c, i) => (c.e ? -1 : i)).filter(i => i >= 0); base[libresIdx[Math.floor(azar() * libresIdx.length)]] = { r: o.r, e: o.tipo, p: o.p }; break; } }
    }
  }
  return { total, comprados: base.filter(c => c.e).length, fichas };
}
const orden = filas.map(f => f.tipo);
for (const mazos of [3, 5, 8]) {
  let t = 0, c = 0, sin = 0; const M = 4000;
  for (let i = 0; i < M; i++) { const p = partida(mazos, orden); t += p.total; c += p.comprados; }
  for (let i = 0; i < M; i++) { let s = 0; for (let m = 0; m < mazos; m++) s += jugarMazo({}).puntos; sin += s; }
  console.log(mazos + ' mazos: con tienda ' + (t / M).toFixed(0) + ' puntos (' + (c / M).toFixed(1) + ' cartas compradas) · sin tienda ' + (sin / M).toFixed(0));
}
