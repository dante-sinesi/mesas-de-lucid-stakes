'use strict';
// La partida de Fundación (versión 2): el mapa de hexágonos con su cámara, la mano de tarjetas, los dados de número en 3D y las escenas del turno
// (tirada, descarte, construir, colocar, misiones y pedidos, entregas) y el final. Pantalla horizontal, estructura «Mesa de Risk».
// Todo lo decide el servidor (servidor/fundacion/mesa_fundacion.js); aquí solo se dibuja lo que manda y se envían acciones. Diseño: docs/fundacion_v2_pantallas.md.
// Usa: comun.js (accion, nuevoBoton, ponerNombre, compartirImagen), voxel.js (V), dados3d.js (D3), mesas.js (Mesas) y fu_arte.js (FU_ARTE).

const FU = { e: null, escena: null, sel: null, zona: null, panel: null, selDesc: new Set(), estKey: '', turnoKey: '', fase: 3, tirada: null, finKey: '', cam: null, candidatos: [], zonas: [], zonasMostrar: [], ultimoMapa: null, evVisto: -1, aviso: null, band: null };
const FU_TIPO_RECURSO = { bosque: 0, colinas: 1, pastos: 2, campos: 3, montana: 4 };
const FU_NOMBRE_REC = ['madera', 'ladrillo', 'lana', 'trigo', 'mineral'];
const FU_NOMBRE_ED = { camino: 'Camino', pueblo: 'Pueblo', ciudad: 'Ciudad', caballero: 'Caballero' };
const FU_COSTOS = { camino: [1, 1, 0, 0, 0], pueblo: [1, 1, 1, 1, 0], ciudad: [0, 0, 0, 2, 3], caballero: [0, 0, 1, 1, 1] };   // (los mismos del servidor: reglas.js)
const FU_MISION = {
  red5: '5 caminos conectados', ciudades2: '2 ciudades', pueblos4: '4 pueblos o ciudades', caballeros3: 'Los 3 caballeros',
  par: 'Entrega 2 madera + 2 ladrillo', pareja: 'Entrega 2 lana + 2 trigo', mineral3: 'Entrega 3 mineral', surtido: 'Entrega una de cada recurso', iguales3: 'Entrega 3 tarjetas iguales',
};
const fuColor = asiento => Mesas.COLORES[asiento % Mesas.COLORES.length];
const fuRgb = c => 'rgb(' + c.map(v => Math.round(v * 255)).join(',') + ')';
const fuEl = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };

// ---------- abrir ----------

function abrirFU() {
  if (!FU.escena) {
    // los dos dados de número, en 3D como los del diez mil (misma caída)
    FU.escena = new D3.Escena($('fuDadosLienzo'), $('fuDados'), { maxAlto: 260, forzarFila: true, espaciado: 1.7, sinMesa: true, velocidad: 1.15, dprMax: 1.5, escalaMax: 120, sinValores: true });   // (sin mesa, con la sombra de cada dado, y una caída más pausada que la del diez mil)
    FU.escena.configurar(['normal', 'normal']);
    FU.escena.alAterrizar = () => { if (!document.hidden) Sonido.play('ficha'); };
    FU.escena.alTerminar = () => { if (FU.tirada) aterrizoFU(FU.tirada.key); };
    $('fAyuda').appendChild(V.interrogante()); $('fAyuda').onclick = abrirAyudaFU;
    $('fInvitar').appendChild(V.invitar()); $('fInvitar').onclick = abrirInvitar;
    $('fSalir').appendChild(V.puerta()); $('fSalir').onclick = confirmarSalir;
    $('fSonido').onclick = () => { Sonido.setActivo(!Sonido.activo); pintarSonidoFU(); Sonido.play('clic'); };
    FU.tParp = setInterval(() => { if (FU.parpadea && !$('fu').hidden && !FU.anim) dibujarCamFU(); }, 180);   // (las marcas doradas y blancas titilan)
    $('fuMapa').addEventListener('pointerdown', tocarMapaFU);
    window.addEventListener('resize', () => { clearTimeout(FU.tRes); FU.tRes = setTimeout(() => { if (!$('fu').hidden && FU.e) repintarFU(); }, 120); });
  }
  pintarSonidoFU();
  Object.assign(FU, { e: null, sel: null, zona: null, panel: null, selDesc: new Set(), estKey: '', turnoKey: '', fase: 3, tirada: null, finKey: '', evVisto: -1, aviso: null, band: null });
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (err) { /* no todos los navegadores dejan fijar la orientación */ }
  $('fuFinal').hidden = true;
}
function pintarSonidoFU() { const b = $('fSonido'); b.textContent = ''; b.appendChild(V.parlante(Sonido.activo)); b.title = Sonido.activo ? 'Sonido activado' : 'Sin sonido'; }

function abrirAyudaFU() { Sonido.play('clic'); Ayuda.abrir({ nuevoBoton, modal: $('ayuda'), juego: 'fundacion' }); }

// ---------- el mapa en coordenadas de píxeles de arte ----------

