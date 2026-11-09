'use strict';
// La pantalla del 13 Jack: los jugadores, tu mazo de 13 cartas a la vista, la mano en juego, el resumen de cada mazo, la tienda de cartas especiales y el final.
// Todo lo decide el servidor (servidor/trecejack/mesa_13.js); aquí solo se muestra y se envían acciones. Se carga después de comun.js y diezmil.js (usa $, api, accion, token, sala, ahora, nuevoBoton, fmt, jugDe, nombreDe...).

const TJ = {
  e: null, catalogo: null, jugKey: '', accKey: '', mazoKey: '', manoKey: '', cartelKey: '', resumenKey: '', tiendaKey: '', finKey: '', verKey: '', verAsiento: null, verCarta: -1,
  primera: true, tardioDicho: false, miTurnoAntes: false, totalPrev: 0, manoIdPrev: -1, avisoTiempo: false, manoPrev: -1, cartasPrev: 0, ultimaManoVista: -1, reacVisto: undefined, aviso: '', avisoT: 0, selOferta: -1, selLugar: -1, ultimoTick: null,
};
fetch('/api/catalogo').then(r => r.json()).then(d => { TJ.catalogo = d.trecejack; if (TJ.e) pintarTJ(TJ.e); }).catch(() => {});
// El color propio de cada carta especial (fondo y borde), como el de los dados.
const COLOR_ESP_TJ = {   // f = fondo, b = borde: cada carta mezcla dos colores
  oro: { f: [1.0, 0.82, 0.3], b: [0.5, 0.28, 0.06] }, comodin: { f: [0.7, 0.5, 0.95], b: [0.4, 0.8, 0.25] }, salvavidas: { f: [0.45, 0.9, 0.6], b: [0.9, 0.25, 0.25] },
  pegajosa: { f: [0.98, 0.65, 0.25], b: [0.2, 0.4, 0.85] }, doble: { f: [0.95, 0.55, 0.8], b: [0.4, 0.15, 0.55] }, vidente: { f: [0.3, 0.8, 0.85], b: [0.1, 0.15, 0.45] },
  espejo: { f: [0.75, 0.88, 1.0], b: [0.5, 0.55, 0.65] }, fantasma: { f: [0.85, 0.88, 0.97], b: [0.55, 0.4, 0.8] }, multiplicador: { f: [0.95, 0.45, 0.35], b: [1.0, 0.8, 0.2] },
  ancla: { f: [0.5, 0.65, 0.8], b: [0.2, 0.25, 0.3] }, camaleon: { f: [0.7, 0.9, 0.35], b: [0.85, 0.25, 0.7] }, borrador: { f: [0.98, 0.75, 0.75], b: [0.45, 0.45, 0.5] },
  diamante: { f: [0.6, 0.95, 1.0], b: [0.15, 0.45, 0.9] }, cofre: { f: [0.8, 0.6, 0.3], b: [0.1, 0.4, 0.25] }, racha: { f: [1.0, 0.55, 0.2], b: [0.6, 0.1, 0.1] },
  adelanto: { f: [0.65, 0.95, 0.55], b: [0.1, 0.5, 0.5] }, mecenas: { f: [0.9, 0.85, 0.4], b: [0.15, 0.55, 0.25] }, ruleta: { f: [0.95, 0.9, 0.9], b: [0.8, 0.1, 0.15] },
  retroceso: { f: [0.8, 0.75, 1.0], b: [0.95, 0.5, 0.1] },
};
const ETIQUETA_TJ = { oro: 'ORO', comodin: 'COMODÍN', salvavidas: 'SALV.', pegajosa: 'PEGAJ.', doble: 'DOBLE', vidente: 'VIDENTE', espejo: 'ESPEJO', fantasma: 'FANT.', multiplicador: 'x1,25', ancla: 'ANCLA', camaleon: 'CAMAL.', borrador: 'BORRA.', diamante: 'DIAM.', cofre: 'COFRE', racha: 'RACHA', adelanto: 'ADEL.', mecenas: 'MECEN.', ruleta: 'RULETA', retroceso: 'RETRO.' };
const NOMBRE_RANGO = r => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[r] || String(r));
const especialTJ = t => (TJ.catalogo && TJ.catalogo.especiales[t]) || { nombre: t, desc: '', precio: 0 };

// ---------- abrir y cerrar ----------

