'use strict';
// Pruebas de la mesa del 13 Jack: turnos, manos, mazos, resumen, tienda, tiempos, final, guardado y reacciones. Uso: node pruebas/test_trecejack.js
const path = require('path');
const { Mesa13, FASE } = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'mesa_13.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

function mesa(op, ...apodos) {
  const reloj = { t: 1000000 };
  let semilla = 11;
  const m = new Mesa13(Object.assign({ ahora: () => reloj.t, azar: () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; } }, op));
  m.reloj = reloj;
  m.paso = ms => { reloj.t += ms; m.avanzar(); };
  (apodos.length ? apodos : ['A']).forEach(a => m.unirse('t' + a, a));
  return m;
}
const J = (m, a) => m.jugador('t' + a);
const E = (m, a) => m.estado('t' + a);
// Pone el mazo del jugador en un orden conocido (las cartas que se piden primero).
const orden = (j, ...rangos) => { const resto = j.mazo.filter(c => !rangos.includes(c.r)); j.mazo = rangos.map(r => j.mazo.find(c => c.r === r)).concat(resto); };

// ---------- solitario: empieza solo y se juega una mano ----------
{
  const m = mesa({ modo: 'solo' }, 'A');
  check(m.fase === FASE.TURNO && m.mazoN === 1 && m.mano === 1 && m.turno === J(m, 'A'), 'en solitario la partida empieza al entrar');
  check(J(m, 'A').mazo.length === 13 && new Set(J(m, 'A').mazo.map(c => c.r)).size === 13, 'cada jugador tiene su mazo de 13 cartas');
  check(m.plantarse('tA').error === 'Pide al menos una carta', 'no se puede plantar sin cartas');
  orden(J(m, 'A'), 9, 10, 2);
  check(m.pedir('tA').ok && E(m, 'A').turno.total === 9 && E(m, 'A').turno.prob === 100, 'pedir saca la primera carta del mazo');
  m.pedir('tA');
  const e = E(m, 'A');
  check(e.turno.total === 19 && e.turno.prob === 18 && J(m, 'A').mazo.length === 11, 'con 19 solo sirven el as y el 2: 2 de 11 (18 %)');
  check(m.plantarse('tA').ok && J(m, 'A').total === 19 && J(m, 'A').manos.length === 1, 'plantarse anota los puntos de la mano');
  check(m.pedir('tA').error === 'La mano ya terminó' && m.ultimaMano.puntos === 19 && E(m, 'A').turno.terminada, 'tras plantarte hay una pausa para ver la mano');
  m.paso(2000);
  check(m.mano === 2 && J(m, 'A').mano.length === 0 && !E(m, 'A').turno.terminada, 'y sigue la mano 2');
}

// ---------- pasarse y 21 ----------
{
  const m = mesa({ modo: 'solo' }, 'A');
  orden(J(m, 'A'), 10, 9, 5);
  m.pedir('tA'); m.pedir('tA'); m.pedir('tA');
  check(J(m, 'A').manos[0].pasado && J(m, 'A').manos[0].puntos === 0 && J(m, 'A').pasadas === 1 && J(m, 'A').total === 0, 'pasarse termina la mano sin puntos');
  m.paso(2000);
  orden(J(m, 'A'), 1, 13);
  m.pedir('tA'); m.pedir('tA');
  check(J(m, 'A').manos[1].total === 21 && J(m, 'A').manos[1].puntos === 43 && J(m, 'A').veintiunos === 1 && m.finManoEn !== null, 'el 21 exacto vale 30 (+3 por el palo y +10 por el blackjack) y plantarse es automático');
  check(J(m, 'A').manos[1].patrones.map(p => p.id).join() === 'palo,blackjack' && m.ultimaMano.patrones.length === 2, 'la mano guarda sus patrones');
}

// ---------- un mazo completo, el resumen y las fichas ----------
{
  const m = mesa({ modo: 'solo', especiales: false, mazos: 3 }, 'A');
  const j = J(m, 'A');
  for (let mano = 1; mano <= 4; mano++) {
    m.pedir('tA'); if (m.finManoEn === null) m.plantarse('tA');
    m.paso(2000);
  }
  check(m.fase === FASE.RESUMEN && j.resumen && j.resumen.manos.length === 4 && j.resumen.mazo === 1, 'al terminar la mano 4 se muestra el resumen del mazo');
  const esperado = Math.floor(j.puntosMazo / 5) + 5 * j.veintiunosMazo + 3 * j.pasadasMazo;
  check(j.fichas === esperado && j.resumen.fichas === esperado, 'las fichas: 1 cada 5 puntos, 5 por 21 y 3 por mano pasada');
  check(j.resumen.sobran === J(m, 'A').mazo.length && j.resumen.bono === ({ 0: 25, 1: 15, 2: 6 }[j.resumen.sobran] || 0), 'el resumen informa las cartas que sobraron y el premio por vaciar el mazo');
  check(m.listo('tA').ok && m.fase === FASE.TURNO && m.mazoN === 2 && m.mano === 1 && j.mazo.length === 13, '"listo" pasa al mazo siguiente (sin especiales no hay tienda)');
}

