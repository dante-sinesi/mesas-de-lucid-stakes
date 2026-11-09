'use strict';
// Lo que comparten todas las mesas: entrar a una sala, crearla, la conexión con el servidor, el sonido, la ayuda, las estadísticas, el compartir y las ventanas comunes.
// Todo lo decide el servidor; aquí solo se muestra y se envían acciones. Cada juego tiene su propio archivo (hoy diezmil.js).
const $ = id => document.getElementById(id);
const MENOS = '-';
// Refuerzo del CSS: Android y otros navegadores abren igual el menú de selección con una pulsación larga o el botón derecho. Los campos de texto quedan libres.
for (const nombre of ['selectstart', 'contextmenu', 'dragstart']) document.addEventListener(nombre, ev => {
  const t = ev.target && ev.target.nodeType === 3 ? ev.target.parentNode : ev.target;
  if (!(t && t.closest && t.closest('input, textarea, select'))) ev.preventDefault();
});

let sala = null, estado = null, offset = 0, corriendo = false, intento = 0;
const guardado = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
let token = guardado('bj_token');
if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
  token = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
  guardado('bj_token', token);
}
// Lo que la pantalla recuerda entre un cambio y otro.
const vista = { primera: true, timerResultado: 0 };
const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden;

async function api(ruta, cuerpo) {
  const r = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return r.json();
}

// ---------- botones y paño con el dibujo de cubitos del juego ----------

function nuevoBoton(texto, alHacerClick, cubo = 1.7) {
  const b = document.createElement('button');
  b.type = 'button';
  V.boton(b, { texto, cubo });
  b.onclick = alHacerClick;
  return b;
}
// La medalla de probabilidad: un círculo de color pegado a la esquina del botón con el que se arriesga (Pedir; en el Diez mil, Tirar).
const claseMedalla = p => (p >= 60 ? 'alta' : (p < 35 ? 'baja' : 'media'));
function ponerMedalla(boton, pr) {
  if (pr === null || pr === undefined) return boton;
  const m = document.createElement('span'); m.className = 'medalla';
  m.appendChild(V.medalla(pr + '%', claseMedalla(pr)));
  boton.appendChild(m);
  return boton;
}
// ---------- sonido ----------
// El navegador solo deja sonar después de un toque: el primero (en cualquier lado) enciende el audio.
for (const ev of ['pointerdown', 'pointerup', 'keydown', 'touchstart', 'touchend', 'click']) window.addEventListener(ev, () => Sonido.desbloquear(), { passive: true });
// ---------- ayuda: láminas con dibujos (web/ayuda.js) ----------
async function abrirAyuda() {
  const tj = !$('tj').hidden || (typeof juegoLobby !== 'undefined' && juegoLobby === 'trecejack' && Pantalla.actual !== 'dm');
  Ayuda.abrir({ nuevoBoton, modal: $('ayuda'), dm: typeof DM !== 'undefined' ? DM.catalogo : null, tj: typeof TJ !== 'undefined' ? TJ.catalogo : null, juego: tj ? 'trecejack' : 'diezmil' });
}
$('ayuda').addEventListener('click', ev => { if (ev.target === $('ayuda')) $('ayuda').hidden = true; });

