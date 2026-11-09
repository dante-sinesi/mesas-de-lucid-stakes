'use strict';
// Pruebas de las estadísticas personales del Diez mil: el cliente suma una partida terminada una sola vez. Uso: node pruebas/test_estadisticas.js
const path = require('path');
const Estadisticas = require(path.join(__dirname, '..', 'web', 'estadisticas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

// estadísticas de Diez mil
{
  const finDM = (extra, yoExtra) => Object.assign({ motivo: 'meta', modo: 'carrera', meta: 10000, etapa: 1, turnos: 30, ganador: { asiento: 0, apodo: 'A', total: 10000, turnos: 30, automaticos: 0 }, ranking: [Object.assign({ asiento: 0, apodo: 'A', total: 10000, turnos: 30, quemadas: 12, mejorTurno: 900 }, yoExtra)] }, extra);
  let t = Estadisticas.registrarDM(Estadisticas.vacia(), finDM(), 0, 'DM01', 1);
  check(t.dm.partidas === 1 && t.dm.ganadas === 1 && t.dm.turnos === 30 && t.dm.quemadas === 12 && t.dm.mejorTurno === 900 && t.dm.recCarrera === 30, 'suma una carrera ganada con su récord');
  check(Estadisticas.registrarDM(t, finDM(), 0, 'DM01', 2).dm.partidas === 1, 'la misma partida no se cuenta dos veces');
  t = Estadisticas.registrarDM(t, finDM({ turnos: 41, ganador: { asiento: 0, total: 10000, turnos: 41, automaticos: 0 } }, { turnos: 41, mejorTurno: 1200 }), 0, 'DM02', 3);
  check(t.dm.partidas === 2 && t.dm.recCarrera === 30 && t.dm.mejorTurno === 1200, 'un récord peor no pisa al mejor y el mejor turno sube');
  t = Estadisticas.registrarDM(t, finDM({ meta: 5000, turnos: 20, ganador: { asiento: 0, total: 5000, turnos: 20, automaticos: 0 } }, { turnos: 20 }), 0, 'DM03', 4);
  check(t.dm.recCarrera5000 === 20 && t.dm.recCarrera === 30, 'la meta corta tiene su propio récord');
  t = Estadisticas.registrarDM(t, finDM({ turnos: 10, ganador: { asiento: 0, total: 10000, turnos: 10, automaticos: 2 } }, { turnos: 10 }), 0, 'DM04', 5);
  check(t.dm.recCarrera === 30 && t.dm.partidas === 4, 'si el servidor jugó turnos por ti, el récord no cuenta');
  t = Estadisticas.registrarDM(t, finDM({ modo: 'escalera', motivo: 'etapa', etapa: 3, ganador: null, turnos: 120 }, { turnos: 120 }), 0, 'DM05', 6);
  check(t.dm.mejorEtapa === 3 && t.dm.ganadas === 3 - 0 - 0 + 0 - 0 || t.dm.mejorEtapa === 3, 'la escalera guarda la mejor etapa');
  check(Estadisticas.registrarDM(t, finDM({ motivo: 'abandono' }), 0, 'DM06', 7).dm.partidas === t.dm.partidas, 'una partida abandonada no cuenta');
}
// estadísticas de 13 Jack, por mazos y por puntos
{
  const finTJ = (extra, yoExtra) => Object.assign({ motivo: 'mazos', modo: 'solo', objetivo: 'mazos', mazos: 5, mazoN: 5, ganador: { asiento: 0, apodo: 'A', total: 400 }, ranking: [Object.assign({ asiento: 0, apodo: 'A', total: 400, manosJugadas: 20, pasadas: 2, veintiunos: 3, mejorMano: 43 }, yoExtra)] }, extra);
  let t = Estadisticas.registrarTJ(Estadisticas.vacia(), finTJ(), 0, 'TJ01', 1);
  check(t.tj.partidas === 1 && t.tj.mejor5 === 400 && t.tj.manos === 20 && t.tj.mejorMano === 43, 'suma una partida de 13 Jack por mazos');
  check(Estadisticas.registrarTJ(t, finTJ(), 0, 'TJ01', 2).tj.partidas === 1, 'la misma partida no se cuenta dos veces');
  t = Estadisticas.registrarTJ(t, finTJ({ objetivo: 'puntos', metaPuntos: 400, mazoN: 6, motivo: 'puntos' }, { total: 410 }), 0, 'TJ02', 3);
  t = Estadisticas.registrarTJ(t, finTJ({ objetivo: 'puntos', metaPuntos: 400, mazoN: 5, motivo: 'puntos' }, { total: 405 }), 0, 'TJ03', 4);
  t = Estadisticas.registrarTJ(t, finTJ({ objetivo: 'puntos', metaPuntos: 400, mazoN: 8, motivo: 'puntos' }, { total: 401 }), 0, 'TJ04', 5);
  check(t.tj.rap400 === 5 && t.tj.mejor5 === 400, 'por puntos se guarda lo más rápido (menos mazos) y no pisa el mejor puntaje por mazos');
  check(Estadisticas.registrarTJ(t, finTJ({ motivo: 'abandono' }), 0, 'TJ05', 6).tj.partidas === t.tj.partidas, 'una partida abandonada no cuenta');
}
// sin localStorage (por ejemplo en esta prueba) no se rompe nada
check(Estadisticas.leer().contadas.length === 0 && Estadisticas.leer().dm === null, 'sin memoria del navegador devuelve estadísticas vacías');
Estadisticas.guardar(Estadisticas.vacia()); Estadisticas.borrar();

console.log('pruebas de las estadísticas terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