// ---------- la tienda ----------
{
  const m = mesa({ modo: 'solo', mazos: 5 }, 'A');
  const j = J(m, 'A');
  const jugarMazo = () => { for (let i = 0; i < 4; i++) { m.pedir('tA'); if (m.finManoEn === null) m.plantarse('tA'); m.paso(2000); } m.listo('tA'); };
  jugarMazo();
  check(m.fase === FASE.TURNO && m.mazoN === 2, 'tras el mazo 1 no hay tienda');
  jugarMazo();
  check(m.fase === FASE.TIENDA && j.oferta.length === 3 && j.oferta.every(o => o.precio > 0), 'tras el mazo 2 se abre la tienda con 3 ofertas');
  const o = j.oferta[0];
  j.fichas = 100;
  check(m.comprar('tA', 0, 3).ok && j.base[3].e === o.tipo && j.base[3].r === o.r && j.base[3].p === o.p && j.fichas === 100 - o.precio, 'comprar reemplaza la casilla elegida por la carta de la oferta, con su número y palo');
  check(m.comprar('tA', 0, 5).error === 'Ya la compraste' && m.comprar('tA', 1, 3).error === 'Esa carta ya es especial', 'no se compra dos veces ni se pisa una especial');
  j.fichas = 0;
  check(m.comprar('tA', 1, 6).error === 'No te alcanzan las fichas' && m.comprar('tA', 9, 6).error === 'Esa oferta no existe' && m.comprar('tA', 1, 99).error === 'Elige la carta que reemplaza' && m.comprar('tA', 1, -1).error === 'Elige la carta que reemplaza', 'sin fichas, oferta inexistente o rango inválido: error');
  m.listo('tA');
  check(m.fase === FASE.TURNO && m.mazoN === 3 && j.mazo.find(c => c.i === 3).e === o.tipo && j.mazo.find(c => c.i === 3).r === o.r, 'al seguir, el mazo nuevo trae la carta especial');
}

// ---------- la partida termina tras el último mazo ----------
{
  const m = mesa({ modo: 'solo', especiales: false, mazos: 3 }, 'A');
  for (let mazo = 1; mazo <= 3; mazo++) { for (let i = 0; i < 4; i++) { m.pedir('tA'); if (m.finManoEn === null) m.plantarse('tA'); m.paso(2000); } m.listo('tA'); }
  check(m.fase === FASE.FIN && m.fin.motivo === 'mazos' && m.fin.ranking.length === 1 && m.fin.mazos === 3, 'tras el mazo 3 termina la partida');
  check(m.nuevaPartida('tA').ok && m.fase === FASE.TURNO && m.mazoN === 1 && J(m, 'A').total === 0, 'una nueva partida empieza de cero');
}

// ---------- objetivo por puntos ----------
{
  const m = mesa({ modo: 'solo', especiales: false, objetivo: 'puntos', metaPuntos: 250 }, 'A');
  check(m.objetivo === 'puntos' && m.metaPuntos === 250 && E(m, 'A').objetivo === 'puntos' && E(m, 'A').metaPuntos === 250, 'la sala por puntos informa su objetivo');
  let mazos = 0;
  while (m.fase !== FASE.FIN && mazos < 25) {
    for (let i = 0; i < 4; i++) { m.pedir('tA'); if (m.finManoEn === null) m.plantarse('tA'); m.paso(2000); }
    if (m.fase === FASE.RESUMEN) { mazos++; m.listo('tA'); }
  }
  check(m.fase === FASE.FIN && m.fin.motivo === 'puntos' && m.fin.objetivo === 'puntos' && m.fin.metaPuntos === 250 && m.fin.ranking[0].total >= 250 && m.fin.mazoN >= 2, 'termina al llegar a los puntos, al cerrar un mazo (' + mazos + ' mazos)');
  const n = mesa({ modo: 'solo', especiales: false, objetivo: 'puntos', metaPuntos: 650 }, 'A');
  n.jugadores[0].total = 100; n.mazoN = 1; n._finMazo(); n._despuesDelResumen();
  check(n.fase === FASE.TURNO && n.mazoN === 2, 'si nadie llegó a la meta, sigue otro mazo');
  const t = mesa({ modo: 'solo', objetivo: 'mazos', mazos: 3 }, 'A'); check(t.objetivo === 'mazos' && mesa({ modo: 'solo', objetivo: 'raro' }, 'A').objetivo === 'mazos' && mesa({ modo: 'solo', objetivo: 'puntos', metaPuntos: 7 }, 'A').metaPuntos === 400, 'un objetivo o una meta que no existe pasa al de siempre');
}

