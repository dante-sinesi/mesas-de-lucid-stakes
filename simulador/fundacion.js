'use strict';
// Simulador de Fundación: juega partidas enteras entre bots para medir la duración, quién gana según el orden de turno, cuánto pesa el mapa y qué se construye.
// Uso: node simulador/fundacion.js [partidas por configuración] [meta]
const path = require('path');
const { MesaFundacion, FASE } = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'mesa_fundacion.js'));
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));

const PARTIDAS = Number(process.argv[2]) || 200, META = Number(process.argv[3]) || 10;

function jugar(jugadores, semilla, meta) {
  const reloj = { t: 1000000 };
  const m = new MesaFundacion({ modo: 'multi', asientos: jugadores, bots: 0, meta, azar: R.rng(semilla), ahora: () => reloj.t });
  for (let i = 0; i < jugadores; i++) m.jugadores.push(Object.assign(MesaFundacion._nuevo('bot' + i, 'Bot' + i, i), { bot: true }));
  m._empezar();
  for (let i = 0; i < 40000 && m.fase !== FASE.FIN; i++) { reloj.t += 3000; m.avanzar(); }
  return m;
}

console.log('Fundación: ' + PARTIDAS + ' partidas por configuración, meta ' + META + '\n');
for (const jug of [1, 2, 3, 4, 6, 8]) {
  let terminadas = 0, rondas = 0, turnosTotales = 0, puntosGanador = 0; const gana = new Array(jug).fill(0); let construidos = { camino: 0, pueblo: 0, ciudad: 0, caballero: 0 };
  const rondasLista = [];
  for (let k = 0; k < PARTIDAS; k++) {
    const m = jugar(jug, 1000 * jug + k, META);
    if (m.fase !== FASE.FIN) continue;
    terminadas++; rondas += m.ronda; rondasLista.push(m.ronda); puntosGanador += m.fin.ganador ? m.fin.ganador.puntos : 0;
    const orden = m.orden.indexOf(m.fin.ganador.asiento); if (orden >= 0) gana[orden]++;
    m.fin.ranking.forEach(r => { construidos.pueblo += r.pueblos; construidos.ciudad += r.ciudades; construidos.camino += r.caminos; construidos.caballero += r.caballeros; });
  }
  rondasLista.sort((a, b) => a - b);
  const med = rondasLista.length ? rondasLista[Math.floor(rondasLista.length / 2)] : 0;
  console.log(jug + ' jugador' + (jug > 1 ? 'es' : '') + ' (mapa de ' + (jug > 4 ? 37 : 19) + '): terminan ' + terminadas + '/' + PARTIDAS + ' · rondas promedio ' + (rondas / Math.max(1, terminadas)).toFixed(1) + ' (mediana ' + med + ', máximo ' + (rondasLista[rondasLista.length - 1] || 0) + ') · puntos del ganador ' + (puntosGanador / Math.max(1, terminadas)).toFixed(1));
  if (jug > 1) console.log('   gana según el orden de turno (1.º a último): ' + gana.map(g => Math.round(g / Math.max(1, terminadas) * 100) + ' %').join(' · '));
  const n = Math.max(1, terminadas * jug);
  console.log('   por jugador al final: ' + (construidos.pueblo / n).toFixed(1) + ' pueblos, ' + (construidos.ciudad / n).toFixed(1) + ' ciudades, ' + (construidos.camino / n).toFixed(1) + ' caminos, ' + (construidos.caballero / n).toFixed(1) + ' caballeros');
}
