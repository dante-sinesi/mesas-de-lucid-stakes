'use strict';
// La entrada: dos puertas (con amigos / solo), "entrar ya" con el código, el mapa de mesas con su ficha, la lista, "solo" y "crear sala".
// Se carga después de comun.js (usa $, api, guardado, params, Pantalla, entrar, nuevoBoton) y de mesas.js.

const JUEGOS = [
  { id: 'trecejack', nombre: '13 Jack' },
  { id: 'diezmil', nombre: 'Diez mil' },
  { id: 'fundacion', nombre: 'Fundación' },
];
let juegoLobby = 'diezmil';   // el juego que se está mirando (para la ayuda y el tutorial)
const nombreJuego = id => (JUEGOS.find(j => j.id === id) || {}).nombre || '';
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const nuevoEl = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
// Un botón de cubitos para las pantallas estáticas.
const botonDe = (id, op) => V.boton($(id), op || { cubo: 1.7 });

// ---------- la entrada ----------

$('figAmigos').append(Mesas.persona(Mesas.COLORES[0], 6), Mesas.persona(Mesas.COLORES[1], 6));
$('figSolo').append(Mesas.persona(Mesas.COLORES[3], 6));
// El lápiz del campo del apodo (de cubitos): avisa que el nombre se puede cambiar.
$('apodoLapiz').append(Mesas.pixeles(['.....##.', '....####', '...####.', '..####..', '.####...', '.###....', '#.#.....', '##......'], [0.66, 0.61, 0.79], 3));
for (const [id, op] of [['bEntrar', { oro: true, cubo: 2 }], ['aVolver', { cubo: 1.5 }], ['lVolver', { cubo: 1.5 }], ['sVolver', { cubo: 1.5 }], ['cVolver', { cubo: 1.5 }], ['saVolver', { cubo: 1.5 }],
  ['aLista', { cubo: 2, minAncho: 120 }], ['aCrear', { oro: true, cubo: 2, minAncho: 170 }], ['lMapa', { cubo: 1.5 }], ['cCrear', { oro: true, cubo: 2.2, minAncho: 220 }], ['saInvitar', { cubo: 2 }], ['saEmpezar', { oro: true, cubo: 2 }]]) botonDe(id, op);

function irEntrada() {
  Mapa.parar();
  Pantalla.ir('entrada');
  pintarContinuar();
  $('errorInicio').textContent = '';
  $('codigo').value = ''; $('claveSala').value = ''; $('campoClave').hidden = true; actualizarEntrar();
  history.replaceState && history.replaceState(null, '', location.pathname);
}

// Si quedó una partida a medias (se cerró la página sin salir), se ofrece volver a ella.
async function pintarContinuar() {
  const caja = $('continuar'), cod = guardado('bj_sala');
  caja.hidden = true;
  if (!cod || sala) return;
  try {
    const r = await (await fetch('/api/sala?sala=' + encodeURIComponent(cod), { cache: 'no-store' })).json();
    if (!r.ok) { guardado('bj_sala', ''); return; }
    $('continuarTxt').textContent = 'Partida en curso · sala ' + cod;
    caja.hidden = false;
  } catch (e) { /* sin red: no se ofrece */ }
}
V.boton($('bContinuar'), { oro: true, cubo: 1.5 });
$('bContinuar').onclick = async () => {
  const cod = guardado('bj_sala');
  $('apodo').value = guardado('bj_apodo') || 'Jugador';
  const r = await entrar(cod, guardado('bj_clave') || '');
  if (!r.ok) { guardado('bj_sala', ''); pintarContinuar(); }   // (ya no se puede volver: se quita el aviso)
};

$('pAmigos').onclick = () => { if (apodoListo()) irAmigos(); };
$('pSolo').onclick = () => irSolo();