// ---------- con amigos: turnos, orden de vueltas y tiempos ----------
{
  const m = mesa({ modo: 'multi', especiales: false }, 'A', 'B', 'C');
  check(m.fase === FASE.ESPERA && m.estado('tB').anfitrion === 0, 'con amigos se espera a que empiece quien armó la sala');
  check(m.empezar('tB').error === 'Solo puede empezar quien armó la sala' && m.empezar('tA').ok, 'solo empieza el anfitrión');
  check(m.turno === J(m, 'A') && m.pedir('tB').error === 'No es tu turno', 'cada uno juega en su turno');
  orden(J(m, 'A'), 10, 8);
  m.pedir('tA'); m.pedir('tA'); m.plantarse('tA');
  m.paso(2000);
  check(m.turno === J(m, 'B') && m.mano === 1, 'sigue el siguiente jugador en la misma mano');
  m.paso(21000);
  check(J(m, 'B').manos.length === 1 && J(m, 'B').manos[0].cartas.length === 1 && J(m, 'B').manos[0].motivo === 'tiempo' && J(m, 'B').automaticos === 1, 'si se acaba el tiempo, el servidor pide una carta (si no tenía) y se planta');
  m.paso(2000);
  m.pedir('tC'); m.plantarse('tC'); m.paso(2000);
  check(m.mano === 2 && m.turno === J(m, 'A'), 'terminada la vuelta, empieza la mano 2 con el primero');
  m.desconectar('tA');
  for (let i = 0; i < 30 && J(m, 'A').manos.length < 2; i++) m.paso(1500);
  check(J(m, 'A').manos.length === 2 && J(m, 'A').automaticos === 0, 'quien se desconecta sigue jugando solo, como un bot, y conserva su lugar');
  const e = E(m, 'B');
  check(!JSON.stringify(e).includes('tA') && e.jugadores.every(x => x.cartas.length === 13), 'el estado no incluye identificadores y muestra los 13 lugares del mazo de cada uno');
  m.salir('tC');
  check(m.jugadores.length === 2, 'quien sale deja la mesa');
}

// ---------- cartas especiales en la mano ----------
{
  const m = mesa({ modo: 'solo' }, 'A');
  const j = J(m, 'A');
  j.base[2] = { r: 3, e: 'vidente', p: 0 }; j.base[7] = { r: 8, e: 'pegajosa', p: 2 }; j.base[11] = { r: 12, e: 'oro', p: 1 };
  m._prepararMazo(j);
  orden(j, 8, 3, 12);
  m.pedir('tA'); m.pedir('tA');
  check(E(m, 'A').turno.proxima && E(m, 'A').turno.proxima.r === 12 && E(m, 'A').turno.proxima.e === 'oro', 'el vidente muestra la próxima carta del mazo');
  m.pedir('tA');
  const mano = j.manos[0];
  check(mano.cartas.length === 3 && mano.total === 21 && mano.puntos === 45, 'la mano con oro vale un 50 % más (21 exacto, cada carta con su palo: 30 x 1,5)');
  check(j.mazo.filter(c => c.r === 8).length === 1 && j.mazo.length === 11, 'la pegajosa vuelve al mazo después de la mano (' + j.mazo.length + ' cartas)');
}

// ---------- pausa en solitario y reacciones ----------
{
  const m = mesa({ modo: 'solo' }, 'A');
  const lim = m.limite;
  check(m.pausar('tA').ok && m.pausa !== null, 'en solitario se puede pausar');
  m.paso(60000);
  check(m.limite === lim && m.turno === J(m, 'A') && J(m, 'A').manos.length === 0, 'en pausa el reloj no corre');
  m.reanudar('tA');
  check(m.pausa === null && m.limite === lim + 60000, 'al reanudar se devuelve el tiempo');
  const q = mesa({ modo: 'multi' }, 'A', 'B');
  check(q.reaccionar('tA', 2).ok && q.reacciones.length === 1 && q.reaccionar('tA', 2).error === 'Más despacio' && q.reaccionar('tA', 99).error === 'Reacción desconocida', 'reacciones: una cada 2 segundos y solo las conocidas');
}

