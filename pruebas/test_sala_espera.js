'use strict';
// Pruebas de la sala de espera: asientos de 2 a 8, pública o privada, la lista de mesas, cambiar reglas, bots y clave (solo el anfitrión), y el borrado de salas vacías. Uso: node pruebas/test_sala_espera.js
const path = require('path');
const { Salas } = require(path.join(__dirname, '..', 'servidor', 'salas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };
const T = a => 't' + a + 'abcdefghijklmnop';
function nueva() { const r = { t: 1000000 }; const S = new Salas({ archivo: null, ahora: () => r.t }); S.reloj = r; return S; }
const crear = (S, cfg) => { const c = S.crear(cfg); return c; };

// ---------- asientos y visibilidad al crear ----------
{
  const S = nueva();
  const a = crear(S, { juego: 'trecejack', modoTJ: 'multi', asientos: 4 });
  check(a.ok && a.asientos === 4 && S.sala(a.sala).mesa.maxAsientos === 4 && a.publica === false && S.sala(a.sala).publica === false, 'una sala nace con sus asientos y privada');
  check(crear(S, { juego: 'diezmil', modoDM: 'multi', asientos: 1 }).asientos === 8 && crear(S, { juego: 'diezmil', modoDM: 'multi', asientos: 9 }).asientos === 8 && crear(S, { juego: 'diezmil', modoDM: 'multi' }).asientos === 8, 'los asientos válidos son de 2 a 8 (si no, 8)');
  const p = crear(S, { juego: 'diezmil', modoDM: 'multi', publica: true });
  check(p.publica === true && S.sala(p.sala).publica === true, 'una sala creada desde el mapa nace pública');
  check(crear(S, { juego: 'diezmil', modoDM: 'multi', publica: true, clave: true }).publica === false, 'con clave nunca es pública');
  check(crear(S, { juego: 'diezmil', modoDM: 'carrera', publica: true }).publica === false && crear(S, { juego: 'trecejack', modoTJ: 'solo', publica: true }).publica === false, 'una sala solitaria nunca es pública');
}

// ---------- la lista de mesas ----------
{
  const S = nueva();
  const a = crear(S, { juego: 'trecejack', modoTJ: 'multi', asientos: 6, publica: true }), b = crear(S, { juego: 'diezmil', modoDM: 'multi', publica: true, metaDM: 5000 });
  check(S.publicas().length === 0, 'una sala pública sin nadie adentro no aparece');
  S.entrar(a.sala, T('Ana'), 'Ana', ''); S.entrar(a.sala, T('Beto'), 'Beto', ''); S.entrar(b.sala, T('Cai'), 'Cai', '');
  S.accion(a.sala, T('Ana'), 'botmas', { asiento: 5 });
  const l = S.publicas();
  const la = l.find(x => x.sala === a.sala), lb = l.find(x => x.sala === b.sala);
  check(l.length === 2 && la.juego === 'trecejack' && la.asientos === 6 && la.sillas.join() === 'h,h,,,,b' && la.datos.mazos === 5 && lb.datos.meta === 5000, 'la lista trae juego, asientos, quién ocupa cada uno (humano o bot) y las reglas');
  check(!JSON.stringify(l).includes('Ana') && !JSON.stringify(l).includes('Beto') && !JSON.stringify(l).includes(T('Ana')), 'la lista no muestra apodos ni identificadores');
  S.accion(a.sala, T('Ana'), 'visibilidad', { publica: false });
  check(S.publicas().length === 1, 'al pasar a privada sale del mapa');
  S.accion(a.sala, T('Ana'), 'visibilidad', { publica: true }); S.accion(a.sala, T('Ana'), 'empezar');
  check(!S.publicas().some(x => x.sala === a.sala), 'cuando empieza la partida sale del mapa');
  const c = crear(S, { juego: 'diezmil', modoDM: 'multi', publica: true, clave: false });
  S.entrar(c.sala, T('Dan'), 'Dan', '');
  S.accion(c.sala, T('Dan'), 'clave', { clave: true });
  check(!S.publicas().some(x => x.sala === c.sala) && S.sala(c.sala).mesa.clave && S.sala(c.sala).publica === false, 'poner clave saca la sala del mapa');
  check(S.accion(c.sala, T('Dan'), 'visibilidad', { publica: true }).ok === false, 'una sala con clave no se puede hacer pública');
  S.accion(c.sala, T('Dan'), 'clave', { clave: false });
  check(S.sala(c.sala).mesa.clave === null, 'se puede quitar la clave');
}

// ---------- solo el anfitrión cambia la sala ----------
{
  const S = nueva();
  const c = crear(S, { juego: 'trecejack', modoTJ: 'multi', asientos: 6 });
  S.entrar(c.sala, T('Ana'), 'Ana', ''); S.entrar(c.sala, T('Beto'), 'Beto', '');
  const m = S.sala(c.sala).mesa;
  check(S.accion(c.sala, T('Beto'), 'config', { asientos: 4 }).error === 'Solo puede quien armó la sala' && S.accion(c.sala, T('Beto'), 'visibilidad', { publica: true }).ok === false && S.accion(c.sala, T('Beto'), 'botmas', { asiento: 3 }).ok === false, 'otro jugador no puede cambiar la sala');
  check(S.accion(c.sala, T('Ana'), 'config', { asientos: 4, tiempo: 'extendido', objetivo: 'puntos', metaPuntos: 650, especiales: false }).ok && m.maxAsientos === 4 && m.tiempoModo === 'extendido' && m.tiempos.turno === 40000 && m.objetivo === 'puntos' && m.metaPuntos === 650 && m.especiales === false, 'el anfitrión cambia las reglas del 13 Jack');
  check(S.accion(c.sala, T('Ana'), 'config', { asientos: 1 }).ok === false && S.accion(c.sala, T('Ana'), 'config', { asientos: 9 }).ok === false, 'los asientos van de 2 a 8');
  S.accion(c.sala, T('Ana'), 'botmas', { asiento: 3 });
  check(S.accion(c.sala, T('Ana'), 'config', { asientos: 2 }).ok === false, 'no se pueden achicar los asientos por debajo de los jugadores sentados');
  check(S.accion(c.sala, T('Ana'), 'botmas', { asiento: 3 }).ok === false && S.accion(c.sala, T('Ana'), 'botmas', { asiento: 9 }).ok === false && S.accion(c.sala, T('Ana'), 'botmas', { asiento: 0 }).ok === false, 'un bot solo se sienta en un asiento libre');
  check(m.jugadores.length === 3 && m.porAsiento(3).bot, 'el bot se sienta donde se pidió');
  check(S.accion(c.sala, T('Ana'), 'botmenos', { asiento: 0 }).ok === false && S.accion(c.sala, T('Ana'), 'botmenos', { asiento: 3 }).ok && m.jugadores.length === 2, 'se quita un bot (y solo un bot)');
  S.accion(c.sala, T('Ana'), 'empezar');
  check(S.accion(c.sala, T('Ana'), 'config', { asientos: 5 }).ok === false && S.accion(c.sala, T('Ana'), 'botmas', { asiento: 3 }).ok === false, 'con la partida en marcha ya no se cambia nada');

  const d = crear(S, { juego: 'diezmil', modoDM: 'multi' });
  S.entrar(d.sala, T('Eva'), 'Eva', '');
  const md = S.sala(d.sala).mesa;
  check(S.accion(d.sala, T('Eva'), 'config', { meta: 5000, cupo: true, hostil: false, tomarDados: true, tiempo: 'libre', asientos: 3 }).ok && md.metaBase === 5000 && md.meta === 5000 && md.cupo && !md.hostil && md.tomarDados && md.sinTiempo && md.maxAsientos === 3 && md.jugadores[0].entrado === false, 'el anfitrión cambia las reglas del Diez mil');
  S.accion(d.sala, T('Eva'), 'config', { cupo: false });
  check(md.jugadores[0].entrado === true, 'sin cupo de entrada todos quedan entrados');
  const e = S.estado(d.sala, T('Eva'), -1, x => x); check(e.maxAsientos === 3 && e.tiempoModo === 'libre' && e.metaBase === 5000 && e.publica === false, 'el estado trae las reglas y la visibilidad');
}

// ---------- la corona pasa y las salas vacías se borran ----------
{
  const S = nueva();
  const c = crear(S, { juego: 'diezmil', modoDM: 'multi', publica: true });
  S.entrar(c.sala, T('Ana'), 'Ana', ''); S.entrar(c.sala, T('Beto'), 'Beto', '');
  const m = S.sala(c.sala).mesa;
  check(m.anfitrion().apodo === 'Ana', 'quien llegó primero es el anfitrión');
  S.accion(c.sala, T('Ana'), 'salir');
  check(m.anfitrion().apodo === 'Beto', 'si el anfitrión se va, la corona pasa al siguiente');
  S.accion(c.sala, T('Beto'), 'salir'); S.tic();
  S.reloj.t += 20000; S.tic();
  check(S.sala(c.sala) !== null, 'una sala vacía todavía no se borra a los 20 s');
  S.reloj.t += 12000; S.tic();
  check(S.sala(c.sala) === null, 'una sala que espera y quedó vacía se borra a los 30 s');

  const n = crear(S, { juego: 'trecejack', modoTJ: 'multi', publica: true });
  S.tic(); S.reloj.t += 31000; S.tic();
  check(S.sala(n.sala) === null, 'una mesa libre que se tomó pero nadie entró se borra a los 30 s');
  const k = crear(S, { juego: 'trecejack', modoTJ: 'multi', publica: true });
  S.entrar(k.sala, T('Cai'), 'Cai', '');
  S.reloj.t += 120000; S.tic();
  check(S.sala(k.sala) !== null, 'una sala con alguien conectado no se borra');
}

console.log('pruebas de la sala de espera terminadas, fallos: ' + fallos);
process.exit(fallos ? 1 : 0);
