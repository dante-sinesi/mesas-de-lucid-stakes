'use strict';
// La pantalla del diez mil: los jugadores, la mesa con los dados (dados3d.js), las acciones de cada momento, la tienda y el final.
// Todo lo decide el servidor (servidor/diezmil/mesa_dm.js); aquí solo se muestra y se envían acciones. Se carga después de juego.js y usa sus ayudas ($, api, accion, token, sala, ahora, nuevoBoton...).

const DM = {
  escena: null, e: null, rollId: -1, valores: [], sel: new Set(), selRoll: -1, animando: false, jugKey: '', accKey: '', cartelId: -1, tiendaKey: '', finKey: '',
  avisoVisto: undefined, reacVisto: undefined, primera: true, catalogo: null, paso: null, calientes: -1, aviso: '', avisoT: 0, miTurnoAntes: false, ultimoSonidoTurno: -1,
};
const catalogoDM = fetch('/api/catalogo').then(r => r.json()).then(d => { DM.catalogo = d.diezmil; return d.diezmil; }).catch(() => null);
const NOMBRE_DADO = t => (DM.catalogo && DM.catalogo.dados[t] ? DM.catalogo.dados[t].nombre : (t === 'normal' ? 'Dado común' : t));
const colorCss = c => 'rgb(' + c.map(v => Math.round(v * 255)).join(',') + ')';

// ---------- abrir y cerrar ----------

function abrirDM() {
  if (!DM.escena) {
    const mesa = $('dmMesa');
    DM.escena = new D3.Escena($('dmLienzo'), mesa, { maxAlto: Math.max(mesa.clientHeight - 6, 140) });
    DM.escena.configurar([0, 1, 2, 3, 4].map(() => 'normal'));
    DM.escena.alTocar = tocarDado;
    DM.escena.alAterrizar = () => { if (!document.hidden) Sonido.play('ficha'); };
    DM.escena.alTerminar = () => { DM.animando = false; if (DM.e) pintarDM(DM.e); };
    $('dAyuda').appendChild(V.interrogante()); $('dAyuda').onclick = abrirAyuda;
    $('dInvitar').appendChild(V.invitar()); $('dInvitar').onclick = abrirInvitar;
    $('dSalir').appendChild(V.puerta()); $('dSalir').onclick = confirmarSalir;
    $('dSonido').onclick = () => { Sonido.setActivo(!Sonido.activo); pintarSonidoDM(); Sonido.play('clic'); };
    window.addEventListener('resize', () => { clearTimeout(DM.tRes); DM.tRes = setTimeout(reajustarDM, 120); });
    if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(DM.tRes); DM.tRes = setTimeout(reajustarDM, 60); }).observe($('dmMesa'));
  }
  pintarSonidoDM();
  DM.misValores = []; DM.misMostrados = []; DM.tardioDicho = false; DM.primera = true; DM.rollId = -1; DM.valores = []; DM.sel = new Set(); DM.selRoll = -1; DM.animando = false; DM.jugKey = ''; DM.accKey = ''; DM.cartelId = -1; DM.tiendaKey = ''; DM.finKey = ''; DM.calientes = -1; DM.misKey = ''; DM.flotaKey = '';
  DM.avisoVisto = undefined; DM.reacVisto = undefined; DM.e = null;
  requestAnimationFrame(reajustarDM);
}
function reajustarDM() {
  if (!DM.escena || $('dm').hidden) return;
  const mesa = $('dmMesa');
  DM.escena.maxAlto = Math.max(mesa.clientHeight - 6, 140);
  DM.escena.ajustar();
}
function pintarSonidoDM() {
  const b = $('dSonido'); b.textContent = '';
  b.appendChild(V.parlante(Sonido.activo));
  b.title = Sonido.activo ? 'Sonido activado' : 'Sin sonido';
}
function limpiarDM() {
  DM.e = null; DM.jugKey = ''; DM.accKey = ''; DM.tiendaKey = ''; DM.finKey = '';
  for (const id of ['dmTienda', 'dmFinal']) $(id).hidden = true;
  $('dmCartel').hidden = true; $('dmAcciones').textContent = ''; $('dmJugadores').textContent = ''; $('dmInfo').textContent = '';
  if (DM.escena) DM.escena.quitarMarcas();
}

// ---------- mensajes ----------

function avisarDM(texto, ms = 2400, clase) { DM.avisoClase = clase || 'mal'; DM.aviso = texto; clearTimeout(DM.avisoT); DM.avisoT = setTimeout(() => { DM.aviso = ''; DM.dadoSel = -1; document.querySelectorAll('#dmMisFila .on').forEach(x => x.classList.remove('on')); if (DM.e) pintarInfoDM(DM.e); }, ms); if (DM.e) pintarInfoDM(DM.e); }
async function accionDM(nombre, extra) {
  try {
    const r = await api('/api/accion', Object.assign({ sala, token, accion: nombre }, extra || {}));
    if (!r.ok) avisarDM(r.error, 3200);
    return r;
  } catch (err) { avisarDM('No se pudo enviar, intenta de nuevo'); return { ok: false }; }
}
const jugDe = (e, asiento) => e.jugadores.find(j => j.asiento === asiento);
const nombreDe = (e, asiento) => (asiento === e.yo ? 'Tú' : ((jugDe(e, asiento) || {}).apodo || '?'));
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ---------- el estado ----------