// ---------- guardar y recuperar ----------
{
  const m = mesa({ modo: 'multi', especiales: true, mazos: 8 }, 'A', 'B');
  m.empezar('tA');
  orden(J(m, 'A'), 9, 5);
  m.pedir('tA');
  const datos = JSON.parse(JSON.stringify(m.guardar()));
  const n = Mesa13.desde(datos, {});
  check(n.fase === FASE.TURNO && n.mazos === 8 && n.jugadores.length === 2 && n.turno && n.turno.apodo === 'A', 'la sala se recupera tras un reinicio');
  check(n.jugador('tA').mano.length === 0 && n.jugador('tA').mazo.length === 13, 'la mano a medias se vuelve a empezar: la carta pedida vuelve al mazo');
}

// ---------- las especiales nuevas: retroceso, adelanto, mecenas y ruleta ----------
const poner = (j, casilla, r, e, p) => { j.base[casilla] = { r, e, p }; j.mazo = []; };
{   // retroceso: al pasarte, la última carta vuelve al mazo y te plantas con lo anterior
  const m = mesa({ modo: 'solo' }, 'A'), j = J(m, 'A');
  j.base[1] = { r: 2, e: 'retroceso', p: 2 }; j.mazo = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'reglas.js')).mazoNuevo(j.base, () => 0.5);
  orden(j, 2, 10, 5, 9);
  m.pedir('tA'); m.pedir('tA'); m.pedir('tA'); m.pedir('tA');
  check(j.manos.length === 1 && !j.manos[0].pasado && j.manos[0].total === 17 && j.manos[0].motivo === 'retroceso' && j.mazo.some(c => c.r === 9), 'el retroceso devuelve la carta que te pasaba y te planta');
}
{   // adelanto: la mano siguiente empieza con una carta puesta
  const m = mesa({ modo: 'solo' }, 'A'), j = J(m, 'A');
  j.base[1] = { r: 2, e: 'adelanto', p: 2 }; j.mazo = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'reglas.js')).mazoNuevo(j.base, () => 0.5);
  orden(j, 2, 5, 7);
  m.pedir('tA'); m.plantarse('tA'); m.paso(2000);
  check(j.mano.length === 1 && E(m, 'A').turno.mano.length === 1, 'el adelanto pone una carta al empezar la mano siguiente');
}
{   // mecenas: +4 fichas cuando sale en una mano
  const m = mesa({ modo: 'solo' }, 'A'), j = J(m, 'A');
  j.base[1] = { r: 2, e: 'mecenas', p: 2 }; j.mazo = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'reglas.js')).mazoNuevo(j.base, () => 0.5);
  orden(j, 2, 5);
  m.pedir('tA'); m.plantarse('tA');
  check(j.fichasExtra === 4, 'el mecenas suma 4 fichas');
}
{   // ruleta: su valor se sortea al salir
  const m = mesa({ modo: 'solo' }, 'A'), j = J(m, 'A');
  j.base[6] = { r: 7, e: 'ruleta', p: 3 }; j.mazo = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'reglas.js')).mazoNuevo(j.base, () => 0.5);
  orden(j, 7);
  m.pedir('tA');
  const c = E(m, 'A').turno.mano[0];
  check(c.e === 'ruleta' && c.v >= 1 && c.v <= 11 && E(m, 'A').turno.total === c.v, 'la ruleta sortea un valor del 1 al 11');
}

// ---------- empate por el primer puesto ----------
{
  const m = mesa({}, 'A', 'B', 'C');
  J(m, 'A').total = 50; J(m, 'B').total = 50; J(m, 'C').total = 20;
  m._terminarPartida('mazos');
  check(m.fin.empatados.length === 2 && m.fin.empatados.includes(0) && m.fin.empatados.includes(1), 'un empate por el primer puesto lo declara el servidor');
  const n = mesa({}, 'A', 'B');
  J(n, 'A').total = 60; J(n, 'B').total = 50; n._terminarPartida('mazos');
  check(n.fin.empatados.length === 0, 'sin empate no hay empatados');
}

console.log('pruebas de la mesa del 13 Jack terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