// "Entrar ya": el código de cuatro letras; si la sala tiene clave, se pide antes de entrar.
$('bEntrar').onclick = async () => {
  if (!apodoListo()) return;
  $('errorInicio').textContent = '';
  const r = await entrar($('codigo').value.trim().toUpperCase());
  if (!r.ok && r.error) $('errorInicio').textContent = r.error;
};
function actualizarEntrar() { $('bEntrar').disabled = $('codigo').value.trim().length < 4; }
$('codigo').addEventListener('input', actualizarEntrar);
actualizarEntrar();
$('codigo').addEventListener('keydown', e => { if (e.key === 'Enter') $('bEntrar').click(); });
$('claveSala').addEventListener('keydown', e => { if (e.key === 'Enter') $('bEntrar').click(); });
$('apodo').addEventListener('keydown', e => { if (e.key === 'Enter') ($('codigo').value ? $('bEntrar') : $('pAmigos')).click(); });
let tCodigo = 0;
async function mirarSala() {   // al escribir un código se mira si la sala pide clave
  const c = $('codigo').value.trim().toUpperCase();
  if (c.length < 4) { $('campoClave').hidden = true; return; }
  try {
    const r = await (await fetch('/api/sala?sala=' + encodeURIComponent(c), { cache: 'no-store' })).json();
    if (sala) return;
    $('campoClave').hidden = !(r.ok && r.conClave);
  } catch (e) { /* sin red: se verá al entrar */ }
}
$('codigo').addEventListener('input', () => { clearTimeout(tCodigo); tCodigo = setTimeout(mirarSala, 250); });

// ---------- tarjetas de juego (crear sala y solo) ----------

function tarjetaJuego(j, alTocar, activa) {
  const b = nuevoEl('button', 'jue' + (activa ? ' on' : '')); b.type = 'button';
  b.append(Mesas.iconoJuego(j.id), nuevoEl('b', '', j.nombre.toUpperCase()));
  b.onclick = alTocar;
  return b;
}

// ---------- solo ----------

function irSolo(juego) {
  Mapa.parar();
  Pantalla.ir('solo');
  const caja = $('sOpciones'); caja.textContent = '';
  $('sVolver').onclick = juego ? () => irSolo() : irEntrada;
  if (!juego) {
    $('sTitulo').textContent = 'SOLO';
    JUEGOS.forEach(j => caja.append(tarjetaJuego(j, () => { juegoLobby = j.id; irSolo(j.id); if (j.id === 'diezmil' && typeof Tut !== 'undefined') Tut.ofrecer(j.id); })));
    return;
  }
  juegoLobby = juego;
  $('sTitulo').textContent = nombreJuego(juego).toUpperCase();
  const variantes = juego === 'fundacion'
    ? [['MEJOR MARCA', () => crearSolo('fundacion')], ['CONTRA BOTS', () => crearContraBots('fundacion')]]
    : (juego === 'trecejack'
    ? [['SOLITARIO', () => crearSolo('trecejack')], ['CONTRA BOTS', () => crearContraBots('trecejack')]]
    : [['CARRERA', () => jugarSolo('diezmil', 'carrera')], ['ESCALERA', () => jugarSolo('diezmil', 'escalera')], ['CONTRA BOTS', () => crearContraBots('diezmil')]]);
  variantes.forEach(([n, f]) => { const b = nuevoEl('button', 'jue variante', n); b.type = 'button'; b.onclick = f; caja.append(b); });
  const fila = nuevoEl('div', 'pie');
  if (juego === 'diezmil') { const t = nuevoEl('button', 'boton sec', 'Tutorial'); t.type = 'button'; V.boton(t, { cubo: 1.7 }); t.onclick = () => Tut.iniciar('diezmil'); fila.append(t); }
  const a = nuevoEl('button', 'boton sec', 'Cómo se juega'); a.type = 'button'; V.boton(a, { cubo: 1.7 }); a.onclick = abrirAyuda; fila.append(a);
  caja.append(fila);
}
// Una partida solitaria (sin tiempo): el Diez mil ofrece el tutorial la primera vez.
async function jugarSolo(juego, modo) {
  if (juego === 'diezmil' && guardado('bj_tut_' + juego) !== '1' && typeof Tut !== 'undefined') return Tut.ofrecer(juego, () => crearSolo(juego, modo));
  crearSolo(juego, modo);
}
function apodoSolo() { if (!$('apodo').value.trim()) $('apodo').value = guardado('bj_apodo') || 'Jugador ' + (10 + Math.floor(Math.random() * 90)); }
async function crearSolo(juego, modo) {
  apodoSolo();
  const r = await api('/api/crear', juego === 'fundacion' ? { juego, modoFU: 'solo', metaFU: 8, tiempo: 'libre' } : (juego === 'trecejack' ? { juego, modoTJ: 'solo', mazosTJ: 5, especiales: true, tiempo: 'libre' } : { juego, modoDM: modo || 'carrera', metaDM: 10000, tiempo: 'libre' }));
  if (!r.ok) return avisoSolo(r.error || 'No se pudo crear la partida');
  const e = await entrar(r.sala, '');
  if (!e.ok) avisoSolo(e.error);
}
// Una sala privada con tres bots: la sala de espera deja cambiar los bots y las reglas antes de empezar.
async function crearContraBots(juego) {
  apodoSolo();
  const r = await api('/api/crear', Object.assign(reglasBase(juego), { asientos: juego === 'fundacion' ? 8 : 4, bots: 3, publica: false }));
  if (!r.ok) return avisoSolo(r.error || 'No se pudo crear la sala');
  const e = await entrar(r.sala, '');
  if (!e.ok) avisoSolo(e.error);
}
function avisoSolo(msg) { irEntrada(); $('errorInicio').textContent = msg || ''; }

