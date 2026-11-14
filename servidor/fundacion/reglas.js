'use strict';
// Las reglas de Fundación (el Catan de dados, versión 2): el mapa de hexágonos, las tarjetas de recursos, los costos, los lugares válidos, la cobranza de todos, el bandido, los puntos y las carreras.
// Todo es puro (sin red ni reloj): la mesa (mesa_fundacion.js) las usa y las pruebas las miran de a una. Reglas del juego: docs/catan_dados.md. Las misiones y los pedidos están en misiones.js.
//
// El mapa usa coordenadas enteras. Un hexágono (q, r) tiene el centro en a = 2q + r (a por √3) e y = 3r; sus esquinas están a ±1 en a y a -2, -1, 1, 2 en y.
// Así cada vértice se identifica por dos enteros y nunca hay decimales para comparar (el cliente multiplica por el tamaño que quiera).
// La mano de un jugador es una lista de 5 cuentas, una por recurso: [madera, ladrillo, lana, trigo, mineral]. Cada unidad es una tarjeta.

const RECURSOS = ['madera', 'ladrillo', 'lana', 'trigo', 'mineral'];
const COSTOS = { camino: [1, 0, 0, 0, 0], pueblo: [1, 1, 1, 1, 0], ciudad: [0, 0, 0, 2, 3], caballero: [0, 0, 1, 1, 1] };   // por recurso: madera, ladrillo, lana, trigo, mineral (la ciudad pide 3 de mineral: por confirmar con un bot, plan B 2 + 2)
const EDIFICIOS = ['camino', 'pueblo', 'ciudad', 'caballero'];
const PIEZAS = { camino: 15, pueblo: 5, ciudad: 4, caballero: 3 };
const MANO_MAX = 6;            // tarjetas que puedes tener al empezar tu turno (si tienes más, descartas hasta 6)
const METAS = [8, 10, 12];
const CFG = { pedidoMin: 4, manoPorJugadorExtra: 0 };   // manoPorJugadorExtra: cuánto sube el tope de la mano por cada jugador desde el quinto (0 = no sube; palanca de calibración)   // los pedidos duran 2 turnos de cada jugador, pero nunca menos de estos turnos en total (en solitario serían solo 2): por calibrar
const CAMINO_MIN = 5, EJERCITO_MIN = 2, BONO = 2;
const DIRS_VERTICE = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];   // las 6 esquinas de un hexágono, en (a, y)
const DIRS_HEX = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];         // los 6 vecinos de un hexágono, en (q, r)
const TIPOS_19 = { bosque: 4, colinas: 3, pastos: 4, campos: 4, montana: 3, desierto: 1 };
const TIPOS_37 = { bosque: 7, colinas: 7, pastos: 8, campos: 8, montana: 6, desierto: 1 };
const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };   // los puntitos de cada número (su probabilidad sobre 36)
const NUMEROS_BASE = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const RECURSO_DE = { bosque: 0, colinas: 1, pastos: 2, campos: 3, montana: 4 };       // qué da cada tipo de hexágono

// ---------- el azar ----------