function abrirTJ() {
  if (!TJ.listo) {
    TJ.listo = true;
    $('tAyuda').appendChild(V.interrogante()); $('tAyuda').onclick = abrirAyuda;
    $('tInvitar').appendChild(V.invitar()); $('tInvitar').onclick = abrirInvitar;
    $('tSalir').appendChild(V.puerta()); $('tSalir').onclick = confirmarSalir;
    window.addEventListener('resize', () => { clearTimeout(TJ.tRes); TJ.tRes = setTimeout(() => { TJ.manoKey = ''; TJ.mazoKey = ''; if (TJ.e) { pintarManoTJ(TJ.e); pintarMazoTJ(TJ.e); } }, 120); });
    $('tSonido').onclick = () => { Sonido.setActivo(!Sonido.activo); pintarSonidoTJ(); Sonido.play('clic'); };
    $('tjJugador').addEventListener('click', ev => { if (ev.target === $('tjJugador')) cerrarJugadorTJ(); });
  }
  pintarSonidoTJ();
  Object.assign(TJ, { e: null, jugKey: '', accKey: '', mazoKey: '', manoKey: '', cartelKey: '', resumenKey: '', tiendaKey: '', finKey: '', verKey: '', verAsiento: null, primera: true, tardioDicho: false, miTurnoAntes: false, totalPrev: 0, manoIdPrev: -1, avisoTiempo: false, manoPrev: -1, cartasPrev: 0, ultimaManoVista: -1, reacVisto: undefined, selOferta: -1, selLugar: -1 });
}
function pintarSonidoTJ() {
  const b = $('tSonido'); b.textContent = '';
  b.appendChild(V.parlante(Sonido.activo));
  b.title = Sonido.activo ? 'Sonido activado' : 'Sin sonido';
}
function limpiarTJ() {
  TJ.e = null;
  for (const id of ['tjResumen', 'tjTienda', 'tjFinal', 'tjJugador']) $(id).hidden = true;
  for (const id of ['tjJugadores', 'tjMano', 'tjMazo', 'tjAcciones', 'tjInfo', 'tjTotal']) $(id).textContent = '';
  $('tjCartel').hidden = true;
}
function avisarTJ(texto, ms = 2600, clase) { TJ.avisoClase = clase || 'mal'; TJ.aviso = texto; clearTimeout(TJ.avisoT); TJ.avisoT = setTimeout(() => { TJ.aviso = ''; if (TJ.e) pintarInfoTJ(TJ.e); }, ms); if (TJ.e) pintarInfoTJ(TJ.e); }
async function accionTJ(nombre, extra) {
  try {
    const r = await api('/api/accion', Object.assign({ sala, token, accion: nombre }, extra || {}));
    if (!r.ok) avisarTJ(r.error, 3200);
    return r;
  } catch (err) { avisarTJ('No se pudo enviar, intenta de nuevo'); return { ok: false }; }
}

// ---------- una carta dibujada (con su marca si es especial) ----------

function cartaTJ(r, e, ancho, apagada, tapada, p, v) {
  const d = document.createElement('div'); d.className = 'tjCarta' + (e ? ' esp' : '') + (apagada ? ' apagada' : '');
  const cv = tapada ? V.cartaCanvas(1, 0, true) : V.cartaCanvas(r, p === undefined || p === null ? r % 4 : p, false, e ? COLOR_ESP_TJ[e] : null); cv.style.width = ancho + 'px'; cv.style.height = 'auto';
  d.appendChild(cv);
  if (e) { const b = document.createElement('span'); b.className = 'tjEtq'; b.textContent = e === 'ruleta' && v ? '= ' + v : (ETIQUETA_TJ[e] || e); d.appendChild(b); }
  return d;
}
const filaCartasTJ = (cartas, ancho) => { const f = document.createElement('div'); f.className = 'tjFilaCartas'; cartas.forEach(c => f.appendChild(cartaTJ(c.r, c.e, ancho, false, false, c.p, c.v))); return f; };

// Los 13 lugares de un mazo: las que quedan encendidas, las usadas apagadas, y las especiales con su marca. `alTocar(carta)` se llama al tocar una especial.
function mazoTJ(cartas, ancho, alTocar) {
  const g = document.createElement('div'); g.className = 'tjGridMazo';
  cartas.forEach(c => {
    const d = cartaTJ(c.r, c.e, ancho, !c.quedan, false, c.p);
    if (c.enMano) d.classList.add('enMano');
    if (c.e && alTocar) { d.onclick = () => { Sonido.play('clic'); alTocar(c); }; d.style.cursor = 'pointer'; }
    g.appendChild(d);
  });
  return g;
}

// ---------- el estado ----------

function pintarTJ(e) {
  TJ.e = e;
  $('tSala').textContent = sala; $('tClave').textContent = e.clave ? 'clave ' + e.clave : '';
  $('tMazo').textContent = e.fase === 'espera' || e.fase === 'fin' ? '' : '· mazo ' + e.mazoN + (e.objetivo === 'puntos' ? ' · meta ' + e.metaPuntos : '/' + e.mazos);   // (el mazo va en la cabecera: así la línea de abajo queda corta)
  pintarJugadoresTJ(e);
  refrescarJugadorTJ(e);
  $('tInvitar').hidden = e.modo !== 'multi';
  pintarManoTJ(e);
  pintarMazoTJ(e);
  pintarCartelTJ(e);
  flotaPuntosTJ(e);
  pintarInfoTJ(e);
  pintarAccionesTJ(e);
  resumenTJ(e);
  tiendaTJ(e);
  finalTJ(e);
  reaccionesTJ(e);
  sonidosTJ(e);
  const yoJ = jugDe(e, e.yo);
  if (yoJ && yoJ.tardio && !TJ.tardioDicho && e.fase !== 'espera') { TJ.tardioDicho = true; avisarTJ('Partida en curso: juegas cuando te toque', 6000, 'bien'); }
  // mi turno: un sonido (y una vibración) al empezar
  const mio = e.fase === 'turno' && e.turnoDe === e.yo && e.turno && !e.turno.terminada && e.turno.mano.length === 0;
  if (mio && TJ.miTurnoAntes !== true && !TJ.primera) { Sonido.play('turno'); try { navigator.vibrate && navigator.vibrate(100); } catch (x) { /* sin vibración */ } }
  TJ.miTurnoAntes = mio;
  TJ.primera = false;
}