function pintarDM(e) {
  DM.e = e;
  const sc = e.mio, jugando = e.turno;
  const dueño = e.fase === 'turno' && e.turnoDe !== null ? jugDe(e, e.turnoDe) : jugDe(e, e.yo);
  $('dClave').textContent = e.clave ? 'clave ' + e.clave : '';
  pintarJugadoresDM(e);
  refrescarJugadorDM(e);
  $('dInvitar').hidden = e.modo !== 'multi';   // (en las salas solitarias no sirve)
  pintarMisDadosDM(e);
  const yoJ = jugDe(e, e.yo);
  if (yoJ && yoJ.tardio && !DM.tardioDicho && e.fase !== 'espera') { DM.tardioDicho = true; avisarDM('Partida en curso: juegas cuando te toque', 6000, 'bien'); }
  if (dueño) {
    const tipos = dueño.dados.map(d => d.tipo);
    const igual = DM.escena.dados.length === tipos.length && DM.escena.dados.every((d, i) => d.tipo === tipos[i]);
    if (!igual) { DM.escena.configurar(tipos); reajustarSiCambioModo(); }
  }
  // la tirada: si es nueva, se anima; si ya estaba (al volver a la página), se muestra
  if (jugando) {
    const t = e.turno;
    if (t.rollId !== DM.rollId) {
      const nueva = DM.rollId !== -1 || !DM.primera;
      DM.rollId = t.rollId;
      if (t.tirada.length) {
        t.tirada.forEach(i => { DM.valores[i.slot] = i.valor; if (e.turnoDe === e.yo) DM.misValores[i.slot] = i.valor; });
        if (nueva && !sinMovimiento()) {
          DM.escena.tirar(t.tirada.map(i => i.slot), t.tirada.map(i => i.valor), t.rollId);
          DM.animando = true;
          if (!document.hidden) Sonido.play('flip');
        } else DM.escena.mostrar(DM.valores);
      }
    } else if (!DM.escena.hayTiro()) DM.escena.mostrar(DM.valores);
    if (t.estado === 'apartar' && e.turnoDe === e.yo && DM.selRoll !== t.rollId && t.validas.length) {
      const mejor = t.validas.reduce((a, b) => (b.puntos > a.puntos ? b : a));
      DM.sel = new Set(mejor.indices.map(i => t.tirada[i].slot)); DM.selRoll = t.rollId;
    }
    if (t.estado !== 'apartar' || e.turnoDe !== e.yo) DM.sel = new Set();
    if (t.ultimaJugada && t.ultimaJugada.calientes && DM.calientes !== t.rollId + ':' + t.acum) { DM.calientes = t.rollId + ':' + t.acum; if (!DM.primera) { avisarDM('¡Dados calientes! Vuelves a tirar con todos', 2800); if (!document.hidden) Sonido.play('salvado'); } }
    marcarDM(e);
  } else {
    DM.rollId = -1; DM.sel = new Set();
    if (DM.escena) DM.escena.quitarMarcas();
    if (dueño && e.fase !== 'turno') DM.escena.mostrar(DM.valores);
  }
  if (!DM.escena.hayTiro()) DM.animando = false;
  DM.escena.dibujar();
  if (DM.animando) {   // (mientras caen los dados no se adelanta el resultado: todo lo demás se muestra cuando terminan)
    $('dmCartel').hidden = true;
    avisosDM(e); reaccionesDM(e);
    DM.primera = false;
    return;
  }
  pintarCartelDM(e);
  flotaPuntosDM(e);
  pintarInfoDM(e);
  pintarAccionesDM(e);
  tiendaDM(e);
  finalDM(e);
  avisosDM(e);
  reaccionesDM(e);
  // mi turno: un sonido al empezar
  const mio = e.fase === 'turno' && e.turnoDe === e.yo && jugando && jugando.estado === 'tirar' && jugando.acum === 0;
  if (mio && DM.miTurnoAntes !== true && !DM.primera) { Sonido.play('turno'); try { navigator.vibrate && navigator.vibrate(100); } catch (x) { /* sin vibración */ } }
  DM.miTurnoAntes = mio;
  DM.primera = false;
  if (typeof Tut !== 'undefined') Tut.mirar(e);
}
function reajustarSiCambioModo() { const antes = DM.escena.modo; DM.escena.ajustar(); if (antes !== DM.escena.modo) reajustarDM(); }

// Los dados apartados (con candado) y los elegidos (con aro dorado).
function marcarDM(e) {
  const t = e.turno; if (!t) return;
  const dueño = jugDe(e, e.turnoDe); if (!dueño) return;
  dueño.dados.forEach((d, i) => {
    const apartado = !t.pool.includes(i) || (t.estado === 'decidir' && t.ultimaJugada && t.ultimaJugada.slots.includes(i) && !t.pool.includes(i));
    DM.escena.marcar(i, apartado, !DM.animando && DM.sel.has(i) && t.estado === 'apartar');   // (el aro dorado aparece cuando los dados quedan quietos)
  });
}
function tocarDado(slot) {
  const e = DM.e; if (!e || DM.animando) return;
  const t = e.turno;
  if (!t || e.turnoDe !== e.yo || t.estado !== 'apartar' || !t.tirada.some(i => i.slot === slot)) return;
  if (DM.sel.has(slot)) DM.sel.delete(slot); else DM.sel.add(slot);
  Sonido.play('clic');
  marcarDM(e); DM.escena.dibujar(); DM.accKey = ''; pintarAccionesDM(e); pintarInfoDM(e);
}
// La jugada que forman los dados elegidos (o null si no puntúan).
function jugadaElegida(e) {
  const t = e.turno; if (!t || !DM.sel.size) return null;
  const idx = t.tirada.map((i, k) => (DM.sel.has(i.slot) ? k : -1)).filter(k => k >= 0).sort((a, b) => a - b).join(',');
  return t.validas.find(v => v.indices.slice().sort((a, b) => a - b).join(',') === idx) || null;
}

// ---------- los jugadores ----------

function pintarJugadoresDM(e) {
  const k = JSON.stringify([e.turnoDe, e.fase, e.meta, e.jugadores.map(j => [j.asiento, j.apodo, j.total, j.entrado, j.fichas, j.conectado, j.dados.map(d => d.tipo).join(), j.turnos])]);
  if (k === DM.jugKey) return;
  DM.jugKey = k;
  const caja = $('dmJugadores'); caja.textContent = '';
  caja.classList.toggle('compacto', e.jugadores.length > 3);   // (con más de 3 jugadores las tarjetas se achican para que los botones entren en el celular)
  e.jugadores.forEach(j => {
    const d = document.createElement('div'); d.className = 'dmJ' + (j.asiento === e.turnoDe && e.fase === 'turno' ? ' turno' : '') + (j.asiento === e.yo ? ' soy' : '') + (j.entrado ? '' : ' sinEntrar') + (j.conectado ? '' : ' off'); d.dataset.asiento = j.asiento;
    const n = document.createElement('div'); n.className = 'dmNombre'; ponerNombre(n, j.apodo, j.bot);
    const t = document.createElement('div'); t.className = 'dmTotal'; t.textContent = fmt(j.total);
    const m = document.createElement('div'); m.className = 'dmMeta'; if (!j.entrado) { const rot = document.createElement('span'); rot.className = 'dmRotSin'; rot.textContent = 'sin entrar'; m.append(rot); }   // (solo los puntos; si aún no entró, lo avisa)
    const dm = document.createElement('div'); dm.className = 'dmDadosMini';
    j.dados.forEach(x => { const s = document.createElement('span'); s.style.background = colorCss(D3.ESTILOS[x.tipo].cuerpo); s.title = NOMBRE_DADO(x.tipo); dm.appendChild(s); });
    const f = document.createElement('div'); f.className = 'dmFichas'; f.textContent = j.fichas + ' fichas' + (j.nObjetos && e.jugadores.length <= 3 ? ' · ' + j.nObjetos + ' obj.' : '');
    d.append(n, t, m, dm, f);
    d.style.cursor = 'pointer'; d.onclick = () => abrirJugadorDM(j.asiento);   // (al tocar a un jugador se abre su ventana)
    caja.appendChild(d);
  });
}

