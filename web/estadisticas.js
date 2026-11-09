'use strict';
// Las estadísticas de cada persona, guardadas solo en su dispositivo (localStorage). Esta parte no toca la pantalla: suma los números de una partida terminada.
// (La clave de memoria 'bj_stats' viene de la primera versión: se mantiene para no borrar lo que ya tiene cada jugador.)

const Estadisticas = (() => {
  const CLAVE = 'bj_stats';
  const vacia = () => ({ contadas: [], dm: null, tj: null });

  // Suma al total una partida de Diez mil terminada (carrera, escalera o con amigos). Las abandonadas no cuentan.
  function registrarDM(total, fin, asiento, sala, fecha) {
    const t = Object.assign(vacia(), total || {});
    const yo = fin && fin.ranking && fin.ranking.find(r => r.asiento === asiento);
    if (!yo || !(yo.turnos > 0) || fin.motivo === 'abandono') return t;
    const marca = 'DM:' + sala + ':' + fin.turnos + ':' + (fin.etapa || 1) + ':' + yo.total;
    if (t.contadas.includes(marca)) return t;
    const d = Object.assign({ partidas: 0, ganadas: 0, turnos: 0, quemadas: 0, mejorTurno: 0, recCarrera: 0, recCarrera5000: 0, mejorEtapa: 0 }, t.dm);
    d.partidas++;
    d.turnos += yo.turnos; d.quemadas += yo.quemadas || 0; d.mejorTurno = Math.max(d.mejorTurno, yo.mejorTurno || 0);
    const gano = !!(fin.ganador && (fin.ganador.asiento === asiento || (fin.empatados || []).includes(asiento)) && fin.motivo === 'meta');
    if (gano) d.ganadas++;
    if (gano && fin.modo === 'carrera' && !(fin.ganador.automaticos > 0)) {
      const k = fin.meta === 5000 ? 'recCarrera5000' : 'recCarrera';
      if (!d[k] || yo.turnos < d[k]) d[k] = yo.turnos;
    }
    if (fin.modo === 'escalera') d.mejorEtapa = Math.max(d.mejorEtapa, fin.etapa || 1);
    t.dm = d;
    t.contadas = t.contadas.concat([marca]).slice(-20);
    return t;
  }

  // Suma al total una partida de 13 Jack terminada. Las abandonadas no cuentan.
  function registrarTJ(total, fin, asiento, sala, fecha) {
    const t = Object.assign(vacia(), total || {});
    const yo = fin && fin.ranking && fin.ranking.find(r => r.asiento === asiento);
    if (!yo || !(yo.manosJugadas > 0) || fin.motivo === 'abandono') return t;
    const marca = 'TJ:' + sala + ':' + (fin.objetivo === 'puntos' ? 'p' + fin.metaPuntos : fin.mazos) + ':' + yo.total + ':' + yo.manosJugadas;
    if (t.contadas.includes(marca)) return t;
    const d = Object.assign({ partidas: 0, ganadas: 0, manos: 0, veintiunos: 0, pasadas: 0, mejorMano: 0, mejor3: 0, mejor5: 0, mejor8: 0 }, t.tj);
    d.partidas++; d.manos += yo.manosJugadas; d.veintiunos += yo.veintiunos || 0; d.pasadas += yo.pasadas || 0; d.mejorMano = Math.max(d.mejorMano, yo.mejorMano || 0);
    if (fin.ganador && (fin.ganador.asiento === asiento || (fin.empatados || []).includes(asiento)) && fin.modo === 'multi') d.ganadas++;
    if (fin.objetivo === 'puntos') {   // por puntos: lo mejor es llegar en menos mazos
      const k = 'rap' + fin.metaPuntos;
      if (yo.total >= fin.metaPuntos && fin.mazoN > 0 && (!d[k] || fin.mazoN < d[k])) d[k] = fin.mazoN;
    } else { const k = 'mejor' + fin.mazos; if (k in d) d[k] = Math.max(d[k], yo.total); }
    t.tj = d;
    t.contadas = t.contadas.concat([marca]).slice(-20);
    return t;
  }

  const porcentaje = (a, b) => (b > 0 ? Math.round((a / b) * 100) + ' %' : '-');

  function leer() { try { return Object.assign(vacia(), JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (e) { return vacia(); } }
  function guardar(t) { try { localStorage.setItem(CLAVE, JSON.stringify(t)); } catch (e) { /* sin memoria: no se guarda */ } }
  function borrar() { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } }

  return { vacia, registrarDM, registrarTJ, porcentaje, leer, guardar, borrar };
})();

if (typeof module !== 'undefined') module.exports = Estadisticas;
