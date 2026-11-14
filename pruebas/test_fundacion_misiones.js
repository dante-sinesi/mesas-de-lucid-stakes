'use strict';
// Pruebas de las misiones y los pedidos de Fundación: la red de caminos, las misiones de condición, los pedidos y sus tarjetas, el vencimiento por turnos y la reposición.
// Uso: node pruebas/test_fundacion_misiones.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const M = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'misiones.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

const mapa = R.crearMapa(11, 4);

// ---------- la red de caminos ----------
{
  const t = R.nuevoTablero(mapa);
  check(M.redMayor(mapa, t, 0) === 0, 'sin caminos no hay red');
  // una cadena de 5 caminos conectados saliendo de un vértice
  let v = mapa.vertices[0].id; const cadena = [];
  for (let i = 0; i < 5; i++) {
    const e = mapa.vertices[v].aristas.map(x => mapa.aristas[x]).find(x => t.aris[x.id] === -1 && !cadena.includes(x.id)); t.aris[e.id] = 0; cadena.push(e.id); v = e.a === v ? e.b : e.a;
  }
  check(M.redMayor(mapa, t, 0) === 5, 'cinco caminos seguidos son una red de 5');
  check(M.redMayor(mapa, t, 1) === 0, 'la red es de cada jugador');
  // un pueblo de otro corta la red
  const medio = mapa.aristas[cadena[2]], corte = mapa.aristas[cadena[1]].a === medio.a || mapa.aristas[cadena[1]].b === medio.a ? medio.a : medio.b;
  R.poner(t, 'pueblo', 1, corte);
  check(M.redMayor(mapa, t, 0) < 5, 'un pueblo de otro jugador en medio corta la red');
}

// ---------- las misiones de condición ----------
{
  const t = R.nuevoTablero(mapa), g = M.nuevoGrupo(R.rng(1));
  check(g.activas.filter(m => M.DEFS[m.id].clase === 'A').length === 2 && g.activas.filter(m => M.DEFS[m.id].clase === 'B').length === 2, 'el grupo nace con 2 misiones y 2 pedidos a la vista');
  check(new Set(g.activas.map(m => m.id)).size === 4, 'no se repiten a la vista');
  const a = g.activas.find(m => M.DEFS[m.id].clase === 'A').id;
  check(M.cumplidas(g, mapa, t, 0).length === 0, 'al empezar nadie cumple nada');
  // se arma una situación que cumple la misión
  const g2 = { turno: 0, activas: [{ id: 'ciudades2', nacido: 0, por: null }, { id: 'pueblos4', nacido: 0, por: null }] };
  R.poner(t, 'ciudad', 0, 0); check(M.cumplidas(g2, mapa, t, 0).length === 0, 'con una ciudad todavía no se cumple «2 ciudades»');
  R.poner(t, 'ciudad', 0, 10); check(M.cumplidas(g2, mapa, t, 0).join() === 'ciudades2', 'con 2 ciudades se cumple «2 ciudades»');
  check(M.tomar(g2, 'ciudades2', 0) && !M.tomar(g2, 'ciudades2', 1), 'se la lleva el primero y nadie más');
  check(M.cumplidas(g2, mapa, t, 0).length === 0 && M.cumplidas(g2, mapa, t, 1).length === 0, 'una misión tomada ya no se ofrece');
  check(typeof a === 'string', 'las misiones tienen nombre');
}

// ---------- los pedidos ----------
{
  check(JSON.stringify(M.entrega('par', [2, 2, 0, 0, 1])) === '[2,2,0,0,0]' && M.entrega('par', [2, 1, 0, 0, 5]) === null, 'un pedido fijo entrega justo lo que pide, o no se puede');
  check(JSON.stringify(M.entrega('iguales3', [3, 1, 0, 0, 0])) === '[3,0,0,0,0]' && JSON.stringify(M.entrega('iguales3', [1, 1, 4, 0, 0])) === '[0,0,3,0,0]' && M.entrega('iguales3', [2, 2, 2, 0, 0]) === null, '3 iguales entrega 3 del que más tiene; con menos de 3 de cada uno, no');
  check(JSON.stringify(M.entrega('surtido', [1, 1, 1, 1, 1])) === '[1,1,1,1,1]' && M.entrega('surtido', [2, 2, 2, 2, 0]) === null, 'el surtido pide una de cada');
  check(M.entrega('red5', [9, 9, 9, 9, 9]) === null, 'una misión de condición no se entrega');
}