// ---------- compartir el ranking como imagen ----------
// Las imágenes se dibujan con las letras de cubitos del juego y se mandan por el menú de compartir del teléfono; si no hay, se muestran para guardarlas.
const IMG = { ancho: 720, fuente: "'Lucid Stakes', 'Courier New', monospace" };
// Texto con la letra del juego; devuelve el ancho.
function imgTexto(ctx, txt, x, y, px, color, alinea, peso) {
  ctx.font = (peso || 400) + ' ' + px + 'px ' + IMG.fuente; ctx.fillStyle = color; ctx.textAlign = alinea || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(txt, x, y);
}
// Recorta el texto con "…" para que entre en `max` píxeles.
function imgRecortar(ctx, txt, px, max, peso) {
  ctx.font = (peso || 400) + ' ' + px + 'px ' + IMG.fuente;
  if (ctx.measureText(txt).width <= max) return txt;
  while (txt.length > 1 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1);
  return txt + '…';
}
// Crea el lienzo (al doble de resolución, para que el texto salga nítido) con el fondo y el marco de las ventanas del juego.
function imgLienzo(alto) {
  const W = IMG.ancho, esc = 2, cv = document.createElement('canvas');
  cv.width = W * esc; cv.height = Math.round(alto * esc);
  const ctx = cv.getContext('2d'); ctx.scale(esc, esc); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#120a22'; ctx.fillRect(0, 0, W, alto);
  const g = ctx.createRadialGradient(W / 2, alto * 0.25, 10, W / 2, alto * 0.25, W * 0.7);
  g.addColorStop(0, 'rgba(255,214,102,.30)'); g.addColorStop(1, 'rgba(255,214,102,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, alto);
  ctx.fillStyle = '#1d1236'; ctx.fillRect(16, 16, W - 32, alto - 32);
  ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 4; ctx.strokeRect(12, 12, W - 24, alto - 24);
  ctx.strokeStyle = '#3a2766'; ctx.lineWidth = 2; ctx.strokeRect(22, 22, W - 44, alto - 44);
  return { cv, ctx, W };
}
// Manda la imagen por el menú de compartir (o la muestra para guardarla). `armar` es una función que dibuja la imagen (se llama cuando la letra del juego ya cargó).
async function compartirImagen(armar, nombre, titulo, texto) {
  try { await document.fonts.load("700 24px 'Lucid Stakes'"); await document.fonts.load("400 24px 'Lucid Stakes'"); } catch (err) { /* sin la letra del juego, sale con la de respaldo */ }
  const cv = typeof armar === 'function' ? armar() : armar;
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  try {
    const archivo = new File([blob], nombre, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) { await navigator.share({ files: [archivo], title: titulo, text: texto }); return; }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  // sin menú de compartir: se muestra la imagen para guardarla o copiarla
  const caja = $('imagen').querySelector('.cajaRanking');
  caja.textContent = '';
  const img = document.createElement('img'); img.src = cv.toDataURL('image/png'); img.alt = 'Ranking de la partida'; img.className = 'imgRanking';
  const nota = document.createElement('p'); nota.className = 'nota'; nota.textContent = 'Mantén presionada la imagen para guardarla o copiarla.';
  const bot = document.createElement('div'); bot.className = 'botonesFin';
  const des = nuevoBoton('Descargar', () => { const a = document.createElement('a'); a.href = img.src; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); });
  bot.append(des, nuevoBoton('Cerrar', () => { $('imagen').hidden = true; }));
  caja.append(img, nota, bot);
  $('imagen').hidden = false;
}
$('imagen').addEventListener('click', ev => { if (ev.target === $('imagen')) $('imagen').hidden = true; });
$('imagen').addEventListener('click', ev => { if (ev.target === $('imagen')) $('imagen').hidden = true; });

// ---------- estadísticas personales (solo en este dispositivo) ----------
function pintarStats() {
  const caja = $('stats').querySelector('.cajaRanking'), t = Estadisticas.leer();
  caja.textContent = '';
  const h = document.createElement('h3'); h.textContent = 'Tus estadísticas'; caja.appendChild(h);
  const filas = document.createElement('div'); filas.className = 'statFilas';
  const fila = (nombre, valor) => { const f = document.createElement('div'); f.className = 'statFila'; const a = document.createElement('span'); a.textContent = nombre; const b = document.createElement('b'); b.textContent = valor; f.append(a, b); filas.appendChild(f); };
  const dm = Object.assign({ partidas: 0, ganadas: 0, turnos: 0, quemadas: 0, mejorTurno: 0, recCarrera: 0, recCarrera5000: 0, mejorEtapa: 0 }, t.dm);
  const menor = (a, b) => (a && b ? Math.min(a, b) : (a || b || 0));   // (los récords viejos se guardaban aparte)
  const recC = menor(dm.recCarrera, Number(guardado('bj_dm_carrera') || 0)), recC5 = menor(dm.recCarrera5000, Number(guardado('bj_dm_carrera_5000') || 0)), etapa = Math.max(dm.mejorEtapa, Number(guardado('bj_dm_escalera') || 0));
  const hayDM = dm.partidas > 0 || recC || recC5 || etapa;
  if (hayDM) {
    const sep = document.createElement('div'); sep.className = 'statSep'; sep.textContent = 'Diez mil'; filas.appendChild(sep);
    fila('Partidas jugadas', dm.partidas); fila('Partidas ganadas', dm.ganadas + ' (' + Estadisticas.porcentaje(dm.ganadas, dm.partidas) + ')');
    fila('Turnos jugados', dm.turnos); fila('Turnos quemados', dm.quemadas + ' (' + Estadisticas.porcentaje(dm.quemadas, dm.turnos) + ')');
    fila('Mejor turno (puntos)', dm.mejorTurno);
    fila('Récord a 10.000', recC ? recC + ' turnos' : '-'); fila('Récord a 5.000', recC5 ? recC5 + ' turnos' : '-'); fila('Escalera: mejor etapa', etapa || '-');
    caja.appendChild(filas);
  }
  const tj = Object.assign({ partidas: 0, ganadas: 0, manos: 0, veintiunos: 0, pasadas: 0, mejorMano: 0, mejor3: 0, mejor5: 0, mejor8: 0 }, t.tj);
  if (tj.partidas > 0) {
    const sep = document.createElement('div'); sep.className = 'statSep'; sep.textContent = '13 Jack'; filas.appendChild(sep);
    fila('Partidas jugadas', tj.partidas); fila('Partidas ganadas', tj.ganadas + ' (' + Estadisticas.porcentaje(tj.ganadas, tj.partidas) + ')');
    fila('Manos jugadas', tj.manos); fila('21 exactos', tj.veintiunos); fila('Manos pasadas', tj.pasadas + ' (' + Estadisticas.porcentaje(tj.pasadas, tj.manos) + ')');
    fila('Mejor mano (puntos)', tj.mejorMano);
    fila('Mejor puntaje, 3 mazos', tj.mejor3 || '-'); fila('Mejor puntaje, 5 mazos', tj.mejor5 || '-'); fila('Mejor puntaje, 8 mazos', tj.mejor8 || '-');
    fila('Más rápido a 250 puntos', tj.rap250 ? tj.rap250 + ' mazos' : '-'); fila('Más rápido a 400 puntos', tj.rap400 ? tj.rap400 + ' mazos' : '-'); fila('Más rápido a 650 puntos', tj.rap650 ? tj.rap650 + ' mazos' : '-');
  }
  if (hayDM || tj.partidas > 0) caja.appendChild(filas);
  else { const v = document.createElement('p'); v.className = 'nota'; v.textContent = 'Todavía no terminaste ninguna partida.'; caja.appendChild(v); }
  const bot = document.createElement('div'); bot.className = 'botonesFin';
  let pidio = false;
  const borrar = nuevoBoton('Borrar', () => { if (!pidio) { pidio = true; V.boton(borrar, { texto: '¿Seguro?', cubo: 1.7 }); return; } Estadisticas.borrar(); pintarStats(); });
  bot.append(nuevoBoton('Cerrar', () => { $('stats').hidden = true; }), borrar);
  caja.appendChild(bot);
}
$('bStats').onclick = () => { pintarStats(); $('stats').hidden = false; };
$('stats').addEventListener('click', ev => { if (ev.target === $('stats')) $('stats').hidden = true; });

// ---------- reacciones rápidas ----------
// Fuera de tu turno aparece una fila de símbolos; al tocar uno aparece un momento sobre tu asiento, para todos. Nada se queda en pantalla.
const REAC = [{ t: '♥', c: [1, 0.45, 0.55] }, { t: '★', c: [1, 0.86, 0.35] }, { t: 'GG', c: [0.6, 0.95, 0.7] }, { t: '!', c: [1, 0.6, 0.3] }, { t: '?', c: [0.7, 0.85, 1] }, { t: 'ZZZ', c: [0.75, 0.7, 1] }];

// clic en los botones y fichas; un roce suave al pasar el mouse por encima (no en pantallas táctiles)
const BOTONES = '.vb, .fsel, .tileBtn';
document.addEventListener('click', ev => { const b = ev.target.closest(BOTONES); if (b && !b.disabled && b.id !== 'bSonido') Sonido.play('clic'); });
document.addEventListener('mouseover', ev => { const b = ev.target.closest(BOTONES); if (b && !b.disabled && !(ev.relatedTarget && b.contains(ev.relatedTarget))) Sonido.play('roce'); });
const esChico = () => window.matchMedia('(max-width: 700px), (max-height: 540px)').matches;   // (celular: botones cortos y la hoja de compartir)

// ---------- instalar como app ----------
// En Android (Chrome) el navegador avisa cuando se puede instalar y se instala con un toque; en iPhone y iPad no hay aviso: se explica el camino por el menú de Safari.
let eventoInstalar = null;
const yaInstalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esAndroid = () => /Android/i.test(navigator.userAgent);
// En Android Chrome a veces no avisa que se puede instalar (hay que haber usado el sitio un rato): el botón sale igual y, sin aviso, explica cómo hacerlo desde el menú.
function actualizarInstalar() { $('bInstalar').hidden = yaInstalada() || !(eventoInstalar || esIOS() || esAndroid()); }
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); eventoInstalar = ev; actualizarInstalar(); });
window.addEventListener('appinstalled', () => { eventoInstalar = null; actualizarInstalar(); });
V.boton($('bInstalar'), { cubo: 1.7 });
V.boton($('bStats'), { cubo: 1.7 });
$('bInstalar').onclick = async () => {
  if (eventoInstalar) { eventoInstalar.prompt(); try { await eventoInstalar.userChoice; } catch (e) { /* sin respuesta */ } eventoInstalar = null; actualizarInstalar(); }
  else abrirInstalar();
};
// El botón de compartir de Safari (un cuadrado abierto con una flecha hacia arriba), dibujado con cubitos.
function iconoCompartir() {
  const patron = ['....#....', '...###...', '..#.#.#..', '....#....', '....#....', '#...#...#', '#.......#', '#.......#', '#.......#', '#########'];
  const c = 4, cv = document.createElement('canvas'); cv.width = 9 * c * 3; cv.height = 10 * c * 3; cv.style.width = 9 * c + 'px'; cv.style.height = 10 * c + 'px'; cv.style.verticalAlign = 'middle';
  const ctx = cv.getContext('2d'); ctx.scale(3, 3);
  patron.forEach((fila, j) => { for (let i = 0; i < 9; i++) if (fila[i] === '#') V.cubo(ctx, i * c, j * c, c, [0.55, 0.82, 1.0], true); });
  return cv;
}
function abrirInstalar() {
  const caja = $('instalar').querySelector('.cajaObjeto');
  caja.textContent = '';
  const t = document.createElement('h3'); t.textContent = esAndroid() ? 'Instalar en Android' : 'Instalar en iPhone o iPad';
  const pasos = document.createElement('div'); pasos.className = 'descripcion'; pasos.style.textAlign = 'left';
  if (esAndroid()) {
    const a1 = document.createElement('p'); a1.textContent = '1. Abre esta página en Chrome (si la abriste desde otra app, usa «Abrir en Chrome»).';
    const a2 = document.createElement('p'); a2.textContent = '2. Toca el menú ⋮ (arriba a la derecha) y elige «Instalar aplicación» o «Añadir a la pantalla de inicio».';
    const a3 = document.createElement('p'); a3.textContent = '3. Confirma. Queda un ícono de Farolín y se abre como una app, sin la barra del navegador.';
    pasos.append(a1, a2, a3);
    caja.append(t, pasos, nuevoBoton('Entendido', () => { $('instalar').hidden = true; }));
    $('instalar').hidden = false;
    return;
  }
  const p1 = document.createElement('p'); p1.append('1. Abre esta página en Safari y toca el botón Compartir ', iconoCompartir(), ' (abajo en el iPhone, arriba en el iPad).');
  const p2 = document.createElement('p'); p2.textContent = '2. Baja y elige «Añadir a pantalla de inicio».';
  const p3 = document.createElement('p'); p3.textContent = '3. Toca «Añadir». Queda un ícono de Farolín y se abre como una app, sin la barra de Safari.';
  pasos.append(p1, p2, p3);
  caja.append(t, pasos, nuevoBoton('Entendido', () => { $('instalar').hidden = true; }));
  $('instalar').hidden = false;
}
$('instalar').addEventListener('click', ev => { if (ev.target === $('instalar')) $('instalar').hidden = true; });
actualizarInstalar();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sin service worker: igual funciona, solo que no se instala */ }));


