'use strict';
// Estadísticas de partidas de Fundación solo con bots (sin pasar por el juego): cuánto dura una partida de 1 a 8 jugadores y en qué momentos se traba.
// Uso: node simulador/estadisticas.js [partidas por cantidad de jugadores] [meta] [segundos por turno de una persona]
const path = require('path');
const { MesaFundacion, FASE } = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'mesa_fundacion.js'));
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const PARTIDAS = Number(process.argv[2]) || 80, META = Number(process.argv[3]) || 10, SEG_TURNO = Number(process.argv[4]) || 30;

function jugar(jugadores, semilla) {
  const reloj = { t: 1000000 };
  const m = new MesaFundacion({ modo: 'multi', asientos: jugadores, bots: 0, meta: META, azar: R.rng(semilla), ahora: () => reloj.t });
  for (let i = 0; i < jugadores; i++) m.jugadores.push(Object.assign(MesaFundacion._nuevo('bot' + i, 'Bot' + i, i), { bot: true }));
  m._empezar();
  const turnos = [];   // por turno: jugador, ronda, puntos al empezar, qué se podía construir y si construyó
  let actual = null, ultimaT = null;
  for (let i = 0; i < 80000 && m.fase !== FASE.FIN; i++) {
    reloj.t += 6000; m.avanzar();
    const t = m.t;
    if (t && t !== ultimaT) {   // empezó un turno nuevo
      ultimaT = t;
      const as = t.asiento, factibles = R.EDIFICIOS.filter(e => R.lugares(m.mapa, m.tab, as, e).length > 0);
      actual = { as, ronda: m.ronda, puntos: m._puntosDe(as), factibles, construyo: false, reserva: t.nReserva || 0, t };
      turnos.push(actual);
    }
    if (actual && actual.t.terminado && actual.t === t) actual.construyo = t.motivo === 'construyo';
  }
  return { m, turnos };
}
const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, q) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))] : 0;
const f1 = x => x.toFixed(1), pc = x => Math.round(x * 100) + ' %';
const TRAMOS = [[0, 3, '0-3 pts'], [4, 6, '4-6 pts'], [7, 9, '7-9 pts'], [10, 99, '10+ pts']];

