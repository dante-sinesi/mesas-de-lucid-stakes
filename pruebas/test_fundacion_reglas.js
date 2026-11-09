'use strict';
// Pruebas de las reglas de Fundación: el mapa, los costos con el oro, la probabilidad, los lugares válidos, la producción con el bandido y el caballero, y los puntos y las carreras.
// Uso: node pruebas/test_fundacion_reglas.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };
const cerca = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// ---------- el mapa ----------
for (const [jug, hexes, vert, aris] of [[1, 19, 54, 72], [4, 19, 54, 72], [5, 37, 96, 132], [8, 37, 96, 132]]) {
  const m = R.crearMapa(7, jug);
  check(m.hexes.length === hexes, 'el mapa de ' + jug + ' jugadores tiene ' + hexes + ' hexágonos (tiene ' + m.hexes.length + ')');
  check(m.vertices.length === vert, 'el mapa de ' + hexes + ' hexágonos tiene ' + vert + ' vértices (tiene ' + m.vertices.length + ')');
  check(m.aristas.length === aris, 'el mapa de ' + hexes + ' hexágonos tiene ' + aris + ' aristas (tiene ' + m.aristas.length + ')');
  check(m.hexes.filter(h => h.tipo === 'desierto').length === 1 && m.hexes[m.desierto].tipo === 'desierto', 'hay un solo desierto');
  check(m.hexes.every(h => (h.tipo === 'desierto') === (h.num === 0)), 'solo el desierto no tiene número');
  check(m.hexes.every(h => h.vertices.length === 6 && new Set(h.vertices).size === 6), 'cada hexágono tiene 6 vértices distintos');
  check(m.vertices.every(v => v.vecinos.length >= 2 && v.vecinos.length <= 3 && v.hexes.length >= 1 && v.hexes.length <= 3), 'cada vértice toca de 1 a 3 hexágonos y tiene 2 o 3 vecinos');
  check(m.hexes.every(h => !(h.num === 6 || h.num === 8) || h.vecinos.every(v => !(m.hexes[v].num === 6 || m.hexes[v].num === 8))), 'ningún 6 u 8 queda pegado a otro');
  const por = {}; m.hexes.forEach(h => { por[h.tipo] = (por[h.tipo] || 0) + 1; });
  check(Object.keys(por).length === 6, 'están los 6 tipos de hexágono');
}
check(JSON.stringify(R.crearMapa(3, 4).hexes.map(h => [h.tipo, h.num])) === JSON.stringify(R.crearMapa(3, 4).hexes.map(h => [h.tipo, h.num])), 'la misma semilla da la misma isla');
check(JSON.stringify(R.crearMapa(3, 4).hexes.map(h => [h.tipo, h.num])) !== JSON.stringify(R.crearMapa(4, 4).hexes.map(h => [h.tipo, h.num])), 'otra semilla da otra isla');
{ const m = R.crearMapa(5, 4), c = m.hexes.filter(h => h.num); const n = {}; c.forEach(h => { n[h.num] = (n[h.num] || 0) + 1; }); check(n[2] === 1 && n[12] === 1 && n[6] === 2 && n[8] === 2 && n[7] === undefined, 'los números del mapa de 19 son los de siempre (sin 7)'); }

// ---------- los costos y los dados ----------
const C = R.COSTOS;
check(R.alcanza(C.camino, [0, 1, 4, 4, 4, 4]) && !R.alcanza(C.camino, [0, 0, 4, 4, 4, 4]), 'un camino pide madera y ladrillo');
check(R.alcanza(C.pueblo, [0, 1, 2, 3, 4, 4]) && !R.alcanza(C.pueblo, [0, 1, 2, 4, 4, 4]), 'un pueblo pide madera, ladrillo, lana y trigo');
check(R.alcanza(C.ciudad, [4, 4, 4, 3, 3, 0]) && !R.alcanza(C.ciudad, [4, 4, 3, 3, 3, 0]), 'una ciudad pide 3 de mineral y 2 de trigo');
check(R.alcanza(C.camino, [0, 5, 5, 4, 4, 4]), '2 oros valen un recurso que falta (madera)');
check(!R.alcanza(C.camino, [0, 5, 4, 4, 4, 4]), 'un solo oro no alcanza');
check(R.alcanza(C.camino, [5, 5, 5, 5, 4, 4]), '4 oros valen madera y ladrillo');
{ const r = R.pagar(C.pueblo, [0, 1, 2, 3, 4, 5]); check(r.ok && r.usados.length === 4 && !r.usados.includes(4) && !r.usados.includes(5), 'se usan los dados justos y los demás se pierden'); }
{ const r = R.pagar(C.camino, [1, 5, 5, 4, 4, 2]); check(r.ok && r.usados.includes(1) && r.usados.includes(2) && r.usados.length === 3, 'con el ladrillo y 2 oros se paga un camino'); }
check(R.alcanza(C.caballero, [2, 3, 4, 0, 0, 0]), 'un caballero pide lana, trigo y mineral');