// ---------- pantallas ----------
// Una sola pantalla a la vez: la entrada, el mapa de mesas, la lista, "solo", "crear sala", la sala de espera y las dos mesas de juego.
const Pantalla = {
  actual: null,
  ir(id) {
    document.querySelectorAll('.pant').forEach(p => { p.hidden = p.id !== id; });
    this.actual = id;
  },
};

// ---------- entrar a una sala ----------

const params = new URLSearchParams(location.search);
$('apodo').value = guardado('bj_apodo') || '';
$('apodo').placeholder = 'Tu apodo';
// El nombre de un jugador; si es un bot, con el icono de robot a la izquierda.
function ponerNombre(nodo, nombre, bot) {
  nodo.textContent = '';
  if (bot) { const i = document.createElement('span'); i.className = 'botIco'; i.title = 'Bot'; i.setAttribute('role', 'img'); i.setAttribute('aria-label', 'Bot'); nodo.appendChild(i); }
  nodo.appendChild(document.createTextNode(nombre));
  return nodo;
}
function falloApodo() { $('errorInicio').textContent = ''; $('errorApodo').textContent = 'Escribe un apodo'; $('apodo').classList.add('malo'); $('apodo').focus(); return false; }
$('apodo').addEventListener('input', () => { $('errorApodo').textContent = ''; $('apodo').classList.remove('malo'); });
// Con apodo se puede seguir; si falta, se avisa en la entrada y no se avanza.
function apodoListo() {
  if ($('apodo').value.trim()) return true;
  if (Pantalla.actual !== 'entrada') Pantalla.ir('entrada');
  return falloApodo();
}