// ---------- la ventana de un jugador: sus datos y sus dados ----------

function abrirJugadorDM(asiento) {
  if (!DM.e || !jugDe(DM.e, asiento)) return;
  Sonido.play('clic');
  DM.verAsiento = asiento; DM.verDado = -1; DM.verKey = '';
  $('dmJugador').hidden = false;
  refrescarJugadorDM(DM.e);
}
function cerrarJugadorDM() { DM.verAsiento = null; DM.verKey = ''; $('dmJugador').hidden = true; }
$('dmJugador').addEventListener('click', ev => { if (ev.target === $('dmJugador')) cerrarJugadorDM(); });
function refrescarJugadorDM(e) {
  const m = $('dmJugador');
  if (m.hidden || DM.verAsiento === null || DM.verAsiento === undefined) return;
  const j = jugDe(e, DM.verAsiento);
  if (!j || e.fase === 'fin' || e.fase === 'tienda') { cerrarJugadorDM(); return; }
  const key = JSON.stringify([j.apodo, j.total, j.entrado, j.fichas, j.quemadas, j.mejorTurno, j.nObjetos, j.dados.map(d => d.tipo), e.meta, DM.verDado, !!DM.catalogo]);
  if (key === DM.verKey) return;
  DM.verKey = key;
  const caja = m.querySelector('.caja'); caja.textContent = '';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
  const cab = el('div', 'jvCab'); cab.append(ponerNombre(el('b'), j.apodo + (j.asiento === e.yo ? ' (tú)' : ''), j.bot));
  const x = el('button', 'jvX', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.onclick = cerrarJugadorDM; cab.appendChild(x);
  const datos = [['Puntos' + (j.entrado ? '' : ' · sin entrar'), fmt(j.total) + ' / ' + fmt(e.meta)], ['Fichas', String(j.fichas), 'bien'], ['Quemadas', String(j.quemadas), 'mal'], ['Mejor turno', fmt(j.mejorTurno || 0)], ['Objetos', String(j.nObjetos)]];
  const g = el('div', 'jvGrid');
  datos.forEach(([a, b, c]) => { const d = el('div', 'jvDato'); d.append(el('span', '', a), el('b', c || '', b)); g.appendChild(d); });
  const dados = el('div', 'jvDados');
  j.dados.forEach((d, i) => {
    const b = el('button', 'jvDado' + (d.tipo === 'normal' ? '' : ' esp') + (DM.verDado === i ? ' on' : '')); b.type = 'button';
    b.appendChild(D3.sprite(d.tipo, d.caras[0], 46));
    b.appendChild(el('span', '', NOMBRE_DADO(d.tipo).replace(/^Dado (de |de la |de )?/, '')));
    b.onclick = () => { Sonido.play('clic'); DM.verDado = DM.verDado === i ? -1 : i; refrescarJugadorDM(DM.e); };
    dados.appendChild(b);
  });
  const def = DM.verDado >= 0 && DM.catalogo ? DM.catalogo.dados[j.dados[DM.verDado].tipo] : null;
  const nota = el('div', 'jvNota', def ? NOMBRE_DADO(j.dados[DM.verDado].tipo) + ': ' + (def.desc || 'sale cualquier cara del 1 al 6.') : (j.dados.some(d => d.tipo !== 'normal') ? 'Los dados con borde dorado son especiales. Toca uno para leer qué hace.' : 'Solo tiene dados comunes.'));
  const cerrar = el('button', 'boton', 'Cerrar'); cerrar.type = 'button'; V.boton(cerrar, { cubo: 2.4 }); cerrar.onclick = cerrarJugadorDM;
  caja.append(cab, g, el('div', 'jvTit', 'Sus dados'), dados, nota, cerrar);
}

// ---------- el cartel de arriba de la mesa ----------

function pintarCartelDM(e) {
  const c = $('dmCartel');
  const u = e.ultimoTurno, t = e.turno;
  let titulo = '', sub = '', clase = '', barra = false;
  if (e.fase === 'turno' && t && t.estado === 'quemada' && e.turnoDe === e.yo) { titulo = '¡Te quemaste!'; sub = 'Usa tu espejo o tu dado de la suerte para salvarte'; clase = 'malo'; barra = true; }
  else if (e.fase === 'turno' && t && t.estado === 'quemada') { titulo = '¡' + nombreDe(e, e.turnoDe) + ' se quema!'; sub = 'Puede salvarse con un espejo o con suerte'; clase = 'malo'; barra = true; }
  else if (e.fase === 'turno' && t && t.estado === 'fin' && u) {
    const quien = nombreDe(e, u.asiento);
    if (u.resultado === 'quemo') { titulo = quien === 'Tú' ? '¡Te quemaste!' : '¡' + quien + ' se quemó!'; sub = u.motivo === 'explosion' ? 'Explotó un dado explosivo' : (u.motivo === 'pasado' ? 'Se pasaría de la meta' : 'Ningún dado puntúa') + ' · pierde ' + fmt(u.acum); clase = 'malo'; }
    else { titulo = (quien === 'Tú' ? 'Te plantaste' : quien + ' se plantó') + ': +' + fmt(u.acum); sub = u.resultado === 'gano' ? '¡Llegó justo a la meta!' : ''; clase = 'bueno'; }
    if (DM.cartelId !== u.id && !DM.primera) { if (!document.hidden) Sonido.play(u.resultado === 'quemo' ? 'perder' : (u.resultado === 'gano' ? 'ganar' : 'moneda')); }
    if (u.asiento === e.yo) { if (DM.cartelId !== u.id && !DM.primera) cartelGrandeDM(e, u); titulo = ''; }   // (lo propio va con el cartel grande; lo de los demás, con el cartel chico)
    DM.cartelId = u.id;
  }
  if (!titulo) { c.hidden = true; return; }
  c.className = 'dmCartel ' + clase; c.textContent = '';
  const b = document.createElement('b'); b.textContent = titulo; c.appendChild(b);
  if (sub) { const s = document.createElement('span'); s.textContent = sub; c.appendChild(s); }
  if (barra) { const br = document.createElement('div'); br.className = 'barraV'; const bi = document.createElement('div'); bi.id = 'dmBarraQ'; br.appendChild(bi); c.appendChild(br); }
  c.hidden = false;
}

// ---------- el cartel grande de lo propio (el de anotado o te quemaste) ----------

function cartelGrandeDM(e, u) {
  if (u.resultado === 'gano') return;   // (la llegada a la meta tiene su propia ventana)
  const quemo = u.resultado === 'quemo', jug = jugDe(e, e.yo);
  const color = quemo ? [1.0, 0.45, 0.36] : [1.0, 0.85, 0.4], luz = quemo ? '255,80,60' : '255,214,102';
  const ov = $('resultado'), centro = ov.querySelector('.rcentro');
  clearTimeout(vista.timerResultado);
  ov.querySelectorAll('.rconf').forEach(c => c.remove());
  centro.textContent = '';
  ov.querySelector('.rluz').style.background = 'radial-gradient(ellipse at 50% 45%, rgba(' + luz + ',.28), rgba(' + luz + ',0) 62%)';
  const ancho = Math.min(window.innerWidth * 0.92, 900);
  const titulo = V.rotulo(quemo ? '¡TE QUEMASTE!' : 'ANOTADO', color, ancho, 13);
  centro.appendChild(titulo);
  let cifra = null;
  const signo = quemo ? MENOS : '+';
  if (u.acum > 0) { cifra = document.createElement('div'); cifra.appendChild(V.rotulo(signo + fmt(u.acum), color, ancho * 0.7, 11)); centro.appendChild(cifra); }
  const arr = u.tiradas > 1 ? 'Arriesgaste ' + (u.tiradas - 1) + (u.tiradas === 2 ? ' vez' : ' veces') : (quemo ? 'En la primera tirada' : 'Te plantaste a la primera');   // (el resumen del turno)
  const s = document.createElement('div'); s.className = 'rsub grande';
  s.textContent = quemo ? (u.motivo === 'explosion' ? 'Explotó un dado explosivo' : (u.motivo === 'pasado' ? 'Te pasabas de la meta' : 'Ningún dado puntúa')) : (jug ? 'Llevas ' + fmt(jug.total) + ' puntos' : '');
  if (s.textContent) centro.appendChild(s);
  if (u.tiradas > 0) { const r2 = document.createElement('div'); r2.className = 'rsub'; r2.textContent = arr; centro.appendChild(r2); }
  ov.hidden = false;
  if (!sinMovimiento()) {
    ov.querySelector('.rfondo').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
    titulo.animate([{ transform: 'scale(.3) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.18) rotate(1deg)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' });
    if (cifra) {
      const total = u.acum, t0 = performance.now();
      cifra.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, delay: 200, easing: 'ease-out', fill: 'backwards' });
      const paso = () => {
        if (ov.hidden) return;
        const k = Math.min(1, (performance.now() - t0 - 220) / 600);
        if (k >= 0) { cifra.textContent = ''; cifra.appendChild(V.rotulo(signo + fmt(Math.round(total * (1 - Math.pow(1 - k, 3)))), color, ancho * 0.7, 11)); }
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
    if (quemo) document.body.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 420 });
    else if (u.acum >= 500) confeti(ov, u.acum >= 1000 ? 46 : 26);
  }
  vista.timerResultado = setTimeout(ocultarResultado, 1500);
}