// ---------- crear sala ----------

// Las reglas con las que nace una sala nueva (después se cambian en la sala de espera).
const reglasBase = juego => (juego === 'fundacion' ? { juego, modoFU: 'multi', metaFU: 8, tiempo: 'normal', asientos: 8 } : juego === 'trecejack'
  ? { juego, modoTJ: 'multi', mazosTJ: 5, especiales: true, tiempo: 'normal', asientos: 6 }
  : { juego, modoDM: 'multi', metaDM: 10000, tomarDados: false, hostil: true, cupo: false, tiempo: 'normal', asientos: 6 });
const Crear = { juego: 'trecejack', publica: false };
function irCrear() {
  Mapa.parar();
  Pantalla.ir('crear');
  pintarCrear();
}
function pintarCrear() {
  const caja = $('cJuegos'); caja.textContent = '';
  JUEGOS.forEach(j => caja.append(tarjetaJuego(j, () => { Crear.juego = j.id; pintarCrear(); }, Crear.juego === j.id)));
  const vis = $('cVis'); vis.textContent = '';
  for (const [txt, pub] of [['Privada', false], ['Pública', true]]) { const b = nuevoEl('button', 'boton'); b.type = 'button'; V.boton(b, { texto: txt, oro: Crear.publica === pub, cubo: 1.7 }); b.onclick = () => { Crear.publica = pub; pintarCrear(); }; vis.append(b); }
}
$('cVolver').onclick = () => irAmigos();
$('cCrear').onclick = () => crearSalaAmigos(Crear.juego, Crear.publica);
async function crearSalaAmigos(juego, publica) {
  const r = await api('/api/crear', Object.assign(reglasBase(juego), { publica }));
  if (!r.ok) return mensajeAmigos(r.error || 'No se pudo crear la sala');
  const e = await entrar(r.sala, '');
  if (!e.ok) mensajeAmigos(e.error);
}
// Un aviso breve sobre el mapa (sala llena, ya empezó...).
function mensajeAmigos(msg) {
  if (Pantalla.actual !== 'amigos' && Pantalla.actual !== 'lista') irAmigos();
  const aviso = nuevoEl('div', 'avisoMapa', msg || 'No se pudo entrar');
  const caja = Pantalla.actual === 'lista' ? $('lista') : $('amigos');
  caja.append(aviso); setTimeout(() => aviso.remove(), 3500);
}

