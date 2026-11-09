'use strict';
// Pruebas de las salas del Diez mil: crear según el modo, la clave de 6 caracteres, las acciones, el guardado, el tutorial, el tiempo y el registro de partidas. Uso: node pruebas/test_salas_dm.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Salas } = require(path.join(__dirname, '..', 'servidor', 'salas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };
const T = n => 'token' + n + 'abcdefghijklmnop';

// ---------- crear según el modo ----------
{
  const S = new Salas({ archivo: null });
  const d = S.crear({ juego: 'diezmil', modoDM: 'escalera', tomarDados: true, hostil: true });
  const m = S.sala(d.sala).mesa;
  check(d.ok && d.juego === 'diezmil' && m.juego === 'diezmil' && m.modo === 'escalera' && m.tomarDados === true && m.maxAsientos === 1, 'se crea una sala de diez mil con su modo');
  const mu = S.sala(S.crear({ juego: 'diezmil', modoDM: 'multi', tomarDados: true, hostil: false }).sala).mesa;
  check(mu.modo === 'multi' && mu.tomarDados && !mu.hostil && mu.maxAsientos === 8, 'con amigos: hasta 8 jugadores, tomar los dados y objetos se eligen');
  // el cupo de entrada: apagado por omisión con amigos, elegible, y en solitario rige siempre
  check(mu.cupo === false, 'el cupo de entrada empieza apagado');
  const mc = S.sala(S.crear({ juego: 'diezmil', modoDM: 'multi', cupo: true }).sala).mesa;
  check(mc.cupo === true && mc.estado('x').cupo === true, 'el cupo de entrada se puede encender y viaja en el estado');
  check(m.cupo === true, 'en solitario el cupo rige siempre');
  mu.unirse(T(1), 'Ana'); mu.unirse(T(2), 'Beto'); mc.unirse(T(3), 'Cai');
  check(mu.jugadores.every(j => j.entrado) && mc.jugadores.every(j => !j.entrado), 'sin cupo todos nacen entrados; con cupo no');
  const { MesaDM } = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'mesa_dm.js'));
  check(MesaDM.desde(mc.guardar()).cupo === true && MesaDM.desde(mu.guardar()).cupo === false, 'el cupo sobrevive al guardado');
  const x = S.sala(S.crear({ juego: 'diezmil', modoDM: 'raro' }).sala).mesa;
  check(x.modo === 'multi', 'un modo que no existe pasa a con amigos');
  check(S.info(d.sala).juego === 'diezmil' && S.info('ZZZZ').ok === false, 'info dice qué juego es la sala');
  check(S.crear({ juego: 'otro' }).ok === false && S.crear({ juego: 'otro', tutorial: true }).ok === false, 'un juego que no existe no se crea (ni siquiera de práctica)');
}

// ---------- la clave ----------
{
  const S = new Salas({ archivo: null });
  const c = S.crear({ juego: 'diezmil', clave: true, modoDM: 'multi' });
  const clave = S.sala(c.sala).mesa.clave;
  check(c.conClave && /^[A-Z2-9]{6}$/.test(clave) && c.clave === clave, 'la sala con clave tiene una clave de 6 caracteres (y quien la crea la recibe)');
  check(S.info(c.sala).conClave === true, 'info avisa que pide clave');
  const sin = S.entrar(c.sala, T(1), 'Ana');
  check(!sin.ok && sin.pideClave === true && sin.error === 'Esta sala tiene clave', 'sin clave no se entra');
  const mal = S.entrar(c.sala, T(1), 'Ana', 'AAAAAA');
  check(!mal.ok && mal.pideClave === true && mal.error === 'La clave no es correcta', 'con una clave incorrecta tampoco');
  check(S.entrar(c.sala, T(1), 'Ana', clave.toLowerCase()).ok, 'con la clave correcta (aunque esté en minúsculas) se entra');
  check(S.entrar(c.sala, T(1), 'Ana').ok, 'quien ya está dentro vuelve sin clave');
  let e = null; S.estado(c.sala, T(1), -1, x => { e = x; });
  check(e && e.clave === clave, 'quien está en la sala ve la clave');
  let af = null; S.estado(c.sala, T(9), -1, x => { af = x; });
  check(af && af.clave === null, 'quien no está en la sala no la ve');
  const libre = S.crear({ juego: 'diezmil', modoDM: 'multi' });
  check(libre.conClave === false && S.entrar(libre.sala, T(2), 'Beto').ok && S.sala(libre.sala).mesa.clave === null, 'sin clave se entra normalmente');
}