// Los puntos de lo que acabas de apartar, flotando sobre la mesa.
function flotaPuntosDM(e) {
  const t = e.turno; if (!t || e.turnoDe !== e.yo || !t.ultimaJugada || t.estado !== 'decidir') return;
  const k = t.rollId + ':' + t.acum;
  if (DM.flotaKey === k) return;
  DM.flotaKey = k;
  if (DM.primera || sinMovimiento() || !t.ultimaJugada.puntos) return;
  const f = document.createElement('div'); f.className = 'dmFlota'; f.textContent = '+' + fmt(t.ultimaJugada.puntos);
  $('dmMesa').appendChild(f);
  setTimeout(() => f.remove(), 1200);
}

// ---------- mis dados: los míos a la vista, y al tocar uno dice qué es ----------

function pintarMisDadosDM(e) {
  const caja = $('dmMis'), yo = jugDe(e, e.yo);
  if (!yo || !DM.catalogo) { caja.hidden = true; return; }
  // la fila muestra la cara que salió en cada uno de tus dados (recién cuando terminan de caer)
  if (!DM.animando) DM.misMostrados = DM.misValores.slice();
  const key = yo.dados.map((d, i) => d.tipo + ':' + (DM.misMostrados[i] || d.caras[0])).join();
  caja.hidden = false;
  if (DM.misKey === key) return;
  DM.misKey = key; DM.dadoSel = -1;
  const fila = $('dmMisFila');
  fila.textContent = '';
  yo.dados.forEach((d, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', NOMBRE_DADO(d.tipo));
    b.appendChild(D3.sprite(d.tipo, DM.misMostrados[i] || d.caras[0], 30));
    b.onclick = () => {
      Sonido.play('clic');
      const abre = DM.dadoSel !== i; DM.dadoSel = abre ? i : -1;
      fila.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', abre && j === i));
      if (!abre) { DM.aviso = ''; clearTimeout(DM.avisoT); if (DM.e) pintarInfoDM(DM.e); return; }
      const def = DM.catalogo.dados[d.tipo] || {};
      avisarDM(NOMBRE_DADO(d.tipo) + ': ' + (def.desc || 'sale cualquier cara del 1 al 6.'), 5000, 'info');   // (la descripción va en la línea de estado: no tapa los dados)
    };
    fila.appendChild(b);
  });
}

// ---------- la línea de información ----------