// ---------- el mapa de mesas ----------
// Las salas públicas que esperan se ven como mesas sobre el paño. Se consulta cada pocos segundos (sin conexiones abiertas); si faltan, el mapa se completa con mesas libres:
// quien elige una crea una sala nueva y es su anfitrión. Cada mesa dura unos 30 s y se reemplaza de a una, nunca la que se está tocando.

const Mapa = { activo: false, reales: [], slots: [], sel: null, timer: 0, llave: '', filtro: { juego: 'todos', mitad: false } };
const VIDA_MESA_MS = 30000;
const mesasQueEntran = () => (esChico() ? 6 : 8);
const sillasLibres = n => Array.from({ length: n }, () => null);
const ocupadas = r => r.sillas.filter(Boolean).length;
const slotReal = r => ({ sala: r.sala, juego: r.juego, sillas: r.sillas, datos: r.datos, asientos: r.asientos, desde: Date.now(), fantasma: false });
const slotFantasma = juego => ({ sala: null, juego, sillas: sillasLibres(6), datos: reglasFantasma(juego), asientos: 6, desde: Date.now(), fantasma: true });
const reglasFantasma = juego => (juego === 'fundacion' ? { meta: 10 } : juego === 'trecejack' ? { objetivo: 'mazos', mazos: 5, metaPuntos: 400, especiales: true } : { meta: 10000, cupo: false, hostil: true, tomarDados: false });