// ---------- la probabilidad ----------
check(cerca(R.probabilidad(C.camino, [0, 1], 4, 2), 1), 'si ya tienes todo, es 100 %');
check(cerca(R.probabilidad(C.camino, [0, 1], 4, 0), 1), 'ya alcanzado sin tiradas, 100 %');
check(cerca(R.probabilidad(C.pueblo, [0, 1, 2], 3, 0), 0), 'sin tiradas y sin lo que falta, 0 %');
check(cerca(R.probabilidad(C.pueblo, [0, 1, 2], 3, 1), 1 - (Math.pow(4 / 6, 3) + 3 * (1 / 6) * Math.pow(4 / 6, 2)), 1e-9), 'falta un trigo con 3 dados y una tirada: sale un trigo o 2 oros');
{ // con 2 tiradas: la primera con 3 dados, y si no sale se tiran otra vez; el oro también puede ayudar al final
  const p2 = R.probabilidad(C.pueblo, [0, 1, 2], 3, 2); check(p2 > R.probabilidad(C.pueblo, [0, 1, 2], 3, 1) && p2 <= 1, 'una tirada más sube la probabilidad');
  check(p2 > 0.7 && p2 < 0.8, 'con 2 tiradas el pueblo (falta el trigo) ronda el 75 %');
}
check(R.probabilidad(C.ciudad, [], 5, 3) < 0.1 && R.probabilidad(C.ciudad, [], 5, 3) > 0, 'una ciudad desde cero con 5 dados es muy difícil pero posible');
check(R.probabilidad(C.pueblo, [0, 1, 2, 3], 2, 1) === 1, 'un pueblo ya completo es 100 %');
check(R.probabilidad(C.camino, [5, 5, 5, 5], 2, 1) === 1 && R.probabilidad(C.camino, [5, 5], 4, 1) > 0 && R.probabilidad(C.camino, [5, 5], 4, 1) < 1, 'los oros guardados cuentan como comodines (hacen falta 2 por recurso)');
{ const t = R.tabla(['camino', 'pueblo'], [0], [1, 2, 3, 5, 4], 1); check(t.camino.length === 32 && t.pueblo.length === 32, 'la tabla tiene una entrada por cada conjunto de dados guardados'); check(t.camino[1 << 0] === 100, 'guardando el ladrillo (con la madera fijada) el camino es 100 %'); check(t.camino[0] < 100 && t.camino[0] > 0, 'sin guardar nada hay una probabilidad intermedia'); }