function pintarJugadoresTJ(e) {
  const k = JSON.stringify([e.turnoDe, e.fase, e.jugadores.map(j => [j.asiento, j.apodo, j.total, j.fichas, j.conectado, j.cartas.map(c => (c.quedan ? 1 : 0) + (c.e || '')).join(''), j.manosJugadas])]);
  if (k === TJ.jugKey) return;
  TJ.jugKey = k;
  const caja = $('tjJugadores'); caja.textContent = '';
  caja.classList.toggle('compacto', e.jugadores.length > 3);
  caja.dataset.n = String(e.jugadores.length);   // (5 y 6 jugadores van de a 3 por renglón; 7 y 8, de a 4: quedan parejos y centrados)
  e.jugadores.forEach(j => {
    const d = document.createElement('div'); d.className = 'dmJ' + (j.asiento === e.turnoDe && e.fase === 'turno' ? ' turno' : '') + (j.asiento === e.yo ? ' soy' : '') + (j.conectado ? '' : ' off'); d.dataset.asiento = j.asiento;
    const n = document.createElement('div'); n.className = 'dmNombre'; ponerNombre(n, j.apodo, j.bot);
    const t = document.createElement('div'); t.className = 'dmTotal'; t.textContent = String(j.total);
    const mini = document.createElement('div'); mini.className = 'dmDadosMini tjMini';
    j.cartas.forEach(c => { const s = document.createElement('span'); s.className = (c.quedan ? 'q' : 'u') + (c.e ? ' e' : ''); mini.appendChild(s); });
    const f = document.createElement('div'); f.className = 'dmFichas'; f.textContent = j.fichas + ' fichas';
    d.append(n, t, mini, f);
    d.style.cursor = 'pointer'; d.onclick = () => abrirJugadorTJ(j.asiento);
    caja.appendChild(d);
  });
}