function irAmigos() {
  Pantalla.ir('amigos');
  history.replaceState && history.replaceState(null, '', location.pathname);
  Mapa.activo = true; Mapa.slots = []; Mapa.llave = '';
  actualizarMapa();
}
Mapa.parar = () => { Mapa.activo = false; clearTimeout(Mapa.timer); };
async function actualizarMapa() {
  clearTimeout(Mapa.timer);
  if (!Mapa.activo) return;
  try {
    const r = await (await fetch('/api/salas', { cache: 'no-store' })).json();
    if (r.ok) Mapa.reales = r.salas;
  } catch (e) { /* sin red: se queda con lo último */ }
  if (!Mapa.activo) return;
  armarMapa();
  pintarMapa(); pintarLista();
  Mapa.timer = setTimeout(actualizarMapa, 4000);
}
const estaTocada = s => Mapa.sel && Mapa.sel === s;
function armarMapa() {
  const N = mesasQueEntran(), ahora = Date.now();
  // las mesas reales que siguen existiendo se actualizan; las que se cerraron o empezaron salen
  Mapa.slots = Mapa.slots.filter(s => s.fantasma || Mapa.reales.some(r => r.sala === s.sala));
  for (const s of Mapa.slots) if (!s.fantasma) { const r = Mapa.reales.find(x => x.sala === s.sala); s.sillas = r.sillas; s.datos = r.datos; s.asientos = r.asientos; }
  if (Mapa.slots.length > N) Mapa.slots.length = N;
  const sinMostrar = () => Mapa.reales.filter(r => !Mapa.slots.some(s => s.sala === r.sala));
  const cuenta = j => Mapa.slots.filter(s => s.juego === j).length;
  const juegoQueFalta = () => JUEGOS.map(j => j.id).sort((a, b) => cuenta(a) - cuenta(b))[0];
  // las mesas libres dejan su lugar a las salas reales
  for (let i = 0; i < Mapa.slots.length; i++) { const s = Mapa.slots[i]; if (s.fantasma && !estaTocada(s)) { const r = sinMostrar()[0]; if (r) Mapa.slots[i] = slotReal(r); } }
  // se completa: salas reales primero, mesas libres después
  while (Mapa.slots.length < N) { const r = sinMostrar()[0]; Mapa.slots.push(r ? slotReal(r) : slotFantasma(juegoQueFalta())); }
  // siempre al menos una mesa de cada juego
  for (const j of JUEGOS.map(x => x.id)) {
    if (cuenta(j) > 0) continue;
    const r = sinMostrar().find(x => x.juego === j);
    const i = Mapa.slots.findIndex(s => !estaTocada(s) && s.fantasma) >= 0 ? Mapa.slots.findIndex(s => !estaTocada(s) && s.fantasma) : Mapa.slots.findIndex(s => !estaTocada(s) && cuenta(s.juego) > 1);
    if (i >= 0) Mapa.slots[i] = r ? slotReal(r) : slotFantasma(j);
  }
  // cada mesa dura unos 30 s: si hay otra sala esperando, la más vieja se reemplaza (una por vez)
  const vieja = Mapa.slots.filter(s => !s.fantasma && !estaTocada(s) && ahora - s.desde > VIDA_MESA_MS).sort((a, b) => a.desde - b.desde)[0];
  const nueva = sinMostrar()[0];
  if (vieja && nueva && cuenta(vieja.juego) > (vieja.juego === nueva.juego ? 0 : 1)) Mapa.slots[Mapa.slots.indexOf(vieja)] = slotReal(nueva);
}
function pintarMapa() {
  if (Pantalla.actual !== 'amigos') return;
  const llave = JSON.stringify([Mapa.slots.map(s => [s.sala, s.juego, s.sillas, s.fantasma]), Mapa.sel && Mapa.sel.sala, esChico()]);
  if (llave === Mapa.llave) return;
  Mapa.llave = llave;
  const caja = $('mapaMesas'); caja.textContent = '';
  const cols = esChico() ? 2 : 4;
  caja.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)'; caja.style.gridTemplateRows = 'repeat(' + Math.ceil(Mapa.slots.length / cols) + ', 1fr)';
  Mapa.slots.forEach(s => {
    const m = Mesas.mesa(s.juego, s.sillas, { c: 6, fantasma: s.fantasma, sel: estaTocada(s) });
    m.onclick = () => abrirFicha(s);
    caja.append(m);
  });
  requestAnimationFrame(pintarPano);
}
function pintarPano() {
  const p = $('mapaPano'), r = p.getBoundingClientRect();
  if (r.width > 0) V.paño($('mapaFondo'), Math.round(r.width), Math.round(r.height));
}
window.addEventListener('resize', () => { if (Pantalla.actual === 'amigos') { Mapa.llave = ''; armarMapa(); pintarMapa(); } });
$('aVolver').onclick = irEntrada;
$('aCrear').onclick = irCrear;
$('aLista').onclick = () => { Pantalla.ir('lista'); pintarLista(); };
$('lMapa').onclick = () => { Pantalla.ir('amigos'); Mapa.llave = ''; pintarMapa(); };
$('lVolver').onclick = () => { Pantalla.ir('amigos'); Mapa.llave = ''; pintarMapa(); };

// ---------- la ficha de una mesa ----------

function abrirFicha(s) {
  Mapa.sel = s; Mapa.llave = ''; pintarMapa();
  const m = $('ficha'), caja = m.querySelector('.caja'); caja.textContent = '';
  const fila = (a, b) => { const f = nuevoEl('div', 'fichaFila'); f.append(nuevoEl('span', '', a), nuevoEl('b', 'oro', b)); return f; };
  const d = s.datos, ocup = s.fantasma ? 0 : s.sillas.filter(Boolean).length;
  const objetivo = s.juego === 'fundacion' ? d.meta + ' puntos' : (s.juego === 'trecejack' ? (d.objetivo === 'puntos' ? d.metaPuntos + ' puntos' : d.mazos + ' mazos') : miles(d.meta));
  const error = nuevoEl('div', 'error');
  const cerrar = () => { m.hidden = true; Mapa.sel = null; Mapa.llave = ''; pintarMapa(); };
  const entrarMesa = async () => {
    error.textContent = '';
    const r = s.fantasma ? await crearYEntrar(s.juego) : await entrar(s.sala, '');
    if (r && r.ok) { m.hidden = true; Mapa.sel = null; Mapa.parar(); return; }
    error.textContent = (r && r.error) || '';
  };
  const bs = nuevoEl('div', 'botonesFin');
  bs.append(nuevoBoton('Cerrar', cerrar, 1.8), (() => { const b = nuevoBoton('Entrar', entrarMesa, 1.8); b.oro = true; return b; })());
  caja.append(nuevoEl('h3', '', nombreJuego(s.juego).toUpperCase()), fila('Jugadores', ocup + ' / ' + s.asientos), fila(s.juego === 'diezmil' ? 'Meta' : 'Objetivo', objetivo), error, bs);
  m.hidden = false;
}
$('ficha').addEventListener('click', ev => { if (ev.target === $('ficha')) { $('ficha').hidden = true; Mapa.sel = null; Mapa.llave = ''; pintarMapa(); } });
// Una mesa libre: se crea la sala (pública, con las reglas de siempre) y quien la tocó es el anfitrión.
async function crearYEntrar(juego) {
  const r = await api('/api/crear', Object.assign(reglasBase(juego), { publica: true }));
  if (!r.ok) return { ok: false, error: r.error || 'No se pudo crear la mesa' };
  return entrar(r.sala, '');
}

