'use strict';
// La partida de Fundación (el Catan de dados): el mapa de hexágonos con su cámara, los dados de recursos en 3D, las cuatro etapas del turno (producción, dados, construir y colocar) y el final.
// Todo lo decide el servidor (servidor/fundacion/mesa_fundacion.js); aquí solo se dibuja lo que manda y se envían acciones. Diseño: docs/catan_flujo.md.
// Usa: comun.js (accion, estado, nuevoBoton, ponerMedalla, ponerNombre), voxel.js (V), dados3d.js (D3), mesas.js (Mesas) y fu_arte.js (FU_ARTE).

const FU = { escena: null, e: null, keep: new Set(), objetivo: null, sel: null, zona: null, estKey: '', turnoKey: '', tiradaVista: -1, enviado: null, animando: false, finKey: '', cam: null, candidatos: [], zonas: [], ultimoMapa: null };
const FU_VALOR = { ciudad: 3, pueblo: 2.6, caballero: 1.3, camino: 1 };
const FU_TIPO_RECURSO = { bosque: 0, colinas: 1, pastos: 2, campos: 3, montana: 4 };
const FU_NOMBRE_REC = ['madera', 'ladrillo', 'lana', 'trigo', 'mineral', 'oro'];
const FU_NOMBRE_ED = { camino: 'Camino', pueblo: 'Pueblo', ciudad: 'Ciudad', caballero: 'Caballero' };
const FU_COSTOS = { camino: [0, 1], pueblo: [0, 1, 2, 3], ciudad: [4, 4, 4, 3, 3], caballero: [2, 3, 4] };   // las caras que cuesta cada edificio
const fuColor = asiento => Mesas.COLORES[asiento % Mesas.COLORES.length];
const fuRgb = c => 'rgb(' + c.map(v => Math.round(v * 255)).join(',') + ')';
const fuEl = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };

// ---------- abrir ----------

function abrirFU() {
  if (!FU.escena) {
    FU.escena = new D3.Escena($('fuDadosLienzo'), $('fuDados'), { maxAlto: 250, forzarGrilla: true, sinMesa: true });
    FU.escena.configurar(Array(6).fill('recurso'));
    FU.escena.alTocar = tocarDadoFU;
    FU.escena.alAterrizar = () => { if (!document.hidden) Sonido.play('ficha'); };
    FU.escena.alTerminar = () => { FU.animando = false; marcarDadosFU(); };
    $('fAyuda').appendChild(V.interrogante()); $('fAyuda').onclick = abrirAyudaFU;
    $('fInvitar').appendChild(V.invitar()); $('fInvitar').onclick = abrirInvitar;
    $('fSalir').appendChild(V.puerta()); $('fSalir').onclick = confirmarSalir;
    $('fSonido').onclick = () => { Sonido.setActivo(!Sonido.activo); pintarSonidoFU(); Sonido.play('clic'); };
    $('fuMapa').addEventListener('pointerdown', tocarMapaFU);
    window.addEventListener('resize', () => { clearTimeout(FU.tRes); FU.tRes = setTimeout(() => { if (!$('fu').hidden && FU.e) repintarFU(); }, 120); });
  }
  pintarSonidoFU();
  Object.assign(FU, { e: null, keep: new Set(), objetivo: null, sel: null, zona: null, estKey: '', turnoKey: '', tiradaVista: -1, enviado: null, animando: false, finKey: '' });
  $('fuFinal').hidden = true;
}
function pintarSonidoFU() { const b = $('fSonido'); b.textContent = ''; b.appendChild(V.parlante(Sonido.activo)); b.title = Sonido.activo ? 'Sonido activado' : 'Sin sonido'; }

