'use strict';
// Las misiones y los pedidos de Fundación (versión 2). Un solo grupo compartido a la vista de todos. Reglas: docs/catan_dados.md ("Misiones y pedidos").
//   - Misiones de condición (A): se cumplen haciendo algo en el mapa; no vencen; se las lleva quien las cumple primero.
//   - Pedidos (B): se cumplen entregando tarjetas; se los lleva el primero que los entrega en su turno; vencen a los 2 turnos de cada jugador (cuenta propia por pedido).
// Lo que se lleva alguien o vence se repone al terminar el turno de quien lo cumplió o entregó. Todo es puro y el estado es un objeto simple (se guarda con la sala).

const R = require('./reglas');

const A_A_LA_VISTA = 2, B_A_LA_VISTA = 2;
const PV = 1;   // los puntos de cada misión o pedido (por calibrar)

// ---------- las misiones de condición ----------

// El tamaño de la red de caminos conectados más grande de un jugador (los caminos se conectan por un vértice que no tenga un edificio de otro).
function redMayor(mapa, tab, p) {
  const mios = mapa.aristas.filter(e => tab.aris[e.id] === p);
  const padre = new Map(mios.map(e => [e.id, e.id]));
  const raiz = x => { while (padre.get(x) !== x) { padre.set(x, padre.get(padre.get(x))); x = padre.get(x); } return x; };
  for (const v of mapa.vertices) {
    const o = tab.vert[v.id]; if (o && o.p !== p) continue;
    const aqui = v.aristas.filter(e => tab.aris[e] === p);
    for (let i = 1; i < aqui.length; i++) padre.set(raiz(aqui[i]), raiz(aqui[0]));
  }
  const tam = new Map(); let mejor = 0;
  for (const e of mios) { const r = raiz(e.id), n = (tam.get(r) || 0) + 1; tam.set(r, n); if (n > mejor) mejor = n; }
  return mejor;
}
const MISIONES = {
  red5: { clase: 'A', cumple: (mapa, tab, p) => redMayor(mapa, tab, p) >= 5 },                      // 5 caminos conectados
  ciudades2: { clase: 'A', cumple: (mapa, tab, p) => R.piezas(tab, p).ciudad >= 2 },                // 2 ciudades
  pueblos4: { clase: 'A', cumple: (mapa, tab, p) => { const c = R.piezas(tab, p); return c.pueblo + c.ciudad >= 4; } },   // 4 pueblos o ciudades
  caballeros3: { clase: 'A', cumple: (mapa, tab, p) => R.piezas(tab, p).caballero >= 3 },           // los 3 caballeros
};

// ---------- los pedidos ----------

const PEDIDOS = {
  par: { clase: 'B', costo: [2, 2, 0, 0, 0] },        // 2 madera + 2 ladrillo
  pareja: { clase: 'B', costo: [0, 0, 2, 2, 0] },     // 2 lana + 2 trigo
  mineral3: { clase: 'B', costo: [0, 0, 0, 0, 3] },   // 3 mineral
  surtido: { clase: 'B', costo: [1, 1, 1, 1, 1] },    // una de cada
  iguales3: { clase: 'B', iguales: 3 },               // 3 tarjetas iguales
  cualquiera3: { clase: 'B', cualquiera: 3 },         // 3 tarjetas cualesquiera (todavía fuera del grupo: se calibra con bots)
};
const DEFS = Object.assign({}, MISIONES, PEDIDOS);
const IDS = { A: Object.keys(MISIONES), B: Object.keys(PEDIDOS).filter(id => id !== 'cualquiera3') };   // (lo que entra al grupo)

// Las tarjetas que se entregarían por un pedido con esta mano (una cuenta por recurso), o null si no se puede. Las elige el juego: el jugador no elige.
function entrega(id, mano) {
  const d = PEDIDOS[id]; if (!d) return null;
  if (d.costo) return R.alcanza(d.costo, mano) ? d.costo.slice() : null;
  if (d.cualquiera) {   // las del recurso que más hay, de a una (con empate, el primero)
    if (R.totalMano(mano) < d.cualquiera) return null;
    const m = mano.slice(), q = R.manoVacia();
    for (let k = 0; k < d.cualquiera; k++) { let r = 0; m.forEach((n, i) => { if (n > m[r]) r = i; }); m[r]--; q[r]++; }
    return q;
  }
  let r = -1; mano.forEach((n, i) => { if (n >= d.iguales && (r < 0 || n > mano[r])) r = i; });
  if (r < 0) return null;
  const q = R.manoVacia(); q[r] = d.iguales; return q;
}
// Las tarjetas que muestra un pedido (lo que pide), con el 'iguales' como cantidad de tarjetas parecidas.
const describe = id => { const d = DEFS[id]; return d ? { id, clase: d.clase, costo: d.costo ? d.costo.slice() : null, iguales: d.iguales || 0 } : null; };

// ---------- el grupo ----------

const duracion = jugadores => Math.max(2 * jugadores, R.CFG.pedidoMin);

function nuevoGrupo(azar) {
  const g = { turno: 0, activas: [] };
  rellenar(g, azar);
  return g;
}
function rellenar(g, azar) {
  const nuevas = [];
  for (const clase of ['A', 'B']) {
    const meta = clase === 'A' ? A_A_LA_VISTA : B_A_LA_VISTA;
    let hay = g.activas.filter(m => DEFS[m.id].clase === clase).length;
    while (hay < meta) {
      const libres = IDS[clase].filter(id => !g.activas.some(m => m.id === id));
      if (!libres.length) break;
      const id = libres[Math.floor(azar() * libres.length)];
      g.activas.push({ id, nacido: g.turno, por: null }); nuevas.push(id); hay++;
    }
  }
  return nuevas;
}
// Cuántos turnos le quedan a un pedido (null en las misiones de condición, que no vencen).
function quedanTurnos(g, m, jugadores) { return DEFS[m.id].clase === 'B' ? Math.max(0, duracion(jugadores) - (g.turno - m.nacido)) : null; }

// Las misiones de condición que este jugador cumple ahora y todavía están disponibles.
function cumplidas(g, mapa, tab, p) { return g.activas.filter(m => DEFS[m.id].clase === 'A' && m.por === null && MISIONES[m.id].cumple(mapa, tab, p)).map(m => m.id); }
// El jugador se lleva una misión o un pedido: queda marcado hasta que termine su turno (entonces se repone).
function tomar(g, id, p) { const m = g.activas.find(x => x.id === id && x.por === null); if (!m) return false; m.por = p; return true; }
// Termina un turno: se cuenta, se quitan las tomadas y los pedidos vencidos y se reponen. Devuelve lo que salió y lo que entró.
function finDeTurno(g, azar, jugadores) {
  g.turno++;
  const dur = duracion(jugadores), salen = g.activas.filter(m => m.por !== null || (DEFS[m.id].clase === 'B' && g.turno - m.nacido >= dur));
  g.activas = g.activas.filter(m => !salen.includes(m));
  const entran = rellenar(g, azar);
  return { salen: salen.map(m => ({ id: m.id, por: m.por })), entran };
}

module.exports = { PV, MISIONES, PEDIDOS, DEFS, IDS, redMayor, entrega, describe, duracion, nuevoGrupo, quedanTurnos, cumplidas, tomar, finDeTurno };
