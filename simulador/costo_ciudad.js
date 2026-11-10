'use strict';
// Compara costos de la ciudad con partidas solo de bots: cuánto duran, cuántos turnos pasan sin construir y cuántas ciudades se hacen.
// Uso: node simulador/costo_ciudad.js [partidas por caso] [meta]
const path = require('path');
const { MesaFundacion, FASE } = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'mesa_fundacion.js'));
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const PARTIDAS = Number(process.argv[2]) || 100, META = Number(process.argv[3]) || 10;
const VARIANTES = [['hoy: 3 mineral + 2 trigo', [0, 0, 0, 2, 3]], ['2 mineral + 2 trigo', [0, 0, 0, 2, 2]], ['3 mineral + 1 trigo', [0, 0, 0, 1, 3]], ['2 mineral + 1 trigo', [0, 0, 0, 1, 2]]];   // (madera, ladrillo, lana, trigo, mineral)

function jugar(jugadores, semilla) {
  const reloj = { t: 1000000 };
  const m = new MesaFundacion({ modo: 'multi', asientos: jugadores, bots: 0, meta: META, azar: R.rng(semilla), ahora: () => reloj.t });
  for (let i = 0; i < jugadores; i++) m.jugadores.push(Object.assign(MesaFundacion._nuevo('bot' + i, 'Bot' + i, i), { bot: true }));
  m._empezar();
  const turnos = []; let actual = null, ultimaT = null;
  for (let i = 0; i < 80000 && m.fase !== FASE.FIN; i++) {
    reloj.t += 6000; m.avanzar();
    const t = m.t;
    if (t && t !== ultimaT) { ultimaT = t; actual = { as: t.asiento, puntos: m._puntosDe(t.asiento), construyo: false, t }; turnos.push(actual); }
    if (actual && actual.t.terminado && actual.t === t) actual.construyo = t.motivo === 'construyo';
  }
  return { m, turnos };
}
const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, q) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))] : 0;

// probabilidad de lograr la ciudad con 6 dados nuevos y 2 tiradas más (como se ve en el juego)
function probCiudad() {
  let tot = 0, n = 0; for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) for (let d = 0; d < 6; d++) for (let e = 0; e < 6; e++) for (let f = 0; f < 6; f++) { const t = R.tabla(['ciudad'], [], [a, b, c, d, e, f], 2); tot += Object.values(t)[0][0]; n++; }
  return tot / n;
}
const original = R.COSTOS.ciudad.slice();
const salida = [];
const p = s => { console.log(s); salida.push(s); };
p('# Costo de la ciudad: comparación con bots\n');
p(PARTIDAS + ' partidas por caso, meta ' + META + ' puntos, reserva de dados ' + R.CFG.reservaMax + '. «Vacíos 7-9» = turnos sin construir cuando el jugador tiene entre 7 y 9 puntos.\n');
p('| Jugadores | Costo de la ciudad | Prob. de lograrla en un turno | Rondas (prom · p90) | Vacíos 7-9 pts | Racha máx. sin construir (p90) | Ciudades por jugador | Gana el 1.º |');
p('|---|---|---|---|---|---|---|---|');
for (const jug of [2, 4, 8]) {
  for (const [nombre, costo] of VARIANTES) {
    R.COSTOS.ciudad.splice(0, 5, ...costo);
    const pr = probCiudad(), rondas = [], rachas = [], ciu = []; let vac = 0, tot = 0, fin = 0, primero = 0;
    for (let k = 0; k < PARTIDAS; k++) {
      const { m, turnos } = jugar(jug, 9100 * jug + k);
      if (m.fase !== FASE.FIN) continue; fin++; rondas.push(m.ronda);
      turnos.filter(x => x.puntos >= 7 && x.puntos <= 9).forEach(x => { tot++; if (!x.construyo) vac++; });
      for (let as = 0; as < jug; as++) { let r = 0, mx = 0; turnos.filter(x => x.as === as).forEach(x => { if (x.construyo) r = 0; else { r++; mx = Math.max(mx, r); } }); rachas.push(mx); }
      ciu.push(media(m.jugadores.map(j => R.piezas(m.tab, j.asiento).ciudad)));
      if (m.orden.indexOf(m.fin.ganador.asiento) === 0) primero++;
    }
    p('| ' + jug + ' | ' + nombre + ' | ' + pr.toFixed(1) + ' % | ' + media(rondas).toFixed(1) + ' · ' + pct(rondas, 0.9) + ' | ' + Math.round(vac / Math.max(1, tot) * 100) + ' % | ' + pct(rachas, 0.9) + ' | ' + media(ciu).toFixed(2) + ' | ' + Math.round(primero / Math.max(1, fin) * 100) + ' % |');
  }
}
R.COSTOS.ciudad.splice(0, 5, ...original);
require('fs').writeFileSync(path.join(__dirname, '..', 'docs', 'fundacion_costo_ciudad.md'), salida.join('\n') + '\n');