// La mano en juego (la del jugador al que le toca), con la carta nueva animada.
function pintarManoTJ(e) {
  const t = e.turno, caja = $('tjMano');
  const conCartel = hayCartelTJ(e), k = JSON.stringify([e.fase, t && t.de, t && t.mano, t && t.terminada, t && t.proxima, t && t.patrones, $('tjMesa').clientHeight, $('tjMesa').clientWidth, conCartel]);
  if (k === TJ.manoKey) return;
  TJ.manoKey = k;
  caja.textContent = ''; $('tjTotal').textContent = '';
  $('tjMesa').classList.toggle('conCartel', conCartel);
  if (!t) return;
  const mesaEl = $('tjMesa'), alto = (mesaEl.clientHeight || 160) - (conCartel ? 64 : 0), n = Math.max(3, t.mano.length), porAlto = Math.floor((alto - (t.patrones && t.patrones.length && !conCartel ? 56 : 24)) / 1.4), porAncho = Math.floor(((mesaEl.clientWidth || 320) - 118 - (n - 1) * 6) / n);
  const ancho = Math.max(26, Math.min(window.matchMedia('(max-width: 700px)').matches ? 68 : 84, porAlto, porAncho));   // (las cartas se achican si la mesa es baja, para que entren con el total y los patrones)
  const previas = t.manoId === TJ.manoPrev ? TJ.cartasPrev : 0;
  t.mano.forEach((c, i) => {
    const d = cartaTJ(c.r, c.e, ancho, false, false, c.p, c.v);
    if (i >= previas && !TJ.primera && !sinMovimiento()) d.animate([{ transform: 'translateY(-40px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    caja.appendChild(d);
  });
  if (t.proxima) { const p = document.createElement('div'); p.className = 'tjProxima'; const et = document.createElement('span'); et.textContent = 'Sigue'; p.append(et, cartaTJ(t.proxima.r, t.proxima.e, 40, false, false, t.proxima.p)); caja.appendChild(p); }
  TJ.manoPrev = t.manoId; TJ.cartasPrev = t.mano.length;
  if (t.mano.length) {
    const tt = $('tjTotal'); tt.textContent = String(t.total);
    tt.className = 'tjTotal' + (t.pasado ? ' pasado' : (t.total === 21 ? ' veintiuno' : ''));
    if (t.patrones && t.patrones.length && !conCartel) { const ch = document.createElement('div'); ch.className = 'tjPatrones'; t.patrones.forEach(x => { const s = document.createElement('span'); s.textContent = x.nombre + ' +' + x.puntos; ch.appendChild(s); }); caja.appendChild(ch); }   // (los patrones que ya tiene la mano)
  }
}

// Tu mazo, siempre a la vista: qué cartas te quedan.
function pintarMazoTJ(e) {
  const yo = jugDe(e, e.yo), caja = $('tjMazo');
  if (!yo) { caja.textContent = ''; return; }
  const k = JSON.stringify([window.innerHeight < 700, yo.cartas.map(c => [c.quedan, c.enMano, c.e])]);
  if (k === TJ.mazoKey) return;
  TJ.mazoKey = k;
  caja.textContent = '';
  const et = document.createElement('div'); et.className = 'tjEtqMazo'; et.textContent = 'Tu mazo · quedan ' + yo.quedan + ' de 13';
  caja.append(et, mazoTJ(yo.cartas, window.innerHeight < 700 ? 30 : 40, c => { const d = especialTJ(c.e); avisarTJ(d.nombre + ': ' + d.desc, 5000, 'info'); }));
}

// El cartel con cómo terminó la última mano (la de otro jugador; lo propio se ve en la mano).
function pintarCartelTJ(e) {
  const c = $('tjCartel'), u = e.ultimaMano, t = e.turno;
  c.hidden = true;
  if (!(e.fase === 'turno' && t && t.terminada && u)) { TJ.cartelKey = ''; return; }
  const k = String(u.id);
  if (u.asiento === e.yo) { if (k !== TJ.cartelKey) { TJ.cartelKey = k; if (!TJ.primera) cartelGrandeTJ(e, u); } return; }   // (lo propio va con el cartel grande)
  TJ.cartelKey = k;
  const quien = nombreDe(e, u.asiento);
  c.className = 'dmCartel ' + (u.pasado ? 'malo' : 'bueno'); c.textContent = '';
  const b = document.createElement('b'); b.textContent = u.pasado ? '¡' + quien + ' se pasó!' : (u.total === 21 ? '¡' + quien + ' hizo 21!' : quien + ' se plantó') + ': +' + u.puntos;
  const s = document.createElement('span'); s.textContent = u.pasado ? (u.puntos ? u.puntos + ' puntos' : 'La mano vale 0') : ((u.patrones || []).length ? u.patrones.map(x => x.nombre + ' +' + x.puntos).join(' · ') : 'Llegó a ' + u.total);
  c.append(b, s); c.hidden = false;
}
// ¿Hay cartel de otro jugador sobre la mesa? Entonces la mano baja y se achica para que no se tapen.
const hayCartelTJ = e => !!(e.fase === 'turno' && e.turno && e.turno.terminada && e.ultimaMano && e.ultimaMano.asiento !== e.yo);

// El cartel grande de lo propio (el mismo del diez mil): "TE PLANTASTE" con los puntos que suben, "¡21!" o "¡TE PASASTE!".
const MENOS_TJ = '-';
function cartelGrandeTJ(e, u) {
  const pasado = u.pasado, veintiuno = !pasado && u.total === 21, jug = jugDe(e, e.yo);
  const color = pasado ? [1.0, 0.45, 0.36] : [1.0, 0.85, 0.4], luz = pasado ? '255,80,60' : '255,214,102';
  const ov = $('resultado'), centro = ov.querySelector('.rcentro');
  clearTimeout(vista.timerResultado);
  ov.querySelectorAll('.rconf').forEach(c => c.remove());
  centro.textContent = '';
  ov.querySelector('.rluz').style.background = 'radial-gradient(ellipse at 50% 45%, rgba(' + luz + ',.28), rgba(' + luz + ',0) 62%)';
  const ancho = Math.min(window.innerWidth * 0.92, 900);
  const titulo = V.rotulo(pasado ? '¡TE PASASTE!' : (veintiuno ? '¡21 EXACTO!' : (u.motivo === 'tiempo' ? 'TE PLANTAMOS' : 'TE PLANTASTE')), color, ancho, 13);
  centro.appendChild(titulo);
  let cifra = null;
  if (!pasado && u.puntos > 0) { cifra = document.createElement('div'); cifra.appendChild(V.rotulo('+' + u.puntos, color, ancho * 0.7, 11)); centro.appendChild(cifra); }
  const s1 = document.createElement('div'); s1.className = 'rsub grande';
  s1.textContent = pasado ? 'Llegaste a ' + u.total + ': la mano vale ' + u.puntos : ((u.patrones || []).length ? u.patrones.map(x => x.nombre + ' +' + x.puntos).join(' · ') : (jug ? 'Llevas ' + jug.total + ' puntos' : ''));
  if (s1.textContent) centro.appendChild(s1);
  const r2 = document.createElement('div'); r2.className = 'rsub';
  r2.textContent = 'Mazo ' + u.mazo + ' · mano ' + u.mano + ' de ' + e.manosPorMazo + (u.motivo === 'tiempo' ? ' · se acabó el tiempo' : '');
  centro.appendChild(r2);
  ov.hidden = false;
  if (!sinMovimiento()) {
    ov.querySelector('.rfondo').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
    titulo.animate([{ transform: 'scale(.3) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.18) rotate(1deg)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' });
    if (cifra) {
      const total = u.puntos, t0 = performance.now();
      cifra.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, delay: 200, easing: 'ease-out', fill: 'backwards' });
      const paso = () => {
        if (ov.hidden) return;
        const k = Math.min(1, (performance.now() - t0 - 220) / 600);
        if (k >= 0) { cifra.textContent = ''; cifra.appendChild(V.rotulo('+' + Math.round(total * (1 - Math.pow(1 - k, 3))), color, ancho * 0.7, 11)); }
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
    if (pasado) document.body.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 420 });
    else if (u.puntos >= 30) confeti(ov, u.puntos >= 45 ? 46 : 26);
  }
  vista.timerResultado = setTimeout(ocultarResultado, 1500);
}

// Los puntos que suma la carta que acabas de pedir, flotando sobre la mesa (como los de lo que apartas en el diez mil).
function flotaPuntosTJ(e) {
  const t = e.turno;
  if (!t || e.turnoDe !== e.yo) { TJ.totalPrev = 0; return; }
  if (t.manoId !== TJ.manoIdPrev) { TJ.manoIdPrev = t.manoId; TJ.totalPrev = 0; }
  if (t.mano.length && !t.pasado && t.total > TJ.totalPrev && !TJ.primera && !sinMovimiento() && !t.terminada) {
    const f = document.createElement('div'); f.className = 'dmFlota'; f.textContent = '+' + (t.total - TJ.totalPrev);
    $('tjMesa').appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }
  TJ.totalPrev = t.mano.length ? t.total : 0;
}

function pintarInfoTJ(e) {
  const el = $('tjInfo'), t = e.turno;
  el.textContent = ''; el.classList.toggle('avisoLargo', !!TJ.aviso);   // (los avisos largos usan dos renglones)
  const add = (txt, clase) => { const s = document.createElement('span'); if (clase) s.className = clase; s.textContent = txt; el.appendChild(s); };
  if (TJ.aviso) { add(TJ.aviso, TJ.avisoClase || 'mal'); return; }
  if (e.fase === 'espera') { add('Preparando la partida…'); return; }   // (la espera de una sala con amigos es otra pantalla: la sala)
  if (e.fase === 'resumen') { add('Fin del mazo ' + e.mazoN); return; }
  if (e.fase === 'tienda') { add('Tienda abierta: elige tus cartas'); return; }
  if (e.fase === 'fin') { add('Fin de la partida'); return; }
  if (!t) return;
  const mio = e.turnoDe === e.yo, j = jugDe(e, e.turnoDe), u = e.ultimaMano;
  if (mio) {   // (el total y la probabilidad ya se ven en la mesa y en el botón Pedir)
    add('Mano ' + e.mano + ' de ' + e.manosPorMazo, 'suave');
    if (!t.mano.length) add(' · pide tu primera carta');
    else if (t.pasado) add(' · te pasaste', 'mal');
  } else {
    add((j ? j.apodo : '?') + ' · mano ' + e.mano + ' de ' + e.manosPorMazo, 'suave');
    const h = window.matchMedia('(max-width: 700px)').matches ? [] : (t.historial || []).slice(-3);   // (en el celular no hay registro de jugadas: se gana espacio)
    if (h.length) {
      el.appendChild(document.createElement('br'));
      h.forEach(x => {
        const g = document.createElement('span'); g.className = 'dmHj';
        x.cartas.forEach(c => { const cv = V.cartaCanvas(c.r, c.p === undefined ? c.r % 4 : c.p, false, c.e ? COLOR_ESP_TJ[c.e] : null); cv.style.cssText = 'display:inline-block;vertical-align:middle;margin-right:1px;image-rendering:pixelated;width:13px;height:auto'; g.appendChild(cv); });
        g.appendChild(document.createTextNode(' ' + (x.pasado ? String(x.puntos) : '+' + x.puntos)));
        el.appendChild(g);
      });
    }
  }
}

function pintarAccionesTJ(e) {
  const t = e.turno, mio = e.turnoDe === e.yo && e.fase === 'turno' && t && !t.terminada;
  const key = JSON.stringify([e.fase, e.anfitrion === e.yo, e.yo, e.turnoDe, mio, t && t.puedePedir, t && t.puedePlantarse, t && t.prob, t && t.mano.length, e.jugadores.length]);
  if (key === TJ.accKey) return;
  TJ.accKey = key;
  const caja = $('tjAcciones'); caja.textContent = '';
  const boton = (texto, fn, oro, deshab) => { const b = nuevoBoton(texto, fn, 2); if (oro) b.oro = true; if (deshab) b.disabled = true; caja.appendChild(b); return b; };
  if (e.fase === 'espera') return;
  if (!mio) {
    // fuera de tu turno: reacciones rápidas (un toque) en lugar de una barra vacía
    if (e.fase === 'turno' && e.jugadores.length > 1) {
      const fila = document.createElement('div'); fila.className = 'dmReaccionesFila';
      const et = document.createElement('div'); et.className = 'chico'; et.textContent = (e.turnoDe === e.yo ? 'Terminaste tu mano' : 'Turno de ' + nombreDe(e, e.turnoDe)) + ' · reacciona';
      const bs = document.createElement('div'); bs.className = 'fila';
      REAC.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tileBtn reac'; b.setAttribute('aria-label', 'Reacción ' + x.t); b.appendChild(V.rotulo(x.t, x.c, 44, 3)); b.onclick = () => { Sonido.play('clic'); accionTJ('reaccion', { r: i }); }; bs.appendChild(b); });
      fila.append(et, bs); caja.appendChild(fila);
    }
    return;
  }
  const pedir = boton('Pedir', () => accionTJ('pedir'), true, !t.puedePedir);
  ponerMedalla(pedir, t.prob);
  boton('Plantarte', () => accionTJ('plantarse'), false, !t.puedePlantarse);
}

// ---------- el resumen de cada mazo ----------

function resumenTJ(e) {
  const m = $('tjResumen');
  if (e.fase !== 'resumen') { m.hidden = true; TJ.resumenKey = ''; return; }
  const yo = jugDe(e, e.yo) || e.jugadores[0];
  const k = JSON.stringify([e.mazoN, e.jugadores.map(j => [j.asiento, j.total, j.listo]), yo && yo.resumen]);
  if (k === TJ.resumenKey && !m.hidden) return;
  TJ.resumenKey = k;
  const caja = m.querySelector('.caja'); caja.textContent = '';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
  caja.appendChild(el('h3', '', 'Mazo ' + e.mazoN + ' terminado'));
  const r = yo && yo.resumen;
  if (r) {
    const filas = el('div', 'tjFilas');
    r.manos.forEach((x, i) => {
      const f = el('div', 'tjFila'); f.appendChild(el('span', 'tjN', String(i + 1)));
      const cen = el('div', 'tjFilaCen'); cen.appendChild(x.cartas.length ? filaCartasTJ(x.cartas, 30) : el('span', 'suave', 'sin cartas'));
      if ((x.patrones || []).length) cen.appendChild(el('span', 'tjPat', x.patrones.map(q => q.nombre + ' +' + q.puntos).join(' · ')));
      f.appendChild(cen);
      f.appendChild(el('b', x.pasado || !x.puntos ? 'mal' : 'dorado', String(x.puntos)));
      filas.appendChild(f);
    });
    caja.appendChild(filas);
    if (r.bono) { const bn = el('div', 'tjTot chica'); bn.append(el('span', '', r.sobran === 0 ? 'Mazo vaciado' : 'Sobró ' + r.sobran + (r.sobran === 1 ? ' carta' : ' cartas')), el('b', 'dorado', '+' + r.bono)); caja.appendChild(bn); }
    const tot = el('div', 'tjTot'); tot.append(el('span', '', 'Puntos del mazo'), el('b', 'dorado', String(r.puntos))); caja.appendChild(tot);
    const fi = el('div', 'tjTot chica'); fi.append(el('span', '', 'Fichas ganadas'), el('b', 'bien', '+' + r.fichas)); caja.appendChild(fi);
  }
  if (e.jugadores.length > 1) {
    const rk = el('div', 'tjRank');
    e.jugadores.slice().sort((a, b) => b.total - a.total).forEach((j, i) => { const f = el('div', 'tjRankFila' + (j.asiento === e.yo ? ' yo' : '')); f.append(ponerNombre(el('span'), (i + 1) + '. ' + j.apodo, j.bot), el('b', '', String(j.total)), el('i', '', j.listo ? '✓' : '')); rk.appendChild(f); });
    caja.appendChild(rk);
  }
  const ultimo = e.objetivo === 'puntos' ? e.jugadores.some(j => j.total >= e.metaPuntos) : e.mazoN >= e.mazos;
  const sig = ultimo ? 'Resultado final' : (e.especiales && e.mazoN % e.cadaTienda === 0 ? 'Siguiente: tienda' : 'Siguiente: mazo ' + (e.mazoN + 1));
  caja.appendChild(el('div', 'nota', sig));
  const barra = el('div', 'tjBarraT'); const bi = el('div'); bi.id = 'tjBarraR'; barra.appendChild(bi); caja.appendChild(barra);
  const b = nuevoBoton(yo && yo.listo ? 'Esperando…' : 'Continuar', () => accionTJ('listo'), 2); b.oro = true; if (yo && yo.listo) b.disabled = true; caja.appendChild(b);
  m.hidden = false;
}

// ---------- la tienda de cartas especiales ----------

function tiendaTJ(e) {
  const m = $('tjTienda');
  if (e.fase !== 'tienda' || !e.mio) { m.hidden = true; TJ.tiendaKey = ''; TJ.selOferta = -1; TJ.selLugar = -1; return; }
  const yo = jugDe(e, e.yo);
  const k = JSON.stringify([e.mio.oferta, yo.fichas, yo.cartas.map(c => c.e), e.mio.listo, TJ.selOferta, TJ.selLugar]);
  if (k === TJ.tiendaKey && !m.hidden) return;
  TJ.tiendaKey = k;
  if (m.hidden) Sonido.play('tienda');
  const caja = m.querySelector('.caja'); caja.textContent = '';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
  caja.appendChild(el('h3', '', 'Tienda · tienes ' + yo.fichas + ' fichas'));
  const barra = el('div', 'tjBarraT'); const bi = el('div'); bi.id = 'tjBarraTienda'; barra.appendChild(bi); caja.appendChild(barra);
  const ofertas = el('div', 'tjOfertas');
  e.mio.oferta.forEach((o, i) => {
    const d = especialTJ(o.tipo), b = el('button', 'tjOferta' + (TJ.selOferta === i ? ' on' : '') + (o.comprada ? ' comprada' : '')); b.type = 'button';
    b.disabled = o.comprada;
    b.appendChild(cartaTJ(o.r, o.tipo, 54, false, false, o.p));   // (cada oferta trae su propio número y palo)
    b.append(el('b', '', d.nombre), el('span', 'desc', d.desc), el('span', 'precio' + (yo.fichas < o.precio ? ' mal' : ''), o.comprada ? 'Comprada' : o.precio + ' fichas'));
    b.onclick = () => { Sonido.play('clic'); TJ.selOferta = TJ.selOferta === i ? -1 : i; tiendaTJ(TJ.e); };
    ofertas.appendChild(b);
  });
  caja.appendChild(ofertas);
  if (TJ.selOferta >= 0 && !e.mio.oferta[TJ.selOferta].comprada) {
    caja.appendChild(el('div', 'tjPregunta', especialTJ(e.mio.oferta[TJ.selOferta].tipo).nombre + ': ¿qué carta de tu mazo reemplaza? (queda con el número y palo de la oferta)'));
    const g = mazoTJ(yo.cartas.map(c => Object.assign({}, c, { quedan: true, enMano: false })), 36, null);
    [...g.children].forEach((d, i) => {
      const c = yo.cartas[i];
      if (c.e) { d.classList.add('apagada'); return; }
      d.style.cursor = 'pointer'; if (TJ.selLugar === c.i) d.classList.add('elegida');
      d.onclick = () => { Sonido.play('clic'); TJ.selLugar = c.i; tiendaTJ(TJ.e); };
    });
    caja.appendChild(g);
  }
  const fila = el('div', 'botonesFin');
  const o = TJ.selOferta >= 0 ? e.mio.oferta[TJ.selOferta] : null;
  const comprar = nuevoBoton('Comprar', async () => {
    if (!o || TJ.selLugar < 0) return;
    const rect = comprar.getBoundingClientRect();
    const r = await accionTJ('comprar', { indice: TJ.selOferta, lugar: TJ.selLugar });
    if (r && r.ok) { Sonido.play('comprar'); destelloCompra(rect, o.precio); TJ.selOferta = -1; TJ.selLugar = -1; tiendaTJ(TJ.e); }
  }, 2);
  comprar.oro = true; if (!o || TJ.selLugar < 0 || yo.fichas < o.precio) comprar.disabled = true;
  const listo = nuevoBoton(e.mio.listo ? 'Esperando…' : 'Listo', () => accionTJ('listo'), 2); if (e.mio.listo) listo.disabled = true;
  fila.append(comprar, listo); caja.appendChild(fila);
  m.hidden = false;
}

// ---------- el final ----------

function finalTJ(e) {
  const m = $('tjFinal');
  if (e.fase !== 'fin' || !e.fin) { m.hidden = true; TJ.finKey = ''; return; }
  const f = e.fin, k = JSON.stringify(f);
  if (k === TJ.finKey && !m.hidden) return;
  const nuevo = TJ.finKey !== k; TJ.finKey = k;
  if (nuevo && f.motivo !== 'abandono') Estadisticas.guardar(Estadisticas.registrarTJ(Estadisticas.leer(), f, e.yo, sala, Date.now()));
  const emp = infoEmpateFin(f, e.yo), yoGane = emp.gane;
  const caja = m.querySelector('.caja'); caja.textContent = ''; caja.classList.add('dmFin');
  const solo = f.modo === 'solo';
  const titulo = f.motivo === 'abandono' ? 'La partida terminó' : (solo ? 'Terminaste: ' + f.ganador.total + ' puntos' : (emp.empate ? emp.titulo : (yoGane ? '¡Ganaste!' : 'Ganó ' + f.ganador.apodo)));
  const sub = f.motivo === 'abandono' ? '' : (f.objetivo === 'puntos' ? 'Meta de ' + f.metaPuntos + ' puntos · ' + f.mazoN + ' mazos' : f.mazos + ' mazos') + (f.especiales ? '' : ' · sin cartas especiales');
  TJ.finTexto = { titulo, sub };
  const h = document.createElement('h3'); h.textContent = titulo; caja.appendChild(h);
  if (sub) { const s = document.createElement('p'); s.className = 'nota'; s.textContent = sub; caja.appendChild(s); }
  f.ranking.forEach((r, i) => {
    const fila = document.createElement('div'); fila.className = 'filaR' + (emp.lider(i) && !solo ? ' lider' : '');
    const a = document.createElement('div'); a.textContent = String(emp.puesto(i));
    const b = document.createElement('div'); const nom = document.createElement('div'); ponerNombre(nom, (r.asiento === e.yo ? '★ ' : '') + r.apodo, r.bot); const det = document.createElement('div'); det.className = 'chico'; det.textContent = r.pasadas + ' pasadas · mejor mano ' + r.mejorMano; b.append(nom, det);
    const c = document.createElement('div'); c.className = 'dorado'; c.textContent = String(r.total);
    fila.append(a, b, c); caja.appendChild(fila);
  });
  const bot = document.createElement('div'); bot.className = 'botonesFin';
  bot.append(nuevoBoton('Nueva partida', () => accionTJ('nueva'), 1.7), nuevoBoton('Compartir', () => compartirImagen(() => imagenRankingTJ(f, e), 'ranking-13jack.png', '13 Jack · Lucid Stakes', f.modo === 'multi' ? 'Así quedó la partida' : 'Mi partida de 13 Jack'), 1.7), nuevoBoton('Salir', async () => { await accion('salir'); volverAlInicio(''); }, 1.7));
  caja.appendChild(bot);
  m.hidden = false;
  if (nuevo && !TJ.primera) Sonido.play(yoGane || f.modo !== 'multi' ? 'victoria' : 'perder');
}

// La imagen del ranking para compartir: igual a la ventana del final (el título, el resumen y una fila por jugador, una pegada a la otra).
function imagenRankingTJ(f, e) {
  const W = IMG.ancho, P = 44, G = 18, FILA = 66;
  const tx = TJ.finTexto || { titulo: '', sub: '' };
  const filas = f.ranking.slice(0, 8), emp = infoEmpateFin(f, e.yo);
  const H = 22 + P - 10 + 18 + 12 + 36 + 10 + (tx.sub ? 26 + 8 : 0) + G + filas.length * FILA + G + 18 + P - 10;
  const { cv, ctx } = imgLienzo(H);
  let y = 22 + P - 10;
  y += 16; imgTexto(ctx, '13 JACK · LUCID STAKES', W / 2, y, 16, '#a99cc9', 'center'); y += 12;
  y += 36; imgTexto(ctx, imgRecortar(ctx, tx.titulo, 34, W - 2 * P, 700), W / 2, y, 34, '#fff3c4', 'center', 700); y += 10;
  if (tx.sub) { y += 26; imgTexto(ctx, imgRecortar(ctx, tx.sub, 20, W - 2 * P), W / 2, y, 20, '#d9cfff', 'center'); y += 8; }
  y += G;
  filas.forEach((r, i) => {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; ctx.fillRect(P, y, W - 2 * P, FILA);
    if (emp.lider(i) && f.modo === 'multi') { ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 3; ctx.strokeRect(P + 1.5, y + 1.5, W - 2 * P - 3, FILA - 3); }
    imgTexto(ctx, String(emp.puesto(i)), P + 22, y + 42, 28, emp.lider(i) ? '#f2c94c' : '#a99cc9', 'center', 700);
    imgTexto(ctx, imgRecortar(ctx, r.apodo, 26, W - 2 * P - 230, 700), P + 56, y + 31, 26, '#fff3c4', 'left', 700);
    imgTexto(ctx, imgRecortar(ctx, r.pasadas + ' pasadas · mejor mano ' + r.mejorMano, 16, W - 2 * P - 230), P + 56, y + 54, 16, '#a99cc9', 'left');
    imgTexto(ctx, String(r.total), W - P - 16, y + 43, 30, '#f2c94c', 'right', 700);
    y += FILA;
  });
  y += G + 18; imgTexto(ctx, 'SALA ' + (sala || '') + ' · ' + new Date().toLocaleDateString(), W / 2, y, 15, '#a99cc9', 'center');
  return cv;
}

// ---------- la ventana de un jugador: sus datos y su mazo ----------

function abrirJugadorTJ(asiento) {
  if (!TJ.e || !jugDe(TJ.e, asiento)) return;
  Sonido.play('clic');
  TJ.verAsiento = asiento; TJ.verCarta = -1; TJ.verKey = '';
  $('tjJugador').hidden = false;
  refrescarJugadorTJ(TJ.e);
}
function cerrarJugadorTJ() { TJ.verAsiento = null; TJ.verKey = ''; $('tjJugador').hidden = true; }
function refrescarJugadorTJ(e) {
  const m = $('tjJugador');
  if (m.hidden || TJ.verAsiento === null || TJ.verAsiento === undefined) return;
  const j = jugDe(e, TJ.verAsiento);
  if (!j || e.fase === 'fin' || e.fase === 'tienda' || e.fase === 'resumen') { cerrarJugadorTJ(); return; }
  const key = JSON.stringify([j.apodo, j.total, j.fichas, j.pasadas, j.mejorMano, j.veintiunos, j.cartas.map(c => [c.quedan, c.e]), e.mazoN, TJ.verCarta, !!TJ.catalogo]);
  if (key === TJ.verKey) return;
  TJ.verKey = key;
  const caja = m.querySelector('.caja'); caja.textContent = '';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
  const cab = el('div', 'jvCab'); cab.append(ponerNombre(el('b'), j.apodo + (j.asiento === e.yo ? ' (tú)' : ''), j.bot));
  const x = el('button', 'jvX', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.onclick = cerrarJugadorTJ; cab.appendChild(x);
  const datos = [['Puntos', String(j.total)], ['Fichas', String(j.fichas), 'bien'], ['Mazo', e.objetivo === 'puntos' ? String(e.mazoN) : e.mazoN + ' de ' + e.mazos], ['Mejor mano', String(j.mejorMano)], ['Manos pasadas', String(j.pasadas), 'mal'], ['21 exactos', String(j.veintiunos)]];
  const g = el('div', 'jvGrid');
  datos.forEach(([a, b, c]) => { const d = el('div', 'jvDato'); d.append(el('span', '', a), el('b', c || '', b)); g.appendChild(d); });
  const mazo = mazoTJ(j.cartas, 38, c => { TJ.verCarta = c.i; TJ.verKey = ''; refrescarJugadorTJ(TJ.e); });   // (por casilla: dos casillas pueden tener el mismo número)
  const sel = TJ.verCarta >= 0 ? j.cartas.find(c => c.i === TJ.verCarta) : null;
  const nota = el('div', 'jvNota', sel && sel.e ? especialTJ(sel.e).nombre + ': ' + especialTJ(sel.e).desc : (j.cartas.some(c => c.e) ? 'Las cartas con borde dorado son especiales. Toca una para leer qué hace.' : 'Solo tiene cartas comunes.'));
  const cerrar = el('button', 'boton', 'Cerrar'); cerrar.type = 'button'; V.boton(cerrar, { cubo: 2.4 }); cerrar.onclick = cerrarJugadorTJ;
  caja.append(cab, g, el('div', 'jvTit', 'Su mazo · quedan ' + j.quedan + ' de 13'), mazo, nota, cerrar);
}

// ---------- reacciones, sonidos y reloj ----------

function reaccionesTJ(e) {
  const mayor = e.contadorReacciones || 0;
  if (TJ.reacVisto === undefined || mayor < TJ.reacVisto) { TJ.reacVisto = mayor; return; }
  const nuevas = e.reacciones.filter(x => x.id > TJ.reacVisto); TJ.reacVisto = mayor;
  if (sinMovimiento()) return;
  nuevas.forEach(x => {
    const el = document.querySelector('#tjJugadores .dmJ[data-asiento="' + x.asiento + '"]'), d = REAC[x.r];
    if (!el || !d) return;
    const r = el.getBoundingClientRect(), g = document.createElement('div'); g.className = 'dmGlobo';
    g.appendChild(V.rotulo(d.t, d.c, 90, 6));
    g.style.left = (r.left + r.width / 2) + 'px'; g.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(g);
    g.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: .2 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .75 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 2200, easing: 'ease-out' }).onfinish = () => g.remove();
    if (x.asiento !== e.yo) Sonido.play('roce');
  });
}

function sonidosTJ(e) {
  const t = e.turno;
  if (t && t.manoId === TJ.sonManoId && t.mano.length > TJ.sonCartas && !TJ.primera && !document.hidden) Sonido.play('carta');
  TJ.sonManoId = t ? t.manoId : -1; TJ.sonCartas = t ? t.mano.length : 0;
  const u = e.ultimaMano;
  if (u && u.id !== TJ.ultimaManoVista) {
    if (TJ.ultimaManoVista !== -1 && !TJ.primera && !document.hidden) Sonido.play(u.pasado ? 'perder' : (u.total === 21 ? 'victoria' : 'moneda'));
    TJ.ultimaManoVista = u.id;
  }
}

function relojTJ(e) {
  const b = $('tjBarra');
  if (b) {
    const total = e.fase === 'turno' && e.turno && !e.turno.terminada && e.limite && !e.sinTiempo ? (e.tiempos.turno || 0) : 0;
    const quedan = total ? e.limite - ahora() : 0;
    b.style.width = total ? Math.max(0, Math.min(100, quedan / total * 100)) + '%' : '0%';
    const apura = total > 0 && quedan > 0 && quedan <= 5000 && e.turnoDe === e.yo;
    b.classList.toggle('apura', apura);
    if (apura) { $('tjInfo').textContent = 'Quedan ' + Math.ceil(quedan / 1000) + ' s: jugaremos por ti'; TJ.avisoTiempo = true; }
    else if (TJ.avisoTiempo) { TJ.avisoTiempo = false; pintarInfoTJ(e); }
    const seg = Math.ceil(quedan / 1000);
    if (apura && seg !== TJ.ultimoTick) { TJ.ultimoTick = seg; if (!document.hidden) Sonido.play('tic'); }
    if (!apura) TJ.ultimoTick = null;
  }
  const r = $('tjBarraR'); if (r && e.limite && !e.sinTiempo) r.style.width = Math.max(0, Math.min(100, (e.limite - ahora()) / (e.tiempos.resumen || 1) * 100)) + '%';
  const t = $('tjBarraTienda'); if (t && e.limite && !e.sinTiempo) t.style.width = Math.max(0, Math.min(100, (e.limite - ahora()) / (e.tiempos.tienda || 1) * 100)) + '%';
}