function pintarInfoDM(e) {
  const el = $('dmInfo'), t = e.turno;
  el.textContent = '';
  const add = (txt, clase) => { const s = document.createElement('span'); if (clase) s.className = clase; s.textContent = txt; el.appendChild(s); };
  if (DM.aviso) { add(DM.aviso, DM.avisoClase || 'mal'); return; }
  if (e.fase === 'espera') { add('Preparando la partida…'); return; }   // (la espera de una sala con amigos es otra pantalla: la sala)
  if (e.fase === 'tienda') { add('Tienda abierta: elige tus mejoras'); return; }
  if (e.fase === 'fin') { add('Fin de la partida'); return; }
  if (!t) return;
  const mio = e.turnoDe === e.yo, j = jugDe(e, e.turnoDe);
  const entrada = t.entrada || 500, falta = t.acum === 0 || j.entrado || t.acum >= entrada ? 0 : entrada - t.acum;
  if (e.ultimaVuelta !== null && e.ultimaVuelta !== undefined) add('Última vuelta · ', 'mal');
  if (e.modo === 'escalera') add('Etapa ' + e.etapa + ' · turno ' + (j.turnosEtapa + 1) + '/' + e.etapaTurnos + ' · ');
  else if (e.modo === 'carrera') add('Turno ' + (j.turnos + 1) + ' · ');
  if (mio) {
    if (t.estado === 'eleccion') add('Toma los dados de quien se quemó: ' + fmt(t.eleccion.acum) + ' puntos, ' + t.eleccion.n + ' dados');
    else {
      add('Acumulado '); add(fmt(t.acum), 'acum');
      if (t.estado === 'apartar') { const jug = jugadaElegida(e); if (jug) { add(' · suma +' + fmt(jug.puntos), 'bien'); } else add(' · elige lo que puntúa', 'mal'); }
      else if (t.estado === 'decidir') { if (falta) add(' · te faltan ' + fmt(falta) + ' para entrar', 'mal'); else add(' · ¿sigues o te plantas?'); }
      else if (t.estado === 'tirar') { add(' · ' + t.pool.length + (t.pool.length === 1 ? ' dado' : ' dados')); if (t.piedad) add(' · Piedad: no puedes quemarte', 'bien'); else if (!j.entrado && entrada < 500) add(' · Entras con ' + fmt(entrada), 'bien'); }
    }
  } else {
    add('Turno de ' + (j ? j.apodo : '?') + (t.acum ? ' · lleva ' : ''));
    if (t.acum) add(fmt(t.acum), 'acum');
    // lo que va apartando, con los dados de cada jugada (para entender qué pasa sin esperar a que se plante)
    const h = (t.historial || []).slice(-3);
    if (h.length && t.estado !== 'fin') {
      el.appendChild(document.createElement('br'));
      if ((t.historial || []).length > 3) add('… ');
      h.forEach(x => {
        const g = document.createElement('span'); g.className = 'dmHj';
        x.dados.forEach(d => { const c = D3.sprite(d.tipo, d.valor, 20); c.style.cssText = 'display:inline-block;vertical-align:middle;margin-right:1px;image-rendering:pixelated;width:20px;height:20px'; g.appendChild(c); });
        g.appendChild(document.createTextNode(' +' + fmt(x.puntos)));
        el.appendChild(g);
      });
    }
  }
}

// ---------- los botones de cada momento ----------

function pintarAccionesDM(e) {
  const t = e.turno, mio = e.turnoDe === e.yo && e.fase === 'turno' && t;
  const jug = mio && t.estado === 'apartar' ? jugadaElegida(e) : null;
  const key = JSON.stringify([e.fase, e.anfitrion === e.yo, e.yo, mio && t.estado, mio && t.acum, mio && t.puedePlantarse, mio && t.pool.length, jug && jug.puntos, jug && jug.prob, mio && t.prob, mio && t.espejos, mio && t.suertes, mio && t.apuesta, DM.animando, e.jugadores.length, mio && t.eleccion]);
  if (key === DM.accKey) return;
  DM.accKey = key;
  const caja = $('dmAcciones'); caja.textContent = '';
  const boton = (texto, fn, oro, deshab) => { const b = nuevoBoton(texto, fn, 2); if (oro) b.oro = true; if (deshab) b.disabled = true; caja.appendChild(b); return b; };
  if (DM.animando) return;
  if (e.fase === 'espera') return;
  if (!mio) {
    // fuera de tu turno: reacciones rápidas (un toque) en lugar de una barra vacía
    if (e.fase === 'turno' && e.jugadores.length > 1) {
      const fila = document.createElement('div'); fila.className = 'dmReaccionesFila';
      const et = document.createElement('div'); et.className = 'chico'; et.textContent = 'Turno de ' + nombreDe(e, e.turnoDe) + ' · reacciona';
      const bs = document.createElement('div'); bs.className = 'fila';
      REAC.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tileBtn reac'; b.setAttribute('aria-label', 'Reacción ' + x.t); b.appendChild(V.rotulo(x.t, x.c, 44, 3)); b.onclick = () => { Sonido.play('clic'); accionDM('reaccion', { r: i }); }; bs.appendChild(b); });
      fila.append(et, bs); caja.appendChild(fila);
    }
    return;
  }
  const estilo = t.estado;
  if (estilo === 'eleccion') {
    boton('Tomar los dados', () => accionDM('tomar', { si: true }), true);
    boton('Empezar de cero', () => accionDM('tomar', { si: false }));
  } else if (estilo === 'tirar') {
    ponerMedalla(boton('Tirar', () => accionDM('tirar'), true), t.prob);
    if (t.apuesta) boton('Apuesta: ' + t.apuesta, () => accionDM('apuesta', { v: t.apuesta === 'par' ? 'impar' : 'par' }));
  } else if (estilo === 'apartar') {
    const quedan = jug ? t.pool.length - jug.indices.length : 0, total = jug ? t.acum + jug.puntos : 0, yaEntro = (jugDe(e, e.yo) || {}).entrado;
    const sigue = luego => () => { const j = jugadaElegida(e); if (!j) return avisarDM('Esos dados no puntúan: elige los que sí'); accionDM('apartar', { indices: j.indices, luego }); };
    ponerMedalla(boton(jug ? 'Tirar ' + (quedan > 0 ? quedan : (DM.escena.dados.length)) + '' : 'Tirar', sigue('tirar'), true, !jug), jug ? jug.prob : null);
    if (jug) boton('Plantarte +' + fmt(total), sigue('plantarse'), false, !(yaEntro || total >= (t.entrada || 500)));
    if (t.espejos.length) boton('Voltear espejo', () => accionDM('voltear', { slot: t.espejos[0] }));
    if (t.suertes.length) boton('Tirar dado de la suerte', () => accionDM('voltear', { slot: t.suertes[0] }));
  } else if (estilo === 'decidir') {
    ponerMedalla(boton('Tirar ' + t.pool.length, () => accionDM('tirar'), true), t.prob);
    boton('Plantarte +' + fmt(t.acum), () => accionDM('plantarse'), false, !t.puedePlantarse);
    if (t.apuesta) boton('Apuesta: ' + t.apuesta, () => accionDM('apuesta', { v: t.apuesta === 'par' ? 'impar' : 'par' }));
  } else if (estilo === 'quemada') {
    if (t.espejos.length) boton('Voltear espejo', () => accionDM('voltear', { slot: t.espejos[0] }), true);
    if (t.suertes.length) boton('Tirar dado de la suerte', () => accionDM('voltear', { slot: t.suertes[0] }), !t.espejos.length);
  }
  // los objetos contra otros: se usan en cualquier momento
  if (e.hostil && e.mio && e.mio.objetos.length && e.jugadores.length > 1 && e.fase === 'turno') {
    e.mio.objetos.forEach((id, i) => {
      const o = DM.catalogo && DM.catalogo.objetos[id];
      boton(o ? o.nombre : id, () => usarObjetoDM(i, id), false);
    });
  }
}
function usarObjetoDM(indice, id) {
  const e = DM.e; if (!e) return;
  const otros = e.jugadores.filter(j => j.asiento !== e.yo);
  if (otros.length === 1) { accionDM('usar', { indice, objetivo: otros[0].asiento }); return; }
  const c = $('dmFinal').querySelector('.caja'); c.textContent = '';
  const h = document.createElement('h3'); h.textContent = (DM.catalogo.objetos[id] || {}).nombre + ': ¿contra quién?';
  const lista = document.createElement('div'); lista.className = 'dmElegir';
  otros.forEach(j => { const b = document.createElement('button'); b.type = 'button'; b.textContent = j.apodo + ' (' + fmt(j.total) + ')'; b.onclick = () => { $('dmFinal').hidden = true; accionDM('usar', { indice, objetivo: j.asiento }); }; lista.appendChild(b); });
  c.append(h, lista, nuevoBoton('Cancelar', () => { $('dmFinal').hidden = true; }));
  DM.finKey = 'objeto'; $('dmFinal').hidden = false;
}

