'use strict';
// La sala de espera (antes de empezar una partida con amigos): los asientos con sus jugadores y bots, las reglas y la visibilidad.
// Solo el anfitrión (con la corona) cambia las reglas, suma o quita bots, elige pública o privada y empieza. Todo lo decide el servidor.

const Sala = { llave: '' };

const TIEMPOS_NOMBRE = { normal: 'Tiempo normal', extendido: 'Tiempo extendido', libre: 'Sin límite' };
const chipTexto = txt => { const s = nuevoEl('span', 'chipR'); s.appendChild(V.medalla(txt, 'media')); return s; };
// Las reglas de la sala, en pocas palabras (cada una es una etiqueta).
function reglasDe(e) {
  const r = [];
  if (e.juego === 'trecejack') {
    r.push(e.objetivo === 'puntos' ? e.metaPuntos + ' puntos' : e.mazos + ' mazos', e.especiales ? 'Especiales' : 'Sin especiales');
  } else {
    r.push('Meta ' + miles(e.metaBase || e.meta));
    if (e.cupo) r.push('Cupo de entrada');
    if (e.hostil) r.push('Con objetos');
    if (e.tomarDados) r.push('Tomar dados');
  }
  r.push(TIEMPOS_NOMBRE[e.tiempoModo] || TIEMPOS_NOMBRE.normal, 'Hasta ' + e.maxAsientos);
  return r;
}

function pintarSala(e) {
  const soyAnfitrion = e.anfitrion === e.yo;
  const llave = JSON.stringify([e.juego, e.sala, e.yo, e.anfitrion, e.maxAsientos, e.publica, e.clave, reglasDe(e), e.jugadores.map(j => [j.asiento, j.apodo, j.bot, j.conectado])]);
  if (llave === Sala.llave) return;
  Sala.llave = llave;
  $('saTitulo').textContent = nombreJuego(e.juego).toUpperCase();
  $('saCodigo').textContent = ''; $('saCodigo').appendChild(V.medalla(e.sala, 'media'));
  $('saJugEt').textContent = 'Jugadores ' + e.jugadores.length + '/' + e.maxAsientos;

  // un renglón por asiento: persona, bot o asiento libre
  const caja = $('saAsientos'); caja.textContent = '';
  for (let i = 0; i < e.maxAsientos; i++) {
    const j = e.jugadores.find(x => x.asiento === i);
    const fila = nuevoEl('div', 'as' + (j && j.asiento === e.yo ? ' yo' : '') + (j ? '' : ' libre'));
    fila.append(nuevoEl('span', 'n', String(i + 1)));
    const nom = nuevoEl('span', 'nom');
    if (j) {
      ponerNombre(nom, j.apodo + (j.asiento === e.yo ? ' ★' : ''), j.bot);
      if (j.asiento === e.anfitrion) nom.prepend(Mesas.corona(2.5), document.createTextNode(' '));
      fila.append(nom);
      if (j.bot && soyAnfitrion) { const q = nuevoEl('button', 'acc', 'Quitar'); q.type = 'button'; q.onclick = () => accionSala('botmenos', { asiento: i }); fila.append(q); }
    } else {
      const ico = nuevoEl('span', 'botIco'); nom.append(ico);
      if (soyAnfitrion) { nom.append(document.createTextNode('Añadir bot')); fila.classList.add('toca'); fila.onclick = () => accionSala('botmas', { asiento: i }); }
      fila.append(nom);
    }
    caja.append(fila);
  }

  // las reglas
  const reglas = $('saReglas'); reglas.textContent = '';
  reglasDe(e).forEach(t => reglas.append(chipTexto(t)));
  if (soyAnfitrion) { const b = nuevoEl('button', 'boton sec'); b.type = 'button'; V.boton(b, { texto: 'Editar', cubo: 1.4 }); b.onclick = () => abrirReglas(e); reglas.append(b); }

  // visibilidad y clave
  const vis = $('saVis'), cl = $('saClave'); vis.textContent = ''; cl.textContent = '';
  const seg = (padre, texto, activo, alTocar, habilitado = true) => {
    const b = nuevoEl('button', 'boton'); b.type = 'button'; V.boton(b, { texto, oro: activo, cubo: 1.6 });
    if (soyAnfitrion && habilitado) b.onclick = alTocar; else b.disabled = !activo;
    padre.append(b);
  };
  seg(vis, 'Privada', !e.publica, () => accionSala('visibilidad', { publica: false }));
  seg(vis, 'Pública', !!e.publica, () => accionSala('visibilidad', { publica: true }), !e.clave);
  seg(cl, 'Sin clave', !e.clave, () => accionSala('clave', { clave: false }));
  seg(cl, e.clave ? 'Clave ' + e.clave : 'Con clave', !!e.clave, () => accionSala('clave', { clave: true }));

  // empezar: solo el anfitrión
  $('saEmpezar').hidden = !soyAnfitrion;
}