// ---------- la lista ----------

function pintarLista() {
  if (Pantalla.actual !== 'lista') return;
  const f = Mapa.filtro, caja = $('lFiltros'); caja.textContent = '';
  for (const [txt, activo, alTocar] of [['Todos', f.juego === 'todos', () => { f.juego = 'todos'; }], ['13 Jack', f.juego === 'trecejack', () => { f.juego = 'trecejack'; }], ['Diez mil', f.juego === 'diezmil', () => { f.juego = 'diezmil'; }], ['Fundación', f.juego === 'fundacion', () => { f.juego = 'fundacion'; }], ['Mitad llena', f.mitad, () => { f.mitad = !f.mitad; }]]) {
    const b = nuevoEl('button', 'boton'); b.type = 'button'; V.boton(b, { texto: txt, oro: activo, cubo: 1.4 });
    b.onclick = () => { alTocar(); pintarLista(); };
    caja.append(b);
  }
  const filas = $('lFilas'); filas.textContent = '';
  const lista = Mapa.reales.filter(r => (f.juego === 'todos' || r.juego === f.juego) && (!f.mitad || ocupadas(r) * 2 >= r.asientos));
  if (!lista.length) { filas.append(nuevoEl('div', 'listaVacia', 'Sin mesas')); return; }
  for (const r of lista) {
    const b = nuevoEl('button', 'listaFila'); b.type = 'button';
    const objetivo = r.juego === 'fundacion' ? 'Meta ' + r.datos.meta : (r.juego === 'trecejack' ? (r.datos.objetivo === 'puntos' ? r.datos.metaPuntos + ' puntos' : r.datos.mazos + ' mazos') : 'Meta ' + miles(r.datos.meta));
    const ico = Mesas.iconoJuego(r.juego, 0.5);
    const info = nuevoEl('div', 'listaInfo'); info.append(nuevoEl('b', '', nombreJuego(r.juego)), nuevoEl('span', 'suave', objetivo));
    const pts = nuevoEl('div', 'puntos'); r.sillas.forEach((s, i) => { const p = nuevoEl('i', s ? (s === 'b' ? 'bot' : 'on') : ''); if (s === 'h') p.style.background = V.css(Mesas.COLORES[i % Mesas.COLORES.length]); pts.append(p); });
    b.append(ico, info, pts, nuevoEl('span', 'oro', ocupadas(r) + '/' + r.asientos));
    b.onclick = () => abrirFicha(slotReal(r));
    filas.append(b);
  }
}

// ---------- el arranque ----------
// Con ?sala= (un enlace de invitación) se va a la entrada con el código puesto; si no, a la entrada de siempre.
(async () => {
  const c = (params.get('sala') || '').toUpperCase().slice(0, 4);
  if (!c) { irEntrada(); return; }
  Pantalla.ir('entrada');
  $('codigo').value = c; actualizarEntrar();
  await mirarSala();
})();