// ---------- la tienda ----------

function sprites(dados, alElegir, marcado) {
  const fila = document.createElement('div'); fila.className = 'dmElegir';
  dados.forEach((d, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = marcado === i ? 'on' : '';
    b.appendChild(D3.sprite(d.tipo, d.caras[0], 40));
    const n = document.createElement('span'); n.textContent = NOMBRE_DADO(d.tipo).replace('Dado ', ''); b.appendChild(n);
    b.onclick = () => alElegir(i);
    fila.appendChild(b);
  });
  return fila;
}
function tiendaDM(e) {
  const m = $('dmTienda');
  if (e.fase !== 'tienda' || !e.mio) { if (!m.hidden) m.hidden = true; DM.tiendaKey = ''; DM.paso = null; return; }
  const yo = jugDe(e, e.yo);
  const k = JSON.stringify([e.mio.oferta, yo.fichas, yo.dados, e.mio.listo, DM.paso]);
  if (k === DM.tiendaKey && !m.hidden) return;
  DM.tiendaKey = k;
  const caja = m.querySelector('.caja'); caja.textContent = '';
  const h = document.createElement('h3'); h.textContent = 'Tienda · tienes ' + yo.fichas + ' fichas'; caja.appendChild(h);
  const tiempo = document.createElement('div'); tiempo.className = 'barra'; const ti = document.createElement('div'); ti.id = 'dmBarraT'; tiempo.appendChild(ti); caja.appendChild(tiempo);
  const paso = DM.paso;
  if (paso) { pasoCompra(caja, e, yo, paso); }
  else {
    const lista = document.createElement('div'); lista.className = 'dmOfertas';
    e.mio.oferta.forEach((o, i) => lista.appendChild(ofertaDM(e, yo, o, i)));
    caja.appendChild(lista);
    caja.appendChild(nuevoBoton(e.mio.listo ? 'Esperando a los demás…' : 'Listo', () => accionDM('listo'), 2));
  }
  if (m.hidden) { m.hidden = false; if (!DM.primera) Sonido.play('tienda'); }
}
function infoOferta(o) {
  const cat = DM.catalogo; const t = cat && cat.dados[o.id];
  if (o.tipo === 'dado') return { nombre: NOMBRE_DADO(o.id), desc: t ? t.desc : '', icono: D3.sprite(o.id, 5, 44) };
  if (o.tipo === 'sexto') return { nombre: 'Sexto dado', desc: 'Tiras con 6 dados.', icono: D3.sprite('normal', 6, 44) };
  if (o.tipo === 'grabado') return { nombre: 'Grabado', desc: 'Cambia una cara de un dado (30 a 100 fichas).', icono: D3.sprite('normal', 3, 44) };
  const ob = cat && cat.objetos[o.id] || {};
  return { nombre: ob.nombre || o.id, desc: ob.desc || '', icono: D3.sprite('explosivo', 1, 44) };
}
function ofertaDM(e, yo, o, i) {
  const info = infoOferta(o);
  const d = document.createElement('div'); d.className = 'dmOferta' + (o.comprada ? ' comprada' : '');
  const tx = document.createElement('div'); const n = document.createElement('div'); n.className = 'nom'; n.textContent = info.nombre; const ds = document.createElement('div'); ds.className = 'desc'; ds.textContent = info.desc; tx.append(n, ds);
  const der = document.createElement('div'); const p = document.createElement('div'); p.className = 'precio'; p.textContent = (o.tipo === 'grabado' ? 'desde 30' : o.precio);
  const compra = () => {
    if (o.tipo === 'dado') DM.paso = { tipo: 'dado', i, o };
    else if (o.tipo === 'grabado') DM.paso = { tipo: 'grabado', i, o, slot: null, cara: null };
    else { const rect = d.getBoundingClientRect(); return accionDM('comprar', { indice: i }).then(r => { if (r.ok) { Sonido.play('comprar'); destelloCompra(rect, o.precio); } }); }
    DM.tiendaKey = ''; tiendaDM(DM.e);
  };
  const barato = o.tipo === 'grabado' ? 30 : o.precio;
  const b = nuevoBoton(o.comprada ? 'Comprado' : 'Comprar', compra, 1.3);
  if (o.comprada || yo.fichas < barato) b.disabled = true;
  der.append(p, b);
  d.append(info.icono, tx, der);
  return d;
}
function pasoCompra(caja, e, yo, paso) {
  const t = document.createElement('p'); t.className = 'nota'; caja.appendChild(t);
  const volver = nuevoBoton('Volver', () => { DM.paso = null; DM.tiendaKey = ''; tiendaDM(DM.e); }, 1.5);
  if (paso.tipo === 'dado') {
    t.textContent = '¿Qué dado reemplazas por ' + NOMBRE_DADO(paso.o.id).toLowerCase() + '? (' + paso.o.precio + ' fichas)';
    caja.appendChild(sprites(yo.dados, async i => { const r = await accionDM('comprar', { indice: paso.i, slot: i }); if (r.ok) { Sonido.play('comprar'); DM.paso = null; DM.tiendaKey = ''; } }));
  } else if (paso.slot === null) {
    t.textContent = 'Grabado: ¿qué dado quieres modificar?';
    caja.appendChild(sprites(yo.dados, i => { paso.slot = i; DM.tiendaKey = ''; tiendaDM(DM.e); }));
  } else if (paso.cara === null) {
    t.textContent = '¿Qué cara cambias?';
    const fila = document.createElement('div'); fila.className = 'dmElegir';
    yo.dados[paso.slot].caras.forEach((v, c) => { const b = document.createElement('button'); b.type = 'button'; b.appendChild(D3.sprite(yo.dados[paso.slot].tipo, v, 40)); b.onclick = () => { paso.cara = c; DM.tiendaKey = ''; tiendaDM(DM.e); }; fila.appendChild(b); });
    caja.appendChild(fila);
  } else {
    const actual = yo.dados[paso.slot].caras[paso.cara];
    t.textContent = 'La cara que dice ' + actual + ' pasa a decir…';
    const fila = document.createElement('div'); fila.className = 'dmElegir';
    for (let v = 1; v <= 6; v++) {
      if (v === actual) continue;
      const precio = v === 1 ? 100 : (v === 5 ? 60 : 30);
      const b = document.createElement('button'); b.type = 'button'; b.appendChild(D3.sprite(yo.dados[paso.slot].tipo, v, 40));
      const s = document.createElement('span'); s.textContent = precio + ' fichas'; b.appendChild(s);
      b.disabled = yo.fichas < precio; if (b.disabled) b.style.opacity = '.4';
      b.onclick = async () => { const r = await accionDM('comprar', { indice: paso.i, slot: paso.slot, cara: paso.cara, valor: v }); if (r.ok) { Sonido.play('comprar'); DM.paso = null; DM.tiendaKey = ''; } };
      fila.appendChild(b);
    }
    caja.appendChild(fila);
  }
  caja.appendChild(volver);
}