// Una acción del anfitrión sobre la sala (el servidor la valida); si no se puede, se avisa un momento.
async function accionSala(nombre, extra) {
  const r = await accion(nombre, extra);
  if (r && r.ok === false && r.error) avisarSala(r.error);
}
function avisarSala(msg) {
  const a = nuevoEl('div', 'avisoMapa', msg);
  $('sala').append(a); setTimeout(() => a.remove(), 3500);
}
$('saVolver').onclick = salirDeLaMesa;
$('saInvitar').onclick = abrirInvitar;
$('saEmpezar').onclick = async () => { const r = await accion('empezar'); if (r && r.ok === false && r.error) avisarSala(r.error); };

// ---------- cambiar las reglas ----------

function campoSelect(et, id, opciones, valor) {
  const c = nuevoEl('div', 'cfCampo'), l = nuevoEl('label', '', et); l.htmlFor = id;
  const s = document.createElement('select'); s.id = id;
  opciones.forEach(([v, t]) => { const o = document.createElement('option'); o.value = String(v); o.textContent = t; s.appendChild(o); });
  s.value = String(valor);
  c.append(l, s);
  return c;
}
function abrirReglas(e) {
  const m = $('reglas'), caja = m.querySelector('.caja'); caja.textContent = '';
  const sino = [[1, 'Sí'], [0, 'No']], tiempo = [['normal', 'Normal'], ['extendido', 'Extendido'], ['libre', 'Sin límite']];
  const asientos = [2, 3, 4, 5, 6, 7, 8].map(n => [n, String(n)]);
  const grid = () => nuevoEl('div', 'cfGrid');
  const g1 = grid(), g2 = grid(), g3 = grid();
  caja.append(nuevoEl('h3', '', 'Reglas · ' + nombreJuego(e.juego)));
  if (e.juego === 'trecejack') {
    g1.append(campoSelect('Jugadores', 'rJug', asientos, e.maxAsientos), campoSelect('Tiempo por turno', 'rTiempo', tiempo, e.tiempoModo || 'normal'));
    g2.append(campoSelect('Cartas especiales', 'rEsp', sino, e.especiales ? 1 : 0), campoSelect('Objetivo', 'rObj', [['mazos', 'Por mazos'], ['puntos', 'Por puntos']], e.objetivo));
    const cuantos = obj => (obj === 'puntos' ? [[250, '250 puntos'], [400, '400 puntos'], [650, '650 puntos']] : [[3, '3 mazos'], [5, '5 mazos'], [8, '8 mazos']]);
    g3.append(campoSelect('Meta', 'rMeta', cuantos(e.objetivo), e.objetivo === 'puntos' ? e.metaPuntos : e.mazos));
    caja.append(g1, g2, g3);
    $('rObj').onchange = () => { const s = $('rMeta'); s.textContent = ''; cuantos($('rObj').value).forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = $('rObj').value === 'puntos' ? '400' : '5'; };
  } else {
    g1.append(campoSelect('Jugadores', 'rJug', asientos, e.maxAsientos), campoSelect('Tiempo por turno', 'rTiempo', tiempo, e.tiempoModo || 'normal'));
    g2.append(campoSelect('Meta', 'rMeta', [[10000, 'Clásica · 10.000'], [5000, 'Corta · 5.000']], e.metaBase || e.meta), campoSelect('Cupo de entrada', 'rCupo', sino, e.cupo ? 1 : 0));
    g3.append(campoSelect('Tomar los dados', 'rTomar', sino, e.tomarDados ? 1 : 0), campoSelect('Atacar con objetos', 'rHostil', sino, e.hostil ? 1 : 0));
    caja.append(g1, g2, g3);
  }
  const error = nuevoEl('div', 'error');
  const guardar = async () => {
    const d = e.juego === 'trecejack'
      ? { asientos: Number($('rJug').value), tiempo: $('rTiempo').value, especiales: $('rEsp').value === '1', objetivo: $('rObj').value, mazos: $('rObj').value === 'mazos' ? Number($('rMeta').value) : undefined, metaPuntos: $('rObj').value === 'puntos' ? Number($('rMeta').value) : undefined }
      : { asientos: Number($('rJug').value), tiempo: $('rTiempo').value, meta: Number($('rMeta').value), cupo: $('rCupo').value === '1', tomarDados: $('rTomar').value === '1', hostil: $('rHostil').value === '1' };
    const r = await accion('config', d);
    if (r && r.ok) { m.hidden = true; return; }
    error.textContent = (r && r.error) || 'No se pudo guardar';
  };
  const bs = nuevoEl('div', 'botonesFin');
  const ok = nuevoBoton('Guardar', guardar, 2); ok.oro = true;
  bs.append(ok, nuevoBoton('Cancelar', () => { m.hidden = true; }, 2));
  caja.append(error, bs);
  m.hidden = false;
}
$('reglas').addEventListener('click', ev => { if (ev.target === $('reglas')) $('reglas').hidden = true; });