function geometria(mapa) {
  if (FU.ultimoMapa && FU.ultimoMapa.semilla === mapa.semilla && FU.ultimoMapa.hexes === mapa.hexes.length) return FU.ultimoMapa;
  const WD = FU_ARTE.WD, HT = FU_ARTE.HT, PASO = FU_ARTE.PASO, pad = 8;
  const as = mapa.hexes.map(h => h.a), ys = mapa.hexes.map(h => h.y);
  const minA = Math.min(...as), maxA = Math.max(...as), minY = Math.min(...ys), maxY = Math.max(...ys);
  const OX = pad + WD / 2 - WD * minA / 2, OY = pad + HT / 2 - PASO * minY / 3;
  const g = { semilla: mapa.semilla, hexes: mapa.hexes.length, OX, OY, WW: Math.ceil(WD * (maxA - minA) / 2 + WD + 2 * pad), WH: Math.ceil(PASO * (maxY - minY) / 3 + HT + 2 * pad) };
  g.hx = h => ({ x: g.OX + WD * h.a / 2, y: g.OY + PASO * h.y / 3 });
  g.v = v => ({ x: g.OX + WD * v.a / 2, y: g.OY + PASO * v.y / 3 });
  return FU.ultimoMapa = g;
}
function lineaCaminoFU(g, A, B, col) {
  const d0 = Math.hypot(B.x - A.x, B.y - A.y), k = Math.min(0.3, 5 / d0), a = { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k }, b = { x: B.x - (B.x - A.x) * k, y: B.y - (B.y - A.y) * k };
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
  for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; FU_ARTE.fr(g, Math.round(x - 2), Math.round(y - 2), 4, 4, [col[0] * 0.45, col[1] * 0.45, col[2] * 0.45]); }
  for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; FU_ARTE.fr(g, Math.round(x - 1), Math.round(y - 1), 2, 2, col); }
}
// Dónde va cada caballero de un hexágono (esquina de la figura respecto del centro): abajo de la ficha del número, que así se sigue leyendo.
function posCabFU(n, i) {   // devuelve [x, y, chico]: con 3 o más caballeros se dibujan en versión chica, alrededor de la ficha y lejos de los pueblos
  const T = { 1: [[-6, 3]], 2: [[-12, 3], [0, 3]] }, M = { 3: [[-15, -5], [8, -5], [-3, 8]], 4: [[-15, -5], [8, -5], [-9, 8], [2, 8]] };
  if (n <= 2) return T[n][Math.min(i, n - 1)].concat([false]);
  return (M[Math.min(n, 4)])[Math.min(i, 3)].concat([true]);
}
// El mundo: los hexágonos con lo que hay puesto encima (el bandido se dibuja aparte, porque se mueve).
function dibujarMundo(e, geo) {
  const A = FU_ARTE, mapa = e.mapa, tab = e.tab, c = A.cvs(geo.WW, geo.WH), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  A.fr(g, 0, 0, geo.WW, geo.WH, [0.06, 0.21, 0.31]);
  mapa.hexes.forEach(h => { const p = geo.hx(h), img = A.tile(h.tipo, h.num, h.id === tab.bandido ? { dim: true } : {}); g.drawImage(img, Math.round(p.x - A.WD / 2), Math.round(p.y - A.HT / 2)); });
  tab.aris.forEach((p, id) => { if (p < 0) return; const ar = mapa.aristas[id]; lineaCaminoFU(g, geo.v(mapa.vertices[ar.a]), geo.v(mapa.vertices[ar.b]), fuColor(p)); });
  // Los pueblos, las ciudades y los caballeros se dibujan de arriba hacia abajo (por el pie de cada figura): lo de abajo tapa a lo de arriba.
  const figuras = [];
  tab.vert.forEach((o, id) => { if (!o) return; const p = geo.v(mapa.vertices[id]), img = o[1] ? A.ciudad(fuColor(o[0])) : A.casa(fuColor(o[0])); figuras.push({ y: p.y + 4, f: () => g.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height + 4)) }); });
  tab.cab.forEach((lista, id) => lista.forEach((p, i) => { const q = geo.hx(mapa.hexes[id]), o = posCabFU(lista.length, i), img = o[2] ? A.caballeroMini(fuColor(p)) : A.caballero(fuColor(p)); figuras.push({ y: q.y + o[1] + img.height, f: () => g.drawImage(img, Math.round(q.x + o[0]), Math.round(q.y + o[1])) }); }));
  figuras.sort((u, v) => u.y - v.y).forEach(x => x.f());
  return c;
}
// El bandido: una cruz roja sobre la ficha y su figura al lado. `alfa` lo hace tenue (el lugar de donde sale).
function dibujarBandidoFU(g, b, alfa, conCruz) {
  const A = FU_ARTE; g.globalAlpha = alfa;
  if (conCruz) for (let i = -5; i <= 5; i++) { A.fr(g, Math.round(b.x + i), Math.round(b.y + i), 1, 1, [1, 0.42, 0.36]); A.fr(g, Math.round(b.x - i), Math.round(b.y + i), 1, 1, [1, 0.42, 0.36]); }
  g.drawImage(A.bandido(), Math.round(b.x + 6), Math.round(b.y - 8)); g.globalAlpha = 1;
}
const fuTitila = () => (Math.floor(performance.now() / 360) % 2 ? [1, 1, 1] : [0.97, 0.78, 0.25]);   // (lo que marca algo titila entre dorado y blanco)
const fuOscurecer = (g, a) => { g.fillStyle = 'rgba(8,6,20,' + a + ')'; g.fillRect(-9999, -9999, 99999, 99999); };
function fuPunto(g, p, R, sel) {
  for (let j = -7; j <= 7; j++) for (let k = -7; k <= 7; k++) { const d = Math.hypot(k, j); if (d <= R + 1.2 && d > R) FU_ARTE.fr(g, Math.round(p.x) + k, Math.round(p.y) + j, 1, 1, sel ? [1, 1, 1] : [0.2, 0.12, 0.05]); else if (d <= R) FU_ARTE.fr(g, Math.round(p.x) + k, Math.round(p.y) + j, 1, 1, [0.97, 0.78, 0.22]); }
}
function fuAroZona(g, zn) {
  const R = Math.round(zn.r);
  for (let a = 0; a < 360; a += 3) { if ((a / 3) % 2) continue; FU_ARTE.fr(g, Math.round(zn.x + Math.cos(a * Math.PI / 180) * R) - 1, Math.round(zn.y + Math.sin(a * Math.PI / 180) * R) - 1, 2, 2, zn.col || [0.97, 0.78, 0.22]); }
  if (zn.sinNum) return;
  const l = V.celdas('x' + zn.n), w = l.ancho + 4;
  FU_ARTE.fr(g, Math.round(zn.x - w / 2), Math.round(zn.y - 6), w, 12, [0.11, 0.07, 0.21]); FU_ARTE.fr(g, Math.round(zn.x - w / 2), Math.round(zn.y - 6), w, 1, [0.97, 0.78, 0.22]); FU_ARTE.fr(g, Math.round(zn.x - w / 2), Math.round(zn.y + 5), w, 1, [0.97, 0.78, 0.22]);
  l.celdas.forEach(p => FU_ARTE.fr(g, Math.round(zn.x - l.ancho / 2) + p[0], Math.round(zn.y - 5.5) + p[1] + 1, 1, 1, [0.97, 0.78, 0.22]));
}

// ---------- los lugares: puntos tocables según lo que se pone ----------