// ---------- el final ----------

// La imagen del ranking para compartir: igual a la ventana del final (el título, el resumen y una fila por jugador, una pegada a la otra).
function imagenRankingDM(f, e) {
  const W = IMG.ancho, P = 44, G = 18, FILA = 66;
  const tx = DM.finTexto || { titulo: '', sub: '' };
  const filas = f.ranking.slice(0, 8), emp = infoEmpateFin(f, e.yo);
  let H = 22 + P - 10 + 18 + 12 + 36 + 10 + (tx.sub ? 26 + 8 : 0) + G + filas.length * FILA + G + 18 + P - 10;
  const { cv, ctx } = imgLienzo(H);
  let y = 22 + P - 10;
  y += 16; imgTexto(ctx, 'DIEZ MIL · LUCID STAKES', W / 2, y, 16, '#a99cc9', 'center'); y += 12;
  y += 36; imgTexto(ctx, imgRecortar(ctx, tx.titulo, 34, W - 2 * P, 700), W / 2, y, 34, '#fff3c4', 'center', 700); y += 10;
  if (tx.sub) { y += 26; imgTexto(ctx, imgRecortar(ctx, tx.sub, 20, W - 2 * P), W / 2, y, 20, '#d9cfff', 'center'); y += 8; }
  y += G;
  filas.forEach((r, i) => {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; ctx.fillRect(P, y, W - 2 * P, FILA);
    if (emp.lider(i) && f.modo === 'multi') { ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 3; ctx.strokeRect(P + 1.5, y + 1.5, W - 2 * P - 3, FILA - 3); }
    imgTexto(ctx, String(emp.puesto(i)), P + 22, y + 42, 28, emp.lider(i) ? '#f2c94c' : '#a99cc9', 'center', 700);
    imgTexto(ctx, imgRecortar(ctx, r.apodo, 26, W - 2 * P - 230, 700), P + 56, y + 31, 26, '#fff3c4', 'left', 700);
    imgTexto(ctx, imgRecortar(ctx, r.quemadas + ' quemadas · mejor turno ' + fmt(r.mejorTurno), 16, W - 2 * P - 230), P + 56, y + 54, 16, '#a99cc9', 'left');
    imgTexto(ctx, fmt(r.total), W - P - 16, y + 43, 30, '#f2c94c', 'right', 700);
    y += FILA;
  });
  y += G + 18; imgTexto(ctx, 'SALA ' + (sala || '') + ' · ' + new Date().toLocaleDateString(), W / 2, y, 15, '#a99cc9', 'center');
  return cv;
}

function finalDM(e) {
  const m = $('dmFinal');
  if (typeof Tut !== 'undefined' && Tut.activo) return;   // (en el tutorial, el cierre lo da el guion)
  if (e.fase !== 'fin' || !e.fin) { if (!m.hidden && DM.finKey !== 'objeto') m.hidden = true; if (e.fase !== 'fin' && DM.finKey && DM.finKey !== 'objeto') DM.finKey = ''; return; }
  const f = e.fin, k = JSON.stringify(f);
  if (k === DM.finKey && !m.hidden) return;
  const nuevo = DM.finKey !== k; DM.finKey = k;
  if (nuevo) Estadisticas.guardar(Estadisticas.registrarDM(Estadisticas.leer(), f, e.yo, sala, Date.now()));   // (suma esta partida a las estadísticas del dispositivo, una sola vez)
  const emp = infoEmpateFin(f, e.yo), yoGane = emp.gane;
  const caja = m.querySelector('.caja'); caja.textContent = '';
  caja.classList.add('dmFin');
  let titulo = '', sub = '';
  if (f.modo === 'carrera') {
    titulo = '¡Llegaste a ' + fmt(f.meta) + '!'; sub = 'En ' + f.ganador.turnos + ' turnos';
    const kRec = 'bj_dm_carrera' + (f.meta && f.meta !== 10000 ? '_' + f.meta : '');   // (el récord de la meta corta va aparte)
    const rec = Number(guardado(kRec) || 0);
    const auto = (f.ganador && f.ganador.automaticos) || 0;
    if (auto > 0) sub += ' · sin récord: el servidor jugó ' + auto + (auto === 1 ? ' turno' : ' turnos');
    else if (nuevo && f.motivo === 'meta' && (!rec || f.ganador.turnos < rec)) { guardado(kRec, String(f.ganador.turnos)); sub += ' · ¡nuevo récord!' + (rec ? ' (antes ' + rec + ')' : ''); }
    else if (rec) sub += ' · tu récord: ' + rec + ' turnos';
  } else if (f.modo === 'escalera') {
    titulo = 'Se acabó la escalera'; sub = 'Llegaste hasta la etapa ' + f.etapa + ' (meta ' + fmt(f.meta) + ')';
    const rec = Number(guardado('bj_dm_escalera') || 0);
    if (nuevo && f.etapa > rec) { guardado('bj_dm_escalera', String(f.etapa)); sub += ' · ¡nuevo récord!'; }
    else if (rec) sub += ' · tu récord: etapa ' + rec;
  } else if (f.motivo === 'abandono') { titulo = 'La partida terminó'; sub = ''; }
  else { titulo = emp.empate ? emp.titulo : (yoGane ? '¡Ganaste!' : 'Ganó ' + (f.ganador ? f.ganador.apodo : '?')); sub = f.ganador ? (emp.empate ? 'Todos llegaron justo a ' : 'Llegó justo a ') + fmt(f.meta) : ''; }
  DM.finTexto = { titulo, sub };   // (la imagen de compartir usa los mismos textos)
  const h = document.createElement('h3'); h.textContent = titulo; caja.appendChild(h);
  if (sub) { const s = document.createElement('p'); s.className = 'nota'; s.textContent = sub; caja.appendChild(s); }
  f.ranking.forEach((r, i) => {
    const fila = document.createElement('div'); fila.className = 'filaR' + (emp.lider(i) && f.modo === 'multi' ? ' lider' : '');
    const a = document.createElement('div'); a.textContent = String(emp.puesto(i));
    const b = document.createElement('div'); const nom = document.createElement('div'); ponerNombre(nom, (r.asiento === e.yo ? '★ ' : '') + r.apodo, r.bot); const det = document.createElement('div'); det.className = 'chico'; det.textContent = r.quemadas + ' quemadas · mejor turno ' + fmt(r.mejorTurno); b.append(nom, det);
    const c = document.createElement('div'); c.className = 'dorado'; c.textContent = fmt(r.total);
    fila.append(a, b, c); caja.appendChild(fila);
  });
  const bot = document.createElement('div'); bot.className = 'botonesFin';
  bot.append(nuevoBoton('Nueva partida', () => accionDM('nueva'), 1.7), nuevoBoton('Compartir', () => compartirImagen(() => imagenRankingDM(f, e), 'ranking-diezmil.png', 'Diez mil · Lucid Stakes', f.modo === 'multi' ? 'Así quedó la partida' : 'Mi partida de Diez mil'), 1.7), nuevoBoton('Salir', async () => { await accion('salir'); volverAlInicio(''); }, 1.7));
  caja.appendChild(bot);
  m.hidden = false;
  if (nuevo && !DM.primera) Sonido.play(yoGane || f.modo !== 'multi' ? 'victoria' : 'perder');
}