function rng(semilla) {   // mulberry32: el mismo número da la misma isla
  let a = (semilla | 0) + 0x6D2B79F5;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Un mapa es justo si cada recurso tiene al menos un hexágono con un número bueno (5 a 9) y puntitos suficientes entre todos sus hexágonos (los criterios exactos se calibran con bots).
const PIPS_MIN = { 2: 7, 3: 14 };
function esJusto(hexes, radio) {
  return RECURSOS.every((_, r) => {
    const tipo = Object.keys(RECURSO_DE).find(k => RECURSO_DE[k] === r), mios = hexes.filter(h => h.tipo === tipo);
    return mios.some(h => h.num >= 5 && h.num <= 9) && mios.reduce((t, h) => t + (PIPS[h.num] || 0), 0) >= PIPS_MIN[radio];
  });
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
  // los tipos y los números: se reintenta hasta que el mapa sea justo (cada recurso tiene un hexágono con número bueno y puntitos suficientes) y no haya 6 u 8 juntos
  const cuenta = radio === 3 ? TIPOS_37 : TIPOS_19, base = [];
  for (const k in cuenta) for (let i = 0; i < cuenta[k]; i++) base.push(k);
  let nums = NUMEROS_BASE.slice(); if (radio === 3) nums = nums.concat(NUMEROS_BASE);
  for (let intento = 0; intento < 400; intento++) {
    const tipos = mezclar(base, azar);
    hexes.forEach((h, i) => { h.tipo = tipos[i]; h.num = 0; });
    const conNumero = hexes.filter(h => h.tipo !== 'desierto'); let sinJuntos = false;
    for (let k = 0; k < 80 && !sinJuntos; k++) {
      const m = mezclar(nums, azar); conNumero.forEach((h, i) => { h.num = m[i]; });
      sinJuntos = conNumero.every(h => !(h.num === 6 || h.num === 8) || h.vecinos.every(v => { const w = hexes[v]; return !(w.num === 6 || w.num === 8); }));
    }
    if (sinJuntos && esJusto(hexes, radio)) break;
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

// ---------- las tarjetas y los costos ----------

const manoVacia = () => [0, 0, 0, 0, 0];
const totalMano = mano => mano.reduce((t, n) => t + n, 0);
const alcanza = (costo, mano) => costo.every((n, r) => mano[r] >= n);
// La mano que queda después de pagar (null si no alcanza).
function pagar(costo, mano) { if (!alcanza(costo, mano)) return null; return mano.map((n, r) => n - costo[r]); }
const sumarMano = (mano, extra) => mano.map((n, r) => n + (extra[r] || 0));
// Cuántas tarjetas hay que descartar para quedar en el máximo.
// La mano máxima de la mesa: 6, más (si se activa la palanca) lo que suma cada jugador desde el quinto.
const manoMax = jugadores => MANO_MAX + Math.max(0, Math.floor((jugadores - 4) * CFG.manoPorJugadorExtra));
const exceso = (mano, max = MANO_MAX) => Math.max(0, totalMano(mano) - max);
// ¿Es válido este descarte (una cuenta por recurso) para esta mano? Hay que descartar justo lo que sobra.
function descarteValido(mano, quitar, max = MANO_MAX) {
  if (!Array.isArray(quitar) || quitar.length !== 5) return false;
  if (!quitar.every((n, r) => Number.isInteger(n) && n >= 0 && n <= mano[r])) return false;
  return totalMano(quitar) === exceso(mano, max);
}
// El descarte al azar (cuando se acaba el tiempo): quita las tarjetas que sobran, una por una, de las que hay.
function descarteAzar(mano, azar, max = MANO_MAX) {
  const quitar = manoVacia(), m = mano.slice();
  for (let k = exceso(mano, max); k > 0; k--) {
    const hay = []; m.forEach((n, r) => { for (let i = 0; i < n; i++) hay.push(r); });
    const r = hay[Math.floor(azar() * hay.length)]; m[r]--; quitar[r]++;
  }
  return quitar;
}
// Los edificios que se pueden construir ahora: alcanzan los dados, quedan piezas y hay dónde ponerlos (la ciudad pide un pueblo tuyo).
// Por qué no hay dónde construir un edificio (para decírselo al jugador).
function motivoSinLugar(mapa, tab, p, edificio) {
  const q = quedan(tab, p);
  if (edificio === 'camino') return q.camino <= 0 ? 'Ya pusiste tus ' + PIEZAS.camino + ' caminos' : 'No hay lugar junto a tus caminos y pueblos';
  if (edificio === 'pueblo') return q.pueblo <= 0 ? 'Ya usaste tus ' + PIEZAS.pueblo + ' pueblos: mejora uno a ciudad' : 'Ningún camino tuyo llega a una esquina libre a dos pasos de otros pueblos';
  if (edificio === 'ciudad') return q.ciudad <= 0 ? 'Ya tienes tus ' + PIEZAS.ciudad + ' ciudades' : 'Primero necesitas un pueblo';
  return q.caballero <= 0 ? 'Ya pusiste tus ' + PIEZAS.caballero + ' caballeros' : 'Necesitas un edificio en un terreno donde aún no tengas caballero';
}
function posibles(mapa, tab, p, mano) { return EDIFICIOS.filter(e => alcanza(COSTOS[e], mano) && lugares(mapa, tab, p, e).length > 0); }
// Lo que daría un pueblo en un vértice (para la colocación inicial): los recursos de sus hexágonos con su número, y los que le faltan.
function recursosDeVertice(mapa, v) {
  const da = [], tiene = new Set();
  mapa.vertices[v].hexes.forEach(h => { const hx = mapa.hexes[h]; if (hx.tipo === 'desierto') return; const r = RECURSO_DE[hx.tipo]; da.push({ recurso: r, num: hx.num, hex: h }); tiene.add(r); });
  return { da, faltan: [0, 1, 2, 3, 4].filter(r => !tiene.has(r)) };
}

// ---------- la producción y el bandido ----------

function tirarNumeros(azar) { const a = 1 + Math.floor(azar() * 6), b = 1 + Math.floor(azar() * 6); return { a, b, suma: a + b }; }
// Lo que cobra cada jugador con una suma (distinta de 7): una tarjeta por pueblo y dos por ciudad en cada hexágono con ese número. Cobran todos. El bandido bloquea su hexágono, salvo para quien tiene un caballero ahí.
// Devuelve `gana` (por jugador, la mano que gana) y `detalle` (de qué edificio sale cada tarjeta, para mostrarlo).
function produccion(mapa, tab, suma, jugadores) {
  const gana = []; for (let p = 0; p < jugadores; p++) gana.push(manoVacia());
  const detalle = [];
  if (suma === 7) return { gana, detalle };
  mapa.hexes.forEach(h => {
    if (h.num !== suma || h.tipo === 'desierto') return;
    h.vertices.forEach(v => {
      const o = tab.vert[v]; if (!o) return;
      if (tab.bandido === h.id && !tab.cab[h.id].includes(o.p)) return;
      const n = o.ciudad ? 2 : 1, r = RECURSO_DE[h.tipo];
      if (o.p < jugadores) gana[o.p][r] += n;
      detalle.push({ asiento: o.p, vertice: v, hex: h.id, recurso: r, n });
    });
  });
  return { gana, detalle };
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
function puntos(tab, p, car, extra) {   // `extra`: los puntos de las misiones y pedidos que ganó
  const c = piezas(tab, p);
  return c.pueblo + 2 * c.ciudad + (car && car.camino === p ? BONO : 0) + (car && car.ejercito === p ? BONO : 0) + (extra || 0);
}

module.exports = {
  CFG, motivoSinLugar, RECURSOS, COSTOS, EDIFICIOS, PIEZAS, MANO_MAX, manoMax, TIPOS_19, TIPOS_37, METAS, CAMINO_MIN, EJERCITO_MIN, BONO, RECURSO_DE, PIPS,
  rng, mezclar, crearMapa, esJusto, nuevoTablero, piezas, quedan, lugaresPueblo, lugaresCamino, lugaresCiudad, lugaresCaballero, lugares, poner, ordenInicial,
  manoVacia, totalMano, alcanza, pagar, sumarMano, exceso, descarteValido, descarteAzar, posibles, recursosDeVertice, tirarNumeros, produccion, moverBandido, hexesDe, carreras, puntos,
};
