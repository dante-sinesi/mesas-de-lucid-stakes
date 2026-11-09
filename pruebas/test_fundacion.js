'use strict';
// Pruebas de la mesa de Fundación: partidas completas con bots y un jugador que juega lo más simple, el tiempo agotado y el bot que toma el lugar, el solo, guardar y recuperar, y las salas.
// Uso: node pruebas/test_fundacion.js
const path = require('path');
const { MesaFundacion, FASE } = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'mesa_fundacion.js'));
const R = require(path.join(__dirname, '..', 'servidor', 'fundacion', 'reglas.js'));
const { Salas } = require(path.join(__dirname, '..', 'servidor', 'salas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

// un reloj de mentira y un azar repetible
function nueva(op) {
  const reloj = { t: 1000000 }; const azar = R.rng(op.semilla || 1);
  const m = new MesaFundacion(Object.assign({ azar, ahora: () => reloj.t }, op));
  return { m, reloj };
}
// Juega por el humano lo más simple posible: pone en el primer lugar válido, tira una vez y construye lo que alcance.
function jugarHumano(m, token) {
  const e = m.estado(token);
  if (e.turnoDe !== e.yo || m.finTurnoEn !== null) return false;
  if (e.fase === 'inicial') return m.colocar(token, e.lugares[0]).ok;
  const t = e.turno;
  if (t.sub === 'produccion') return m.seguir(token).ok;
  if (t.sub === 'dados') { if (t.tirada < 2) m.tirar(token, []); return m.terminarDados(token).ok; }
  if (t.sub === 'construir') return m.elegir(token, t.posibles[0]).ok;
  if (t.sub === 'colocar') return m.colocar(token, e.lugares[0]).ok;
  return false;
}
function correr(m, reloj, token, pasos) {
  for (let i = 0; i < pasos && m.fase !== FASE.FIN; i++) {
    reloj.t += 700; m.avanzar();
    if (token) jugarHumano(m, token);
  }
}

// ---------- una partida con amigos: un humano y 3 bots ----------
{
  const { m, reloj } = nueva({ modo: 'multi', asientos: 4, bots: 3, meta: 8, semilla: 5 });
  check(m.jugadores.length === 3 && m.jugadores.every(j => j.bot), 'la sala nace con los bots pedidos');
  check(m.unirse('humano', 'Dante').ok && m.jugadores.length === 4, 'entra el humano y ocupa el asiento libre');
  check(m.empezar('humano').ok && m.fase === FASE.INICIAL, 'el anfitrión empieza y arranca la colocación inicial');
  check(m.estado('humano').mapa.hexes.length === 19 && m.mapa.radio === 2, 'con 4 jugadores el mapa es de 19 hexágonos');
  check(m.inicial.plan.length === 8 && m.inicial.plan.slice(0, 4).join() === m.inicial.plan.slice(4).reverse().join(), 'la colocación inicial va en serpiente');
  correr(m, reloj, 'humano', 4000);
  check(m.fase === FASE.FIN, 'la partida termina (fase ' + m.fase + ', ronda ' + m.ronda + ')');
  const f = m.fin;
  check(f && f.motivo === 'meta' && f.ranking.length === 4, 'termina por la meta con 4 en el ranking');
  check(m.llegoMeta !== null && m.finDeVuelta, 'alguien llegó a la meta (8) y se jugó la vuelta completa (quien la tenía pudo perder una carrera en la última vuelta)');
  check(f.ranking.every(r => r.turnos === f.ranking[0].turnos || r.turnos === f.ranking[0].turnos - 1 || r.turnos === f.ranking[0].turnos + 1), 'todos jugaron los mismos turnos (vuelta completa)');
  check(f.ranking.every((r, i) => i === 0 || f.ranking[i - 1].puntos >= r.puntos), 'el ranking va de más a menos puntos');
  const piezasTotales = m.tab.vert.filter(Boolean).length; check(piezasTotales >= 8, 'se pusieron los pueblos iniciales y los que se construyeron');
  check(m.jugadores.every(j => R.quedan(m.tab, j.asiento).camino >= 0 && R.quedan(m.tab, j.asiento).pueblo >= 0 && R.quedan(m.tab, j.asiento).ciudad >= 0 && R.quedan(m.tab, j.asiento).caballero >= 0), 'nadie pasa el tope de piezas');
  check(m.nuevaPartida('humano').ok && m.fase === FASE.ESPERA, 'una partida nueva vuelve a la espera');
}

// ---------- el mapa de 37 con 6 jugadores ----------
{
  const { m, reloj } = nueva({ modo: 'multi', asientos: 6, bots: 5, meta: 8, semilla: 8 });
  m.unirse('h', 'Ana'); m.empezar('h');
  check(m.mapa.hexes.length === 37, 'con 6 jugadores el mapa es de 37 hexágonos');
  correr(m, reloj, 'h', 6000);
  check(m.fase === FASE.FIN && m.fin.ranking.length === 6, 'una partida de 6 termina');
}

// ---------- solo: mejor marca en turnos ----------
{
  const { m, reloj } = nueva({ modo: 'solo', meta: 8, semilla: 3 });
  check(m.unirse('solo', 'Solo').ok && m.fase === FASE.INICIAL && m.maxAsientos === 1, 'en solitario se empieza al entrar');
  check(m.inicial.plan.length === 2, 'con un jugador son dos colocaciones iniciales');
  correr(m, reloj, 'solo', 4000);
  check(m.fase === FASE.FIN && m.fin.motivo === 'meta' && m.fin.turnos === m.fin.ranking[0].turnos && m.fin.turnos > 0, 'en solitario termina al llegar a la meta y el resultado son los turnos (' + (m.fin && m.fin.turnos) + ')');
  check(m.mapa.hexes.length === 19, 'en solitario el mapa es de 19 hexágonos');
}

// ---------- las acciones fuera de turno y los datos inválidos ----------
{
  const { m, reloj } = nueva({ modo: 'multi', asientos: 3, bots: 1, semilla: 9 });
  m.unirse('a', 'Ana'); m.unirse('b', 'Beto'); m.empezar('a');
  check(!m.empezar('a').ok, 'no se empieza dos veces');
  const actor = m._actor(); const hum = actor.token === 'a' ? 'b' : 'a';
  check(!m.colocar(hum, 0).ok, 'no se coloca fuera de turno');
  check(!m.seguir('a').ok && !m.tirar('a', []).ok && !m.terminarDados('a').ok, 'no se hacen acciones del turno en la colocación inicial');
  check(!m.colocar(actor.token, 999).ok && !m.colocar(actor.token, 'x').ok, 'un lugar inválido no sirve');
  check(!m.empezar('zzz').ok, 'un desconocido no puede empezar');
  // hasta el turno 1
  let pasos = 0; while (m.fase === FASE.INICIAL && pasos++ < 200) { reloj.t += 700; m.avanzar(); const e = m.estado('a'); if (e.turnoDe === 0 || e.turnoDe === e.yo) { /* nada */ } const act = m._actor(); if (act && !act.bot) { const tk = act.token; const e2 = m.estado(tk); m.colocar(tk, e2.lugares[0]); } }
  check(m.fase === FASE.TURNO, 'tras la colocación inicial empiezan los turnos');
  const t = m.t; const dueno = m.porAsiento(t.asiento);
  if (!dueno.bot) {
    const tk = dueno.token;
    check(t.sub === 'produccion' && !m.tirar(tk, []).ok, 'en la producción no se puede tirar');
    check(m.seguir(tk).ok && m.t.sub === 'dados' && m.t.tirada === 1 && m.t.dados.length === 6, 'seguir hace la primera tirada de los 6 dados');
    check(!m.tirar(tk, [m.t.fijos - 1]).ok || m.t.fijos === 0, 'un dado fijado no se puede guardar');
    check(m.tirar(tk, [m.t.fijos]).ok && m.t.tirada === 2 && m.tirar(tk, []).ok && m.t.tirada === 3 && !m.tirar(tk, []).ok, 'hasta 3 tiradas');
    const guardado = m.t.dados[m.t.fijos]; check(typeof guardado === 'number', 'los dados tienen caras');
    check(m.pasar(tk).ok && m.finTurnoEn !== null, 'pasar termina el turno sin construir');
  }
}

// ---------- tiempo agotado: un bot juega y a la segunda vez seguida toma el lugar ----------
{
  const { m, reloj } = nueva({ modo: 'multi', asientos: 2, bots: 1, semilla: 4 });
  m.unirse('d', 'Dante'); m.empezar('d');
  // la colocación inicial con el humano al día
  let n = 0; while (m.fase === FASE.INICIAL && n++ < 300) { reloj.t += 700; m.avanzar(); const a = m._actor(); if (a && !a.bot) m.colocar(a.token, m.estado(a.token).lugares[0]); }
  check(m.fase === FASE.TURNO, 'empiezan los turnos');
  // se deja pasar el tiempo en los turnos del humano
  let esperaHumano = 0, vistoExpulsado = false;
  for (let i = 0; i < 400 && m.fase === FASE.TURNO; i++) {
    reloj.t += 3000; m.avanzar();
    const j = m.jugador('d'); if (j.expulsado) { vistoExpulsado = true; break; }
  }
  const dj = m.jugador('d');
  check(dj.automaticos >= 2 && vistoExpulsado, 'tras 2 tiempos agotados seguidos, el jugador queda reemplazado por un bot (automáticos ' + dj.automaticos + ')');
  check(m.estado('d').jugadores.find(x => x.asiento === dj.asiento).expulsado === true, 'el estado lo informa');
  check(m.unirse('d').ok && m.jugador('d').expulsado === false && m.jugador('d').fallos === 0, 'al volver a entrar recupera su lugar');
}

// ---------- guardar y recuperar a mitad de la partida ----------
{
  const { m, reloj } = nueva({ modo: 'multi', asientos: 3, bots: 2, meta: 8, semilla: 6 });
  m.unirse('h', 'Hugo'); m.empezar('h');
  correr(m, reloj, 'h', 120);
  check(m.fase === FASE.TURNO || m.fase === FASE.INICIAL, 'a mitad de la partida');
  const copia = JSON.parse(JSON.stringify(m.guardar()));
  const m2 = MesaFundacion.desde(copia, { azar: R.rng(7), ahora: () => reloj.t });
  check(m2.fase === m.fase && JSON.stringify(m2.tab) === JSON.stringify(m.tab) && m2.mapa.hexes.length === m.mapa.hexes.length, 'la sala se recupera con su mapa y sus piezas');
  check(JSON.stringify(m2.mapa.hexes.map(h => h.num)) === JSON.stringify(m.mapa.hexes.map(h => h.num)), 'la isla es la misma');
  for (let i = 0; i < 4000 && m2.fase !== FASE.FIN; i++) { reloj.t += 700; m2.avanzar(); jugarHumano(m2, 'h'); }
  check(m2.fase === FASE.FIN, 'la partida recuperada se puede terminar');
}

// ---------- las reglas de la sala ----------
{
  const { m } = nueva({ modo: 'multi', asientos: 4, bots: 0 });
  m.unirse('a', 'Ana');
  check(m.configurar('a', { asientos: 6, meta: 12, tiempo: 'extendido' }).ok && m.maxAsientos === 6 && m.meta === 12 && m.tiempoModo === 'extendido' && m.tiempos.dados === 50000, 'el anfitrión cambia jugadores, meta y tiempo');
  check(!m.configurar('a', { asientos: 0 }).ok && !m.configurar('a', { asientos: 9 }).ok && m.configurar('a', { asientos: 1 }).ok, 'de 1 a 8 jugadores');
  m.configurar('a', { meta: 7 }); check(m.meta === 12, 'una meta inválida no cambia nada');
  m.configurar('a', { asientos: 4 });
  check(m.agregarBot('a', 3).ok && m.jugadores.length === 2 && m.jugadores[1].bot, 'se agrega un bot');
  check(m.quitarBot('a', 3).ok && m.jugadores.length === 1, 'se quita el bot');
  check(!m.unirse('b', 'Ana').ok, 'no se repite un apodo');
  m.unirse('b', 'Beto'); check(!m.configurar('b', { meta: 8 }).ok, 'solo el anfitrión cambia las reglas');
  m.empezar('a'); check(!m.unirse('c', 'Cris').ok, 'una vez empezada no se puede entrar');
  check(!m.configurar('a', { meta: 8 }).ok, 'ni cambiar las reglas');
}

// ---------- las salas (red) ----------
{
  const reloj = { t: 5000000 };
  const salas = new Salas({ archivo: null, ahora: () => reloj.t });
  const r = salas.crear({ juego: 'fundacion', modoFU: 'multi', asientos: 4, metaFU: 8, publica: true, bots: 2 });
  check(r.ok && r.juego === 'fundacion' && r.asientos === 4 && r.metaFU === 8 && r.bots === 2, 'se crea una sala de Fundación');
  check(salas.info(r.sala).juego === 'fundacion', 'la sala informa su juego');
  const e = salas.entrar(r.sala, 'token_largo_de_prueba_1', 'Dante');
  check(e.ok && e.juego === 'fundacion', 'se entra a la sala');
  const pub = salas.publicas(); check(pub.length === 1 && pub[0].juego === 'fundacion' && pub[0].datos.meta === 8 && pub[0].sillas.filter(Boolean).length === 3, 'aparece en el mapa de mesas con su meta');
  check(!salas.accion(r.sala, 'token_largo_de_prueba_1', 'pedir').ok, 'una acción de otro juego no existe aquí');
  check(salas.accion(r.sala, 'token_largo_de_prueba_1', 'config', { meta: 12 }).ok && salas.sala(r.sala).mesa.meta === 12, 'el anfitrión cambia la meta por la red');
  check(salas.accion(r.sala, 'token_largo_de_prueba_1', 'empezar').ok && salas.sala(r.sala).mesa.fase === 'inicial', 'se empieza por la red');
  let estado = null; salas.estado(r.sala, 'token_largo_de_prueba_1', -1, x => { estado = x; });
  check(estado && estado.ok && estado.juego === 'fundacion' && estado.mapa && estado.tab && estado.jugadores.length === 3, 'el estado trae el mapa, el tablero y los jugadores');
  check(!salas.crear({ juego: 'fundacion', modoFU: 'solo' }).publica, 'una sala solo no es pública');
  const so = salas.crear({ juego: 'fundacion', modoFU: 'solo', metaFU: 99 }); check(so.ok && so.metaFU === 10 && so.asientos === 1 && so.tiempo === 'libre', 'una meta inválida vuelve a 10 y el solo no tiene tiempo');
}

console.log('pruebas de la mesa de Fundación terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
