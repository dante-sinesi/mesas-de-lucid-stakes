'use strict';
// Las reglas de Fundación (el Catan de dados): el mapa de hexágonos, los dados de recursos, los costos, los lugares válidos, la producción, el bandido, los puntos y las carreras.
// Todo es puro (sin red ni reloj): la mesa (mesa_fundacion.js) las usa y las pruebas las miran de a una. Reglas del juego: docs/catan_dados.md.
//
// El mapa usa coordenadas enteras. Un hexágono (q, r) tiene el centro en a = 2q + r (a por √3) e y = 3r; sus esquinas están a ±1 en a y a -2, -1, 1, 2 en y.
// Así cada vértice se identifica por dos enteros y nunca hay decimales para comparar (el cliente multiplica por el tamaño que quiera).

const RECURSOS = ['madera', 'ladrillo', 'lana', 'trigo', 'mineral'];
const ORO = 5;                                            // la sexta cara del dado de recursos: comodín (2 oros valen 1 recurso)
const CARAS = RECURSOS.concat(['oro']);                   // el valor de una cara es su índice (0 a 5)
const COSTOS = { camino: [1, 1, 0, 0, 0], pueblo: [1, 1, 1, 1, 0], ciudad: [0, 0, 0, 2, 3], caballero: [0, 0, 1, 1, 1] };   // por recurso: madera, ladrillo, lana, trigo, mineral
const EDIFICIOS = ['camino', 'pueblo', 'ciudad', 'caballero'];
const PIEZAS = { camino: 15, pueblo: 5, ciudad: 4, caballero: 3 };
const DADOS = 6;               // dados de recursos de cada turno
const TIRADAS = 3;             // tiradas por turno
const TOPE_FIJOS = 4;          // dados fijados por la producción
const METAS = [8, 10, 12];
const CAMINO_MIN = 5, EJERCITO_MIN = 2, BONO = 2;
const DIRS_VERTICE = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];   // las 6 esquinas de un hexágono, en (a, y)
const DIRS_HEX = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];         // los 6 vecinos de un hexágono, en (q, r)
const TIPOS_19 = { bosque: 4, colinas: 3, pastos: 4, campos: 4, montana: 3, desierto: 1 };
const TIPOS_37 = { bosque: 7, colinas: 7, pastos: 8, campos: 8, montana: 6, desierto: 1 };
const NUMEROS_BASE = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const RECURSO_DE = { bosque: 0, colinas: 1, pastos: 2, campos: 3, montana: 4 };       // qué da cada tipo de hexágono

// ---------- el azar ----------