// ---------- los lugares válidos ----------
const mapa = R.crearMapa(11, 4);
let tab = R.nuevoTablero(mapa);
check(tab.bandido === mapa.desierto, 'el bandido empieza en el desierto');
const todos = R.lugaresPueblo(mapa, tab, 0, true);
check(todos.length === mapa.vertices.length, 'al empezar se puede poner un pueblo en cualquier vértice');
check(R.lugaresPueblo(mapa, tab, 0, false).length === 0, 'sin caminos no se puede poblar fuera de la colocación inicial');
const v0 = todos[10]; R.poner(tab, 'pueblo', 0, v0);
check(!R.lugaresPueblo(mapa, tab, 1, true).includes(v0) && mapa.vertices[v0].vecinos.every(w => !R.lugaresPueblo(mapa, tab, 1, true).includes(w)), 'regla de distancia: no se puebla pegado a otro pueblo');
const ini = R.lugaresCamino(mapa, tab, 0, v0); check(ini.length === mapa.vertices[v0].aristas.length, 'el primer camino sale del pueblo recién puesto');
R.poner(tab, 'camino', 0, ini[0]);
const lc = R.lugaresCamino(mapa, tab, 0); check(lc.length > 0 && !lc.includes(ini[0]) && lc.every(e => tab.aris[e] === -1), 'los caminos siguientes continúan los tuyos');
check(R.lugaresCamino(mapa, tab, 1).length === 0, 'otro jugador sin piezas no tiene dónde poner un camino');
{ // un camino no pasa por el pueblo de otro
  const e = mapa.aristas[ini[0]], otro = (mapa.vertices[e.a].id === v0 ? e.b : e.a);
  const t2 = R.nuevoTablero(mapa); R.poner(t2, 'pueblo', 0, v0); R.poner(t2, 'camino', 0, ini[0]); R.poner(t2, 'pueblo', 1, otro);
  check(!R.lugaresCamino(mapa, t2, 0).some(x => { const ar = mapa.aristas[x]; return (ar.a === otro || ar.b === otro) && x !== ini[0]; }), 'no se sigue por un vértice donde hay un pueblo de otro');
}
check(R.lugaresCiudad(mapa, tab, 0).join() === String(v0) && R.lugaresCiudad(mapa, tab, 1).length === 0, 'la ciudad mejora un pueblo tuyo');
const dest = R.lugaresPueblo(mapa, tab, 0, false); check(dest.length >= 0 && dest.every(v => !tab.vert[v]), 'los pueblos siguientes van donde llega un camino tuyo');
check(R.lugaresCaballero(mapa, tab, 0).length === mapa.vertices[v0].hexes.length, 'un caballero va en un hexágono donde tienes un edificio');
R.poner(tab, 'caballero', 0, mapa.vertices[v0].hexes[0]);
check(R.lugaresCaballero(mapa, tab, 0).length === mapa.vertices[v0].hexes.length - 1, 'un caballero por jugador en cada hexágono');
check(R.lugaresCaballero(mapa, tab, 1).length === 0, 'sin edificios no hay caballero');
check(R.ordenInicial(3).join() === '0,1,2,2,1,0', 'la colocación inicial va en serpiente');
{ // piezas agotadas
  const t3 = R.nuevoTablero(mapa); let n = 0; for (const e of mapa.aristas) { if (n >= 15) break; t3.aris[e.id] = 0; n++; }
  check(R.quedan(t3, 0).camino === 0 && R.lugaresCamino(mapa, t3, 0).length === 0, 'con los 15 caminos puestos no se ofrece otro');
  R.poner(t3, 'caballero', 0, 0); R.poner(t3, 'caballero', 0, 1); R.poner(t3, 'caballero', 0, 2); check(R.quedan(t3, 0).caballero === 0, 'tope de 3 caballeros');
}
{ // posibles
  const t4 = R.nuevoTablero(mapa); R.poner(t4, 'pueblo', 0, v0); R.poner(t4, 'camino', 0, ini[0]);
  const p0 = R.posibles(mapa, t4, 0, [0, 1, 2, 3, 4, 4]);
  check(p0.includes('camino') && !p0.includes('pueblo') && p0.includes('caballero'), 'con un solo camino todavía no hay dónde poblar (queda pegado al pueblo)');
  R.poner(t4, 'camino', 0, R.lugaresCamino(mapa, t4, 0)[0]);
  const p = R.posibles(mapa, t4, 0, [0, 1, 2, 3, 4, 4]);
  check(p.includes('camino') && p.includes('pueblo') && !p.includes('ciudad') && p.includes('caballero'), 'se ofrecen solo los edificios que alcanzan y tienen lugar (camino, pueblo y caballero; no la ciudad)');
  check(!R.posibles(mapa, t4, 0, [4, 4, 4, 4, 4, 4]).length, 'sin recursos no se ofrece nada');
  check(R.posibles(mapa, t4, 0, [3, 3, 3, 4, 4, 4]).includes('ciudad') && R.posibles(mapa, t4, 0, [3, 3, 3, 4, 4, 4]).includes('ciudad'), 'con 3 de mineral y 2 de trigo y un pueblo propio, se ofrece la ciudad');
}