// Entra a una sala con el apodo escrito. Devuelve { ok, error?, pideClave? }: quien llama decide cómo mostrar el error.
async function entrar(codigo, claveGuardada) {
  const apodo = $('apodo').value.trim();
  if (!apodo) { apodoListo(); return { ok: false }; }
  guardado('bj_apodo', apodo);
  const claveSala = (claveGuardada || $('claveSala').value || '').trim().toUpperCase();
  const r = await api('/api/entrar', { sala: codigo, token, apodo, clave: claveSala });
  if (!r.ok) { if (r.pideClave) $('campoClave').hidden = false; return { ok: false, error: r.error, pideClave: !!r.pideClave }; }
  guardado('bj_clave', claveSala);
  abrirMesa(codigo, r.juego);
  return { ok: true };
}

function abrirMesa(codigo, juego) {
  sala = codigo;
  reanudar();   // (se corta la consulta que quedara pendiente de la sala anterior, para que la nueva empiece enseguida)
  guardado('bj_sala', codigo);
  vista.juego = juego; vista.abierta = codigo; vista.pantalla = null;
  if (juego === 'trecejack') { $('tSala').textContent = codigo; abrirTJ(); } else { $('dSala').textContent = codigo; abrirDM(); }
  try { history.replaceState(null, '', '?sala=' + codigo + (diag ? '&diag=1' : '')); } catch (e) { /* sin cambiar la barra */ }
  mantenerPantalla();
  if (!corriendo) { corriendo = true; bucle(); setInterval(reloj, 250); }
}

