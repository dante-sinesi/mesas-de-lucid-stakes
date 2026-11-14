'use strict';
// El jugador automático de Fundación: elige qué descartar, qué construir, qué pedido entregar y dónde poner cada pieza. Lo usan los bots de la sala, quien se ausenta y la colocación inicial cuando se acaba el tiempo.
// Piensa con las mismas reglas que el juego (reglas.js y misiones.js): no hace trampa ni ve más que un jugador.

const R = require('./reglas');
const M = require('./misiones');

const VALOR = { ciudad: 3, pueblo: 2.6, pedido: 2.2, caballero: 1.3, camino: 1 };   // cuánto vale cada jugada para el bot (puntos y futuro)
const pips = n => (n ? 6 - Math.abs(7 - n) : 0);                                      // los puntitos de un número: su probabilidad sobre 36

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
    if (edificio === 'pueblo') v = valorVertice(mapa, l) + 2.2 * nuevosTipos(mapa, tab, p, l);   // sin intercambio, lo que no tocas no lo tienes nunca: conviene sumar recursos que todavía no cobras
    else if (edificio === 'ciudad') v = valorVertice(mapa, l) + 0.5;
    else if (edificio === 'caballero') { const hx = mapa.hexes[l]; v = pips(hx.num) + (tab.bandido === l ? 3 : 0); }
    else { const e = mapa.aristas[l]; v = Math.max(libre(mapa, tab, e.a) ? valorVertice(mapa, e.a) : 0, libre(mapa, tab, e.b) ? valorVertice(mapa, e.b) : 0); }   // un camino que lleva a un buen vértice libre
    v += azar() * 0.01;
    if (v > mejorV) { mejorV = v; mejor = l; }
  }
  return mejor;
}
// Cuántos recursos distintos suma un pueblo en este vértice a los que ya cobra el jugador.
function nuevosTipos(mapa, tab, p, v) {
  const tiene = new Set();
  tab.vert.forEach((o, id) => { if (o && o.p === p) mapa.vertices[id].hexes.forEach(h => { const hx = mapa.hexes[h]; if (hx.tipo !== 'desierto') tiene.add(hx.tipo); }); });
  const nuevos = new Set(); mapa.vertices[v].hexes.forEach(h => { const hx = mapa.hexes[h]; if (hx.tipo !== 'desierto' && !tiene.has(hx.tipo)) nuevos.add(hx.tipo); });
  return nuevos.size;
}
const libre = (mapa, tab, v) => tab.vert[v] === null && mapa.vertices[v].vecinos.every(w => tab.vert[w] === null);

// Qué hace en su turno con esta mano: entregar un pedido, construir algo (y qué) o pasar. Se llama de a una jugada: después de cada una vuelve a decidir.
function decidir(mapa, tab, p, mano, grupo, azar) {
  let mejor = { tipo: 'pasar', valor: 0 };
  for (const e of R.posibles(mapa, tab, p, mano)) if (VALOR[e] > mejor.valor) mejor = { tipo: 'construir', edificio: e, valor: VALOR[e] };
  if (grupo) for (const m of grupo.activas) if (m.por === null && M.PEDIDOS[m.id] && M.entrega(m.id, mano) && VALOR.pedido > mejor.valor) mejor = { tipo: 'entregar', id: m.id, valor: VALOR.pedido };
  return mejor;
}

// Las tarjetas que descarta cuando tiene de más: primero las que sobran del recurso más abundante que no hace falta para un pueblo o una ciudad.
function descartar(mapa, tab, p, mano, n) {
  const quitar = R.manoVacia(), m = mano.slice();
  const falta = r => Math.max(R.COSTOS.pueblo[r], R.COSTOS.ciudad[r]);
  for (let k = 0; k < n; k++) {
    let mejor = -1, mejorV = -Infinity;
    for (let r = 0; r < 5; r++) { if (m[r] <= 0) continue; const v = (m[r] - falta(r)) * 10 + m[r]; if (v > mejorV) { mejorV = v; mejor = r; } }
    m[mejor]--; quitar[mejor]++;
  }
  return quitar;
}

module.exports = { VALOR, valorVertice, mejorLugar, decidir, descartar, pips };