function candidatosFU(e, geo) {
  if (!e.lugares || !e.lugares.length) return [];
  const mapa = e.mapa;
  const sub = e.inicial ? e.inicial.sub : (e.turno ? e.turno.edificio : null);
  return e.lugares.map(id => {
    let p;
    if (sub === 'caballero') { const h = mapa.hexes[id], q = geo.hx(h); p = { x: q.x + 10, y: q.y + 2 }; }
    else if (sub === 'camino') { const ar = mapa.aristas[id], a = geo.v(mapa.vertices[ar.a]), b = geo.v(mapa.vertices[ar.b]); p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    else p = geo.v(mapa.vertices[id]);
    return { id, x: p.x, y: p.y, tipo: sub };
  });
}
function zonasFU(cands) {   // se agrupan en zonas para acercar la cámara a una antes de elegir el punto exacto
  const celdas = new Map();
  cands.forEach(c => { const k = Math.floor(c.x / 46) + ',' + Math.floor(c.y / 40); if (!celdas.has(k)) celdas.set(k, []); celdas.get(k).push(c); });
  return [...celdas.values()].map(l => { const x = l.reduce((s, c) => s + c.x, 0) / l.length, y = l.reduce((s, c) => s + c.y, 0) / l.length; return { x, y, n: l.length, r: Math.max(8, ...l.map(c => Math.hypot(c.x - x, c.y - y))) + 8, lista: l }; });
}
const fuFitZ = (pts, aw, ah, pad, zs) => { const xs = pts.map(p => p.x), ys = pts.map(p => p.y), w = Math.max(...xs) - Math.min(...xs) + 2 * pad, h = Math.max(...ys) - Math.min(...ys) + 2 * pad; for (const z of zs) if (w * z <= aw && h * z <= ah) return z; return zs[zs.length - 1]; };
const fuCentro = pts => ({ x: (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2, y: (Math.min(...pts.map(p => p.y)) + Math.max(...pts.map(p => p.y))) / 2 });

function puntoLugarFU(e, geo, ed, id, asiento) {   // dónde está en el mapa un lugar de construcción
  const mapa = e.mapa;
  if (ed === 'caballero') {   // el centro de la figura del caballero, donde de verdad está dibujada (no el punto donde se tocaba para ponerla)
    const q = geo.hx(mapa.hexes[id]), lista = (e.tab.cab[id] || []), i = Math.max(0, lista.lastIndexOf(asiento === undefined ? lista[lista.length - 1] : asiento)), o = posCabFU(Math.max(1, lista.length), i);
    const img = o[2] ? FU_ARTE.caballeroMini(fuColor(0)) : FU_ARTE.caballero(fuColor(0));
    return { x: q.x + o[0] + img.width / 2, y: q.y + o[1] + img.height / 2 };
  }
  if (ed === 'camino') { const ar = mapa.aristas[id], a = geo.v(mapa.vertices[ar.a]), b = geo.v(mapa.vertices[ar.b]); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  return geo.v(mapa.vertices[id]);
}
// La marca que se pone donde alguien acaba de construir: un anillo del color del jugador que late, con un aro de rayitas blancas que gira y cuatro destellos.
function fuMarcaFU(g, p, col, t0) {
  const A = FU_ARTE, t = (performance.now() - t0) / 1000, pulso = (Math.sin(t * 7) + 1) / 2, R = 9 + Math.round(pulso * 2);
  const oscuro = [0.1, 0.06, 0.16], claro = [col[0] * 0.55 + 0.45, col[1] * 0.55 + 0.45, col[2] * 0.55 + 0.45];
  const anillo = (r, c, grosor) => { const n = Math.ceil(2 * Math.PI * r * 2); for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; for (let k = 0; k < grosor; k++) A.fr(g, Math.round(p.x + Math.cos(a) * (r - k)) - 0, Math.round(p.y + Math.sin(a) * (r - k)) - 0, 1, 1, c); } };
  anillo(R + 2, oscuro, 1); anillo(R, col, 2); anillo(R - 2, oscuro, 1);
  const n = 28, giro = Math.floor(t * 10);   // el aro de rayitas blancas, por dentro, gira
  for (let i = 0; i < n; i++) { if ((i + giro) % 3 !== 0) continue; const a = i / n * 2 * Math.PI; A.fr(g, Math.round(p.x + Math.cos(a) * (R - 4)), Math.round(p.y + Math.sin(a) * (R - 4)), 1, 1, [1, 1, 1]); }
  const d = R + 5 + (pulso > 0.5 ? 1 : 0);   // cuatro destellos en cruz que se abren y se cierran
  [[d, 0], [-d, 0], [0, d], [0, -d]].forEach(([dx, dy]) => { A.fr(g, Math.round(p.x + dx) - 1, Math.round(p.y + dy) - 1, 3, 3, oscuro); A.fr(g, Math.round(p.x + dx), Math.round(p.y + dy) - 1, 1, 3, claro); A.fr(g, Math.round(p.x + dx) - 1, Math.round(p.y + dy), 3, 1, claro); });
}

// ---------- las tarjetas ----------

function iconoRecFU(k, px) { const cc = FU_ARTE.cvs(15, 15); cc.getContext('2d').drawImage(FU_ARTE.dado2d(FU_NOMBRE_REC[k]), 0, 0); cc.style.cssText = 'width:' + px + 'px;height:' + px + 'px;image-rendering:pixelated;display:block'; return cc; }
// Una tarjeta de recurso: color y dibujo, sin texto. `cls` agrega clases (g: grande, sel: elegida, nueva: recién ganada, falta: no la tienes).
function cartaFU(k, cls) {
  const c = fuEl('div', 'fuCarta' + (cls ? ' ' + cls : '')); c.style.background = fuRgb(FU_ARTE.EST[FU_NOMBRE_REC[k]].cuerpo);
  const ic = iconoRecFU(k, 15); ic.style.width = '78%'; ic.style.height = 'auto'; c.append(ic); return c;
}
const expandirFU = mano => { const a = []; mano.forEach((n, r) => { for (let i = 0; i < n; i++) a.push(r); }); return a; };
const dorsoFU = cls => fuEl('div', 'fuCarta fuDorso' + (cls ? ' ' + cls : ''));
const fuNombreDe = (e, asiento) => { const j = e.jugadores.find(x => x.asiento === asiento); return j ? j.apodo : '—'; };
// Las tarjetas de un costo (cada una un cubito), apagando las que faltan según la mano.
function costoFU(costo, mano) {
  const f = fuEl('div', 'fuCosto');
  costo.forEach((n, r) => { for (let i = 0; i < n; i++) { const c = cartaFU(r, 'chica' + (mano && i >= mano[r] ? ' falta' : '')); f.append(c); } });
  return f;
}
function costoIgualesFU(mano) { const f = fuEl('div', 'fuCosto'); let r = 0; if (mano) mano.forEach((n, i) => { if (n > mano[r]) r = i; }); for (let i = 0; i < 3; i++) f.append(cartaFU(r, 'chica' + (mano && i >= mano[r] ? ' falta' : ''))); return f; }
// Las tarjetas que se entregarían por un pedido con esta mano (lo mismo que decide el servidor), o null.
function entregaFU(m, mano) {
  if (m.costo) return m.costo.every((n, r) => mano[r] >= n) ? m.costo.slice() : null;
  let r = -1; mano.forEach((n, i) => { if (n >= m.iguales && (r < 0 || n > mano[r])) r = i; });
  if (r < 0) return null; const q = [0, 0, 0, 0, 0]; q[r] = m.iguales; return q;
}

// ---------- pintar todo ----------

// La escena en la que está la partida para este jugador.
function escenaFU(e) {
  if (e.fase === 'fin') return 'fin';
  if (e.fase === 'inicial' && e.inicial) return e.inicial.de === e.yo ? 'inicial' : 'inicialAjeno';
  const t = e.turno; if (e.fase !== 'turno' || !t) return 'nada';
  const mio = t.de === e.yo;
  if (t.terminado) return 'finTurno';
  if (t.sub === 'tirada') return 'tirada';
  if (t.sub === 'descarte') return mio ? 'descarte' : 'descarteAjeno';
  if (t.sub === 'colocar') return mio ? 'colocar' : 'colocarAjeno';
  return mio ? 'turno' : 'turnoAjeno';
}

function pintarFU(e) {
  FU.e = e;
  const t = e.turno;
  const turnoKey = e.fase === 'turno' && t ? [t.de, e.ronda, t.num.a, t.num.b].join('-') : 'x';
  if (turnoKey !== FU.turnoKey) { FU.turnoKey = turnoKey; FU.panel = null; FU.selDesc = new Set(); iniciarTiradaFU(e, turnoKey); }
  const estKey = [e.fase, e.turnoDe, t && t.sub, t && t.edificio, e.inicial && e.inicial.idx, e.inicial && e.inicial.sub, e.yo].join('|');
  if (estKey !== FU.estKey) { FU.estKey = estKey; FU.sel = null; FU.zona = null; FU.panel = null; FU.selDesc = new Set(); }
  avisosFU(e);
  repintarFU();
  if (e.fase === 'fin' && e.fin) finalFU(e);
  else if ($('fuFinal') && !$('fuFinal').hidden) $('fuFinal').hidden = true;
}

// Lo que cada jugador hizo hace un momento (construir, entregar, cumplir una misión) se avisa un rato arriba.
function avisosFU(e) {
  const ult = e.contadorEventos || 0;
  if (FU.evVisto < 0) { FU.evVisto = ult; return; }
  const nuevos = (e.eventos || []).filter(v => v.id > FU.evVisto); FU.evVisto = ult;
  nuevos.forEach(v => {
    const quien = v.asiento === e.yo ? 'Tú' : fuNombreDe(e, v.asiento), art = { camino: 'un camino', pueblo: 'un pueblo', ciudad: 'una ciudad', caballero: 'un caballero' };
    let txt = null;
    if (art[v.tipo] && e.fase === 'turno') txt = quien + (v.asiento === e.yo ? ' construiste ' : ' construyó ') + art[v.tipo];
    else if (v.tipo === 'pedido') txt = quien + (v.asiento === e.yo ? ' entregaste un pedido' : ' entregó un pedido');
    else if (v.tipo === 'mision') txt = quien + (v.asiento === e.yo ? ' cumpliste una misión' : ' cumplió una misión');
    if (txt) FU.aviso = { txt, hasta: performance.now() + 2600 };
    if (art[v.tipo] && v.lugar !== null && v.lugar !== undefined) {   // lo que construyó cualquiera se muestra: la cámara se acerca y una marca lo señala un momento
      FU.foco = { tipo: v.tipo, lugar: v.lugar, asiento: v.asiento, t0: performance.now(), hasta: performance.now() + 2600 };
      clearTimeout(FU.tFoco); FU.tFoco = setTimeout(() => { FU.foco = null; if (FU.e) repintarFU(); }, 2700); animarMarcaFU();
    }
  });
}
function animarMarcaFU() {
  cancelAnimationFrame(FU.rafMarca);
  const paso = () => { if (!FU.foco || $('fu').hidden || performance.now() > FU.foco.hasta) return; if (!FU.anim) dibujarCamFU(); FU.rafMarca = requestAnimationFrame(paso); };
  FU.rafMarca = requestAnimationFrame(paso);
}
function avisoFU(txt) { FU.aviso = { txt, hasta: performance.now() + 2200 }; if (FU.e) pintarAvisoFU(FU.e, escenaFU(FU.e)); setTimeout(() => { if (FU.e) pintarAvisoFU(FU.e, escenaFU(FU.e)); }, 2300); }

// ---------- la tirada: los dados, las ganancias y el bandido ----------
// Fases: 0 los dados ruedan · 1 aterrizaron («Sale N») · 2 las tarjetas salen de los edificios (o el bandido se mueve) · 3 las ganancias de todos.

function iniciarTiradaFU(e, key) {
  const t = e.turno;
  if (!t || t.sub !== 'tirada') { FU.tirada = null; FU.fase = 3; FU.band = null; return; }
  if (sinMovimiento()) { FU.tirada = { key }; FU.fase = 3; return; }
  FU.tirada = { key }; FU.fase = 0;
  const esc = FU.escena, vals = [t.num.a, t.num.b];
  setTimeout(() => {
    if (!FU.tirada || FU.tirada.key !== key) return;
    $('fuDados').hidden = false; esc.maxAlto = Math.round(Math.min($('fu').clientHeight * 0.5, 340)); esc.ajustar(); esc.mostrar([1, 1]); esc.tirar([0, 1], vals, e.ronda * 31 + t.num.suma);
    requestAnimationFrame(() => { const r = $('fuDados').getBoundingClientRect(), s0 = $('fu').getBoundingClientRect(); $('fuSale').style.top = Math.round(r.bottom - s0.top + 8) + 'px'; });   // («Sale N» va justo debajo de la mesa)
  }, 250);
  setTimeout(() => aterrizoFU(key), 5200);   // (por si la animación no avisa)
}
function aterrizoFU(key) {
  if (!FU.tirada || FU.tirada.key !== key || FU.fase >= 1) return;
  FU.fase = 1; repintarFU();
  setTimeout(() => { if (!FU.tirada || FU.tirada.key !== key) return; FU.fase = 2; FU.band = { t0: performance.now() }; repintarFU(); animarBandidoFU(); }, 2300);   // (los dados se quedan quietos un buen rato, con el «Sale N»)
  setTimeout(() => { if (!FU.tirada || FU.tirada.key !== key) return; FU.fase = 3; repintarFU(); }, 3900);
}
function animarBandidoFU() {
  cancelAnimationFrame(FU.rafBand);
  const paso = () => { if (!FU.band || $('fu').hidden) return; dibujarCamFU(); if (performance.now() - FU.band.t0 < 1500) FU.rafBand = requestAnimationFrame(paso); };
  FU.rafBand = requestAnimationFrame(paso);
}

// ---------- repintar ----------

function repintarFU() {
  const e = FU.e; if (!e || !e.mapa) return;
  const sec = $('fu'), W = sec.clientWidth, H = sec.clientHeight; if (!W || !H) return;
  FU.MOV = W < 700 || H < 520;
  const geo = geometria(e.mapa), t = e.turno, esc = escenaFU(e); FU.esc = esc;
  pintarRecursosFU(e, esc); pintarPiezasFU(e); pintarMisionesFU(e); pintarJugadoresFU(e); pintarManoFU(e, esc); pintarBotonesFU(e, esc); pintarAvisoFU(e, esc); pintarVeloFU(e, esc); pintarDadosFU(e, esc); pintarGananciasFU(e, esc); relojFU(e);
  // el mapa ocupa lo que queda entre las columnas, la barra de arriba y la mano de abajo (centrado en la pantalla)
  const base = Math.min(W, H), lado = Math.round(base * 0.27) + 10, top = $('fuTiempo').offsetHeight + 4, bottom = H - Math.round(base * 0.125) - 10;   // (las márgenes son fijas: el mapa no da saltos cuando aparece o desaparece algo)
  const left = lado, right = W - lado, aw = Math.max(200, right - left), ah = Math.max(120, bottom - top);
  const cands = candidatosFU(e, geo); FU.candidatos = cands;
  const colocando = cands.length > 0;
  let z, foco = { x: geo.WW / 2, y: geo.WH / 2 }, zonas = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 3), ajuste = Math.min(aw / geo.WW, ah / geo.WH) * 0.98;
  const zLleno = Math.max(1, Math.floor(Math.min(FU.MOV ? 4 : 6, ajuste) * dpr)) / dpr;   // (cada píxel del arte ocupa un número entero de píxeles de la pantalla)
  z = zLleno;
  if (colocando) {
    const zs = FU.MOV ? [4, 3, 2] : [5, 4, 3, 2];
    let lista = cands;
    if (FU.MOV && cands.length > 6) { zonas = zonasFU(cands); if (FU.zona !== null && zonas[FU.zona]) lista = zonas[FU.zona].lista; }
    const zc = fuFitZ(lista, aw - 16, ah - 16, 16, zs);
    if (FU.MOV && cands.length > 6 && FU.zona === null && zc < 3) { z = zLleno; FU.zonas = zonas; }
    else { z = zc; foco = fuCentro(lista); FU.zonas = []; }
  } else if (FU.foco && performance.now() < FU.foco.hasta) {
    const pt = puntoLugarFU(e, geo, FU.foco.tipo, FU.foco.lugar, FU.foco.asiento), zp = fuFitZ([pt], aw - 20, ah - 20, 40, FU.MOV ? [3, 2] : [4, 3]);
    if (zp > zLleno) { z = zp; foco = pt; }
    FU.zonas = [];
  } else FU.zonas = [];
  const cx = left + aw / 2, cy = top + ah / 2;
  const kMundo = e.version + '|' + e.mapa.semilla; if (FU.kMundo !== kMundo || !FU.mundo) { FU.kMundo = kMundo; FU.mundo = dibujarMundo(e, geo); }
  FU.pl = { e, geo, colocando, W, H };   // (lo que hace falta para redibujar el mapa en cada cuadro de la transición)
  irCamaraFU({ z, fx: foco.x, fy: foco.y, cx, cy, W, H });
  FU.zonasMostrar = FU.MOV && colocando && FU.zona === null && zonas.length && z === zLleno ? zonas : [];
}

// ---------- la cámara: el zoom y el movimiento por el mapa son una transición suave ----------

function irCamaraFU(m) {
  const v = FU.vista;
  const salto = !v || Math.abs(v.cx - m.cx) > 1 || Math.abs(v.cy - m.cy) > 1 || v.W !== m.W || v.H !== m.H;
  if (salto || sinMovimiento()) { FU.vista = Object.assign({}, m); FU.anim = null; dibujarCamFU(); return; }
  const meta = FU.anim ? FU.anim.a : v;
  if (Math.abs(meta.z - m.z) < 1e-6 && Math.hypot(meta.fx - m.fx, meta.fy - m.fy) < 0.5) { if (!FU.anim) dibujarCamFU(); return; }
  FU.anim = { de: { z: v.z, fx: v.fx, fy: v.fy }, a: m, t0: performance.now(), dur: 460 };
  if (!FU.animId) FU.animId = requestAnimationFrame(pasoCamFU);
}
function pasoCamFU(ahora) {
  FU.animId = 0; const an = FU.anim; if (!an) return;
  const t = Math.min(1, (ahora - an.t0) / an.dur), k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, v = FU.vista;
  v.z = Math.exp(Math.log(an.de.z) + (Math.log(an.a.z) - Math.log(an.de.z)) * k);   // (el zoom crece de forma pareja: se interpola en logaritmo)
  v.fx = an.de.fx + (an.a.fx - an.de.fx) * k; v.fy = an.de.fy + (an.a.fy - an.de.fy) * k;
  if (t >= 1) { FU.vista = Object.assign({}, an.a); FU.anim = null; }
  dibujarCamFU();
  if (FU.anim) FU.animId = requestAnimationFrame(pasoCamFU);
}
function dibujarCamFU() {
  const pl = FU.pl, v = FU.vista; if (!pl || !v || !FU.mundo) return;
  const c = $('fuMapa'), W = pl.W, H = pl.H, dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (c.width !== Math.round(W * dpr)) c.width = Math.round(W * dpr); if (c.height !== Math.round(H * dpr)) c.height = Math.round(H * dpr);
  c.style.width = W + 'px'; c.style.height = H + 'px';
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.fillStyle = 'rgb(15,54,79)'; g.fillRect(0, 0, c.width, c.height);
  const quieto = !FU.anim, z = quieto ? Math.max(1, Math.round(v.z * dpr)) / dpr : v.z, S = z * dpr;
  let ox = v.fx - v.cx / z, oy = v.fy - v.cy / z; if (quieto) { ox = Math.round(ox * S) / S; oy = Math.round(oy * S) / S; }   // (en reposo cae justo en píxeles enteros: nítido)
  g.setTransform(S, 0, 0, S, -ox * S, -oy * S);
  g.drawImage(FU.mundo, 0, 0);
  superponerFU(g, pl.e, pl.geo, pl.colocando, z);
  g.setTransform(1, 0, 0, 1, 0, 0);
  FU.cam = { z, ox, oy, W, H };
}

// Lo que se dibuja sobre el mapa según la escena: los hexágonos que producen, las tarjetas que salen de los edificios, el bandido y los lugares donde poner una pieza.
function superponerFU(g, e, geo, colocando, z) {
  const t = e.turno, A = FU_ARTE; FU.parpadea = false;
  const tirada = e.fase === 'turno' && t && t.sub === 'tirada' && FU.tirada;
  if (tirada && FU.fase >= 1 && t.num.suma !== 7) {
    FU.parpadea = true; const marca = fuTitila();
    t.hexes.forEach(i => { const h = e.mapa.hexes[i], p = geo.hx(h); g.drawImage(A.aroHex(marca, 2.4), Math.round(p.x - A.WD / 2), Math.round(p.y - A.HT / 2)); });
  }
  if (tirada && FU.fase === 2 && t.num.suma !== 7) {   // cada tarjeta que gana el propio jugador sale de su pueblo o ciudad
    t.detalle.filter(d => d.asiento === e.yo).forEach(d => {
      const p = geo.v(e.mapa.vertices[d.vertice]);
      for (let i = 0; i < d.n; i++) g.drawImage(A.dado2d(FU_NOMBRE_REC[d.recurso]), Math.round(p.x - 8 + (i - (d.n - 1) / 2) * 17), Math.round(p.y - 28));
    });
  }
  // el bandido: quieto en su casilla, o desplazándose de la anterior a la nueva cuando acaba de salir un 7
  const nuevo = geo.hx(e.mapa.hexes[e.tab.bandido]);
  if (tirada && t.num.suma === 7 && FU.fase <= 2) {
    const antes = geo.hx(e.mapa.hexes[t.bandidoAntes]);
    if (FU.fase < 2) dibujarBandidoFU(g, antes, 1, true);
    else {   // el bandido se mueve solo (sin la cruz); cuando llega, aparece la cruz en la casilla nueva
      const k = Math.min(1, (performance.now() - (FU.band ? FU.band.t0 : 0)) / 1400), s = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      dibujarBandidoFU(g, { x: antes.x + (nuevo.x - antes.x) * s, y: antes.y + (nuevo.y - antes.y) * s }, 1, k >= 1);
      if (k >= 1) { g.drawImage(A.aroHex(fuTitila(), 2.4), Math.round(nuevo.x - A.WD / 2), Math.round(nuevo.y - A.HT / 2)); FU.parpadea = true; }
    }
  } else dibujarBandidoFU(g, nuevo, 1, true);
  if (!colocando && FU.foco && performance.now() < FU.foco.hasta) fuMarcaFU(g, puntoLugarFU(e, geo, FU.foco.tipo, FU.foco.lugar, FU.foco.asiento), fuColor(FU.foco.asiento), FU.foco.t0);
  if (colocando) {
    fuOscurecer(g, 0.5);
    if (FU.zonasMostrar && FU.zonasMostrar.length) { FU.candidatos.forEach(c => fuPunto(g, c, 1.6, false)); FU.zonasMostrar.forEach(zn => fuAroZona(g, zn)); }
    else {
      FU.candidatos.forEach(c => fuPunto(g, c, c.id === FU.sel ? 5.2 : 3.4, c.id === FU.sel));
      const s = FU.candidatos.find(c => c.id === FU.sel);
      if (s) {
        const sub = s.tipo, col = fuColor(e.yo);
        if (sub === 'pueblo') { const im = A.casa(col); g.drawImage(im, Math.round(s.x - 6), Math.round(s.y - 10)); }
        else if (sub === 'ciudad') { const im = A.ciudad(col); g.drawImage(im, Math.round(s.x - 8), Math.round(s.y - 10)); }
        else if (sub === 'caballero') { g.drawImage(A.caballero(col), Math.round(s.x - 5), Math.round(s.y - 8)); }
        else if (sub === 'camino') { const ar = e.mapa.aristas[s.id]; lineaCaminoFU(g, geo.v(e.mapa.vertices[ar.a]), geo.v(e.mapa.vertices[ar.b]), col); }
      }
    }
  }
}

// ---------- tocar el mapa ----------

function tocarMapaFU(ev) {
  const e = FU.e; if (!e || !FU.cam || !FU.candidatos) return;
  const r = $('fuMapa').getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top, z = FU.cam.z;
  const wx = sx / z + FU.cam.ox, wy = sy / z + FU.cam.oy;
  if (FU.zonasMostrar && FU.zonasMostrar.length) {
    let mejor = -1, dm = Infinity; FU.zonasMostrar.forEach((zn, i) => { const d = Math.hypot(zn.x - wx, zn.y - wy); if (d <= zn.r * 1.25 && d < dm) { dm = d; mejor = i; } });
    if (mejor >= 0) { Sonido.play('clic'); FU.zona = FU.zonas.indexOf(FU.zonasMostrar[mejor]); if (FU.zona < 0) FU.zona = mejor; repintarFU(); }
    return;
  }
  let mejor = null, dm = Infinity;
  FU.candidatos.forEach(c => { const d = Math.hypot(c.x - wx, c.y - wy) * z; if (d < dm) { dm = d; mejor = c; } });
  if (mejor && dm <= Math.max(26, 8 * z)) { FU.sel = mejor.id; Sonido.play('clic'); repintarFU(); }
}

// ---------- el HUD: piezas, misiones, jugadores, mano y botones ----------

// Se vuelve a armar un pedazo de la pantalla solo si cambió lo que muestra.
function conLlave(caja, llave, armar) { const k = JSON.stringify(llave); if (caja.dataset.llave === k) return; caja.dataset.llave = k; caja.textContent = ''; armar(caja); }

function pintarPiezasFU(e) {
  const caja = $('fuPiezas'), yo = e.jugadores.find(j => j.asiento === e.yo);
  caja.hidden = !yo || !yo.quedan;
  if (caja.hidden) return;
  const tiene = { camino: yo.caminos, pueblo: yo.pueblos, ciudad: yo.ciudades, caballero: yo.caballeros };   // (cuántos tienes puestos, no cuántos te quedan)
  conLlave(caja, tiene, c => {
    [['camino', 'Caminos'], ['pueblo', 'Pueblos'], ['ciudad', 'Ciudades'], ['caballero', 'Caballeros']].forEach(([k, n]) => { const s = fuEl('span', '', n + ' '); s.append(fuEl('b', '', String(tiene[k]))); c.append(s); });
  });
}

function pintarMisionesFU(e) {
  const caja = $('fuMisiones'), g = e.grupo;
  caja.hidden = !g || !g.misiones.length;
  if (caja.hidden) return;
  caja.classList.toggle('clic', e.fase === 'turno' && e.turno && e.turno.de === e.yo && e.turno.sub === 'turno');
  conLlave(caja, [g.misiones.map(m => [m.id, m.quedan, m.por]), e.turno && e.turno.entregables, e.turno && e.turno.sub], c => {
    g.misiones.forEach(m => {
      const d = fuEl('div', 'fuMis' + (m.clase === 'B' ? ' ped' : '') + (m.por !== null ? ' tomada' : '') + (e.turno && e.turno.entregables && e.turno.entregables.includes(m.id) ? ' lista' : ''));
      const t = fuEl('div', 'fuMisT'); t.append(fuEl('b', '', FU_MISION[m.id] || m.id), document.createTextNode(' +1 PV')); d.append(t);
      d.append(fuEl('small', '', m.por !== null ? 'Se la llevó ' + fuNombreDe(e, m.por) : (m.clase === 'B' ? 'Pedido · ' + (m.quedan === 1 ? 'vence en 1 turno' : 'vence en ' + m.quedan + ' turnos') : 'Sin vencimiento')));
      c.append(d);
    });
  });
  caja.onclick = () => { const t = e.turno; if (e.fase === 'turno' && t && t.de === e.yo && t.sub === 'turno') { Sonido.play('clic'); FU.panel = 'pedidos'; repintarFU(); } };
}

function pintarJugadoresFU(e) {
  const caja = $('fuJugadores'), n = e.jugadores.length;
  conLlave(caja, [e.turnoDe, e.yo, e.carreras, e.mano, e.jugadores.map(j => [j.asiento, j.apodo, j.puntos, j.bot, j.conectado, j.expulsado, j.tarjetas])], c => {
    c.className = 'fuJug' + (n > 5 ? ' muchos' : '');
    e.jugadores.forEach(j => {
      const d = fuEl('div', 'fuJ' + (j.asiento === e.turnoDe ? ' turno' : '') + (j.asiento === e.yo ? ' soy' : '') + (j.conectado || j.bot ? '' : ' off'));
      d.style.borderLeftColor = fuRgb(fuColor(j.asiento));
      const cab = fuEl('div', 'fuJNom'); const nom = fuEl('span', 'fuJN'); ponerNombre(nom, (j.asiento === e.yo ? '★ ' : '') + j.apodo, j.bot || j.expulsado);
      cab.append(nom, fuEl('b', 'fuJP', j.puntos + ' PV'));
      const ins = fuEl('span', 'fuIns');
      if (e.carreras && e.carreras.camino === j.asiento) { const ic = FU_ARTE.camino(fuColor(j.asiento)); ic.style.cssText = 'width:' + ic.width * 2 + 'px;height:' + ic.height * 2 + 'px;image-rendering:pixelated'; ins.append(ic); ins.title = 'Camino más largo'; }
      if (e.carreras && e.carreras.ejercito === j.asiento) { const ic = FU_ARTE.caballero(fuColor(j.asiento)); ic.style.cssText = 'width:' + ic.width + 'px;height:' + ic.height + 'px;image-rendering:pixelated'; ins.append(ic); ins.title = 'Ejército más grande'; }
      cab.append(ins);
      const mano = fuEl('div', 'fuJMano');
      if (j.asiento === e.yo && e.mano) expandirFU(e.mano).forEach(r => { const i = fuEl('i', 'fuMini'); i.style.background = fuRgb(FU_ARTE.EST[FU_NOMBRE_REC[r]].cuerpo); mano.append(i); });   // (mis tarjetas, de color y sin texto)
      else { for (let i = 0; i < Math.min(j.tarjetas, 14); i++) mano.append(fuEl('i', 'fuMini dorso')); if (j.tarjetas > 14) mano.append(fuEl('span', 'fuMas', '+' + (j.tarjetas - 14))); }   // (las de los demás: solo cuántas)
      d.append(cab, mano); c.append(d);
    });
  });
}

function pintarManoFU(e, esc) {
  const caja = $('fuMano'), yo = e.jugadores.find(j => j.asiento === e.yo);
  const ver = !!yo && !!e.mano && esc !== 'descarte' && esc !== 'fin' && esc !== 'nada' && e.fase !== 'inicial';
  caja.hidden = !ver; if (!ver) return;
  const t = e.turno, mio = t && t.de === e.yo;
  // las ganancias de esta tirada llegan a la mano recién cuando se muestran
  const gan = t && t.sub === 'tirada' ? (t.gana.find(x => x.asiento === e.yo) || { mano: [0, 0, 0, 0, 0] }).mano : [0, 0, 0, 0, 0];
  const ocultar = t && t.sub === 'tirada' && FU.fase < 3;
  conLlave(caja, [e.mano, ocultar, gan, FU.panel ? 1 : 0], c => {
    const base = e.mano.map((n, r) => n - (ocultar ? gan[r] : 0));
    expandirFU(base).forEach(r => c.append(cartaFU(r)));
    if (!ocultar) expandirFU(gan).forEach(r => { const k = cartaFU(r, 'nueva'); c.append(k); });
    const total = e.mano.reduce((s, n) => s + n, 0) - (ocultar ? gan.reduce((s, n) => s + n, 0) : 0);
    c.append(fuEl('span', 'fuCuenta' + (total > e.manoMax ? ' sobra' : ''), total + '/' + e.manoMax));
  });
}

const botonFU = (txt, f, cls) => { const b = nuevoBoton(txt, f, FU.MOV ? 1.1 : 1.7); if (cls === 'oro') b.oro = true; if (cls === 'off') b.style.opacity = '.45'; return b; };
function pintarBotonesFU(e, esc) {
  const caja = $('fuBotones'), t = e.turno;
  const llave = [esc, FU.sel, FU.zona, FU.panel ? 1 : 0, t && t.edificio, t && t.posibles, e.turnoDe, FU.zonasMostrar.length];
  conLlave(caja, llave, c => {
    const add = (...bs) => bs.forEach(b => b && c.append(b));
    if (esc === 'turno' && !FU.panel) add(botonFU('Construir', () => { Sonido.play('clic'); FU.panel = 'construir'; repintarFU(); }), botonFU('Terminar turno', () => hacerFU('pasar'), 'oro'));
    else if (esc === 'colocar') add(botonFU('Atrás', () => { if (FU.zona !== null) { FU.zona = null; FU.sel = null; repintarFU(); } else hacerFU('atras'); }), FU.sel !== null ? botonFU('Confirmar', () => confirmarLugarFU(), 'oro') : null);
    else if (esc === 'inicial') add(FU.zona !== null ? botonFU('Atrás', () => { FU.zona = null; FU.sel = null; repintarFU(); }) : null, FU.sel !== null ? botonFU('Poner aquí', () => confirmarLugarFU(), 'oro') : null);
    else if ((esc === 'turnoAjeno' || esc === 'colocarAjeno' || esc === 'descarteAjeno') && e.turnoDe !== null) add(botonFU('Esperando a ' + fuNombreDe(e, e.turnoDe), () => {}, 'off'));
  });
}

function pintarAvisoFU(e, esc) {
  const caja = $('fuAviso'), t = e.turno; let txt = null, dorsos = 0;
  const ahoraP = performance.now();
  if (FU.aviso && ahoraP < FU.aviso.hasta) txt = FU.aviso.txt;
  else if (esc === 'tirada' && t && FU.fase >= 2 && t.num.suma === 7) txt = 'Salió 7, el bandido se mueve';
  else if (esc === 'tirada' && t && FU.fase >= 2 && !t.gana.length) txt = 'Salió ' + t.num.suma + ': nadie cobra';
  else if (esc === 'inicial') txt = 'Fundación · ronda ' + (Math.floor(e.inicial.idx / e.jugadores.length) + 1) + ' de 2: elige tu ' + (e.inicial.sub === 'pueblo' ? 'pueblo' : 'camino');
  else if (esc === 'inicialAjeno') txt = fuNombreDe(e, e.inicial.de) + ' pone su ' + (e.inicial.sub === 'pueblo' ? 'pueblo' : 'camino');
  else if (esc === 'colocar') txt = 'Elige dónde poner ' + ({ camino: 'el camino', pueblo: 'el pueblo', ciudad: 'la ciudad', caballero: 'el caballero' }[t.edificio] || 'la pieza');
  else if (esc === 'colocarAjeno') txt = fuNombreDe(e, t.de) + ' elige dónde poner su ' + (FU_NOMBRE_ED[t.edificio] || 'pieza').toLowerCase();
  else if (esc === 'descarteAjeno') { txt = fuNombreDe(e, t.de) + ' descarta ' + t.exceso + (t.exceso === 1 ? ' tarjeta' : ' tarjetas'); dorsos = t.exceso; }
  else if (esc === 'finTurno' && t && t.motivo === 'tiempo') txt = 'Se acabó el tiempo de ' + (t.de === e.yo ? 'tu turno' : fuNombreDe(e, t.de));
  caja.hidden = !txt;
  if (!txt) { caja.dataset.llave = ''; return; }
  conLlave(caja, [txt, dorsos], c => { c.append(fuEl('div', 'fuBanner', txt)); if (dorsos) { const d = fuEl('div', 'fuFila'); for (let i = 0; i < Math.min(dorsos, 6); i++) d.append(dorsoFU()); c.append(d); } });
  if (FU.aviso && ahoraP < FU.aviso.hasta) { clearTimeout(FU.tAviso); FU.tAviso = setTimeout(() => { if (FU.e) pintarAvisoFU(FU.e, escenaFU(FU.e)); }, Math.max(50, FU.aviso.hasta - ahoraP + 30)); }
}

// Al poner los primeros pueblos: qué recursos cobrarías con el pueblo que estás por poner (con el número de cada uno), cuáles ya cobras con el primero y cuáles te van a faltar.
function pintarRecursosFU(e, esc) {
  const caja = $('fuRecursos'), ini = e.inicial;
  const ver = esc === 'inicial' && !!ini && e.yo !== null;
  caja.hidden = !ver; if (!ver) { caja.dataset.llave = ''; return; }
  const geo = geometria(e.mapa), ya = {}, nuevo = {};
  const sumar = (dic, v) => e.mapa.vertices[v].hexes.forEach(h => { const hx = e.mapa.hexes[h], r = FU_TIPO_RECURSO[hx.tipo]; if (r === undefined) return; (dic[r] = dic[r] || []).push(hx.num); });
  e.tab.vert.forEach((o, v) => { if (o && o[0] === e.yo) sumar(ya, v); });
  const poniendo = ini.sub === 'pueblo' && FU.sel !== null;
  if (poniendo) sumar(nuevo, FU.sel);
  if (!Object.keys(ya).length && !poniendo) { caja.hidden = true; return; }   // (con el primer pueblo todavía sin elegir no hay nada que mostrar)
  conLlave(caja, [ya, nuevo, poniendo], c => {
    const t = fuEl('div', 'fuRecT', poniendo ? (Object.keys(ya).length ? 'Con este pueblo' : 'Este pueblo cobra') : 'Ya cobras');
    const fila = fuEl('div', 'fuFila');
    [0, 1, 2, 3, 4].forEach(r => {
      const g = fuEl('div', 'fuGrupo'), da = nuevo[r] || ya[r];
      g.append(da ? cartaFU(r, nuevo[r] ? '' : 'ya') : cartaFU(r, 'vacia'));
      const nums = fuEl('div', 'fuFila');
      if (da) da.slice().sort((a, b) => b - a).forEach(n => nums.append(fuEl('span', 'fuNum' + (n === 6 || n === 8 ? ' roj' : ''), String(n))));
      else nums.append(fuEl('span', 'fuFalta', poniendo || Object.keys(ya).length ? 'Falta' : ''));
      g.append(nums); fila.append(g);
    });
    c.append(t, fila);
  });
}

// ---------- las ventanas sobre el tablero: descarte, construir, misiones y pedidos, entrega ----------

function pintarVeloFU(e, esc) {
  const velo = $('fuVelo'), t = e.turno;
  let tipo = null;
  if (esc === 'descarte') tipo = 'descarte';
  else if (esc === 'turno' && FU.panel) tipo = typeof FU.panel === 'string' ? FU.panel : 'entrega';
  velo.hidden = !tipo; if (!tipo) { velo.dataset.llave = ''; return; }
  conLlave(velo, [tipo, FU.panel, [...FU.selDesc], e.mano, t && t.exceso, t && t.posibles, t && t.entregables, e.grupo && e.grupo.misiones.map(m => [m.id, m.quedan, m.por])], c => {
    c.append(fuEl('div', 'fuFondo'));
    const centro = fuEl('div', 'fuCentro'); c.append(centro);
    if (tipo === 'descarte') descarteVeloFU(e, centro);
    else if (tipo === 'construir') construirVeloFU(e, centro);
    else if (tipo === 'pedidos') pedidosVeloFU(e, centro);
    else entregaVeloFU(e, centro);
  });
}
function descarteVeloFU(e, centro) {
  const t = e.turno, n = t.exceso, cartas = expandirFU(e.mano), s = FU.selDesc.size, falta = n - s;
  centro.append(fuEl('div', 'fuTitulo', 'Descarta ' + n + (n === 1 ? ' tarjeta' : ' tarjetas')), fuEl('div', 'fuSub', 'Máximo ' + e.manoMax));
  const fila = fuEl('div', 'fuFila fuGrandes');
  cartas.forEach((r, i) => { const k = cartaFU(r, 'g' + (FU.selDesc.has(i) ? ' sel' : '')); k.onclick = () => { if (FU.selDesc.has(i)) FU.selDesc.delete(i); else if (FU.selDesc.size < n) FU.selDesc.add(i); Sonido.play('clic'); repintarFU(); }; fila.append(k); });
  centro.append(fila);
  const quitar = [0, 0, 0, 0, 0]; FU.selDesc.forEach(i => { quitar[cartas[i]]++; });
  const b = botonFU(falta > 0 ? 'Faltan ' + falta : 'Descartar', () => { if (falta === 0) hacerFU('descartar', { quitar }); }, falta > 0 ? 'off' : 'oro'); b.classList.add('fuBtnAncho');
  centro.append(b);
}
function construirVeloFU(e, centro) {
  const t = e.turno, mano = e.mano; let ninguna = true;
  const ops = fuEl('div', 'fuOpc');
  ['camino', 'pueblo', 'ciudad', 'caballero'].forEach(ed => {
    const ok = t.posibles.includes(ed), costo = FU_COSTOS[ed], faltan = [];
    costo.forEach((n, r) => { if (mano[r] < n) faltan.push((n - mano[r]) + ' ' + FU_NOMBRE_REC[r]); });
    const motivo = !faltan.length && !ok ? ((t.motivos && t.motivos[ed]) || 'No hay dónde ponerlo') : '';
    if (ok) ninguna = false;
    const c = fuEl('div', 'fuOp ' + (ok ? 'si' : 'no'));
    c.append(fuEl('div', 'fuNm', FU_NOMBRE_ED[ed]), costoFU(costo, mano), fuEl('div', ok ? 'fuOk' : 'fuFalta', ok ? 'Puedes construir' : (faltan.length ? 'Te falta ' + faltan.join(' y ') : motivo)));
    c.onclick = () => { Sonido.play('clic'); if (ok) hacerFU('construir', { edificio: ed }); else avisoFU(faltan.length ? 'Te falta ' + faltan.join(' y ') : motivo); };
    ops.append(c);
  });
  centro.append(fuEl('div', 'fuTitulo', ninguna ? 'No puedes construir nada' : '¿Qué construyes?'), ops);
  centro.append(ninguna ? (() => { const b = botonFU('Pasar', () => hacerFU('pasar'), 'oro'); b.classList.add('fuBtnAncho'); return b; })() : botonFU('Atrás', () => { FU.panel = null; repintarFU(); }));
}
function pedidosVeloFU(e, centro) {
  const t = e.turno, mano = e.mano, ops = fuEl('div', 'fuOpc');
  e.grupo.misiones.forEach(m => {
    const B = m.clase === 'B', ok = B && t.entregables.includes(m.id) && m.por === null;
    const c = fuEl('div', 'fuOp ' + (ok ? 'si' : (B ? 'no' : 'info')));
    c.append(fuEl('div', 'fuNm', FU_MISION[m.id] || m.id));
    if (B) c.append(m.costo ? costoFU(m.costo, mano) : costoIgualesFU(mano));
    const falt = []; if (B && m.costo) m.costo.forEach((n, r) => { if (mano[r] < n) falt.push((n - mano[r]) + ' ' + FU_NOMBRE_REC[r]); });
    c.append(fuEl('div', 'fuSub', B ? '+1 PV · ' + (m.quedan === 1 ? 'vence en 1 turno' : 'vence en ' + m.quedan + ' turnos') : '+1 PV · no se entrega: se cumple construyendo'));
    if (B) c.append(fuEl('div', ok ? 'fuOk' : 'fuFalta', ok ? 'Puedes entregarlo' : (m.costo ? 'Te falta ' + falt.join(' y ') : 'Necesitas 3 tarjetas iguales')));
    if (B) c.onclick = () => { Sonido.play('clic'); if (ok) { FU.panel = { entrega: m.id }; repintarFU(); } else avisoFU(m.costo ? 'Te falta ' + falt.join(' y ') : 'Necesitas 3 tarjetas iguales'); };
    ops.append(c);
  });
  centro.append(fuEl('div', 'fuTitulo', 'Misiones y pedidos'), ops, botonFU('Atrás', () => { FU.panel = null; repintarFU(); }));
}
function entregaVeloFU(e, centro) {
  const m = e.grupo.misiones.find(x => x.id === FU.panel.entrega), q = m ? entregaFU(m, e.mano) : null;
  if (!m || !q) { FU.panel = 'pedidos'; return; }
  const op = fuEl('div', 'fuOp si fuQuieta'); op.append(fuEl('div', 'fuNm', FU_MISION[m.id] || m.id), fuEl('div', 'fuSub', '+1 PV'));
  centro.append(fuEl('div', 'fuTitulo', 'Entregar pedido'), op);
  const fila = fuEl('div', 'fuFila fuGrandes'), resto = q.slice();
  expandirFU(e.mano).forEach(r => { const va = resto[r] > 0; if (va) resto[r]--; fila.append(cartaFU(r, 'g' + (va ? ' sel' : ''))); });   // (las que se entregan quedan marcadas y no se pueden cambiar)
  centro.append(fila);
  const bs = fuEl('div', 'fuFila'); bs.append(botonFU('Atrás', () => { FU.panel = 'pedidos'; repintarFU(); }), botonFU('Entregar', () => hacerFU('entregar', { id: m.id }), 'oro'));
  centro.append(bs);
}

// Los dados en el centro de la pantalla, con «Sale N».
function pintarDadosFU(e, esc) {
  const caja = $('fuDados'), t = e.turno;
  const ver = esc === 'tirada' && !!FU.tirada && FU.fase <= 1 && !sinMovimiento();
  caja.hidden = !ver; $('fuSale').hidden = !(ver && FU.fase === 1);
  if (ver) { const s = $('fuSale'); s.textContent = ''; s.append(fuEl('div', 'fuSaleN', 'Sale ' + t.num.suma), fuEl('div', 'fuSaleD', t.num.a + ' + ' + t.num.b)); }
}
// Las ganancias de la tirada de todos, al frente.
function pintarGananciasFU(e, esc) {
  const caja = $('fuGanancias'), t = e.turno;
  const ver = esc === 'tirada' && FU.tirada && FU.fase === 3 && t.num.suma !== 7 && t.gana.length > 0;
  caja.hidden = !ver; if (!ver) { caja.dataset.llave = ''; return; }
  conLlave(caja, [t.gana, e.ronda], c => {
    c.append(fuEl('div', 'fuTitulo', 'Ganancias de la tirada'));
    const fila = fuEl('div', 'fuFila fuGan');
    t.gana.forEach(x => {
      const g = fuEl('div', 'fuGrupo'), cab = fuEl('div', 'fuFila'), av = fuEl('i', 'fuAv'); av.style.background = fuRgb(fuColor(x.asiento));
      cab.append(av, fuEl('span', '', x.asiento === e.yo ? 'Tú' : fuNombreDe(e, x.asiento)));
      const cs = fuEl('div', 'fuFila'); expandirFU(x.mano).forEach(r => cs.append(cartaFU(r)));
      g.append(cab, cs); fila.append(g);
    });
    c.append(fila);
  });
}

// ---------- las acciones ----------

async function hacerFU(nombre, extra) { const r = await accion(nombre, extra); if (r && !r.ok && r.error) avisoFU(r.error); return r; }
function confirmarLugarFU() { if (FU.sel === null) return; const lugar = FU.sel; FU.sel = null; hacerFU('colocar', { lugar }); }

// ---------- el reloj ----------

function relojFU(e) {
  const b = $('fuTiempo'), esc = FU.esc || escenaFU(e), t = e.turno;
  const conReloj = ['turno', 'turnoAjeno', 'descarte', 'descarteAjeno', 'colocar', 'colocarAjeno', 'inicial', 'inicialAjeno'].includes(esc);
  b.hidden = false; b.classList.toggle('quieta', !conReloj);   // (la barra no aparece y desaparece: cuando no hay tiempo que contar queda gris)
  if (!conReloj) { b.firstChild.style.width = '0%'; b.lastChild.textContent = ''; b.classList.remove('poco'); return; }
  const de = e.fase === 'inicial' && e.inicial ? e.inicial.de : (t ? t.de : null), mio = de === e.yo;
  const total = e.limiteDur || (e.fase === 'inicial' ? e.tiempos.inicial : e.tiempos.turno), restante = e.limite ? e.limite - ahora() : total;
  const frac = e.sinTiempo || !e.limite ? 1 : Math.max(0, Math.min(1, restante / total));
  b.firstChild.style.width = Math.round(frac * 100) + '%'; b.classList.toggle('poco', !e.sinTiempo && restante < Math.max(2500, total * 0.2));
  const s = Math.max(0, Math.ceil(restante / 1000));
  b.lastChild.textContent = (mio ? 'Tu turno' : 'Turno de ' + (de === null ? '—' : fuNombreDe(e, de))) + (e.sinTiempo || !e.limite ? '' : ' · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
}

// ---------- el final ----------

// La imagen del ranking para compartir: igual a la ventana del final (el título, el resumen y una fila por jugador).
function imagenRankingFU(f, e, tx) {
  const W = IMG.ancho, P = 44, G = 18, FILA = 66, filas = f.ranking.slice(0, 8), emp = infoEmpateFin(f, e.yo);
  const H = 22 + P - 10 + 18 + 12 + 36 + 10 + (tx.sub ? 26 + 8 : 0) + G + filas.length * FILA + G + 18 + P - 10;
  const { cv, ctx } = imgLienzo(H);
  let y = 22 + P - 10;
  y += 16; imgTexto(ctx, 'FUNDACIÓN · LUCID STAKES', W / 2, y, 16, '#a99cc9', 'center'); y += 12;
  y += 36; imgTexto(ctx, imgRecortar(ctx, tx.titulo, 34, W - 2 * P, 700), W / 2, y, 34, '#fff3c4', 'center', 700); y += 10;
  if (tx.sub) { y += 26; imgTexto(ctx, imgRecortar(ctx, tx.sub, 20, W - 2 * P), W / 2, y, 20, '#d9cfff', 'center'); y += 8; }
  y += G;
  filas.forEach((r, i) => {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; ctx.fillRect(P, y, W - 2 * P, FILA);
    if (emp.lider(i) && f.modo === 'multi') { ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 3; ctx.strokeRect(P + 1.5, y + 1.5, W - 2 * P - 3, FILA - 3); }
    imgTexto(ctx, String(i + 1), P + 22, y + 42, 28, emp.lider(i) ? '#f2c94c' : '#a99cc9', 'center', 700);
    imgTexto(ctx, imgRecortar(ctx, r.apodo, 26, W - 2 * P - 230, 700), P + 56, y + 31, 26, '#fff3c4', 'left', 700);
    imgTexto(ctx, imgRecortar(ctx, 'Pueblos ' + r.pueblos + ' · Ciudades ' + r.ciudades + ' · Misiones ' + (r.misiones || 0), 16, W - 2 * P - 230), P + 56, y + 54, 16, '#a99cc9', 'left');
    imgTexto(ctx, r.puntos + ' PV', W - P - 16, y + 43, 30, '#f2c94c', 'right', 700);
    y += FILA;
  });
  y += G + 18; imgTexto(ctx, 'SALA ' + (sala || '') + ' · ' + new Date().toLocaleDateString(), W / 2, y, 15, '#a99cc9', 'center');
  return cv;
}

function finalFU(e) {
  const f = e.fin, key = f ? JSON.stringify([f.motivo, f.ranking.map(r => r.puntos), f.turnos]) : '';
  if (key === FU.finKey) return;
  FU.finKey = key;
  const m = $('fuFinal'), caja = m.querySelector('.caja'); caja.textContent = '';
  const solo = e.modo === 'solo', emp = infoEmpateFin(f, e.yo);
  let titulo, sub = '';
  if (solo) {
    let mejor = guardado('bj_fu_mejor'); mejor = mejor ? Number(mejor) : null;
    titulo = f.motivo === 'meta' ? '¡Llegaste a la meta!' : 'Partida terminada'; sub = f.turnos + ' turnos';
    if (f.motivo === 'meta' && (mejor === null || f.turnos < mejor)) { if (mejor !== null) sub += ' · ¡nuevo récord!'; mejor = f.turnos; guardado('bj_fu_mejor', String(mejor)); }
    if (mejor !== null) sub += ' · tu mejor marca: ' + mejor + ' turnos';
  } else if (f.motivo === 'abandono') titulo = 'La partida terminó';
  else { titulo = emp.empate ? emp.titulo : (emp.gane ? '¡Ganaste!' : 'Ganó ' + (f.ganador ? f.ganador.apodo : '?')); sub = f.ganador ? 'Llegó a ' + f.ganador.puntos + ' puntos en ' + f.turnos + ' turnos' : ''; }
  caja.classList.add('dmFin'); caja.append(fuEl('h3', '', titulo));
  if (sub) caja.append(fuEl('p', 'nota', sub));
  f.ranking.forEach((r, i) => {
    const fila = fuEl('div', 'filaR' + (emp.lider(i) && f.modo === 'multi' ? ' lider' : ''));
    const a = fuEl('div', '', String(i + 1)), b = fuEl('div'), nom = fuEl('div'); ponerNombre(nom, (r.asiento === e.yo ? '★ ' : '') + r.apodo, r.bot);
    const det = fuEl('div', 'chico', 'Pueblos ' + r.pueblos + ' · Ciudades ' + r.ciudades + ' · Misiones ' + (r.misiones || 0)); b.append(nom, det);
    fila.append(a, b, fuEl('div', 'dorado', r.puntos + ' PV')); caja.append(fila);
  });
  const bs = fuEl('div', 'botonesFin');
  bs.append(nuevoBoton('Nueva partida', () => { m.hidden = true; hacerFU('nueva'); }, 1.7), nuevoBoton('Compartir', () => compartirImagen(() => imagenRankingFU(f, e, { titulo, sub }), 'ranking-fundacion.png', 'Fundación · Lucid Stakes', 'Así quedó la partida'), 1.7), nuevoBoton('Salir', () => { m.hidden = true; salirDeLaMesa(); }, 1.7));
  caja.append(bs);
  m.hidden = false;
}