function abrirAyudaFU() {
  Sonido.play('clic');
  const m = $('ayuda'), caja = m.querySelector('.caja'); caja.textContent = '';
  caja.append(fuEl('h3', '', 'Cómo se juega'));
  [['1', 'Salen dos dados de número: los hexágonos con esa suma te dan recursos si tienes un edificio al lado. Con 7, el bandido salta y bloquea un hexágono.'],
   ['2', 'Guardas los dados que sirven y vuelves a tirar el resto (3 tiradas). El oro vale: 2 oros son un recurso.'],
   ['3', 'Con los dados construyes un camino, un pueblo, una ciudad o un caballero. El caballero protege tu hexágono del bandido.'],
   ['4', 'Gana quien más puntos tenga al llegar a la meta (se juega la vuelta completa). Pueblo 1, ciudad 2, camino más largo y ejército 2 cada uno.']].forEach(([n, t]) => {
    const f = fuEl('div', 'fuAyudaFila'); f.append(fuEl('b', '', n), fuEl('span', '', t)); caja.append(f);
  });
  const bs = fuEl('div', 'botonesFin'); const ok = nuevoBoton('Cerrar', () => { m.hidden = true; }, 2); ok.oro = true; bs.append(ok); caja.append(bs);
  m.hidden = false;
}

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
// El mundo: los hexágonos con lo que hay puesto encima.
function dibujarMundo(e, geo) {
  const A = FU_ARTE, mapa = e.mapa, tab = e.tab, c = A.cvs(geo.WW, geo.WH), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  A.fr(g, 0, 0, geo.WW, geo.WH, [0.06, 0.21, 0.31]);
  mapa.hexes.forEach(h => { const p = geo.hx(h), img = A.tile(h.tipo, h.num, h.id === tab.bandido ? { dim: true } : {}); g.drawImage(img, Math.round(p.x - A.WD / 2), Math.round(p.y - A.HT / 2)); });
  tab.aris.forEach((p, id) => { if (p < 0) return; const ar = mapa.aristas[id]; lineaCaminoFU(g, geo.v(mapa.vertices[ar.a]), geo.v(mapa.vertices[ar.b]), fuColor(p)); });
  tab.vert.forEach((o, id) => { if (!o) return; const p = geo.v(mapa.vertices[id]), img = o[1] ? A.ciudad(fuColor(o[0])) : A.casa(fuColor(o[0])); g.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height + 4)); });
  tab.cab.forEach((lista, id) => lista.forEach((p, i) => { const q = geo.hx(mapa.hexes[id]); g.drawImage(A.caballero(fuColor(p)), Math.round(q.x - 14 + i * 9), Math.round(q.y - 3)); }));
  const b = geo.hx(mapa.hexes[tab.bandido]);
  for (let i = -5; i <= 5; i++) { A.fr(g, Math.round(b.x + i), Math.round(b.y + i), 1, 1, [1, 0.42, 0.36]); A.fr(g, Math.round(b.x - i), Math.round(b.y + i), 1, 1, [1, 0.42, 0.36]); }
  g.drawImage(A.bandido(), Math.round(b.x + 7), Math.round(b.y - 4));
  return c;
}
const fuOscurecer = (g, a) => { g.fillStyle = 'rgba(8,6,20,' + a + ')'; g.fillRect(-9999, -9999, 99999, 99999); };
function fuPunto(g, p, R, sel) {
  for (let j = -7; j <= 7; j++) for (let k = -7; k <= 7; k++) { const d = Math.hypot(k, j); if (d <= R + 1.2 && d > R) FU_ARTE.fr(g, Math.round(p.x) + k, Math.round(p.y) + j, 1, 1, sel ? [1, 1, 1] : [0.2, 0.12, 0.05]); else if (d <= R) FU_ARTE.fr(g, Math.round(p.x) + k, Math.round(p.y) + j, 1, 1, [0.97, 0.78, 0.22]); }
}
function fuAroZona(g, zn) {
  const R = Math.round(zn.r);
  for (let a = 0; a < 360; a += 3) { if ((a / 3) % 2) continue; FU_ARTE.fr(g, Math.round(zn.x + Math.cos(a * Math.PI / 180) * R) - 1, Math.round(zn.y + Math.sin(a * Math.PI / 180) * R) - 1, 2, 2, [0.97, 0.78, 0.22]); }
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

// ---------- pintar todo ----------

function pintarFU(e) {
  FU.e = e;
  const t = e.turno;
  const turnoKey = e.fase === 'turno' && t ? [t.de, e.ronda, t.num.a, t.num.b].join('-') : 'x';
  if (turnoKey !== FU.turnoKey) { FU.turnoKey = turnoKey; FU.keep = new Set(); FU.objetivo = null; FU.tiradaVista = -1; FU.enviado = null; }
  const estKey = [e.fase, e.turnoDe, t && t.sub, t && t.edificio, e.inicial && e.inicial.idx, e.inicial && e.inicial.sub, e.yo].join('|');
  if (estKey !== FU.estKey) { FU.estKey = estKey; FU.sel = null; FU.zona = null; }
  repintarFU();
  if (e.fase === 'fin' && e.fin) finalFU(e);
  else if ($('fuFinal') && !$('fuFinal').hidden) $('fuFinal').hidden = true;
}

function repintarFU() {
  const e = FU.e; if (!e || !e.mapa) return;
  const sec = $('fu'), W = sec.clientWidth, H = sec.clientHeight, MOV = W < 700 || H < 520, angosto = W < 1100;
  if (!W || !H) return;
  const geo = geometria(e.mapa), t = e.turno, yo = e.yo, miTurno = e.turnoDe === yo && yo !== null;
  const cab = $('fuCab'), jug = $('fuJugadores'), dock = $('fuDock'), dados = $('fuDados');

  // --- la cabecera, los jugadores y el panel ---
  cab.style.cssText = 'position:absolute;top:6px;left:12px;right:12px;z-index:3';
  pintarJugadoresFU(e, MOV);
  pintarDockFU(e, MOV);
  let top, bottom, left, right;
  if (MOV) {
    jug.style.cssText = 'position:absolute;top:50px;left:8px;right:8px;z-index:3';
    dock.style.cssText = 'position:absolute;left:0;right:0;bottom:0;z-index:3;background:#170e2c;border:3px solid #3a2766;padding:10px 12px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;box-sizing:border-box';
    top = jug.offsetTop + jug.offsetHeight + 6; bottom = H - dock.offsetHeight - 4; left = 0; right = W;
  } else {
    jug.style.cssText = 'position:absolute;top:56px;left:16px;width:' + (angosto ? 150 : 190) + 'px;flex-direction:column;flex-wrap:nowrap;gap:6px;background:rgba(18,10,34,.86);border:2px solid #3a2766;padding:8px;z-index:3';
    dock.style.cssText = 'position:absolute;right:16px;top:56px;width:' + (angosto ? 270 : 310) + 'px;z-index:3;background:rgba(18,10,34,.92);border:3px solid #3a2766;padding:10px 12px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;box-sizing:border-box';
    top = 56; bottom = H - 10; left = (angosto ? 190 : 230); right = W - (angosto ? 300 : 340);
  }
  // --- los dados en 3D, sobre el tablero ---
  const verDados = !!(t && t.sub === 'dados' && e.fase === 'turno');
  dados.hidden = !verDados;
  if (verDados) {
    const ancho = MOV ? Math.min(W - 24, 360) : 640, alto = MOV ? 250 : 300;
    dados.style.cssText = 'position:absolute;z-index:2;width:' + ancho + 'px;' + (MOV ? 'left:' + Math.round((W - ancho) / 2) + 'px;bottom:' + (dock.offsetHeight + 2) + 'px' : 'left:' + Math.round((left + right - ancho) / 2) + 'px;bottom:8px');
    FU.escena.maxAlto = alto; FU.escena.ajustar();
    dadosFU(e);
    bottom = MOV ? Math.min(bottom, H - dock.offsetHeight - 120) : bottom;
  }
  // --- el mapa con su cámara ---
  const aw = right - left, ah = bottom - top;
  const WORLD = { w: geo.WW, h: geo.WH };
  const cands = candidatosFU(e, geo); FU.candidatos = cands;
  const colocando = cands.length > 0;
  let z, foco, zonas = [];
  const zsLleno = MOV ? [3, 2, 1] : [6, 5, 4, 3, 2, 1];
  const zLleno = zsLleno.find(zz => WORLD.w * zz <= aw && WORLD.h * zz <= ah) || 1;
  z = zLleno; foco = { x: geo.WW / 2, y: geo.WH / 2 };
  if (colocando) {
    const zs = MOV ? [4, 3, 2] : [5, 4, 3, 2];
    let lista = cands;
    if (MOV && cands.length > 6) { zonas = zonasFU(cands); if (FU.zona !== null && zonas[FU.zona]) lista = zonas[FU.zona].lista; }
    const zc = fuFitZ(lista, aw - 16, ah - 16, 16, zs);
    if (MOV && cands.length > 6 && FU.zona === null && zc < 3) { z = zLleno; FU.zonas = zonas; }
    else { z = zc; foco = fuCentro(lista); FU.zonas = []; }
  } else if (t && t.sub === 'produccion' && t.hexes.length) {
    const pts = t.hexes.map(i => geo.hx(e.mapa.hexes[i])), zp = fuFitZ(pts, aw - 20, ah - 20, 20, MOV ? [3, 2] : [5, 4]);
    if (zp > zLleno) { z = zp; foco = fuCentro(pts); }
    FU.zonas = [];
  } else FU.zonas = [];
  const cx = left + aw / 2, cy = top + ah / 2;
  const mundo = dibujarMundo(e, geo), c = $('fuMapa');
  const cw = Math.ceil(W / z), ch = Math.ceil(H / z);
  if (c.width !== cw) c.width = cw; if (c.height !== ch) c.height = ch;
  c.style.width = W + 'px'; c.style.height = H + 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  FU_ARTE.fr(g, 0, 0, cw, ch, [0.06, 0.21, 0.31]);
  const ox = Math.round(foco.x - cx / z), oy = Math.round(foco.y - cy / z);
  g.drawImage(mundo, -ox, -oy);
  g.save(); g.translate(-ox, -oy);
  superponerFU(g, e, geo, colocando, z);
  g.restore();
  FU.cam = { z, ox, oy, W, H };
  if (!FU.zonasMostrar) FU.zonasMostrar = [];
  FU.zonasMostrar = MOV && colocando && FU.zona === null && zonas.length && z === zLleno ? zonas : [];
}

// Lo que se dibuja sobre el mapa según la etapa.
function superponerFU(g, e, geo, colocando, z) {
  const t = e.turno, A = FU_ARTE;
  if (e.fase === 'turno' && t && t.sub === 'produccion') {
    t.hexes.forEach(i => { const h = e.mapa.hexes[i], p = geo.hx(h); g.drawImage(A.tile(h.tipo, h.num, { rim: [0.97, 0.78, 0.25], rimW: 2.4 }), Math.round(p.x - A.WD / 2), Math.round(p.y - A.HT / 2)); });
    const miosDe = h => h.vertices.some(v => { const o = e.tab.vert[v]; return o && o[0] === t.de; });
    t.gana.length && t.hexes.forEach(i => { const h = e.mapa.hexes[i]; if (!miosDe(h) || e.tab.bandido === i) return; const r = FU_TIPO_RECURSO[h.tipo], p = geo.hx(h); if (r !== undefined) g.drawImage(A.dado2d(FU_NOMBRE_REC[r]), Math.round(p.x - 8), Math.round(p.y - A.HT / 2 - 12)); });
  } else if (colocando) {
    fuOscurecer(g, 0.6);
    if (FU.zonasMostrar && FU.zonasMostrar.length) { FU.cands = e.lugares; FU.candidatos.forEach(c => fuPunto(g, c, 1.6, false)); FU.zonasMostrar.forEach(zn => fuAroZona(g, zn)); }
    else {
      FU.candidatos.forEach(c => fuPunto(g, c, c.id === FU.sel ? 5.2 : 3.4, c.id === FU.sel));
      const s = FU.candidatos.find(c => c.id === FU.sel);
      if (s) {
        const sub = s.tipo, col = fuColor(e.yo);
        if (sub === 'pueblo') { const im = A.casa(col); g.drawImage(im, Math.round(s.x - 4), Math.round(s.y - 9)); }
        else if (sub === 'ciudad') { const im = A.ciudad(col); g.drawImage(im, Math.round(s.x - 7), Math.round(s.y - 9)); }
        else if (sub === 'caballero') { g.drawImage(A.caballero(col), Math.round(s.x - 4), Math.round(s.y - 6)); }
        else if (sub === 'camino') { const ar = e.mapa.aristas[s.id]; lineaCaminoFU(g, geo.v(e.mapa.vertices[ar.a]), geo.v(e.mapa.vertices[ar.b]), col); }
      }
    }
  } else if (e.fase === 'turno' && t && (t.sub === 'dados' || t.sub === 'construir')) fuOscurecer(g, t.sub === 'dados' ? 0.5 : 0.55);
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

// ---------- los jugadores ----------

function pintarJugadoresFU(e, MOV) {
  const caja = $('fuJugadores'), llave = JSON.stringify([e.turnoDe, e.yo, MOV, e.carreras, e.jugadores.map(j => [j.asiento, j.apodo, j.puntos, j.bot, j.conectado, j.expulsado])]);
  if (caja.dataset.llave === llave) return;
  caja.dataset.llave = llave; caja.textContent = '';
  caja.className = 'dmJugadores' + (MOV && e.jugadores.length > 3 ? ' compacto' : '');
  e.jugadores.forEach(j => {
    const d = fuEl('div', 'dmJ' + (j.asiento === e.turnoDe ? ' turno' : '') + (j.asiento === e.yo ? ' soy' : '') + (j.conectado || j.bot ? '' : ' off'));
    d.style.borderTop = '5px solid ' + fuRgb(fuColor(j.asiento));
    const n = fuEl('div', 'dmNombre'); ponerNombre(n, j.apodo, j.bot || j.expulsado);
    const p = fuEl('div', 'dmTotal', String(j.puntos));
    d.append(n, p);
    const ins = fuEl('div', 'fuInsignias');
    if (e.carreras && e.carreras.camino === j.asiento) { const c = FU_ARTE.camino(fuColor(j.asiento)); c.style.cssText = 'width:' + c.width * 2 + 'px;height:' + c.height * 2 + 'px;image-rendering:pixelated'; ins.append(c); }
    if (e.carreras && e.carreras.ejercito === j.asiento) { const c = FU_ARTE.caballero(fuColor(j.asiento)); c.style.cssText = 'width:' + c.width + 'px;height:' + c.height + 'px;image-rendering:pixelated'; ins.append(c); }
    if (ins.childNodes.length) d.append(ins);
    caja.append(d);
  });
}

// ---------- el panel de abajo (o de la derecha) ----------

function textoGana(gana) {
  if (!gana || !gana.length) return 'no ganas nada';
  const c = {}; gana.forEach(r => { c[r] = (c[r] || 0) + 1; });
  return 'ganas ' + Object.keys(c).map(r => c[r] + ' ' + FU_NOMBRE_REC[r]).join(' y ');
}
function fuNombreDe(e, asiento) { const j = e.jugadores.find(x => x.asiento === asiento); return j ? j.apodo : '—'; }
const botonFU = (txt, f, oro, activo = true) => { const b = nuevoBoton(txt, activo ? f : () => {}, 1.7); if (oro) b.oro = true; if (!activo) b.style.opacity = '.45'; return b; };

function tablaMedalla(e) { // el % de cada edificio con los dados guardados ahora
  const t = e.turno, out = {}; if (!t || !t.prob) return out;
  let mask = 0; FU.keep.forEach(p => { mask |= 1 << (p - t.fijos); });
  Object.keys(t.prob).forEach(ed => { out[ed] = t.prob[ed][mask]; });
  return out;
}
function iconoEdificio(ed, color, z) {
  const A = FU_ARTE, img = ed === 'camino' ? A.camino(color) : (ed === 'pueblo' ? A.casa(color) : (ed === 'ciudad' ? A.ciudad(color) : A.caballero(color)));
  img.style.imageRendering = 'pixelated';
  const c = A.cvs(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); c.style.cssText = 'width:' + img.width * z + 'px;height:' + img.height * z + 'px;image-rendering:pixelated;display:block'; return c;
}

function pintarDockFU(e, MOV) {
  const dock = $('fuDock'), t = e.turno, yo = e.yo, miTurno = yo !== null && e.turnoDe === yo && !(t && t.terminado);
  const llave = JSON.stringify([e.fase, e.version, MOV, [...FU.keep], FU.objetivo, FU.sel, FU.zona, miTurno, FU.animando]);
  if (dock.dataset.llave === llave) return;
  dock.dataset.llave = llave; dock.textContent = '';
  const col = (...h) => { h.forEach(x => x && dock.append(x)); };
  const info = txt => fuEl('div', 'dmInfo', txt);
  const reloj = () => { const r = fuEl('div', 'dmReloj'), d = fuEl('div'); d.id = 'fuReloj'; r.append(d); return r; };
  const acciones = (...bs) => { const a = fuEl('div', 'dmAcciones'); a.style.minHeight = '74px'; bs.forEach(b => a.append(b)); return a; };

  if (e.fase === 'inicial' && e.inicial) {
    const ini = e.inicial;
    if (ini.de !== yo) { col(info(fuNombreDe(e, ini.de) + ' pone su ' + (ini.sub === 'pueblo' ? 'pueblo' : 'camino')), reloj()); return; }
    col(info('Pon tu ' + (ini.sub === 'pueblo' ? 'pueblo' : 'camino') + ' (' + (Math.floor(ini.idx / 2) + 1) + ' de ' + Math.ceil(ini.total / e.jugadores.length) + ')'), reloj(), acciones(botonFU('Confirmar', () => confirmarLugarFU(), true, FU.sel !== null)));
    return;
  }
  if (e.fase !== 'turno' || !t) { col(info(e.fase === 'fin' ? 'Fin de la partida' : '')); return; }
  const de = fuNombreDe(e, t.de);
  if (t.terminado) { col(info(de + (t.motivo === 'construyo' ? ' construyó' : ' pasó el turno')), reloj()); return; }
  if (t.sub === 'produccion') {
    const gana = textoGana(t.gana);
    const base = 'Salió ' + t.num.suma + (t.num.suma === 7 ? ' · el bandido salta' : ' · ' + (miTurno ? gana : de + ' ' + gana.replace('ganas', 'gana').replace('no ganas', 'no gana')));
    col(info(base), reloj(), miTurno ? acciones(botonFU('Seguir', () => hacerFU('seguir'), true)) : null);
    return;
  }
  if (t.sub === 'dados') {
    if (!miTurno) { col(info(de + ' tira los dados · tirada ' + t.tirada + ' de ' + t.tiradas), reloj()); return; }
    const meds = tablaMedalla(e), eds = Object.keys(meds);
    if (eds.length && (!FU.objetivo || !eds.includes(FU.objetivo))) FU.objetivo = eds.slice().sort((a, b) => FU_VALOR[b] * meds[b] - FU_VALOR[a] * meds[a])[0];
    const chips = fuEl('div', 'fuChips');
    eds.forEach(ed => {
      const c = fuEl('div', 'fuChip' + (ed === FU.objetivo ? ' on' : '')); c.append(iconoEdificio(ed, fuColor(yo), ed === 'ciudad' || ed === 'caballero' ? 2 : 3));
      ponerMedalla(c, meds[ed]); c.onclick = () => { FU.objetivo = ed; Sonido.play('clic'); repintarFU(); }; chips.append(c);
    });
    const quedan = t.tiradas - t.tirada;
    const tirar = botonFU('Tirar ' + (6 - t.fijos - FU.keep.size), () => tirarFU(), true, quedan > 0 && !FU.animando);
    if (quedan > 0 && FU.objetivo && meds[FU.objetivo] !== undefined) ponerMedalla(tirar, meds[FU.objetivo]);
    col(chips, info('Tirada ' + t.tirada + ' de ' + t.tiradas + (t.fijos ? '' : '')), reloj(), acciones(tirar, botonFU('Construir', () => hacerFU('terminar'), false, !FU.animando)));
    return;
  }
  if (t.sub === 'construir') {
    if (!miTurno) { col(info(de + ' elige qué construir'), reloj()); return; }
    const cs = fuEl('div', 'fuCartas'); const elegido = FU.objetivo && t.posibles.includes(FU.objetivo) ? FU.objetivo : t.posibles.slice().sort((a, b) => FU_VALOR[b] - FU_VALOR[a])[0]; FU.objetivo = elegido;
    t.posibles.forEach(ed => {
      const c = fuEl('div', 'fuCarta' + (ed === elegido ? ' on' : '')); c.append(iconoEdificio(ed, fuColor(yo), ed === 'camino' ? 4 : 5));
      const f = fuEl('div', 'fuCosto'); FU_COSTOS[ed].forEach(k => { const im = FU_ARTE.dado2d(FU_NOMBRE_REC[k]), cc = FU_ARTE.cvs(15, 15); cc.getContext('2d').drawImage(im, 0, 0); cc.style.cssText = 'width:30px;height:30px;image-rendering:pixelated'; f.append(cc); });
      c.append(f, fuEl('div', 'fuNombre', FU_NOMBRE_ED[ed])); c.onclick = () => { FU.objetivo = ed; Sonido.play('clic'); repintarFU(); }; cs.append(c);
    });
    col(cs, info('Elige qué construir'), reloj(), acciones(botonFU('Pasar', () => hacerFU('pasar')), botonFU('Elegir lugar', () => hacerFU('elegir', { edificio: elegido }), true)));
    return;
  }
  if (t.sub === 'colocar') {
    if (!miTurno) { col(info(de + ' elige dónde poner su ' + (t.edificio || '').toLowerCase()), reloj()); return; }
    const zonas = FU.zonasMostrar && FU.zonasMostrar.length;
    const atras = t.posibles.length > 1 ? botonFU('Atrás', () => { if (FU.zona !== null) { FU.zona = null; FU.sel = null; repintarFU(); } else hacerFU('atras'); }) : botonFU('Pasar', () => hacerFU('pasar'));
    col(info(zonas ? 'Toca una zona' : 'Toca un punto y confirma'), reloj(), acciones(atras, botonFU('Confirmar', () => confirmarLugarFU(), true, FU.sel !== null && !zonas)));
  }
}

// ---------- las acciones ----------

async function hacerFU(nombre, extra) { const r = await accion(nombre, extra); if (r && !r.ok && r.error) avisarFU(r.error); return r; }
function avisarFU(msg) { const d = $('fuDock'); if (!d) return; const a = fuEl('div', 'error', msg); d.append(a); setTimeout(() => a.remove(), 2500); }
function confirmarLugarFU() { if (FU.sel === null) return; const lugar = FU.sel; FU.sel = null; hacerFU('colocar', { lugar }); }
function tirarFU() {
  const t = FU.e && FU.e.turno; if (!t || FU.animando) return;
  FU.enviado = new Set(FU.keep);
  hacerFU('tirar', { guardar: [...FU.keep] });
}

// ---------- los dados 3D ----------

function marcarDadosFU() {
  const e = FU.e, esc = FU.escena; if (!e || !esc) return;
  const t = e.turno, mio = e.yo !== null && e.turnoDe === e.yo;
  esc.dados.forEach((d, i) => { if (d.anim) return; const fijo = t && i < t.fijos; esc.marcar(i, fijo, mio && !fijo && FU.keep.has(i)); });
  esc.dibujar();
}
function tocarDadoFU(i) {
  const e = FU.e, t = e && e.turno; if (!t || t.sub !== 'dados' || e.yo === null || e.turnoDe !== e.yo || FU.animando || t.tirada >= t.tiradas || i < t.fijos) return;
  if (FU.keep.has(i)) FU.keep.delete(i); else FU.keep.add(i);
  Sonido.play('clic'); marcarDadosFU(); repintarFU();
}
function dadosFU(e) {
  const t = e.turno, esc = FU.escena, vals = t.dados.map(c => c + 1);
  if (esc.dados.length !== 6) esc.configurar(Array(6).fill('recurso'));
  if (t.tirada !== FU.tiradaVista) {
    const primera = FU.tiradaVista < 1 || t.tirada === 1;
    const lugares = [];
    for (let i = t.fijos; i < 6; i++) if (primera || !(FU.enviado && FU.enviado.has(i)) || !(e.yo === e.turnoDe)) lugares.push(i);
    FU.tiradaVista = t.tirada;
    esc.mostrar(vals);
    if (lugares.length && !sinMovimiento()) { FU.animando = true; esc.tirar(lugares, lugares.map(i => vals[i]), t.tirada * 17 + e.ronda); }
    else { FU.animando = false; marcarDadosFU(); }
  } else if (!FU.animando) { esc.mostrar(vals); marcarDadosFU(); }
}

// ---------- el reloj ----------

function relojFU(e) {
  const b = $('fuReloj'); if (!b || !e.limite || e.sinTiempo) { if (b) b.style.width = '0%'; return; }
  const t = e.turno, sub = e.fase === 'inicial' ? 'inicial' : (t ? t.sub : null), clave = sub === 'colocar' || sub === 'construir' ? 'construir' : sub;
  const total = e.tiempos[clave] || e.tiempos.dados, restante = e.limite - ahora();
  b.style.width = Math.max(0, Math.min(100, restante / total * 100)) + '%';
  b.classList.toggle('apura', restante < 5000);
}

// ---------- el final ----------

function finalFU(e) {
  const f = e.fin, key = f ? JSON.stringify([f.motivo, f.ranking.map(r => r.puntos), f.turnos]) : '';
  if (key === FU.finKey) return;
  FU.finKey = key;
  const m = $('fuFinal'), caja = m.querySelector('.caja'); caja.textContent = '';
  const solo = e.modo === 'solo', yo = f.ranking.find(r => r.asiento === e.yo);
  const gane = f.ganador && f.ganador.asiento === e.yo;
  caja.append(fuEl('h3', '', solo ? (f.motivo === 'meta' ? '¡Llegaste a la meta!' : 'Partida terminada') : (gane ? '¡Ganaste!' : 'Fin de la partida')));
  if (solo) {
    let mejor = guardado('bj_fu_mejor'); mejor = mejor ? Number(mejor) : null;
    if (f.motivo === 'meta' && (mejor === null || f.turnos < mejor)) { mejor = f.turnos; guardado('bj_fu_mejor', String(mejor)); }
    caja.append(fuEl('div', 'fuFinalDato', f.turnos + ' turnos'), fuEl('div', 'chico', mejor !== null ? 'Tu mejor marca: ' + mejor + ' turnos' : ''));
  }
  f.ranking.forEach((r, i) => {
    const fila = fuEl('div', 'fuRank' + (r.asiento === e.yo ? ' yo' : '')); fila.style.borderLeft = '6px solid ' + fuRgb(fuColor(r.asiento));
    const n = fuEl('span', 'n', String(i + 1)), nm = fuEl('span', 'nom'); ponerNombre(nm, r.apodo, r.bot);
    fila.append(n, nm, fuEl('b', '', r.puntos + ' pts'), fuEl('small', '', r.pueblos + ' p · ' + r.ciudades + ' c · ' + r.caminos + ' cam'));
    caja.append(fila);
  });
  const bs = fuEl('div', 'botonesFin');
  const nueva = nuevoBoton('Otra partida', () => { m.hidden = true; hacerFU('nueva'); }, 2); nueva.oro = true;
  bs.append(nueva, nuevoBoton('Salir', () => { m.hidden = true; salirDeLaMesa(); }, 2));
  caja.append(bs);
  m.hidden = false;
}
