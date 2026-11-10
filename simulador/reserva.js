'use strict';
// Compara la reserva de dados (0, 1, 2 o 3 dados que pasan al turno siguiente) con partidas solo de bots: rondas, ganador y cuántos turnos pasan sin construir nada.
// Uso: node simulador/reserva.js [partidas] [meta]
const path = require('path');
const { MesaFundacion, FASE } = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'mesa_fundacion.js'));
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const PARTIDAS = Number(process.argv[2]) || 80, META = Number(process.argv[3]) || 10;

function jugar(jugadores, semilla) {
  const reloj = { t: 1000000 };
  const m = new MesaFundacion({ modo: 'multi', asientos: jugadores, bots: 0, meta: META, azar: R.rng(semilla), ahora: () => reloj.t });
  for (let i = 0; i < jugadores; i++) m.jugadores.push(Object.assign(MesaFundacion._nuevo('bot' + i, 'Bot' + i, i), { bot: true }));
  m._empezar();
  let turnos = 0, vacios = 0, ultimo = null;
  for (let i = 0; i < 60000 && m.fase !== FASE.FIN; i++) {
    reloj.t += 6000; m.avanzar();
    if (m.t && m.t.terminado && m.t !== ultimo) { ultimo = m.t; turnos++; if (m.t.motivo !== 'construyo') vacios++; }
  }
  return { m, turnos, vacios };
}
const pct = (a, q) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))];
console.log('Reserva de dados · ' + PARTIDAS + ' partidas por caso, meta ' + META + '\n');
console.log('jugadores · reserva | rondas promedio · mediana · p90 · máx | turnos sin construir | gana el 1.º');
for (const jug of [2, 4, 8]) {
  for (const res of [0, 1, 2, 3]) {
    R.CFG.reservaMax = res; const rondas = [], vac = []; let primero = 0, fin = 0;
    for (let k = 0; k < PARTIDAS; k++) {
      const { m, turnos, vacios } = jugar(jug, 777 * jug + k);
      if (m.fase !== FASE.FIN) continue; fin++; rondas.push(m.ronda); vac.push(vacios / Math.max(1, turnos));
      if (m.orden.indexOf(m.fin.ganador.asiento) === 0) primero++;
    }
    const media = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    console.log(jug + ' jug · reserva ' + res + ' | ' + media(rondas).toFixed(1) + ' · ' + pct(rondas, 0.5) + ' · ' + pct(rondas, 0.9) + ' · ' + Math.max(...rondas) + ' | ' + (media(vac) * 100).toFixed(0) + ' % | ' + Math.round(primero / Math.max(1, fin) * 100) + ' %   (' + fin + '/' + PARTIDAS + ' terminan)');
  }
}