function rng(semilla) {   // mulberry32: el mismo número da la misma isla
  let a = (semilla | 0) + 0x6D2B79F5;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function mezclar(lista, azar) { const a = lista.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- el mapa ----------

// 19 hexágonos hasta 4 jugadores y 37 de 5 a 8. Los números se reparten sin dejar un 6 o un 8 pegado a otro.
function crearMapa(semilla, jugadores) {
  const radio = jugadores > 4 ? 3 : 2, azar = rng(semilla);
  const hexes = [];
  for (let q = -radio; q <= radio; q++) for (let r = Math.max(-radio, -q - radio); r <= Math.min(radio, -q + radio); r++) hexes.push({ id: hexes.length, q, r, a: 2 * q + r, y: 3 * r, tipo: null, num: 0, vertices: [], vecinos: [] });
  const porQR = new Map(hexes.map(h => [h.q + ',' + h.r, h]));
  hexes.forEach(h => { for (const [dq, dr] of DIRS_HEX) { const v = porQR.get((h.q + dq) + ',' + (h.r + dr)); if (v) h.vecinos.push(v.id); } });
  // los tipos
  const cuenta = radio === 3 ? TIPOS_37 : TIPOS_19; let tipos = [];
  for (const k in cuenta) for (let i = 0; i < cuenta[k]; i++) tipos.push(k);
  tipos = mezclar(tipos, azar);
  hexes.forEach((h, i) => { h.tipo = tipos[i]; });
  // los números: el doble de la lista base en el mapa grande; se reintenta hasta que no haya 6 u 8 juntos
  let nums = NUMEROS_BASE.slice(); if (radio === 3) nums = nums.concat(NUMEROS_BASE);
  const conNumero = hexes.filter(h => h.tipo !== 'desierto'); let bien = false;
  for (let intento = 0; intento < 300 && !bien; intento++) {
    const m = mezclar(nums, azar); conNumero.forEach((h, i) => { h.num = m[i]; });
    bien = conNumero.every(h => !(h.num === 6 || h.num === 8) || h.vecinos.every(v => { const w = hexes[v]; return !(w.num === 6 || w.num === 8); }));
  }
  hexes.forEach(h => { if (h.tipo === 'desierto') h.num = 0; });
  // los vértices y las aristas
  const vertices = [], porClave = new Map(), aristas = [], porArista = new Map();
  hexes.forEach(h => {
    h.vertices = DIRS_VERTICE.map(([da, dy]) => {
      const a = h.a + da, y = h.y + dy, k = a + ',' + y; let v = porClave.get(k);
      if (!v) { v = { id: vertices.length, a, y, hexes: [], vecinos: [], aristas: [] }; porClave.set(k, v); vertices.push(v); }
      v.hexes.push(h.id); return v.id;
    });
  });
  hexes.forEach(h => {
    for (let i = 0; i < 6; i++) {
      const a = h.vertices[i], b = h.vertices[(i + 1) % 6], k = Math.min(a, b) + '-' + Math.max(a, b);
      if (porArista.has(k)) continue;
      const e = { id: aristas.length, a: Math.min(a, b), b: Math.max(a, b) }; porArista.set(k, e); aristas.push(e);
      vertices[e.a].vecinos.push(e.b); vertices[e.b].vecinos.push(e.a); vertices[e.a].aristas.push(e.id); vertices[e.b].aristas.push(e.id);
    }
  });
  const desierto = hexes.find(h => h.tipo === 'desierto');
  return { semilla, radio, hexes, vertices, aristas, desierto: desierto.id };
}

// El tablero: lo que hay puesto en el mapa. El bandido empieza en el desierto.
function nuevoTablero(mapa) {
  return { vert: mapa.vertices.map(() => null), aris: mapa.aristas.map(() => -1), cab: mapa.hexes.map(() => []), bandido: mapa.desierto };
}
function piezas(tab, p) {
  let pueblo = 0, ciudad = 0, camino = 0, caballero = 0;
  tab.vert.forEach(v => { if (v && v.p === p) { if (v.ciudad) ciudad++; else pueblo++; } });
  tab.aris.forEach(a => { if (a === p) camino++; });
  tab.cab.forEach(l => { if (l.includes(p)) caballero++; });
  return { pueblo, ciudad, camino, caballero };
}
// Lo que le queda por poner a un jugador (un pueblo que se hizo ciudad vuelve a la reserva).
function quedan(tab, p) { const c = piezas(tab, p); return { camino: PIEZAS.camino - c.camino, pueblo: PIEZAS.pueblo - c.pueblo, ciudad: PIEZAS.ciudad - c.ciudad, caballero: PIEZAS.caballero - c.caballero }; }

// ---------- los lugares válidos ----------

const ocupado = (tab, v) => tab.vert[v] !== null;
function lugaresPueblo(mapa, tab, p, inicial) {   // vértices libres, sin ningún pueblo pegado y (salvo al empezar) a donde llega un camino tuyo
  if (!inicial && quedan(tab, p).pueblo <= 0) return [];
  return mapa.vertices.filter(v => !ocupado(tab, v.id) && v.vecinos.every(w => !ocupado(tab, w)) && (inicial || v.aristas.some(e => tab.aris[e] === p))).map(v => v.id);
}
function lugaresCamino(mapa, tab, p, desdeVertice) {   // aristas libres contiguas a una pieza o a un camino tuyo; al empezar, solo las del pueblo recién puesto
  if (desdeVertice !== undefined && desdeVertice !== null) return mapa.vertices[desdeVertice].aristas.filter(e => tab.aris[e] === -1);
  if (quedan(tab, p).camino <= 0) return [];
  const conecta = v => { const o = tab.vert[v]; if (o && o.p === p) return true; if (o && o.p !== p) return false; return mapa.vertices[v].aristas.some(e => tab.aris[e] === p); };
  return mapa.aristas.filter(e => tab.aris[e.id] === -1 && (conecta(e.a) || conecta(e.b))).map(e => e.id);
}
function lugaresCiudad(mapa, tab, p) { if (quedan(tab, p).ciudad <= 0) return []; return mapa.vertices.filter(v => tab.vert[v.id] && tab.vert[v.id].p === p && !tab.vert[v.id].ciudad).map(v => v.id); }
function lugaresCaballero(mapa, tab, p) {   // hexágonos donde ya tienes un edificio y todavía no tienes un caballero
  if (quedan(tab, p).caballero <= 0) return [];
  return mapa.hexes.filter(h => !tab.cab[h.id].includes(p) && h.vertices.some(v => tab.vert[v] && tab.vert[v].p === p)).map(h => h.id);
}
function lugares(mapa, tab, p, edificio) { return { camino: lugaresCamino, pueblo: lugaresPueblo, ciudad: lugaresCiudad, caballero: lugaresCaballero }[edificio](mapa, tab, p); }
function poner(tab, edificio, p, lugar) {
  if (edificio === 'camino') tab.aris[lugar] = p;
  else if (edificio === 'pueblo') tab.vert[lugar] = { p, ciudad: false };
  else if (edificio === 'ciudad') tab.vert[lugar] = { p, ciudad: true };
  else tab.cab[lugar].push(p);
}
// El orden de la colocación inicial: en serpiente (1.º a último y último a 1.º).
function ordenInicial(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); for (let i = n - 1; i >= 0; i--) a.push(i); return a; }

// ---------- los dados de recursos y los costos ----------

// ¿Con estos dados (caras de 0 a 5) alcanza para el costo? Devuelve los dados que se usan (los demás se pierden). 2 oros equivalen a 1 recurso que falte.
function pagar(costo, dados) {
  const usados = [], libres = dados.map((c, i) => i);
  let faltan = 0;
  for (let r = 0; r < 5; r++) {
    let n = costo[r];
    for (let k = 0; k < libres.length && n > 0;) { if (dados[libres[k]] === r) { usados.push(libres[k]); libres.splice(k, 1); n--; } else k++; }
    faltan += n;
  }
  if (faltan === 0) return { ok: true, usados };
  const oros = libres.filter(i => dados[i] === ORO);
  if (oros.length < faltan * 2) return { ok: false, usados: [] };
  return { ok: true, usados: usados.concat(oros.slice(0, faltan * 2)) };
}
const alcanza = (costo, dados) => pagar(costo, dados).ok;
// Los edificios que se pueden construir ahora: alcanzan los dados, quedan piezas y hay dónde ponerlos (la ciudad pide un pueblo tuyo).
// Por qué no hay dónde construir un edificio (para decírselo al jugador).
function motivoSinLugar(mapa, tab, p, edificio) {
  const q = quedan(tab, p);
  if (edificio === 'camino') return q.camino <= 0 ? 'Ya pusiste tus ' + PIEZAS.camino + ' caminos' : 'No hay lugar junto a tus caminos y pueblos';
  if (edificio === 'pueblo') return q.pueblo <= 0 ? 'Ya usaste tus ' + PIEZAS.pueblo + ' pueblos: mejora uno a ciudad' : 'Ningún camino tuyo llega a una esquina libre a dos pasos de otros pueblos';
  if (edificio === 'ciudad') return q.ciudad <= 0 ? 'Ya tienes tus ' + PIEZAS.ciudad + ' ciudades' : 'Primero necesitas un pueblo';
  return q.caballero <= 0 ? 'Ya pusiste tus ' + PIEZAS.caballero + ' caballeros' : 'Necesitas un edificio en un terreno donde aún no tengas caballero';
}
function posibles(mapa, tab, p, dados) { return EDIFICIOS.filter(e => alcanza(COSTOS[e], dados) && lugares(mapa, tab, p, e).length > 0); }

// ---------- la probabilidad de lograr un edificio ----------

// Los resultados posibles de tirar n dados (cuántos salieron de cada cara) con su probabilidad.
const RESULTADOS = (() => {
  const out = []; const fact = [1, 1, 2, 6, 24, 120, 720];
  for (let n = 0; n <= DADOS; n++) {
    const lista = [];
    (function rec(cara, resto, cuenta) {
      if (cara === 5) { const c = cuenta.concat([resto]); let p = fact[n]; c.forEach(x => { p /= fact[x]; }); lista.push({ c, p: p / Math.pow(6, n) }); return; }
      for (let k = 0; k <= resto; k++) rec(cara + 1, resto - k, cuenta.concat([k]));
    })(0, n, []);
    out.push(lista);
  }
  return out;
})();
const memoProb = new Map();
// Mejor juego posible: faltan `need` recursos, hay `g` oros guardados, quedan `libres` dados para tirar y `tiradas` tiradas. Se guardan todos los dados que ayudan y los oros que convengan.
function probRec(need, g, libres, tiradas) {
  const falta = need[0] + need[1] + need[2] + need[3] + need[4];
  if (falta * 2 <= g) return 1;
  if (tiradas <= 0 || libres <= 0) return 0;
  const clave = need.join('') + '|' + g + '|' + libres + '|' + tiradas;
  if (memoProb.has(clave)) return memoProb.get(clave);
  let total = 0;
  for (const res of RESULTADOS[libres]) {
    const nn = need.slice(); let usados = 0;
    for (let r = 0; r < 5; r++) { const u = Math.min(nn[r], res.c[r]); nn[r] -= u; usados += u; }
    let mejor = 0;
    for (let k = 0; k <= res.c[ORO]; k++) { const v = probRec(nn, g + k, libres - usados - k, tiradas - 1); if (v > mejor) mejor = v; if (mejor >= 1) break; }
    total += res.p * mejor;
  }
  memoProb.set(clave, total);
  return total;
}
// `guardados`: las caras que ya están guardadas o fijadas; `libres`: cuántos dados se vuelven a tirar; `tiradas`: las que quedan.
function probabilidad(costo, guardados, libres, tiradas) {
  const cuenta = [0, 0, 0, 0, 0, 0]; guardados.forEach(c => { cuenta[c]++; });
  const need = [0, 0, 0, 0, 0]; for (let r = 0; r < 5; r++) need[r] = Math.max(0, costo[r] - cuenta[r]);
  return probRec(need, cuenta[ORO], libres, tiradas);
}
// La tabla para la medalla de % que cambia al tocar un dado: por edificio, el % (0 a 100) para cada conjunto de dados guardados.
// `fijos`: las caras fijadas (no se pueden volver a tirar); `actuales`: las caras de los dados que se pueden guardar; `tiradas`: las que quedan después de la actual.
function tabla(edificios, fijos, actuales, tiradas) {
  const out = {};
  edificios.forEach(e => {
    out[e] = [];
    for (let m = 0; m < (1 << actuales.length); m++) {
      const guard = fijos.slice(); let libres = 0;
      actuales.forEach((c, i) => { if (m & (1 << i)) guard.push(c); else libres++; });
      out[e].push(Math.round(probabilidad(COSTOS[e], guard, libres, tiradas) * 100));
    }
  });
  return out;
}

// ---------- la producción y el bandido ----------

function tirarNumeros(azar) { const a = 1 + Math.floor(azar() * 6), b = 1 + Math.floor(azar() * 6); return { a, b, suma: a + b }; }
// Lo que gana cada jugador con una suma (distinta de 7): un recurso por pueblo y dos por ciudad en cada hexágono con ese número. El bandido bloquea su hexágono, salvo para quien tiene un caballero ahí.
// Devuelve, por jugador, la lista de recursos (índices) hasta el tope de dados fijados.
function produccion(mapa, tab, suma, jugadores) {
  const gana = []; for (let p = 0; p < jugadores; p++) gana.push([]);
  if (suma === 7) return gana;
  mapa.hexes.forEach(h => {
    if (h.num !== suma || h.tipo === 'desierto') return;
    h.vertices.forEach(v => {
      const o = tab.vert[v]; if (!o) return;
      if (tab.bandido === h.id && !tab.cab[h.id].includes(o.p)) return;
      const n = o.ciudad ? 2 : 1;
      for (let i = 0; i < n; i++) if (gana[o.p].length < TOPE_FIJOS) gana[o.p].push(RECURSO_DE[h.tipo]);
    });
  });
  return gana;
}
function moverBandido(mapa, tab, azar) {   // salta a otro hexágono al azar
  const otros = mapa.hexes.filter(h => h.id !== tab.bandido);
  tab.bandido = otros[Math.floor(azar() * otros.length)].id;
  return tab.bandido;
}
// Los hexágonos de un número que producen para alguien (para resaltarlos en la pantalla).
function hexesDe(mapa, suma) { return mapa.hexes.filter(h => h.num === suma && h.tipo !== 'desierto').map(h => h.id); }

// ---------- puntos y carreras ----------

// Quién tiene una carrera: el que más tenga, con un mínimo; si lo tenía otro, solo se lo quitan con más (no con lo mismo). Un empate entre quienes no la tenían la deja sin duenoDe.
function duenoDe(cuentas, minimo, actual) {
  const mejor = Math.max.apply(null, cuentas);
  if (mejor < minimo) return null;
  if (actual !== null && actual !== undefined && cuentas[actual] === mejor) return actual;
  const lideres = []; cuentas.forEach((c, p) => { if (c === mejor) lideres.push(p); });
  return lideres.length === 1 ? lideres[0] : null;
}
function carreras(tab, jugadores, actual) {
  const c = []; for (let p = 0; p < jugadores; p++) c.push(piezas(tab, p));
  const a = actual || { camino: null, ejercito: null };
  return { camino: duenoDe(c.map(x => x.camino), CAMINO_MIN, a.camino), ejercito: duenoDe(c.map(x => x.caballero), EJERCITO_MIN, a.ejercito) };
}
function puntos(tab, p, car) {
  const c = piezas(tab, p);
  return c.pueblo + 2 * c.ciudad + (car && car.camino === p ? BONO : 0) + (car && car.ejercito === p ? BONO : 0);
}

module.exports = {
  motivoSinLugar, RECURSOS, CARAS, ORO, COSTOS, EDIFICIOS, PIEZAS, DADOS, TIRADAS, TOPE_FIJOS, METAS, CAMINO_MIN, EJERCITO_MIN, BONO, RECURSO_DE,
  rng, mezclar, crearMapa, nuevoTablero, piezas, quedan, lugaresPueblo, lugaresCamino, lugaresCiudad, lugaresCaballero, lugares, poner, ordenInicial,
  pagar, alcanza, posibles, probabilidad, tabla, tirarNumeros, produccion, moverBandido, hexesDe, carreras, puntos,
};