const salida = [];
const p = s => { console.log(s); salida.push(s); };
p('# Fundación: estadísticas con bots\n');
p(PARTIDAS + ' partidas por cantidad de jugadores, meta ' + META + ' puntos, reserva de dados ' + R.CFG.reservaMax + ', bots que juegan al máximo. Los minutos estiman ' + SEG_TURNO + ' s por turno de una persona.\n');
p('## Duración\n');
p('| Jugadores | Terminan | Rondas (prom · mediana · p90 · máx) | Turnos por jugador | Minutos estimados (prom · p90) |');
p('|---|---|---|---|---|');
const todo = {};
for (let jug = 1; jug <= 8; jug++) {
  const rondas = [], porJug = [], datos = [], rachas = [];
  let fin = 0, conRacha6 = 0;
  for (let k = 0; k < PARTIDAS; k++) {
    const { m, turnos } = jugar(jug, 4242 * jug + k);
    if (m.fase !== FASE.FIN) continue; fin++;
    rondas.push(m.ronda); porJug.push(turnos.length / jug); datos.push({ turnos, jug, rondas: m.ronda });
    // rachas de turnos seguidos sin construir, por jugador
    let hay6 = false;
    for (let as = 0; as < jug; as++) { let r = 0, mx = 0; turnos.filter(x => x.as === as).forEach(x => { if (x.construyo) r = 0; else { r++; mx = Math.max(mx, r); } }); rachas.push(mx); if (mx >= 6) hay6 = true; }
    if (hay6) conRacha6++;
  }
  todo[jug] = { rondas, porJug, datos, rachas, fin, conRacha6 };
  const minutos = rondas.map(r => r * jug * SEG_TURNO / 60);
  p('| ' + jug + ' | ' + fin + '/' + PARTIDAS + ' | ' + f1(media(rondas)) + ' · ' + pct(rondas, 0.5) + ' · ' + pct(rondas, 0.9) + ' · ' + Math.max(...rondas) + ' | ' + f1(media(porJug)) + ' | ' + f1(media(minutos)) + ' · ' + f1(pct(minutos, 0.9)) + ' |');
}
p('\n## Dónde se traba: turnos en los que no se construyó nada, según los puntos del jugador\n');
p('| Jugadores | ' + TRAMOS.map(t => t[2]).join(' | ') + ' | Racha máx. sin construir (prom · p90 · máx) | Partidas con alguna racha de 6 o más |');
p('|---|' + TRAMOS.map(() => '---').join('|') + '|---|---|');
for (let jug = 1; jug <= 8; jug++) {
  const d = todo[jug], cols = TRAMOS.map(([a, b]) => { const ts = d.datos.flatMap(x => x.turnos).filter(x => x.puntos >= a && x.puntos <= b); return ts.length ? pc(ts.filter(x => !x.construyo).length / ts.length) + ' de ' + ts.length : '—'; });
  p('| ' + jug + ' | ' + cols.join(' | ') + ' | ' + f1(media(d.rachas)) + ' · ' + pct(d.rachas, 0.9) + ' · ' + Math.max(...d.rachas) + ' | ' + pc(d.conRacha6 / Math.max(1, d.fin)) + ' |');
}
p('\n## Por qué no se construye (turnos vacíos con 7 o más puntos): qué se podía construir en ese turno\n');
p('| Jugadores | Solo ciudad | Ciudad y caballero | Nada | Otra cosa |');
p('|---|---|---|---|---|');
for (let jug = 1; jug <= 8; jug++) {
  const vacios = todo[jug].datos.flatMap(x => x.turnos).filter(x => x.puntos >= 7 && !x.construyo), n = Math.max(1, vacios.length);
  const solo = vacios.filter(x => x.factibles.length === 1 && x.factibles[0] === 'ciudad').length, cc = vacios.filter(x => x.factibles.length === 2 && x.factibles.includes('ciudad') && x.factibles.includes('caballero')).length, nada = vacios.filter(x => !x.factibles.length).length;
  p('| ' + jug + ' | ' + pc(solo / n) + ' | ' + pc(cc / n) + ' | ' + pc(nada / n) + ' | ' + pc((n - solo - cc - nada) / n) + ' |   (' + vacios.length + ' turnos)');
}
p('\n## Qué se podía construir en los turnos vacíos con 7 o más puntos (todas las cantidades juntas)\n');
{
  const cuenta = {}; let total = 0;
  for (let jug = 1; jug <= 8; jug++) todo[jug].datos.flatMap(x => x.turnos).filter(x => x.puntos >= 7 && !x.construyo).forEach(x => { const k = x.factibles.join(' + ') || 'nada'; cuenta[k] = (cuenta[k] || 0) + 1; total++; });
  p('| Se podía construir | Turnos vacíos |'); p('|---|---|');
  Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, n]) => p('| ' + k + ' | ' + pc(n / total) + ' |'));
}
p('\n## Turnos vacíos por tercio de la partida\n');
p('| Jugadores | 1.er tercio | 2.º tercio | 3.er tercio |');
p('|---|---|---|---|');
for (let jug = 1; jug <= 8; jug++) {
  const t3 = [[], [], []];
  todo[jug].datos.forEach(d => d.turnos.forEach(x => { const q = Math.min(2, Math.floor(3 * (x.ronda - 1) / Math.max(1, d.rondas))); t3[q].push(x); }));
  p('| ' + jug + ' | ' + t3.map(a => a.length ? pc(a.filter(x => !x.construyo).length / a.length) : '—').join(' | ') + ' |');
}
require('fs').writeFileSync(path.join(__dirname, '..', 'docs', 'fundacion_estadisticas.md'), salida.join('\n') + '\n');