function volverAlInicio(mensaje) {
  if (typeof Tut !== 'undefined') Tut.alSalir();
  sala = null; estado = null; vista.abierta = null; vista.pantalla = null;
  guardado('bj_sala', '');
  ocultarResultado();
  if (typeof limpiarDM === 'function') limpiarDM();
  if (typeof limpiarTJ === 'function') limpiarTJ();
  irEntrada();
  $('errorInicio').textContent = mensaje || '';
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* sin cambiar la barra */ }
}

// ---------- la conexión: una consulta que espera el cambio ----------

async function bucle() {
  let version = -1;
  for (;;) {
    if (!sala) { await pausa(300); version = -1; continue; }
    try {
      const consultada = sala;
      const e = await consultar('/api/estado?sala=' + sala + '&token=' + token + '&v=' + version);
      if (consultada !== sala) { version = -1; continue; }   // (la respuesta es de otra sala, por ejemplo la del tutorial que acaba de cerrarse: se descarta)
      if (!e.ok) { volverAlInicio(e.error); continue; }
      if (diag) mostrarDiag(e);
      intento = 0;
      offset = e.ahora - Date.now();
      version = e.version;
      estado = e;
      if (e.pausa && !document.hidden && !vista.reanudando) { vista.reanudando = true; accion('reanudar').finally(() => { vista.reanudando = false; }); }   // (si se volvió a la partida y quedó en pausa, se reanuda)
      if (!e.yo && e.yo !== 0) { volverAlInicio('Ya no estás en esa sala'); continue; }
      if (vista.abierta !== sala || vista.juego !== e.juego) abrirMesa(sala, e.juego);
      if (e.fase === 'espera' && e.modo === 'multi' && !e.tutorial) {   // esperando en la sala: se ven las reglas, los asientos y los bots
        if (Pantalla.actual !== 'sala') Pantalla.ir('sala');
        pintarSala(e);
        continue;
      }
      const destino = e.juego === 'trecejack' ? 'tj' : 'dm';
      if (Pantalla.actual !== destino) { Pantalla.ir(destino); if (destino === 'dm') reajustarDM(); }
      if (e.juego === 'diezmil') pintarDM(e); else pintarTJ(e);
    } catch (err) {
      if (err && err.name === 'AbortError') { await pausa(150); continue; }   // (consulta cortada a propósito: pasó de 30 s sin respuesta, o se volvió a la página)
      intento++;
      if (typeof avisarDM === 'function') avisarDM('Sin conexión, reintentando…', 2500);
      await pausa(Math.min(1000 * intento, 5000));
    }
  }
}
// La consulta larga tiene un tope de 30 s (el servidor contesta como mucho a los 20): si se cuelga, se corta y se vuelve a pedir.
// También se corta al volver a la página (el celular duerme las conexiones al bloquear la pantalla), al recuperar internet y al volver de la caché.
async function consultar(url) {
  const ctrl = new AbortController();
  vista.consulta = ctrl;
  const t = setTimeout(() => ctrl.abort(), 30000);
  try { return await (await fetch(url, { cache: 'no-store', signal: ctrl.signal })).json(); }
  finally { clearTimeout(t); if (vista.consulta === ctrl) vista.consulta = null; }
}
function reanudar() { if (vista.consulta) vista.consulta.abort(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reanudar(); });
window.addEventListener('online', reanudar);
window.addEventListener('pageshow', reanudar);

