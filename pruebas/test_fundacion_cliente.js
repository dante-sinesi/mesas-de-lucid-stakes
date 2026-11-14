'use strict';
// Pruebas de la lógica pura del cliente de Fundación (web/fundacion.js): en qué escena está cada jugador, qué tarjetas se entregan por un pedido y que los datos que el cliente copia
// del servidor (costos, nombres de las misiones) no se desactualicen. No prueban el dibujo (eso se mira con capturas).
// Uso: node pruebas/test_fundacion_cliente.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const M = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'misiones.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

// el archivo del cliente se carga en un entorno vacío: solo declara datos y funciones (lo que necesita del navegador se usa recién al dibujar)
const codigo = fs.readFileSync(path.join(__dirname, '..', 'web', 'fundacion.js'), 'utf8');
const C = vm.runInNewContext(codigo + '\n;({ escenaFU, entregaFU, expandirFU, ganadoFU, jugadoresEnOrdenFU, claveTurnoFU, FU_COSTOS, FU_MISION, FU_ICONO_MISION, FU_NOMBRE_REC })', {});

// ---------- los datos copiados del servidor ----------
['camino', 'pueblo', 'ciudad', 'caballero'].forEach(e => check(JSON.stringify(C.FU_COSTOS[e]) === JSON.stringify(R.COSTOS[e]), 'el costo de «' + e + '» del cliente es el del servidor'));
check(C.FU_NOMBRE_REC.join() === R.RECURSOS.join(), 'los recursos del cliente están en el mismo orden que los del servidor');
Object.keys(M.DEFS).filter(id => M.IDS.A.includes(id) || M.IDS.B.includes(id)).forEach(id => check(typeof C.FU_MISION[id] === 'string', 'la misión o pedido «' + id + '» tiene su texto en el cliente'));
Object.keys(C.FU_ICONO_MISION).forEach(id => check(M.MISIONES[id], 'el icono de «' + id + '» es de una misión que existe'));

// ---------- la escena de cada jugador ----------
const e = (fase, turno, extra) => Object.assign({ fase, yo: 0, turno, inicial: null }, extra || {});
const t = (de, sub, extra) => Object.assign({ de, sub, terminado: false }, extra || {});
check(C.escenaFU(e('fin', null)) === 'fin', 'terminada la partida: escena final');
check(C.escenaFU(e('inicial', null, { inicial: { de: 0 } })) === 'inicial' && C.escenaFU(e('inicial', null, { inicial: { de: 1 } })) === 'inicialAjeno', 'en la colocación inicial: la tuya o la de otro');
check(C.escenaFU(e('turno', t(1, 'tirada'))) === 'tirada', 'en la tirada todos ven la tirada');
check(C.escenaFU(e('turno', t(0, 'descarte'))) === 'descarte' && C.escenaFU(e('turno', t(1, 'descarte'))) === 'descarteAjeno', 'el descarte propio o el ajeno');
check(C.escenaFU(e('turno', t(0, 'turno'))) === 'turno' && C.escenaFU(e('turno', t(1, 'turno'))) === 'turnoAjeno', 'el turno propio o el ajeno');
check(C.escenaFU(e('turno', t(0, 'colocar'))) === 'colocar' && C.escenaFU(e('turno', t(2, 'colocar'))) === 'colocarAjeno', 'colocar una pieza, propia o ajena');
check(C.escenaFU(e('turno', t(1, 'fin', { terminado: true }))) === 'finTurno', 'un turno terminado se ve como fin de turno');
check(C.escenaFU(e('espera', null)) === 'nada', 'fuera de la partida no hay escena');

// ---------- lo que se entrega por un pedido (lo decide el servidor; el cliente solo lo muestra y debe coincidir) ----------
const pedidos = Object.keys(M.PEDIDOS).filter(id => M.PEDIDOS[id].clase === 'B');
const manos = [[2, 2, 0, 0, 0], [0, 0, 2, 2, 0], [3, 1, 0, 0, 0], [0, 0, 0, 0, 3], [1, 1, 1, 1, 1], [4, 0, 1, 0, 0], [0, 1, 0, 0, 0], [3, 3, 3, 0, 0]];
pedidos.forEach(id => manos.forEach(mano => {
  const srv = M.entrega(id, mano), d = M.describe(id), cli = C.entregaFU({ costo: d.costo, iguales: d.iguales, cualquiera: d.cualquiera }, mano);
  check(JSON.stringify(srv) === JSON.stringify(cli), 'el cliente y el servidor entregan lo mismo para «' + id + '» con la mano ' + mano.join(','));
}));
check(C.expandirFU([2, 0, 1, 0, 0]).join() === '0,0,2', 'una tarjeta por unidad, en el orden de los recursos');

// ---------- las ganancias de las tiradas de un turno (puede haber varias o ninguna) ----------
{
  const t1 = { tiradas: [{ gana: [{ asiento: 1, mano: [0, 1, 0, 0, 0] }, { asiento: 0, mano: [1, 0, 0, 0, 0] }] }, { gana: [{ asiento: 0, mano: [0, 0, 2, 0, 0] }] }, { gana: [] }] };
  check(JSON.stringify(C.ganadoFU(t1)) === JSON.stringify([{ asiento: 0, mano: [1, 0, 2, 0, 0] }, { asiento: 1, mano: [0, 1, 0, 0, 0] }]), 'se suman las ganancias de todas las tiradas del turno por jugador');
  check(C.ganadoFU({ tiradas: [] }).length === 0 && C.ganadoFU({}).length === 0, 'un turno sin tiradas no tiene ganancias');
  check(C.claveTurnoFU({ ronda: 3 }, { de: 1, tiradas: [{ num: { a: 3, b: 5 } }, { num: { a: 1, b: 2 } }] }) !== C.claveTurnoFU({ ronda: 3 }, { de: 1, tiradas: [{ num: { a: 3, b: 5 } }] }) && C.claveTurnoFU({ ronda: 3 }, { de: 1, tiradas: [] }) !== C.claveTurnoFU({ ronda: 4 }, { de: 1, tiradas: [] }), 'cada turno tiene su clave, también el que no tiene tiradas');
}

// ---------- los jugadores se ordenan por el orden de la ronda ----------
{
  const js = [{ asiento: 0 }, { asiento: 1 }, { asiento: 2 }, { asiento: 3 }];
  check(C.jugadoresEnOrdenFU({ orden: [2, 0, 3, 1], jugadores: js }).map(j => j.asiento).join() === '2,0,3,1', 'de primero a último según el orden de la ronda');
  check(C.jugadoresEnOrdenFU({ orden: [], jugadores: js }).map(j => j.asiento).join() === '0,1,2,3', 'sin orden todavía (sala de espera), por asiento');
  check(C.jugadoresEnOrdenFU({ orden: [3, 1], jugadores: js }).map(j => j.asiento).join() === '3,1,0,2', 'los que no figuran en el orden van al final, por asiento');
}

console.log('pruebas del cliente de Fundación terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
