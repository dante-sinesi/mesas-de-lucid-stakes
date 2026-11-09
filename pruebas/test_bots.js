'use strict';
// Pruebas de los bots del Diez mil y del 13 Jack: cuántos hay, a quién le dejan el lugar, y que una partida entera con bots llega al final. Uso: node pruebas/test_bots.js
const path = require('path');
const { Salas } = require(path.join(__dirname, '..', 'servidor', 'salas.js'));
const { MesaDM } = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'mesa_dm.js'));
const { Mesa13 } = require(path.join(__dirname, '..', 'servidor', 'trecejack', 'mesa_13.js'));
const Bots = require(path.join(__dirname, '..', 'servidor', 'bots.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

function reloj() { const r = { t: 1000000 }; r.ahora = () => r.t; return r; }
const T = a => 't' + a + 'abcdefghijklmnop';
function conBots(Clase, op, humanos) {
  const r = reloj(), m = new Clase(Object.assign({ ahora: r.ahora }, op));
  m.reloj = r; m.paso = ms => { r.t += ms; m.avanzar(); };
  humanos.forEach(a => m.unirse(T(a), a));
  return m;
}

// ---------- cuántos bots y cómo se llaman ----------
check(Bots.cantidadValida(3, 8) === 3 && Bots.cantidadValida(9, 8) === 7 && Bots.cantidadValida(-1, 8) === 0 && Bots.cantidadValida('x', 8) === 0 && Bots.cantidadValida(5, 1) === 0, 'la cantidad de bots se acota: de 0 a 7 y nunca llena la sala sola');

for (const [nombre, Clase] of [['Diez mil', MesaDM], ['13 Jack', Mesa13]]) {
  const m = conBots(Clase, { modo: 'multi', bots: 3 }, ['Ana']);
  const bots = m.jugadores.filter(j => j.bot);
  check(bots.length === 3 && bots.every(b => b.asiento >= 5) && new Set(bots.map(b => b.apodo)).size === 3, nombre + ': se crean los bots en los últimos asientos con nombres distintos');
  check(m.jugador(T('Ana')).asiento === 0 && m.anfitrion().apodo === 'Ana', nombre + ': el humano ocupa el primer asiento y es quien empieza');
  check(!JSON.stringify(m.estado(T('Ana'))).includes('bot:') && m.estado(T('Ana')).jugadores.filter(j => j.bot).length === 3, nombre + ': el estado marca a los bots y no muestra sus identificadores');
  const nombreBot = bots[0].apodo;   // un humano que se llama como un bot se queda con el nombre
  check(m.unirse(T('Juan'), nombreBot).ok && m.jugador(T('Juan')).apodo === nombreBot && !m.jugadores.some(j => j.bot && j.apodo === nombreBot), nombre + ': un humano puede llamarse como un bot (el bot cambia de nombre)');
  for (const a of ['H1', 'H2']) m.unirse(T(a), a);
  check(m.jugadores.length === 7 && m.jugadores.filter(j => j.bot).length === 3, nombre + ': mientras hay lugar, los humanos suman sin sacar bots');
  m.unirse(T('H3'), 'H3');
  check(m.jugadores.length === 8 && m.jugadores.filter(j => j.bot).length === 3, nombre + ': con la sala completa (5 humanos y 3 bots) todos conviven');
  m.unirse(T('H4'), 'H4');
  check(m.jugadores.length === 8 && m.jugadores.filter(j => j.bot).length === 2, nombre + ': cuando la sala se llena, sale un bot por cada humano que entra');
  for (const a of ['H5', 'H6']) m.unirse(T(a), a);
  check(m.jugadores.length === 8 && m.jugadores.filter(j => j.bot).length === 0, nombre + ': con 8 humanos no queda ningún bot');
  check(m.unirse(T('Z'), 'Z').error === 'La sala está llena', nombre + ': llena de humanos, no entra nadie más');
}
{
  const m = conBots(MesaDM, { modo: 'multi', bots: 7 }, ['Ana']);
  check(m.jugadores.length === 8 && m.jugadores.filter(j => j.bot).length === 7, 'con 7 bots y un humano la sala queda completa');
  m.salir(T('Ana'));
  check(m.jugadores.length === 7 && m.jugadores.every(j => j.bot), 'cuando se va el último humano de la sala de espera, los bots se quedan por si vuelve');
  const s = conBots(MesaDM, { modo: 'carrera', bots: 3 }, ['Ana']);
  check(s.jugadores.length === 1 && !s.jugadores[0].bot, 'los modos solitarios no llevan bots');
}

// ---------- una partida completa, un humano con tres bots ----------
{
  const m = conBots(MesaDM, { modo: 'multi', bots: 3, cupo: false }, ['Ana']);
  check(m.empezar(T('Ana')).ok, 'Diez mil: el humano empieza la partida con bots');
  for (let i = 0; i < 6000 && m.fase !== 'fin'; i++) {
    if (m.fase === 'tienda') { m.listo(T('Ana')); continue; }
    m.paso(m.turno && !m.turno.bot ? 13000 : 1800);   // (el humano no juega: se le acaba el tiempo)
  }
  check(m.fase === 'fin' && m.fin && m.fin.ranking.length === 4, 'Diez mil: una partida con bots llega al final');
  check(m.jugadores.filter(j => j.bot).every(b => b.turnosPropios > 0), 'Diez mil: todos los bots jugaron sus turnos');
  check(m.jugadores.some(j => j.bot && (j.compras || []).length > 0), 'Diez mil: los bots compraron en la tienda');
}
{
  const m = conBots(Mesa13, { modo: 'multi', bots: 3, mazos: 3 }, ['Ana']);
  check(m.empezar(T('Ana')).ok, '13 Jack: el humano empieza la partida con bots');
  for (let i = 0; i < 6000 && m.fase !== 'fin'; i++) {
    if (m.fase === 'tienda' || m.fase === 'resumen') { m.listo(T('Ana')); continue; }
    m.paso(m.turno && !m.turno.bot ? 21000 : 1500);
  }
  check(m.fase === 'fin' && m.fin && m.fin.ranking.length === 4, '13 Jack: una partida con bots llega al final');
  check(m.jugadores.filter(j => j.bot).every(b => b.manosJugadas > 0 && b.total > 0), '13 Jack: todos los bots jugaron manos y sumaron puntos');
  check(m.jugadores.some(j => j.bot && j.compras.length > 0), '13 Jack: los bots compraron cartas especiales');
}

// ---------- las salas: crear con bots y no tratarlos como desconectados ----------
{
  const r = reloj(), S = new Salas({ archivo: null, ahora: r.ahora });
  const c = S.crear({ juego: 'diezmil', modoDM: 'multi', bots: 4 });
  check(c.ok && c.bots === 4 && S.sala(c.sala).mesa.jugadores.filter(j => j.bot).length === 4, 'crear una sala de Diez mil con bots');
  const t = S.crear({ juego: 'trecejack', modoTJ: 'multi', bots: 2 });
  check(t.ok && t.bots === 2 && S.sala(t.sala).mesa.jugadores.filter(j => j.bot).length === 2, 'crear una sala de 13 Jack con bots');
  check(S.crear({ juego: 'diezmil', modoDM: 'carrera', bots: 3 }).bots === 0 && S.crear({ juego: 'trecejack', modoTJ: 'solo', bots: 3 }).bots === 0, 'en solitario clásico no hay bots');
  check(S.crear({ juego: 'diezmil', modoDM: 'multi' }).bots === 0, 'por omisión no hay bots');
  S.entrar(c.sala, T('Ana'), 'Ana', '');
  r.t += 60000; S.tic();
  check(S.sala(c.sala).mesa.jugadores.filter(j => j.bot).every(b => b.conectado), 'los bots nunca figuran como desconectados');
  check(S.accion(c.sala, 'bot:12345', 'tirar').ok === false, 'nadie puede actuar a nombre de un bot');
  const m2 = MesaDM.desde(S.sala(c.sala).mesa.guardar());
  check(m2.jugadores.filter(j => j.bot).length === 4, 'los bots sobreviven al guardado');
}

console.log('pruebas de los bots terminadas, fallos: ' + fallos);
process.exit(fallos ? 1 : 0);
