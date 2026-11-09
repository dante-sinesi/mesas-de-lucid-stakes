'use strict';
// El jugador automático de Fundación: elige qué dados guardar, cuándo dejar de tirar, qué construir y dónde. Lo usan los bots de la sala, quien se ausenta y el servidor cuando se acaba el tiempo.
// Piensa con las mismas reglas que el juego (reglas.js): no hace trampa ni ve más que un jugador.

const R = require('./reglas');

const VALOR = { ciudad: 3, pueblo: 2.6, caballero: 1.3, camino: 1 };   // cuánto vale cada edificio para el bot (puntos y futuro)
const pips = n => (n ? 6 - Math.abs(7 - n) : 0);                         // los puntitos de un número: su probabilidad sobre 36

// Qué tan buen vértice es para poblar: los puntitos de sus hexágonos y que den recursos distintos.
function valorVertice(mapa, v) {
  const vert = mapa.vertices[v], tipos = new Set();
  let total = 0;
  vert.hexes.forEach(h => { const hx = mapa.hexes[h]; total += pips(hx.num); if (hx.tipo !== 'desierto') tipos.add(hx.tipo); });
  return total + tipos.size * 0.8;
}

// El mejor lugar para un edificio entre los válidos.
function mejorLugar(mapa, tab, p, edificio, lugares, azar) {
  if (!lugares.length) return null;
  let mejor = null, mejorV = -Infinity;
  for (const l of lugares) {
    let v;
    if (edificio === 'pueblo') v = valorVertice(mapa, l);
    else if (edificio === 'ciudad') v = valorVertice(mapa, l) + 0.5;
    else if (edificio === 'caballero') { const hx = mapa.hexes[l]; v = pips(hx.num) + (tab.bandido === l ? 3 : 0); }
    else { const e = mapa.aristas[l]; v = Math.max(libre(mapa, tab, e.a) ? valorVertice(mapa, e.a) : 0, libre(mapa, tab, e.b) ? valorVertice(mapa, e.b) : 0); }   // un camino que lleva a un buen vértice libre
    v += azar() * 0.01;
    if (v > mejorV) { mejorV = v; mejor = l; }
  }
  return mejor;
}
const libre = (mapa, tab, v) => tab.vert[v] === null && mapa.vertices[v].vecinos.every(w => tab.vert[w] === null);

// Los dados que guarda: los que ayudan al edificio que más conviene perseguir (valor por probabilidad con las tiradas que quedan).
// `dados`: las 6 caras; `fijos`: cuántos están fijados (los primeros); `tiradasQuedan`: tiradas que quedan después de la actual.
function guardar(mapa, tab, p, dados, fijos, tiradasQuedan) {
  const libres = []; for (let i = fijos; i < dados.length; i++) libres.push(i);
  let mejor = { score: -1, keep: [] };
  for (const e of R.EDIFICIOS) {
    if (!R.lugares(mapa, tab, p, e).length) continue;
    const costo = R.COSTOS[e], cuenta = [0, 0, 0, 0, 0, 0]; dados.slice(0, fijos).forEach(c => { cuenta[c]++; });
    const keep = [];
    libres.forEach(i => { const c = dados[i]; if (c < 5 && cuenta[c] < costo[c]) { cuenta[c]++; keep.push(i); } });
    let falta = 0; for (let r = 0; r < 5; r++) falta += Math.max(0, costo[r] - cuenta[r]);
    libres.forEach(i => { if (dados[i] === 5 && !keep.includes(i) && falta > 0) keep.push(i); });
    const guard = dados.slice(0, fijos).concat(keep.map(i => dados[i]));
    const prob = R.probabilidad(costo, guard, dados.length - guard.length, tiradasQuedan);
    const score = VALOR[e] * prob;
    if (score > mejor.score) mejor = { score, keep, e };
  }
  return mejor;
}

// ¿Conviene seguir tirando? No si ya se alcanza lo mejor a lo que se puede aspirar.
function seguirTirando(mapa, tab, p, dados, fijos, tiradasQuedan) {
  if (tiradasQuedan <= 0) return false;
  const pos = R.posibles(mapa, tab, p, dados);
  const actual = pos.length ? Math.max.apply(null, pos.map(e => VALOR[e])) : 0;
  const g = guardar(mapa, tab, p, dados, fijos, tiradasQuedan);
  return g.score > actual + 0.05;
}

// El edificio que elige entre los posibles.
function elegirEdificio(posibles) { return posibles.slice().sort((a, b) => VALOR[b] - VALOR[a])[0] || null; }

module.exports = { VALOR, valorVertice, mejorLugar, guardar, seguirTirando, elegirEdificio, pips };