// ---------- las acciones ----------
{
  const S = new Salas({ archivo: null });
  const d = S.crear({ juego: 'diezmil', modoDM: 'multi', hostil: true });
  S.entrar(d.sala, T(1), 'Ana'); S.entrar(d.sala, T(2), 'Beto');
  check(S.accion(d.sala, T(1), 'apostar').error === 'Acción desconocida', 'una acción que no es del juego no existe');
  check(S.accion(d.sala, T(2), 'empezar').error === 'Solo puede empezar quien armó la sala', 'solo empieza el anfitrión');
  check(S.accion(d.sala, T(1), 'empezar').ok, 'el anfitrión empieza');
  const r = S.accion(d.sala, T(1), 'tirar');
  check(r.ok && S.sala(d.sala).mesa.rollId === 1, 'tirar llega a la mesa');
  let e = null; S.estado(d.sala, T(2), -1, x => { e = x; });
  check(e.juego === 'diezmil' && e.jugadores.length === 2 && e.turno && e.turno.rollId === 1, 'el estado llega por la red');
}

// ---------- guardado ----------
{
  const archivo = path.join(os.tmpdir(), 'salas_dm_prueba_' + process.pid + '.json');
  try { fs.unlinkSync(archivo); } catch (x) { /* no existía */ }
  const S = new Salas({ archivo });
  const d = S.crear({ juego: 'diezmil', modoDM: 'multi', clave: true });
  S.entrar(d.sala, T(1), 'Ana', S.sala(d.sala).mesa.clave); S.entrar(d.sala, T(2), 'Beto', S.sala(d.sala).mesa.clave);
  S.accion(d.sala, T(1), 'empezar');
  const claveD = S.sala(d.sala).mesa.clave;
  S.tic(); S.tic();
  const S2 = new Salas({ archivo });
  const m2 = S2.sala(d.sala) && S2.sala(d.sala).mesa;
  check(m2 && m2.juego === 'diezmil' && m2.fase === 'turno' && m2.clave === claveD && m2.jugadores.length === 2, 'una sala de diez mil se recupera tras un reinicio, con su clave');
  try { fs.unlinkSync(archivo); } catch (x) { /* nada */ }
}

// ---------- salas de tutorial ----------
{
  const S = new Salas({ archivo: null });
  const c = S.crear({ juego: 'diezmil', tutorial: true });
  check(c.ok && c.tutorial && c.juego === 'diezmil' && S.sala(c.sala).mesa.tutorial === true, 'se crea una sala de práctica');
  S.entrar(c.sala, T(1), 'Ana');
  check(S.accion(c.sala, T(1), 'tut', { cola: [1, 5, 2, 3, 6] }).ok, 'el guion prepara lo que va a salir');
  const normal = S.crear({ juego: 'diezmil' });
  S.entrar(normal.sala, T(2), 'Beto');
  check(S.accion(normal.sala, T(2), 'tut', {}).error === 'Acción desconocida', 'una sala común no acepta el guion');
  S.accion(c.sala, T(1), 'tirar');
  check(S.sala(c.sala).mesa.t.tirada.map(x => x.valor).join() === '1,5,2,3,6', 'el diez mil de práctica tira los dados del guion');
  S.accion(c.sala, T(1), 'tut', { total: 9950, entrado: true });
  check(S.sala(c.sala).mesa.jugador(T(1)).total === 9950, 'el guion puede poner los puntos');
  S.accion(c.sala, T(1), 'salir');
  check(!S.sala(c.sala), 'al salir se borra la sala de práctica');
  const archivo = path.join(os.tmpdir(), 'salas_tut_prueba_' + process.pid + '.json');
  const S2 = new Salas({ archivo }); S2.crear({ juego: 'diezmil', tutorial: true }); S2._sucio = true; S2.tic(); S2.tic();
  check(!fs.existsSync(archivo) || Object.keys(JSON.parse(fs.readFileSync(archivo, 'utf8'))).length === 0, 'las salas de práctica no se guardan');
  try { fs.unlinkSync(archivo); } catch (x) { /* nada */ }
}

// ---------- meta corta ----------
{
  const S = new Salas({ archivo: null });
  const c = S.crear({ juego: 'diezmil', modoDM: 'carrera', metaDM: 5000 });
  check(c.metaDM === 5000 && S.sala(c.sala).mesa.meta === 5000, 'la meta corta de 5.000 llega a la mesa');
  check(S.crear({ juego: 'diezmil', metaDM: 123 }).metaDM === 10000, 'una meta que no existe pasa a 10.000');
}