// ---------- la producción y el bandido ----------
{
  const m = R.crearMapa(21, 2), t = R.nuevoTablero(m);
  const h = m.hexes.find(x => x.num === 9 || x.num === 10 || x.num === 5 || x.num === 4), v = h.vertices[0];
  R.poner(t, 'pueblo', 0, v); R.poner(t, 'ciudad', 1, h.vertices[3]);
  const g = R.produccion(m, t, h.num, 2);
  check(g[0].includes(R.RECURSO_DE[h.tipo]) && g[0].length >= 1, 'un pueblo gana 1 recurso del hexágono que produce');
  check(g[1].length >= 2 && g[1].every(r => r === R.RECURSO_DE[h.tipo] || true), 'una ciudad gana 2');
  check(R.produccion(m, t, 7, 2).every(l => l.length === 0), 'con 7 no produce nadie');
  t.bandido = h.id; const b = R.produccion(m, t, h.num, 2);
  check(b[0].length === 0 || b[0].every(x => x !== R.RECURSO_DE[h.tipo]) || m.hexes.filter(x => x.num === h.num && x.id !== h.id).length > 0, 'el bandido bloquea su hexágono');
  R.poner(t, 'caballero', 0, h.id); const c = R.produccion(m, t, h.num, 2);
  check(c[0].length >= 1 && c[1].length <= b[1].length, 'con un caballero en el hexágono el bandido no te afecta (y al otro sí)');
  const t2 = R.nuevoTablero(m); for (const v2 of h.vertices) R.poner(t2, v2 === h.vertices[0] ? 'ciudad' : 'pueblo', 0, v2);
  check(R.produccion(m, t2, h.num, 2)[0].length <= R.TOPE_FIJOS, 'la producción se corta en 4 dados fijados');
  const azar = R.rng(5); const ant = t.bandido; const nuevo = R.moverBandido(m, t, azar); check(nuevo !== ant && t.bandido === nuevo, 'el bandido salta a otro hexágono');
  const n = R.tirarNumeros(R.rng(9)); check(n.suma === n.a + n.b && n.a >= 1 && n.b <= 6, 'dos dados de número');
}

// ---------- puntos y carreras ----------
{
  const m = R.crearMapa(2, 3), t = R.nuevoTablero(m);
  R.poner(t, 'pueblo', 0, 0); R.poner(t, 'ciudad', 1, 20);
  let car = R.carreras(t, 3, null);
  check(R.puntos(t, 0, car) === 1 && R.puntos(t, 1, car) === 2 && R.puntos(t, 2, car) === 0, 'pueblo 1 punto, ciudad 2');
  for (let i = 0; i < 5; i++) t.aris[i] = 0;
  car = R.carreras(t, 3, car); check(car.camino === 0 && R.puntos(t, 0, car) === 3, '5 caminos dan «Camino más largo» (+2)');
  for (let i = 5; i < 10; i++) t.aris[i] = 1;
  car = R.carreras(t, 3, car); check(car.camino === 0, 'con lo mismo no se lo quitan al que lo tenía');
  t.aris[10] = 1; car = R.carreras(t, 3, car); check(car.camino === 1, 'con un camino más se lo quitan');
  R.poner(t, 'caballero', 2, 0); car = R.carreras(t, 3, car); check(car.ejercito === null, 'con 1 caballero no hay ejército');
  R.poner(t, 'caballero', 2, 1); car = R.carreras(t, 3, car); check(car.ejercito === 2 && R.puntos(t, 2, car) === 2, 'con 2 caballeros hay ejército (+2)');
  R.poner(t, 'caballero', 0, 0); R.poner(t, 'caballero', 0, 1); car = R.carreras(t, 3, car); check(car.ejercito === 2, 'con 2 iguales se queda el que lo tenía');
  R.poner(t, 'caballero', 0, 2); car = R.carreras(t, 3, car); check(car.ejercito === 0, 'con 3 caballeros se lo quitan');
}

console.log('pruebas de las reglas de Fundación terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