// ---------- el pedido de «3 tarjetas cualesquiera» ----------
{
  check(M.PEDIDOS.cualquiera3 && M.IDS.B.includes('cualquiera3') && M.IDS.B.length === 6, '«3 cualesquiera» es uno de los 6 pedidos que entran al grupo');
  check(M.describe('cualquiera3').cualquiera === 3 && M.describe('cualquiera3').costo === null, 'el pedido se describe para el cliente');
  check(JSON.stringify(M.entrega('cualquiera3', [4, 1, 0, 0, 0])) === '[3,0,0,0,0]', 'entrega las 3 del recurso que más hay');
  check(JSON.stringify(M.entrega('cualquiera3', [2, 2, 0, 0, 0])) === '[2,1,0,0,0]', 'con empate saca de a una, alternando, empezando por el primero');
  check(JSON.stringify(M.entrega('cualquiera3', [1, 1, 1, 0, 0])) === '[1,1,1,0,0]' && M.entrega('cualquiera3', [1, 1, 0, 0, 0]) === null, 'con menos de 3 tarjetas no se puede');
}

// ---------- el vencimiento por turnos y la reposición ----------
{
  const g = { turno: 0, activas: [{ id: 'par', nacido: 0, por: null }, { id: 'red5', nacido: 0, por: null }] };
  check(M.duracion(4) === 8 && M.duracion(8) === 16 && M.duracion(1) === R.CFG.pedidoMin && M.duracion(2) === Math.max(4, R.CFG.pedidoMin), 'un pedido dura 2 turnos de cada jugador (con un mínimo en solitario)');
  check(M.quedanTurnos(g, g.activas[0], 4) === 8 && M.quedanTurnos(g, g.activas[1], 4) === null, 'los pedidos cuentan turnos; las misiones de condición no vencen');
  let vencio = null;
  for (let i = 1; i <= 8; i++) { const r = M.finDeTurno(g, R.rng(i), 4); if (r.salen.some(x => x.id === 'par') && vencio === null) vencio = i; }
  check(vencio === 8, 'con 4 jugadores un pedido vence a los 8 turnos (venció en ' + vencio + ')');
  check(g.activas.some(m => m.id === 'red5'), 'la misión de condición sigue después de muchos turnos');
  check(g.activas.filter(m => M.DEFS[m.id].clase === 'B').length === 2 && g.activas.filter(m => M.DEFS[m.id].clase === 'A').length === 2, 'lo que vence se repone: siempre 2 y 2 a la vista');
}
{
  // quien entrega un pedido: queda tomado, y se repone recién al terminar el turno
  const g = { turno: 5, activas: [{ id: 'par', nacido: 5, por: null }, { id: 'pareja', nacido: 5, por: null }, { id: 'red5', nacido: 0, por: null }, { id: 'pueblos4', nacido: 0, por: null }] };
  M.tomar(g, 'par', 2);
  check(g.activas.length === 4 && g.activas.find(m => m.id === 'par').por === 2, 'el pedido entregado queda marcado hasta que termina el turno');
  const r = M.finDeTurno(g, R.rng(4), 3);
  check(r.salen.length === 1 && r.salen[0].id === 'par' && r.salen[0].por === 2 && r.entran.length === 1 && g.activas.length === 4 && !g.activas.some(m => m.id === 'par'), 'al terminar el turno de quien lo entregó, sale y se repone otro');
}

console.log('pruebas de las misiones de Fundación terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
