'use strict';
// Pruebas de las reglas de Fundación (versión 2): el mapa justo, las tarjetas y los costos, el descarte, los lugares válidos, la cobranza de todos con el bandido y el caballero, y los puntos y las carreras.
// Uso: node pruebas/test_fundacion_reglas.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

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
{ // el mapa justo: cada recurso tiene un número bueno (5 a 9) y puntitos suficientes, en cualquier semilla
  let injustos = 0;
  for (let s = 1; s <= 200; s++) for (const jug of [2, 6]) { const m = R.crearMapa(s, jug); if (!R.esJusto(m.hexes, m.radio)) injustos++; }
  check(injustos === 0, 'todos los mapas generados son justos (' + injustos + ' no lo son)');
  const m = R.crearMapa(9, 4); const mal = m.hexes.map(h => Object.assign({}, h, h.tipo === 'colinas' ? { num: 2 } : {}));
  check(!R.esJusto(mal, 2), 'un mapa donde un recurso solo tiene números bajos no es justo');
}

// ---------- las tarjetas, los costos y el descarte ----------
const C = R.COSTOS;
check(R.alcanza(C.camino, [1, 1, 0, 0, 0]) && !R.alcanza(C.camino, [0, 1, 0, 0, 0]), 'un camino pide madera y ladrillo');
check(R.alcanza(C.pueblo, [1, 1, 1, 1, 0]) && !R.alcanza(C.pueblo, [1, 1, 1, 0, 5]), 'un pueblo pide madera, ladrillo, lana y trigo');
check(R.alcanza(C.ciudad, [0, 0, 0, 2, 3]) && !R.alcanza(C.ciudad, [0, 0, 0, 2, 2]) && !R.alcanza(C.ciudad, [0, 0, 0, 1, 3]), 'una ciudad pide 3 de mineral y 2 de trigo');
check(R.alcanza(C.caballero, [0, 0, 1, 1, 1]) && !R.alcanza(C.caballero, [5, 5, 0, 1, 1]), 'un caballero pide lana, trigo y mineral');
check(JSON.stringify(R.pagar(C.pueblo, [2, 2, 1, 1, 1])) === JSON.stringify([1, 1, 0, 0, 1]) && R.pagar(C.pueblo, [0, 1, 1, 1, 1]) === null, 'al pagar queda el resto de la mano (y si no alcanza, nada)');
check(R.totalMano([1, 2, 3, 0, 0]) === 6 && JSON.stringify(R.sumarMano([1, 0, 0, 0, 0], [0, 2, 0, 0, 1])) === '[1,2,0,0,1]', 'se cuentan y se suman las tarjetas');
check(R.MANO_MAX === 6 && R.exceso([2, 2, 2, 0, 0]) === 0 && R.exceso([3, 3, 3, 0, 1]) === 4, 'la mano máxima es 6 y se sabe cuánto sobra');
check(R.descarteValido([3, 3, 3, 0, 1], [1, 1, 1, 0, 1]) && !R.descarteValido([3, 3, 3, 0, 1], [1, 1, 1, 0, 0]) && !R.descarteValido([3, 3, 3, 0, 1], [4, 0, 0, 0, 0]) && !R.descarteValido([3, 3, 3, 0, 1], [0, 0, 0, 1, 3]), 'hay que descartar justo lo que sobra y de lo que se tiene');
check(R.descarteValido([2, 0, 0, 0, 0], [0, 0, 0, 0, 0]), 'con 6 o menos, el descarte es no descartar nada');
{ const mano = [4, 3, 0, 0, 2], q = R.descarteAzar(mano, R.rng(3)); check(R.descarteValido(mano, q), 'el descarte al azar quita justo lo que sobra'); }
{ const m = R.crearMapa(5, 3), r = R.recursosDeVertice(m, m.hexes[3].vertices[0]); check(r.da.length >= 1 && r.da.every(x => x.num > 0) && r.da.length + r.faltan.length >= 3 && r.faltan.every(f => !r.da.some(d => d.recurso === f)), 'un vértice dice qué recursos da y cuáles le faltan'); }