// ---------- tiempo: normal, extendido y sin límite ----------
{
  const S = new Salas({ archivo: null });
  check(S.crear({ juego: 'diezmil', modoDM: 'multi', tiempo: 'raro' }).tiempo === 'normal', 'un tiempo que no existe pasa a normal');
  const dn = S.sala(S.crear({ juego: 'diezmil', modoDM: 'multi' }).sala).mesa, de = S.sala(S.crear({ juego: 'diezmil', modoDM: 'multi', tiempo: 'extendido' }).sala).mesa;
  const cl = S.crear({ juego: 'diezmil', modoDM: 'multi', tiempo: 'libre' }); const dl = S.sala(cl.sala).mesa;
  const solo = S.crear({ juego: 'diezmil', modoDM: 'carrera', tiempo: 'normal' }), ts = S.crear({ juego: 'trecejack', modoTJ: 'solo', tiempo: 'extendido' });
  check(solo.tiempo === 'libre' && S.sala(solo.sala).mesa.sinTiempo === true && ts.tiempo === 'libre' && S.sala(ts.sala).mesa.tiempos.turno === 3600000 && S.sala(ts.sala).mesa.sinTiempo === true, 'en solitario (de los dos juegos) no corre el tiempo, aunque se pida otro'); 
  const tm = S.sala(S.crear({ juego: 'trecejack', modoTJ: 'multi', tiempo: 'extendido' }).sala).mesa;
  check(tm.tiempos.turno === 40000 && !tm.sinTiempo, 'con amigos el tiempo extendido duplica el del turno (13 Jack)');
  check(dn.tiempos.tirar === 12000 && de.tiempos.tirar === 24000 && de.tiempos.apartar === 30000 && dl.tiempos.tirar === 3600000, 'diez mil: extendido y libre');
  S.entrar(cl.sala, T(2), 'Beto');
  let est = null; S.estado(cl.sala, T(2), -1, x => { est = x; });
  check(est.sinTiempo === true, 'una sala sin límite avisa al cliente para que no muestre relojes');
}

// ---------- 13 Jack: objetivo por mazos o por puntos ----------
{
  const S = new Salas({ archivo: null });
  const a = S.crear({ juego: 'trecejack', modoTJ: 'multi', objetivoTJ: 'puntos', puntosTJ: 650 }), b = S.crear({ juego: 'trecejack', modoTJ: 'multi', mazosTJ: 8 }), c = S.crear({ juego: 'trecejack', objetivoTJ: 'raro', puntosTJ: 7 });
  check(a.objetivoTJ === 'puntos' && a.puntosTJ === 650 && S.sala(a.sala).mesa.objetivo === 'puntos' && S.sala(a.sala).mesa.metaPuntos === 650, 'una sala de 13 Jack por puntos');
  check(b.objetivoTJ === 'mazos' && S.sala(b.sala).mesa.mazos === 8, 'por mazos (lo de siempre)');
  check(c.objetivoTJ === 'mazos' && c.puntosTJ === 400, 'un objetivo o meta que no existe pasa al de siempre');
}

// ---------- registro de partidas de Diez mil ----------
{
  const archivo = path.join(os.tmpdir(), 'salas_reg_prueba_' + process.pid + '.json');
  const archivoPartidas = path.join(os.tmpdir(), 'partidas_dm.jsonl');
  try { fs.unlinkSync(archivoPartidas); } catch (x) { /* no existía */ }
  const S = new Salas({ archivo });
  const c = S.crear({ juego: 'diezmil', modoDM: 'carrera' }), s = S.sala(c.sala), m = s.mesa;
  S.entrar(c.sala, T(1), 'Ana');
  const j = m.jugador(T(1)); j.turnosPropios = 12; j.compras = ['oro'];
  m._terminarPartida('meta', j);
  S._avisar(s); S._avisar(s);
  const lineas = fs.existsSync(archivoPartidas) ? fs.readFileSync(archivoPartidas, 'utf8').trim().split('\n') : [];
  const reg = lineas.length ? JSON.parse(lineas[0]) : {};
  check(lineas.length === 1 && reg.modo === 'carrera' && reg.jugadores[0].turnos === 12 && reg.jugadores[0].compras[0] === 'oro' && !JSON.stringify(reg).includes('Ana'), 'se anota una sola vez cada partida, sin apodos');
  try { fs.unlinkSync(archivoPartidas); fs.unlinkSync(archivo); } catch (x) { /* nada */ }
}

console.log('pruebas de las salas del diez mil terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