// Con ?diag=1 se ve abajo a la izquierda qué proceso del servidor responde (si cambia de uno a otro, hay más de un proceso o se reinició).
const diag = new URLSearchParams(location.search).has('diag');
const dg = { pid: null, cambios: 0, n: 0 };
function mostrarDiag(e) {
  let d = $('diag');
  if (!d) { d = document.createElement('div'); d.id = 'diag'; d.style.cssText = 'position:fixed;left:6px;bottom:4px;font:11px monospace;color:#8f8;z-index:99;background:rgba(0,0,0,.6);padding:2px 4px'; document.body.appendChild(d); }
  if (dg.pid !== null && dg.pid !== e.pid) dg.cambios++;
  dg.pid = e.pid; dg.n++;
  d.textContent = 'proceso ' + e.pid + ' · arrancó ' + new Date(e.arranque).toLocaleTimeString() + ' · respuestas ' + dg.n + ' · cambios de proceso ' + dg.cambios;
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ahora = () => Date.now() + offset;


// El destello de una compra: el borde se ilumina y un "-N" sube desde donde se tocó (las fichas que se fueron).
function destelloCompra(rect, monto) {
  if (sinMovimiento() || !rect) return;
  const f = document.createElement('div'); f.className = 'flotaCompra'; f.textContent = '-' + monto;
  f.style.left = (rect.left + rect.width / 2) + 'px'; f.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(f);
  f.animate([{ opacity: 0, transform: 'translate(-50%, 0) scale(.6)' }, { opacity: 1, transform: 'translate(-50%, -18px) scale(1.15)', offset: .25 }, { opacity: 0, transform: 'translate(-50%, -56px) scale(1)' }], { duration: 900, easing: 'ease-out' }).onfinish = () => f.remove();
}

// ---------- el cartel grande al terminar la ronda ----------

function ocultarResultado() {
  const r = $('resultado');
  clearTimeout(vista.timerResultado);
  if (r) { r.hidden = true; r.querySelector('.rcentro').textContent = ''; r.querySelectorAll('.rconf').forEach(c => c.remove()); }
}

// Cubitos de colores que caen (como las chispas del casino).
function confeti(ov, n) {
  const colores = ['#f2c94c', '#fff3c4', '#9d66f2', '#8be36a', '#ff8a7a', '#8bd0ff'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'rconf';
    const tam = 6 + Math.random() * 8;
    c.style.cssText = 'left:' + Math.random() * 100 + '%;top:-20px;width:' + tam + 'px;height:' + tam + 'px;background:' + colores[i % colores.length];
    ov.appendChild(c);
    c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + (Math.random() * 160 - 80) + 'px,' + (window.innerHeight + 40) + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0.9 }],
      { duration: 1700 + Math.random() * 1500, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' }).onfinish = () => c.remove();
  }
}
$('resultado').addEventListener('click', ocultarResultado);