{ // el tope de la mano puede crecer con la cantidad de jugadores (por omisión no crece: es una palanca de calibración)
  check(R.manoMax(2) === 6 && R.manoMax(4) === 6 && R.manoMax(8) === 6, 'por omisión la mano máxima es 6 con cualquier cantidad de jugadores');
  const ant = R.CFG.manoPorJugadorExtra; R.CFG.manoPorJugadorExtra = 1;
  check(R.manoMax(4) === 6 && R.manoMax(6) === 8 && R.manoMax(8) === 10 && R.manoMax(2) === 6, 'con la palanca en 1, cada jugador desde el quinto suma 1 al tope');
  R.CFG.manoPorJugadorExtra = ant;
  check(R.exceso([3, 3, 3, 0, 1], 8) === 2 && R.descarteValido([3, 3, 3, 0, 1], [1, 1, 0, 0, 0], 8) && !R.descarteValido([3, 3, 3, 0, 1], [1, 1, 1, 0, 1], 8), 'el descarte se calcula contra el tope que se le pasa');
  const q = R.descarteAzar([3, 3, 3, 0, 1], R.rng(2), 8); check(R.totalMano(q) === 2, 'con tope 8 y 10 tarjetas se descartan 2');
}
{ // el contorno de la isla: las cuentas de tipos se pueden cambiar para probar mapas con más colinas
  check(R.TIPOS_19 && R.TIPOS_19.colinas === 3 && R.TIPOS_37 && R.TIPOS_37.colinas === 7, 'la isla de 19 tiene 3 colinas y la de 37 tiene 7');
}

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
  const p0 = R.posibles(mapa, t4, 0, [1, 1, 1, 1, 1]);
  check(p0.includes('camino') && !p0.includes('pueblo') && p0.includes('caballero'), 'con un solo camino todavía no hay dónde poblar (queda pegado al pueblo)');
  R.poner(t4, 'camino', 0, R.lugaresCamino(mapa, t4, 0)[0]);
  const p = R.posibles(mapa, t4, 0, [1, 1, 1, 1, 1]);
  check(p.includes('camino') && p.includes('pueblo') && !p.includes('ciudad') && p.includes('caballero'), 'se ofrecen solo los edificios que alcanzan y tienen lugar (camino, pueblo y caballero; no la ciudad)');
  check(!R.posibles(mapa, t4, 0, [0, 0, 0, 0, 0]).length, 'sin tarjetas no se ofrece nada');
  check(R.posibles(mapa, t4, 0, [0, 0, 0, 2, 3]).includes('ciudad'), 'con 3 de mineral y 2 de trigo y un pueblo propio, se ofrece la ciudad');
}

// ---------- la cobranza de todos y el bandido ----------
{
  const m = R.crearMapa(21, 2), t = R.nuevoTablero(m);
  const h = m.hexes.find(x => x.num === 9 || x.num === 10 || x.num === 5 || x.num === 4), rec = R.RECURSO_DE[h.tipo];
  R.poner(t, 'pueblo', 0, h.vertices[0]); R.poner(t, 'ciudad', 1, h.vertices[3]);
  let pr = R.produccion(m, t, h.num, 2);
  check(pr.gana[0][rec] >= 1 && R.totalMano(pr.gana[0]) >= 1, 'un pueblo cobra 1 tarjeta del hexágono que produce');
  check(pr.gana[1][rec] >= 2, 'una ciudad cobra 2');
  check(pr.detalle.length >= 2 && pr.detalle.every(d => d.recurso !== undefined && d.vertice !== undefined), 'se informa de qué edificio sale cada tarjeta');
  check(pr.gana[0][rec] >= 1 && pr.gana[1][rec] >= 2, 'cobran todos, no solo uno');
  check(R.produccion(m, t, 7, 2).gana.every(g => R.totalMano(g) === 0), 'con 7 no cobra nadie');
  t.bandido = h.id; const b = R.produccion(m, t, h.num, 2);
  const otros = m.hexes.filter(x => x.num === h.num && x.id !== h.id).length;
  check(b.gana[0][rec] === 0 || otros > 0, 'el bandido bloquea su hexágono');
  R.poner(t, 'caballero', 0, h.id); const c = R.produccion(m, t, h.num, 2);
  check(c.gana[0][rec] >= 1 && c.gana[1][rec] <= b.gana[1][rec], 'con un caballero en el hexágono el bandido no te afecta (y al otro sí)');
  const azar = R.rng(5); const ant = t.bandido; const nuevo = R.moverBandido(m, t, azar); check(nuevo !== ant && t.bandido === nuevo, 'el bandido salta a otro hexágono');
  const n = R.tirarNumeros(R.rng(9)); check(n.suma === n.a + n.b && n.a >= 1 && n.b <= 6, 'dos dados de número');
  const dos = R.nuevoTablero(m); for (const v2 of h.vertices) R.poner(dos, v2 === h.vertices[0] ? 'ciudad' : 'pueblo', 0, v2);
  check(R.produccion(m, dos, h.num, 2).gana[0][rec] >= 7, 'sin tope: una ciudad y cinco pueblos cobran todo (la mano se recorta al descartar)');
}

// ---------- puntos y carreras ----------
{
  const m = R.crearMapa(2, 3), t = R.nuevoTablero(m);
  R.poner(t, 'pueblo', 0, 0); R.poner(t, 'ciudad', 1, 20);
  let car = R.carreras(t, 3, null);
  check(R.puntos(t, 0, car) === 1 && R.puntos(t, 1, car) === 2 && R.puntos(t, 2, car) === 0, 'pueblo 1 punto, ciudad 2');
  check(R.puntos(t, 0, car, 2) === 3, 'los puntos de las misiones y pedidos se suman');
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

{   // el motivo de lo que no se puede construir
  const m = R.crearMapa(7, 3), t = R.nuevoTablero(m); const usados = [];
  for (const v of m.vertices) { if (usados.length >= 5) break; if (!usados.some(u => m.vertices[u].vecinos.includes(v.id))) { usados.push(v.id); R.poner(t, 'pueblo', 0, v.id); } }
  check(R.lugares(m, t, 0, 'pueblo').length === 0 && /5 pueblos/.test(R.motivoSinLugar(m, t, 0, 'pueblo')), 'con los 5 pueblos puestos se explica por qué no hay otro');
  check(/pueblo/.test(R.motivoSinLugar(m, R.nuevoTablero(m), 0, 'ciudad')), 'sin pueblos, la ciudad pide primero un pueblo');
}

console.log('pruebas de las reglas de Fundación terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
