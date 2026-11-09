'use strict';
// El tutorial guiado: una sala de práctica de verdad (el servidor reparte lo que manda el guion) con un globo que explica,
// un aro que señala qué tocar y un bloqueo de todo lo demás. Se carga después de comun.js y entrada.js (usa api, token, sala, abrirMesa, accion, volverAlInicio...).

const Tut = (() => {
  const T = { activo: false, juego: null, i: -1, pasos: [], listo: false, dom: null, anillo: null };

  const PRIMERO = '#dmAcciones > :first-child', SEGUNDO = '#dmAcciones > :nth-child(2)';
  const jugando = e => e.fase === 'turno' && e.turno;
  const en = (e, estado) => jugando(e) && e.turno.estado === estado;

  // Cada paso: texto, boton (lo que dice el botón del globo; si no hay, se avanza solo cuando se cumple `hasta`), ring (lo que se puede tocar),
  // setup (lo que el servidor prepara al llegar al paso) y antes (el paso no se muestra hasta que se cumpla).
  const PASOS_DM = [
    { texto: 'Llega primero a 10.000: tira, aparta lo que puntúa y decide si sigues o te plantas. Toca donde brille el aro.', boton: 'Empezar' },
    { setup: { cola: [1, 5, 2, 3, 6] }, texto: 'Toca Tirar.', ring: PRIMERO, hasta: e => en(e, 'apartar') && e.turno.rollId >= 1 },
    { setup: { cola: [3, 3, 3] }, texto: 'Solo puntúan los 1 y los 5. Toca el botón: los aparta y tira el resto.', ring: PRIMERO, hasta: e => en(e, 'apartar') && e.turno.rollId >= 2 },
    { setup: { cola: [1, 2, 3, 4, 6] }, texto: '¡Tres 3 valen 300! Usaste todos: vuelves a tirar con los 5.', ring: PRIMERO, hasta: e => en(e, 'apartar') && e.turno.rollId >= 3 },
    { texto: 'Llevas 550: ya pasaste los 500 para entrar. Toca Plantarte.', ring: SEGUNDO, hasta: e => !!(e.ultimoTurno && e.ultimoTurno.resultado === 'planto') },
    { setup: { cola: [2, 3, 4, 6, 2] }, antes: e => en(e, 'tirar'), texto: 'Si ningún dado puntúa, te quemas. Toca Tirar.', ring: PRIMERO, hasta: e => !!(e.ultimoTurno && e.ultimoTurno.resultado === 'quemo') },
    { antes: e => en(e, 'tirar'), texto: 'Más combos: cuatro iguales, el doble del trío; cinco iguales, 5.000; escaleras, 500 o 750.', boton: 'Siguiente' },
    { setup: { cola: [2, 3, 4, 5, 6] }, texto: 'Toca Tirar.', ring: PRIMERO, hasta: e => en(e, 'apartar') },
    { texto: 'Escalera: 750. Toca Plantarte.', ring: SEGUNDO, hasta: e => !!(e.ultimoTurno && e.ultimoTurno.resultado === 'planto' && e.ultimoTurno.acum === 750) },
    { setup: { total: 9950, entrado: true, cola: [5, 2, 3, 4, 6] }, antes: e => en(e, 'tirar') && e.ultimoTurno && e.ultimoTurno.acum === 750, texto: 'Tienes 9.950: hay que llegar justo a 10.000. Toca Tirar.', ring: PRIMERO, hasta: e => en(e, 'apartar') },
    { texto: 'Solo el 5 llega justo. Toca Plantarte.', ring: SEGUNDO, hasta: e => e.fase === 'fin' },
    { antes: e => e.fase === 'fin', texto: '¡Listo! Llegaste justo a 10.000.', botones: [['Jugar solo', 'solo'], ['Con amigos', 'amigos']], final: true },
  ];

  // ---------- la interfaz: globo, aro y bloqueo ----------

  function crearDom() {
    if (T.dom) return;
    const g = document.createElement('div'); g.id = 'tutGlobo'; g.className = 'tutGlobo'; g.hidden = true;
    const tx = document.createElement('div'); tx.className = 'tutTexto';
    const bt = document.createElement('div'); bt.className = 'tutBotones';
    const sa = document.createElement('button'); sa.type = 'button'; sa.className = 'tutSaltar'; sa.textContent = 'Salir del tutorial';
    sa.onclick = () => terminar();
    g.append(tx, bt, sa);
    const an = document.createElement('div'); an.id = 'tutAnillo'; an.className = 'tutAnillo'; an.hidden = true;
    document.body.append(an, g);
    T.dom = { globo: g, texto: tx, botones: bt }; T.anillo = an;
    for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'contextmenu']) window.addEventListener(ev, bloquear, true);
  }

  function elementos(p) { return p && p.ring ? Array.from(document.querySelectorAll(p.ring)) : []; }
  function bloquear(ev) {
    if (!T.activo) return;
    const t = ev.target; if (!(t instanceof Element)) return;
    if (t.closest('#tutGlobo, #bSalir, #dSalir')) return;
    const p = T.pasos[T.i];
    if (T.listo && T.mostrado && p && elementos(p).some(el => el.contains(t))) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
  }

  function pintarPaso() {
    const p = T.pasos[T.i], d = T.dom;
    if (!p) return;
    d.texto.textContent = p.texto;
    d.botones.textContent = '';
    const idx = T.i;
    if (p.boton) { const b = nuevoBoton(p.boton, () => { if (T.i !== idx) return; if (p.final) terminar(true); else siguiente(); }, 2); b.oro = true; d.botones.appendChild(b); }
    if (p.botones) p.botones.forEach(([txt, destino], k) => { const b = nuevoBoton(txt, () => { if (T.i !== idx) return; terminar(true, destino); }, 2); if (k === 0) b.oro = true; d.botones.appendChild(b); });
    d.globo.hidden = false;
  }

  // Cada cuadro: el aro sigue al elemento señalado y el globo se pone en la mitad de la pantalla donde no estorba.
  function cuadro() {
    if (!T.activo) return;
    const p = T.pasos[T.i], d = T.dom;
    let r = null;
    if (T.listo && T.mostrado && p) { const el = elementos(p).find(x => x.getBoundingClientRect().width > 0); if (el) { r = el.getBoundingClientRect(); if (!T.centrado && (r.bottom > innerHeight || r.top < 0)) { T.centrado = true; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } } }
    if (r) {
      const a = T.anillo.style; a.left = (r.left - 6) + 'px'; a.top = (r.top - 6) + 'px'; a.width = (r.width + 12) + 'px'; a.height = (r.height + 12) + 'px'; T.anillo.hidden = false;
    } else T.anillo.hidden = true;
    // el globo se pone pegado al aro (arriba de él si entra, si no abajo) con una flecha que lo señala; sin aro, al centro
    const g = d.globo.style, gh = d.globo.offsetHeight || 80, gw = d.globo.offsetWidth || 300, tope = 56;
    let top, cx = innerWidth / 2, flecha = '';
    if (!r) top = (innerHeight - gh) / 2;
    else if (r.height > innerHeight * 0.35) top = tope;   // (un aro muy grande, como la lista de la tienda: el globo va arriba de todo)
    else {
      cx = r.left + r.width / 2;
      if (r.top - gh - 16 >= tope) { top = r.top - gh - 16; flecha = 'abajo'; }
      else { top = Math.min(r.bottom + 16, innerHeight - gh - 8); flecha = 'arriba'; }
    }
    const left = Math.max(8, Math.min(innerWidth - gw - 8, cx - gw / 2));
    g.left = left + 'px'; g.top = top + 'px'; g.bottom = 'auto'; g.transform = 'none';
    d.globo.dataset.flecha = flecha; g.setProperty('--fx', (cx - left) + 'px');
    requestAnimationFrame(cuadro);
  }

  // ---------- el avance ----------

  async function entrarPaso(i) {
    T.i = i; T.listo = false;
    const p = T.pasos[i]; if (!p) return;
    T.dom.globo.hidden = true;
    if (p.setup) await api('/api/accion', Object.assign({ sala, token, accion: 'tut' }, p.setup));
    T.listo = true; T.mostrado = false; T.centrado = false;
    if (typeof estado !== 'undefined' && estado) mirar(estado);
  }
  function siguiente() { Sonido.play('clic'); entrarPaso(T.i + 1); }

  // Se llama cada vez que llega un estado nuevo (y la tirada ya terminó).
  function mirar(e) {
    if (!T.activo || !T.listo) return;
    const p = T.pasos[T.i]; if (!p) return;
    if (!T.mostrado) {
      if (p.antes && !p.antes(e)) { T.dom.globo.hidden = true; return; }
      T.mostrado = true; pintarPaso();
    }
    if (!p.boton && p.hasta && p.hasta(e)) { Sonido.play('moneda'); entrarPaso(T.i + 1); }
  }

  async function iniciar(juego) {
    crearDom();
    const apodo = ($('apodo').value || '').trim() || 'Tú';
    const c = await api('/api/crear', { juego, tutorial: true });
    if (!c.ok) return avisoSolo(c.error || 'No se pudo abrir el tutorial');
    const r = await api('/api/entrar', { sala: c.sala, token, apodo, clave: '' });
    if (!r.ok) return avisoSolo(r.error || 'No se pudo abrir el tutorial');
    T.activo = true; T.juego = juego; T.pasos = PASOS_DM;
    abrirMesa(c.sala, juego);
    guardado('bj_sala', '');
    try { history.replaceState(null, '', location.pathname); } catch (x) { /* sin cambiar la barra */ }
    requestAnimationFrame(cuadro);
    entrarPaso(0);
  }

  function limpiar() {
    T.activo = false; T.i = -1; T.listo = false;
    if (T.dom) T.dom.globo.hidden = true;
    if (T.anillo) T.anillo.hidden = true;
  }
  // Terminar (con el botón final o saliendo): se cierra la sala de práctica y se vuelve a la entrada del juego.
  // `completo`: llegó al final (queda visto); si no, queda 'abandonado' y se vuelve a ofrecer.
  async function terminar(completo, destino) {
    if (!T.activo) return;
    const juego = T.juego;
    guardado('bj_tut_' + T.juego, completo ? '1' : 'a');
    limpiar();
    await accion('salir');
    volverAlInicio('');
    if (destino === 'solo') crearSolo(juego);   // (el cierre del tutorial lleva a jugar solo o a la entrada del juego, para armar una sala con amigos)
  }
  // Si se sale por otro camino (la puerta), solo se limpia.
  function alSalir() { if (T.activo) { guardado('bj_tut_' + T.juego, 'a'); limpiar(); } }

  // ---------- la oferta de la primera vez ----------

  function ofrecer(juego, alSaltar) {
    const visto = guardado('bj_tut_' + juego);
    if (visto === '1') return;
    const m = $('tutOferta'); if (!m) return;
    const caja = m.querySelector('.caja'); caja.textContent = '';
    const h = document.createElement('h3'); h.textContent = visto === 'a' ? '¿Retomamos el tutorial?' : '¿Quieres aprender a jugar?';
    const p = document.createElement('p'); p.className = 'nota'; p.textContent = 'Práctica de 2 minutos.';
    const fila = document.createElement('div'); fila.className = 'botonesFin';
    fila.append(nuevoBoton('Aprender', () => { m.hidden = true; iniciar(juego); }, 2), nuevoBoton('Saltar', () => { guardado('bj_tut_' + juego, '1'); m.hidden = true; if (alSaltar) alSaltar(); }, 2));
    caja.append(h, p, fila);
    m.hidden = false;
  }

  return { iniciar, mirar, alSalir, ofrecer, terminar, get activo() { return T.activo; } };
})();