// ---------- avisos del servidor y reacciones ----------

function avisosDM(e) {
  const mayor = e.contadorAvisos || 0;
  if (DM.avisoVisto === undefined || mayor < DM.avisoVisto) { DM.avisoVisto = mayor; return; }
  const nuevos = e.avisos.filter(a => a.id > DM.avisoVisto); DM.avisoVisto = mayor;
  if (DM.primera || document.hidden) return;
  nuevos.forEach(a => {
    let texto = '';
    if (a.tipo === 'tomo') texto = nombreDe(e, a.de) + (a.de === e.yo ? ' tomaste' : ' tomó') + ' los dados con ' + fmt(a.acum) + ' puntos';
    else if (a.tipo === 'vampiro') texto = nombreDe(e, a.de) + (a.de === e.yo ? ' le robaste ' : ' le robó ') + a.puntos + ' puntos a ' + (a.a === e.yo ? 'ti' : nombreDe(e, a.a));
    else if (a.tipo === 'ultima') texto = '¡' + (a.de === e.yo ? 'Llegaste' : nombreDe(e, a.de) + ' llegó') + ' a la meta! Los demás juegan su último turno';
    else if (a.tipo === 'etapa') texto = '¡Etapa ' + a.etapa + ' superada! Sube la meta';
    else if (a.tipo === 'objeto') { const o = DM.catalogo && DM.catalogo.objetos[a.obj]; texto = nombreDe(e, a.de) + (a.de === e.yo ? ' usaste ' : ' usó ') + (o ? o.nombre : a.obj) + ' contra ' + (a.a === e.yo ? 'ti' : nombreDe(e, a.a)); }
    if (!texto) return;
    const cont = $('avisos'); while (cont.children.length >= 3) cont.firstChild.remove();
    const d = document.createElement('div'); d.className = 'avisoObj'; const s = document.createElement('span'); s.textContent = texto; d.appendChild(s); cont.appendChild(d);
    Sonido.play(a.tipo === 'etapa' ? 'tienda' : 'usar');
    setTimeout(() => d.remove(), 3600);
  });
}
function reaccionesDM(e) {
  const mayor = e.contadorReacciones || 0;
  if (DM.reacVisto === undefined || mayor < DM.reacVisto) { DM.reacVisto = mayor; return; }
  const nuevas = e.reacciones.filter(x => x.id > DM.reacVisto); DM.reacVisto = mayor;
  if (sinMovimiento()) return;
  nuevas.forEach(x => {
    const el = document.querySelector('.dmJ[data-asiento="' + x.asiento + '"]'), d = REAC[x.r];
    if (!el || !d) return;
    const r = el.getBoundingClientRect(), g = document.createElement('div'); g.className = 'dmGlobo';
    g.appendChild(V.rotulo(d.t, d.c, 90, 6));
    g.style.left = (r.left + r.width / 2) + 'px'; g.style.top = (r.top + r.height / 2) + 'px';   // (sobre la casilla del jugador)
    document.body.appendChild(g);
    g.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: .2 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .75 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 2200, easing: 'ease-out' }).onfinish = () => g.remove();
    if (x.asiento !== e.yo) Sonido.play('roce');
  });
}

// ---------- el reloj ----------

function relojDM(e) {
  const t = e.turno;
  const b = $('dmBarra');
  if (b) {
    const total = e.fase === 'turno' && t && e.limite && !e.sinTiempo ? ((e.tiempos || {})[t.estado] || 0) : 0;
    const quedan = total ? e.limite - ahora() : 0;
    b.style.width = total ? Math.max(0, Math.min(100, quedan / total * 100)) + '%' : '0%';
    const apura = total > 0 && quedan > 0 && quedan <= 5000 && e.turnoDe === e.yo && t.estado !== 'quemada';
    b.classList.toggle('apura', apura);
    if (apura) { $('dmInfo').textContent = 'Quedan ' + Math.ceil(quedan / 1000) + ' s: jugaremos por ti'; DM.avisoTiempo = true; }
    else if (DM.avisoTiempo) { DM.avisoTiempo = false; pintarInfoDM(e); }
    const seg = Math.ceil(quedan / 1000);
    if (apura && seg !== DM.ultimoTick) { DM.ultimoTick = seg; if (!document.hidden) Sonido.play('tic'); }
    if (!apura) DM.ultimoTick = null;
  }
  const q = $('dmBarraQ'); if (q && e.limite) q.style.width = Math.max(0, Math.min(100, (e.limite - ahora()) / 5000 * 100)) + '%';
  const tb = $('dmBarraT'); if (tb && e.limite) tb.style.width = Math.max(0, Math.min(100, (e.limite - ahora()) / 30000 * 100)) + '%';
  void t;
}
