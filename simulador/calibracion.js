'use strict';
// Calibración de Fundación v2 con bots (sin pasar por el juego): duración, ciudades, descartes, partidas trabadas, pedidos y misiones, y cuántas tarjetas acumula alguien fuera de su turno.
// Uso: node simulador/calibracion.js [partidas] [meta] [mineral de la ciudad: 3 o 2] [pedidoMin] [jugadores separados por coma]
//   ej.: node simulador/calibracion.js 40 10 3 4 2,4,8
const path = require('path');
const { MesaFundacion, FASE } = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'mesa_fundacion.js'));
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const M = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'misiones.js'));

const PARTIDAS = Number(process.argv[2]) || 40, META = Number(process.argv[3]) || 10, MINERAL = Number(process.argv[4]) || 3, PEDIDO_MIN = process.argv[5] === undefined ? R.CFG.pedidoMin : Number(process.argv[5]);
const CANTIDADES = (process.argv[6] || '1,2,4,6,8').split(',').map(Number);
R.COSTOS.ciudad = [0, 0, 0, 2, MINERAL]; R.CFG.pedidoMin = PEDIDO_MIN;

function jugar(jugadores, semilla) {
  const reloj = { t: 1000000 };
  const m = new MesaFundacion({ modo: 'multi', asientos: jugadores, bots: 0, meta: META, azar: R.rng(semilla), ahora: () => reloj.t });
  for (let i = 0; i < jugadores; i++) m.jugadores.push(Object.assign(MesaFundacion._nuevo('bot' + i, 'Bot' + i, i), { bot: true }));
  const st = { turnos: 0, vacios: 0, descartes: 0, descartadas: 0, entregas: 0, misiones: 0, maxMano: 0, rachaMax: 0, racha: new Array(jugadores).fill(0), construyo: new Array(jugadores).fill(false) };
  const despues = m._despuesDeTirada.bind(m), fin = m._finTurno.bind(m), desc = m._descartar.bind(m), ent = m._entregar.bind(m), rev = m._revisarMisiones.bind(m), col = m._colocar.bind(m);
  m._despuesDeTirada = () => { m.jugadores.forEach(j => { st.maxMano = Math.max(st.maxMano, R.totalMano(j.mano)); }); despues(); };
  m._descartar = (j, q) => { const r = desc(j, q); if (r.ok) { st.descartes++; st.descartadas += R.totalMano(q); } return r; };
  m._entregar = (j, id) => { const r = ent(j, id); if (r.ok) { st.entregas++; st.construyo[j.asiento] = true; } return r; };
  m._revisarMisiones = j => { const antes = j.pvExtra; rev(j); st.misiones += (j.pvExtra - antes); };
  m._colocar = (j, l) => { const r = col(j, l); if (r.ok) st.construyo[j.asiento] = true; return r; };
  m._finTurno = mot => { const as = m.t.asiento; st.turnos++; if (st.construyo[as]) st.racha[as] = 0; else { st.vacios++; st.racha[as]++; st.rachaMax = Math.max(st.rachaMax, st.racha[as]); } st.construyo[as] = false; fin(mot); };
  m._empezar();
  for (let i = 0; i < 60000 && m.fase !== FASE.FIN; i++) { reloj.t += 3000; m.avanzar(); }
  return { m, st };
}

const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, q) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))] : 0;
console.log('Fundación v2: ' + PARTIDAS + ' partidas por cantidad, meta ' + META + ', ciudad ' + MINERAL + ' mineral + 2 trigo, pedidos de al menos ' + PEDIDO_MIN + ' turnos\n');
for (const jug of CANTIDADES) {
  const rondas = [], r = { fin: 0, ciudades: 0, pueblos: 0, caminos: 0, caballeros: 0, vacios: 0, turnos: 0, descartes: 0, descartadas: 0, entregas: 0, misiones: 0, maxMano: [], rachaMax: [], trabadas: 0 };
  for (let k = 0; k < PARTIDAS; k++) {
    const { m, st } = jugar(jug, 777 * jug + k);
    if (m.fase !== FASE.FIN) { r.trabadas++; continue; }
    r.fin++; rondas.push(m.ronda);
    m.fin.ranking.forEach(x => { r.ciudades += x.ciudades; r.pueblos += x.pueblos; r.caminos += x.caminos; r.caballeros += x.caballeros; });
    r.vacios += st.vacios; r.turnos += st.turnos; r.descartes += st.descartes; r.descartadas += st.descartadas; r.entregas += st.entregas; r.misiones += st.misiones; r.maxMano.push(st.maxMano); r.rachaMax.push(st.rachaMax);
  }
  const n = Math.max(1, r.fin * jug);
  console.log(jug + ' jugador' + (jug > 1 ? 'es' : '') + ': terminan ' + r.fin + '/' + PARTIDAS + ' · rondas ' + media(rondas).toFixed(1) + ' (mediana ' + pct(rondas, 0.5) + ', p90 ' + pct(rondas, 0.9) + ') · turnos de la partida ' + (r.turnos / Math.max(1, r.fin)).toFixed(0));
  console.log('   por jugador: ' + (r.pueblos / n).toFixed(1) + ' pueblos, ' + (r.ciudades / n).toFixed(2) + ' ciudades, ' + (r.caminos / n).toFixed(1) + ' caminos, ' + (r.caballeros / n).toFixed(1) + ' caballeros · pedidos entregados ' + (r.entregas / n).toFixed(1) + ' · puntos de misiones y pedidos ' + (r.misiones / n).toFixed(1));
  console.log('   turnos sin hacer nada ' + Math.round(r.vacios / Math.max(1, r.turnos) * 100) + ' % · racha máxima de turnos vacíos: mediana ' + pct(r.rachaMax, 0.5) + ', p90 ' + pct(r.rachaMax, 0.9) + ' · descartes por jugador ' + (r.descartes / n).toFixed(1) + ' (' + (r.descartadas / Math.max(1, r.descartes)).toFixed(1) + ' tarjetas cada uno) · mano máxima al empezar un turno: mediana ' + pct(r.maxMano, 0.5) + ', p90 ' + pct(r.maxMano, 0.9));
}