// Que el celular no apague la pantalla en medio de una mano.
let pantalla = null;
async function mantenerPantalla() {
  try { if (navigator.wakeLock && !pantalla && document.visibilityState === 'visible') { pantalla = await navigator.wakeLock.request('screen'); pantalla.addEventListener('release', () => { pantalla = null; }); } } catch (e) { pantalla = null; }
}
document.addEventListener('visibilitychange', () => {
  if (sala) mantenerPantalla();
  // en una sala de un solo jugador, con la pestaña oculta el tiempo se detiene
  if (sala && estado && estado.jugadores && estado.jugadores.length === 1 && !estado.tutorial) accion(document.hidden ? 'pausar' : 'reanudar');
});

function reloj() {
  const e = estado;
  if (e && e.juego === 'diezmil' && typeof relojDM === 'function') relojDM(e);
  else if (e && e.juego === 'trecejack' && typeof relojTJ === 'function') relojTJ(e);
}

// ---------- acciones ----------

async function accion(nombre, extra) {
  try {
    const r = await api('/api/accion', Object.assign({ sala, token, accion: nombre }, extra || {}));
    return r;
  } catch (err) { return { ok: false, error: 'No se pudo enviar, intenta de nuevo' }; }
}

async function salirDeLaMesa() { await accion('salir'); volverAlInicio(''); }
// Salir es definitivo: se pide confirmación (salvo en el tutorial o con la partida ya terminada).
function confirmarSalir() {
  const e = estado;
  if (!e || e.fase === 'fin' || (typeof Tut !== 'undefined' && Tut.activo)) return salirDeLaMesa();
  const m = $('salirConf'), caja = m.querySelector('.caja'); caja.textContent = '';
  const h = document.createElement('h3'); h.textContent = '¿Salir de la partida?';
  const p = document.createElement('p'); p.className = 'nota'; p.textContent = e.jugadores.length <= 1 ? 'Perderás tu progreso.' : 'Perderás tu lugar en la mesa.';
  const fila = document.createElement('div'); fila.className = 'botonesFin';
  const quedar = nuevoBoton('Quedarme', () => { m.hidden = true; }, 2); quedar.oro = true;
  fila.append(quedar, nuevoBoton('Salir', () => { m.hidden = true; salirDeLaMesa(); }, 2));
  caja.append(h, p, fila);
  m.hidden = false;
}
// La ventana para invitar: el código, la clave, el enlace con su QR y los botones para mandarlo (WhatsApp, copiar y, en el celular, la hoja de compartir).
function abrirInvitar() {
  if (!sala || !estado || (typeof Tut !== 'undefined' && Tut.activo)) return;
  const m = $('invitar'), caja = m.querySelector('.caja'); caja.textContent = '';
  const url = location.origin + location.pathname + '?sala=' + sala, clave = estado.clave, juego = estado.juego === 'trecejack' ? '13 Jack' : 'Diez mil';
  const texto = 'Súmate a mi mesa de ' + juego + (clave ? ' (clave ' + clave + ')' : '') + ': ' + url;
  const h = document.createElement('h3'); h.textContent = 'Invitar amigos';
  caja.appendChild(h);
  try { const cv = QR.canvas(url, 6); cv.className = 'qr'; cv.setAttribute('aria-label', 'Código QR de la sala'); caja.appendChild(cv); } catch (e) { /* sin QR, quedan el enlace y los botones */ }
  const dato = document.createElement('div'); dato.className = 'salaDato'; dato.textContent = 'Sala ' + sala + (clave ? ' · clave ' + clave : '');
  const aviso = document.createElement('div'); aviso.className = 'nota';
  const fila = document.createElement('div'); fila.className = 'botonesFin';
  const wa = nuevoBoton('WhatsApp', () => { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'); }, 2); wa.oro = true;
  const copiar = nuevoBoton('Copiar enlace', async () => {
    try { await navigator.clipboard.writeText(texto); aviso.textContent = 'Enlace copiado'; } catch (e) { aviso.textContent = url; }
  }, 2);
  fila.append(wa, copiar);
  if (navigator.share && esChico()) fila.appendChild(nuevoBoton('Compartir…', async () => { try { await navigator.share({ title: 'Mesas de Lucid Stakes', text: texto, url }); } catch (e) { /* cancelado */ } }, 2));
  const cerrar = nuevoBoton('Cerrar', () => { m.hidden = true; }, 2);
  caja.append(dato, aviso, fila, cerrar);
  m.hidden = false;
}
$('invitar').addEventListener('click', ev => { if (ev.target === $('invitar')) $('invitar').hidden = true; });

// si ya estaba sentado en esa sala (recarga de la página), vuelve directo; si es la primera vez, ve la pantalla de entrada
if (params.get('sala') && guardado('bj_apodo') && guardado('bj_sala') === params.get('sala').toUpperCase()) { $('apodo').value = guardado('bj_apodo') || ''; entrar(params.get('sala').toUpperCase(), guardado('bj_clave') || ''); }


// ---------- el final con empate: quienes comparten el primer puesto ----------
// Devuelve { empate, gane, nombres, puesto(i) }: `puesto` es el número que se muestra en cada fila (los empatados comparten el mismo).
function infoEmpateFin(f, yo) {
  const emp = f.empatados || [], empate = f.modo === 'multi' && emp.length > 1;
  const gane = empate ? emp.includes(yo) : !!(f.ganador && f.ganador.asiento === yo);
  const nombres = empate ? f.ranking.filter(r => emp.includes(r.asiento)).map(r => r.apodo) : [];
  const otros = empate ? f.ranking.filter(r => emp.includes(r.asiento) && r.asiento !== yo).map(r => r.apodo) : [];
  const unir = l => (l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l.join(''));
  const titulo = empate ? (gane ? '¡Empataste con ' + unir(otros) + '!' : 'Empataron ' + unir(nombres)) : '';
  const puesto = i => { let k = i; while (k > 0 && f.ranking[k - 1].total === f.ranking[i].total) k--; return k + 1; };
  const lider = i => (empate ? emp.includes(f.ranking[i].asiento) : i === 0);
  return { empate, gane, nombres, titulo, puesto, lider };
}
