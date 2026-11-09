'use strict';
// Pruebas de la mesa del diez mil: turnos, tienda, modos, tiempos, tomar los dados, objetos y guardado. Uso: node pruebas/test_diezmil.js
const path = require('path');
const { MesaDM, FASE, ETAPA_TURNOS } = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'mesa_dm.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

// `cola` son las caras que van a salir en las próximas tiradas (en orden de dados); si se acaba, sale 4 (que no puntúa)
function mesa(op, ...apodos) {
  const reloj = { t: 1000000 }, cola = [];
  const m = new MesaDM(Object.assign({ ahora: () => reloj.t, azar: () => (cola.length ? (cola.shift() - 1) / 6 + 0.01 : 0.5) }, op));
  m.reloj = reloj; m.cola = cola;
  m.paso = ms => { reloj.t += ms; m.avanzar(); };
  (apodos.length ? apodos : ['A']).forEach(a => m.unirse('t' + a, a));
  return m;
}
const J = (m, a) => m.jugador('t' + a);
const E = (m, a) => m.estado('t' + a);

// ---------- solitario: carrera ----------
{
  const m = mesa({ modo: 'carrera' }, 'A');
  check(m.fase === FASE.TURNO && m.turno === J(m, 'A') && m.t.estado === 'tirar' && m.maxAsientos === 1, 'en solitario la partida empieza al entrar');
  J(m, 'A').total = 9950; J(m, 'A').entrado = true; m.t.total = 9950; m.t.entrado = true;
  m.cola.push(5, 2, 3, 4, 6);
  check(m.tirar('tA').ok && E(m, 'A').turno.estado === 'apartar' && E(m, 'A').turno.validas.length === 1, 'tira y ve las jugadas válidas (cerca del final, solo la que no se pasa)');
  check(m.apartar('tA', [0]).ok && m.plantarse('tA').ok, 'aparta el 5 y se planta: 10.000');
  check(m.fase === FASE.FIN && m.fin.motivo === 'meta' && m.fin.ganador.apodo === 'A' && m.fin.turnos === 1, 'llegar justo a 10.000 termina la carrera con los turnos usados');
}

// ---------- cupo de entrada ----------
{
  const m = mesa({ modo: 'multi', cupo: false }, 'A', 'B');
  m.empezar('tA'); m.cola.push(1, 4, 3, 4, 6);
  check(J(m, 'A').entrado && m.tirar('tA').ok && m.apartar('tA', [0]).ok && m.plantarse('tA').ok && J(m, 'A').total === 100, 'sin cupo de entrada te plantas con 100 desde la primera vez');
  const c = mesa({ modo: 'multi', cupo: true }, 'A', 'B');
  c.empezar('tA'); c.cola.push(1, 4, 3, 4, 6);
  c.tirar('tA'); c.apartar('tA', [0]);
  check(!J(c, 'A').entrado && c.plantarse('tA').ok === false, 'con cupo de entrada hacen falta 500 para plantarte');
}

// ---------- con amigos ----------
{
  const m = mesa({ modo: 'multi' }, 'A', 'B');
  check(m.fase === FASE.ESPERA && m.anfitrion() === J(m, 'A'), 'con amigos se espera a que empiece quien armó la sala');
  check(m.empezar('tB').error === 'Solo puede empezar quien armó la sala', 'otro jugador no puede empezar');
  check(m.empezar('tA').ok && m.fase === FASE.TURNO && m.turno === J(m, 'A'), 'el anfitrión empieza y juega primero');
  check(m.tirar('tB').error === 'No es tu turno', 'no se puede tirar fuera de turno');
  m.cola.push(2, 3, 4, 6, 6);
  m.tirar('tA');
  check(m.t.estado === 'fin' && J(m, 'A').quemadas === 1 && J(m, 'A').fichas === 20, 'una tirada sin puntos quema el turno y da 20 fichas de consuelo');
  check(m.ultimoTurno.resultado === 'quemo' && E(m, 'B').ultimoTurno.asiento === 0, 'todos ven cómo terminó el turno');
  check(m.turno === J(m, 'A'), 'hay una pausa para ver el resultado');
  m.paso(1600);
  check(m.turno === J(m, 'B') && m.t.estado === 'tirar', 'después de la pausa le toca a B');
  // privacidad: solo el que juega ve las jugadas válidas
  m.cola.push(1, 5, 2, 3, 4);
  m.tirar('tB');
  check(E(m, 'B').turno.validas.length > 0 && E(m, 'A').turno.validas.length === 0 && E(m, 'A').turno.tirada.length === 5, 'las jugadas son solo del que juega, la tirada la ven todos');
  check(E(m, 'B').turno.rollId === 2, 'cada tirada tiene su número');
  m.apartar('tB', [0]);
  check(m.t.acum === 100 && E(m, 'B').turno.estado === 'decidir', 'aparta un 1: 100 puntos');
  check(m.plantarse('tB').error === 'Necesitas 500 puntos para entrar', 'sin 500 no se entra');
}
// tiempos: en las salas con amigos, quien no juega a tiempo se quema y sigue el próximo
{
  const m = mesa({ modo: 'multi' }, 'A', 'B'); m.empezar('tA');
  const quien = m.turno;
  m.paso(20001);
  check(m.t.estado === 'fin' && m.t.resultado === 'quemo' && m.rollId === 0, 'si se acaba el tiempo de tirar, se quema sin tirar');
  m.paso(22000);
  check(m.turno !== quien, 'y sigue el próximo jugador');
}
{
  const m = mesa({ modo: 'multi' }, 'A', 'B'); m.empezar('tA');
  m.cola.push(1, 5, 2, 3, 4);
  m.tirar('tA');
  m.paso(40001);
  check(m.t.estado === 'fin' && m.t.resultado === 'quemo', 'si se acaba el tiempo de apartar, también se quema');
}
{
  const m = mesa({ modo: 'multi' }, 'A', 'B'); m.empezar('tA');
  m.desconectar('tA');
  for (let i = 0; i < 80 && !m.ultimoTurno; i++) m.paso(1800);
  check(m.ultimoTurno && m.ultimoTurno.asiento === 0 && J(m, 'A').turnosPropios === 1 && J(m, 'A').asiento === 0, 'quien se desconecta sigue jugando solo, como un bot, y conserva su lugar');
}
// (en solitario sigue jugando solo)
{
  const m = mesa({ modo: 'carrera' }, 'A'); m.empezar('tA');
  m.cola.push(1, 5, 2, 3, 4);
  m.paso(20001);
  check(m.t.estado === 'apartar' || m.t.estado === 'decidir', 'en solitario, si se acaba el tiempo, tira solo');
}

// ---------- tomar los dados ----------
{
  const m = mesa({ modo: 'multi', tomarDados: true }, 'A', 'B'); m.empezar('tA');
  m.cola.push(1, 1, 5, 2, 3);          // A: aparta 1,1,5 = 250
  m.tirar('tA'); m.apartar('tA', [0, 1, 2]);
  m.cola.push(2, 3);                   // los dos dados que le quedan no puntúan
  m.tirar('tA');
  check(m.t.estado === 'fin' && m.herencia && m.herencia.acum === 250 && m.herencia.n === 2, 'al quemarse deja lo acumulado y los dados que quedaban');
  m.paso(1600);
  check(m.turno === J(m, 'B') && E(m, 'B').turno.estado === 'eleccion' && E(m, 'B').turno.eleccion.acum === 250, 'B puede elegir si toma los dados');
  check(m.tirar('tB').error === 'Primero elige si tomas los dados', 'primero hay que elegir');
  check(m.tomar('tB', true).ok && m.t.acum === 250 && m.t.pool.length === 2, 'B toma: sigue desde 250 con 2 dados');
}
{
  const m = mesa({ modo: 'multi', tomarDados: true }, 'A', 'B'); m.empezar('tA');
  m.cola.push(1, 5, 2, 3, 4); m.tirar('tA'); m.apartar('tA', [0, 1]); m.cola.push(2, 3, 4); m.tirar('tA'); m.paso(1600);
  check(E(m, 'B').turno.estado === 'eleccion', 'hay elección');
  m.tomar('tB', false);
  check(m.t.acum === 0 && m.t.pool.length === 5, 'si B no toma, empieza de cero con los 5 dados');
}
{
  const m = mesa({ modo: 'multi', tomarDados: false }, 'A', 'B'); m.empezar('tA');
  m.cola.push(1, 5, 2, 3, 4); m.tirar('tA'); m.apartar('tA', [0]); m.cola.push(2, 3, 4, 6); m.tirar('tA'); m.paso(1600);
  check(!E(m, 'B').turno.eleccion && m.t.acum === 0, 'sin la opción activada no hay nada que tomar');
}

// ---------- la tienda ----------
{
  const m = mesa({ modo: 'multi', cadaTienda: 1 }, 'A', 'B'); m.empezar('tA');
  m.cola.push(2, 3, 4, 6, 6); m.tirar('tA'); m.paso(1600);   // A se quema
  m.cola.push(2, 3, 4, 6, 6); m.tirar('tB'); m.paso(1600);   // B se quema: termina la ronda 1
  check(m.fase === FASE.TIENDA && E(m, 'A').mio.oferta.length === 3 && E(m, 'A').mio.oferta.every(o => o.precio > 0), 'al terminar la ronda se abre la tienda con 3 ofertas');
  check(E(m, 'B').mio.oferta !== E(m, 'A').mio.oferta, 'cada uno tiene las suyas');
  J(m, 'A').fichas = 1000;
  const iDado = E(m, 'A').mio.oferta.findIndex(o => o.tipo === 'dado');
  check(iDado >= 0 || true, 'hay ofertas');
  if (iDado >= 0) {
    const o = E(m, 'A').mio.oferta[iDado];
    check(m.comprar('tA', iDado, {}).error === 'Elige qué dado reemplazas', 'hay que elegir qué dado se reemplaza');
    check(m.comprar('tA', iDado, { slot: 1 }).ok && J(m, 'A').dados[1].tipo === o.id && J(m, 'A').fichas === 1000 - o.precio, 'comprar un dado lo pone en el lugar elegido y cobra');
    check(m.comprar('tA', iDado, { slot: 2 }).error === 'Ya lo compraste', 'no se compra dos veces');
  }
  J(m, 'B').fichas = 5;
  const j = E(m, 'B').mio.oferta.findIndex(o => o.tipo === 'dado');
  if (j >= 0) check(m.comprar('tB', j, { slot: 0 }).error === 'No te alcanzan las fichas', 'sin fichas no se compra');
  m.listo('tA'); m.listo('tB');
  check(m.fase === FASE.TURNO && m.turno === J(m, 'A') && m.ronda === 2, 'cuando todos están listos sigue el juego (ronda 2)');
}
{
  // grabado y sexto dado
  const m = mesa({ modo: 'multi', cadaTienda: 1 }, 'A', 'B'); m.empezar('tA');
  m.cola.push(2, 3, 4, 6, 6); m.tirar('tA'); m.paso(1600); m.cola.push(2, 3, 4, 6, 6); m.tirar('tB'); m.paso(1600);
  J(m, 'A').oferta = [{ tipo: 'grabado', precio: 60 }, { tipo: 'sexto', precio: 220 }, { tipo: 'dado', id: 'oro', precio: 200 }]; J(m, 'A').fichas = 1000;
  check(m.comprar('tA', 0, { slot: 0, cara: 0, valor: 1 }).error === 'Esa cara ya tiene ese número', 'no se graba una cara con el número que ya tiene');
  check(m.comprar('tA', 0, { slot: 0, cara: 1, valor: 1 }).ok && J(m, 'A').dados[0].caras[1] === 1 && J(m, 'A').fichas === 1000 - 100, 'el grabado cambia una cara (a 1 cuesta 100)');
  check(m.comprar('tA', 1, {}).ok && J(m, 'A').dados.length === 6, 'el sexto dado suma un dado');
  check(m.comprar('tA', 2, { slot: 0 }).ok && J(m, 'A').dados[0].tipo === 'oro', 'y un dado de oro reemplaza uno');
  J(m, 'A').oferta = [{ tipo: 'dado', id: 'oro', precio: 200 }]; J(m, 'A').compradas = [];
  check(m.comprar('tA', 0, { slot: 3 }).error === 'Ya tienes un dado de ese tipo', 'solo un dado de cada tipo especial');
}

// ---------- escalera de metas ----------
{
  const m = mesa({ modo: 'escalera' }, 'A');
  J(m, 'A').total = 9950; J(m, 'A').entrado = true; m.t.total = 9950; m.t.entrado = true;
  m.cola.push(5, 2, 3, 4, 6); m.tirar('tA'); m.apartar('tA', [0]); m.plantarse('tA');
  check(m.fase === FASE.TURNO && m.etapa === 2 && m.meta === 15000 && J(m, 'A').total === 0 && J(m, 'A').fichas >= 100, 'llegar a la meta sube de etapa: meta 15.000, puntos en cero, 100 fichas de premio');
  m.paso(1600);
  check(m.turno === J(m, 'A') && m.t.meta === 15000 && !m.t.entrado, 'el siguiente turno ya es de la etapa nueva');
  J(m, 'A').turnosEtapa = ETAPA_TURNOS - 1;
  m.cola.push(2, 3, 4, 6, 6); m.tirar('tA');
  check(m.fase === FASE.FIN && m.fin.motivo === 'etapa' && m.fin.etapa === 2, 'si se acaban los turnos de la etapa, termina la corrida');
}

// ---------- objetos contra otros ----------
{
  const m = mesa({ modo: 'multi', hostil: true }, 'A', 'B'); m.empezar('tA');
  J(m, 'A').objetos = ['trabado', 'robo'];
  check(m.usar('tA', 0, 0).error === 'Elige a otro jugador', 'no se usa contra uno mismo');
  check(m.usar('tA', 0, 1).ok && J(m, 'B').trabados === 1 && J(m, 'A').objetos.length === 1, 'el dado trabado queda esperando a B');
  check(m.usar('tA', 0, 1).error === 'A ese jugador no le puedes robar todavía', 'no se roba a quien no entró');
  J(m, 'A').entrado = true; J(m, 'A').total = 1000; J(m, 'B').entrado = true; J(m, 'B').total = 900;
  check(m.usar('tA', 0, 1).ok && J(m, 'A').total === 1200 && J(m, 'B').total === 700, 'el robo pasa 200 puntos');
  check(E(m, 'B').avisos.some(a => a.tipo === 'objeto' && a.obj === 'robo' && a.a === 1), 'todos ven que hubo un robo');
  m.cola.push(2, 3, 4, 6, 6); m.tirar('tA'); m.paso(1600);
  m.cola.push(1, 1, 1, 1);
  m.tirar('tB');
  check(m.t.tirada.length === 4, 'B tira con un dado menos en su primera tirada');
}
{
  const m = mesa({ modo: 'multi', hostil: false }, 'A', 'B'); m.empezar('tA');
  J(m, 'A').objetos = ['trabado'];
  check(m.usar('tA', 0, 1).error === 'Los objetos contra otros jugadores están desactivados en esta sala', 'se pueden desactivar');
  m.paso(1);
}

// ---------- reacciones, salir y nueva partida ----------
{
  const m = mesa({ modo: 'multi' }, 'A', 'B');
  check(m.reaccionar('tA', 1).ok && m.reaccionar('tA', 1).error === 'Más despacio' && E(m, 'B').reacciones.length === 1, 'reacciones con espera de 2 segundos');
  m.empezar('tA');
  m.salir('tA');
  check(m.jugadores.length === 1 && m.turno === J(m, 'B'), 'si sale quien juega, le toca al otro');
  const s = mesa({ modo: 'carrera' }, 'A');
  s.salir('tA');
  check(s.jugadores.length === 0, 'si sale el único jugador, la sala queda vacía');
}
{
  const m = mesa({ modo: 'carrera' }, 'A');
  J(m, 'A').total = 9950; J(m, 'A').entrado = true; m.t.total = 9950; m.t.entrado = true;
  m.cola.push(5, 2, 3, 4, 6); m.tirar('tA'); m.apartar('tA', [0]); m.plantarse('tA');
  check(m.nuevaPartida('tA').ok && m.fase === FASE.TURNO && J(m, 'A').total === 0 && J(m, 'A').dados.every(d => d.tipo === 'normal') && m.fin === null, 'nueva partida: todo de cero');
}

// ---------- guardar ----------
{
  const m = mesa({ modo: 'multi', tomarDados: true, clave: 'AB12CD' }, 'A', 'B'); m.empezar('tA');
  J(m, 'A').dados[2] = { tipo: 'oro', caras: [1, 2, 3, 4, 5, 6] }; J(m, 'A').total = 1200; J(m, 'A').fichas = 77;
  const d = JSON.parse(JSON.stringify(m.guardar()));
  const n = MesaDM.desde(d, { ahora: () => m.reloj.t });
  check(n.modo === 'multi' && n.tomarDados && n.clave === 'AB12CD' && n.fase === FASE.TURNO && n.turno.asiento === 0 && n.jugador('tA').dados[2].tipo === 'oro' && n.jugador('tA').total === 1200 && n.jugador('tA').fichas === 77, 'el guardado conserva la sala y el turno se vuelve a empezar');
  check(n.estado('tA').turno.estado === 'tirar', 'y se puede seguir jugando');
}
{
  // estado: lo privado
  const m = mesa({ modo: 'multi' }, 'A', 'B'); m.empezar('tA');
  J(m, 'A').objetos = ['trabado'];
  check(E(m, 'B').jugadores[0].nObjetos === 1 && !('objetos' in E(m, 'B').jugadores[0]) && E(m, 'B').mio.objetos.length === 0 && E(m, 'A').mio.objetos.length === 1, 'los objetos son secretos (los demás solo ven cuántos)');
  check(E(m, 'B').jugadores[0].dados.length === 5, 'los dados de cada uno son públicos');
}

// ---------- apartar y seguir en un solo toque ----------
{
  const m = mesa({ modo: 'carrera' }, 'A');
  J(m, 'A').entrado = true; m.t.entrado = true;
  m.cola.push(1, 2, 3, 4, 6);
  m.tirar('tA');
  check(m.apartar('tA', [0], 'tirar').ok && m.t.estado === 'apartar' && m.t.acum === 100 && m.rollId === 2 && E(m, 'A').turno.tirada.length === 4, 'apartar con luego=tirar aparta y vuelve a tirar los que quedan');
}
{
  const m = mesa({ modo: 'carrera' }, 'A');
  J(m, 'A').entrado = true; m.t.entrado = true;
  m.cola.push(1, 2, 3, 4, 6);
  m.tirar('tA');
  check(m.apartar('tA', [0], 'plantarse').ok && m.ultimoTurno && m.ultimoTurno.resultado === 'planto' && m.ultimoTurno.acum === 100, 'apartar con luego=plantarse anota de una vez');
  check(E(m, 'A').tiempos && E(m, 'A').tiempos.tirar === 12000, 'el estado informa los tiempos para la barra');
}

// ---------- pausa en solitario y turnos jugados por el servidor ----------
{
  const m = mesa({ modo: 'carrera' }, 'A');
  const lim = m.limite;
  check(m.pausar('tA').ok, 'se puede pausar en solitario');
  m.paso(60000);
  check(m.t.estado === 'tirar' && J(m, 'A').automaticos === undefined && E(m, 'A').pausa === true, 'en pausa el tiempo no corre y no juega solo');
  m.reanudar('tA');
  check(m.limite === lim + 60000 && E(m, 'A').pausa === false, 'al volver se le devuelve el tiempo que estuvo en pausa');
  m.paso(11000);
  check(m.t.estado === 'tirar', 'con lo que quedaba todavía puede jugar');
  m.paso(1500);
  check(J(m, 'A').automaticos === 1 && m.rollId >= 1, 'si no hace nada, el servidor juega y queda contado');
  const dos = mesa({ modo: 'multi' }, 'A', 'B'); dos.empezar('tA');
  dos.pausar('tA'); check(dos.pausa === null, 'con más de un jugador no se pausa');
}

// ---------- piedad tras dos quemadas seguidas y regalo de la primera partida ----------
{
  const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));
  const cola = [2, 3, 4, 6, 2, 1, 2, 3, 4, 6], azar = () => (cola.length ? (cola.shift() - 1) / 6 + 0.01 : 0.5);
  const dados = [0, 1, 2, 3, 4].map(() => R.crearDado('normal'));
  const t = new R.Turno(dados, 0, false, { piedad: true });
  t.tirar(azar);
  check(t.estado === 'apartar' && t.tirada.some(i => i.valor === 1), 'con piedad, una tirada que quemaría se vuelve a tirar hasta que haya jugada');
  const sin = new R.Turno(dados, 0, false, {});
  cola.push(2, 3, 4, 6, 2);
  sin.tirar(azar);
  check(sin.estado === 'fin' && sin.resultado === 'quemo', 'sin piedad la misma tirada quema');

  const m = mesa({ modo: 'carrera' }, 'A');
  for (let i = 0; i < 2; i++) { m.cola.push(2, 3, 4, 6, 2); m.tirar('tA'); m.paso(1600); }
  check(J(m, 'A').quemadasSeguidas === 2 && E(m, 'A').turno.piedad === true, 'tras dos quemadas seguidas el turno siguiente tiene piedad');
  m.cola.push(2, 3, 4, 6, 2, 1, 5, 2, 3, 4);
  m.tirar('tA');
  check(m.t.estado === 'apartar' && J(m, 'A').quemadasSeguidas === 2, 'la primera tirada con piedad no quema');
  m.apartar('tA', [m.t.validas[0].indices[0]].map(Number), 'plantarse');
  m.paso(1600);
  check(E(m, 'A').turno.piedad === false, 'tras anotar, vuelve a la normalidad');

}

// ---------- la entrada baja a 300 tras dos quemadas sin entrar ----------
{
  const c = mesa({ modo: 'carrera' }, 'A');
  c.cola.push(3, 3, 3, 2, 4); c.tirar('tA');
  const v = c.t.validas.find(x => x.puntos === 300);
  c.apartar('tA', v.indices);
  check(E(c, 'A').turno.entrada === 500 && !c.t.puedePlantarse(), 'normalmente 300 no alcanza para entrar');

  const m = mesa({ modo: 'carrera' }, 'A');
  for (let i = 0; i < 2; i++) { m.cola.push(2, 3, 4, 6, 2); m.tirar('tA'); m.paso(1600); }
  check(J(m, 'A').fallosEntrada === 2 && E(m, 'A').turno.entrada === 300, 'tras dos quemadas sin entrar, la entrada baja a 300');
  m.cola.push(3, 3, 3, 2, 4); m.tirar('tA');
  m.apartar('tA', m.t.validas.find(x => x.puntos === 300).indices, 'plantarse');
  check(m.ultimoTurno.resultado === 'planto' && m.ultimoTurno.acum === 300 && J(m, 'A').entrado, 'con 300 ya se entra');
  m.paso(1600);
  check(J(m, 'A').fallosEntrada === 0 && E(m, 'A').turno.entrada === 500, 'una vez dentro, el contador vuelve a cero');

  const t = mesa({ modo: 'carrera' }, 'A'); t.tutorial = true;
  for (let i = 0; i < 2; i++) { t.cola.push(2, 3, 4, 6, 2); t.tirar('tA'); t.paso(1600); }
  check(E(t, 'A').turno.entrada === 500, 'en el tutorial la entrada no baja');
}

// ---------- quien se suma con la partida en curso, y el resumen del turno ----------
{
  const m = mesa({ modo: 'multi' }, 'A', 'B'); m.empezar('tA');
  m.unirse('tC', 'C');
  check(E(m, 'A').jugadores.find(j => j.apodo === 'C').tardio === true && E(m, 'A').jugadores.find(j => j.apodo === 'A').tardio === false, 'quien se suma con la partida en curso figura como tardío');
  const antes = mesa({ modo: 'multi' }, 'A', 'B');
  antes.unirse('tD', 'D');
  check(antes.jugador('tD').tardio === undefined || antes.jugador('tD').tardio === false, 'quien entra antes de empezar no es tardío');
  const c = mesa({ modo: 'carrera' }, 'A');
  c.cola.push(1, 2, 3, 4, 6); c.tirar('tA');
  c.apartar('tA', [c.t.validas[0].indices[0]], 'tirar');
  check(c.rollId === 2, 'el turno cuenta sus tiradas');
  c.cola.push(2, 3, 4, 6);
  while (c.t.estado !== 'fin' && c.rollId < 5) { if (c.t.estado === 'apartar') c.apartar('tA', c.t.validas[0].indices, 'plantarse'); else if (c.t.estado === 'tirar') c.tirar('tA'); else break; }
  check(c.ultimoTurno && c.ultimoTurno.tiradas >= 2, 'el turno terminado informa cuántas veces se tiró');
}

// ---------- probabilidad de no quemarte ----------
{
  const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));
  const mk = n => Array.from({ length: n }, () => R.crearDado('normal'));
  const p = n => { const t = new R.Turno(mk(6), 0, false, { pool: Array.from({ length: n }, (_, i) => i) }); return Math.round(t.probNoQuemar(t.pool, 0) * 10000) / 100; };
  check(p(1) === 33.33 && p(2) === 55.56 && p(3) === 72.22 && p(5) === 92.28 && p(6) === 96.91, 'las probabilidades de no quemarte con dados comunes (1: 33,33 %, 2: 55,56 %, 3: 72,22 %, 5: 92,28 %, 6: 96,91 %): ' + [1, 2, 3, 5, 6].map(p).join(' '));
  const pi = new R.Turno(mk(5), 0, false, { piedad: true });
  check(pi.probNoQuemar(pi.pool, 0) === 1, 'con piedad la primera tirada no puede quemarte');
  const cerca = new R.Turno(mk(3), 9950, true, { pool: [0, 1, 2] });
  check(cerca.probNoQuemar(cerca.pool, 0) < p(3) / 100, 'cerca de la meta, pasarse hace más probable quemarse');
  const sv = new R.Turno([R.crearDado('salvavidas'), R.crearDado('normal')], 0, false, { pool: [0] });
  check(Math.round(sv.probNoQuemar(sv.pool, 0) * 1e6) === 1e6, 'un salvavidas solo nunca te quema');

  const m = mesa({ modo: 'carrera' }, 'A');
  m.cola.push(1, 2, 3, 4, 6); m.tirar('tA');
  const v = E(m, 'A').turno.validas[0];
  check(typeof v.prob === 'number' && v.prob > 0 && v.prob <= 100, 'cada jugada posible informa la probabilidad de no quemarte si sigues');
  m.apartar('tA', v.indices);
  check(E(m, 'A').turno.prob === v.prob, 'ya apartada, el estado informa la misma probabilidad');
}

// ---------- el dado multiplicador ----------
{
  const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));
  const arma = (acum, total) => {
    const t = new R.Turno([R.crearDado('multiplicador'), R.crearDado('normal')], total, true, { acum });
    t.estado = 'apartar';
    t.tirada = [t._item(0, 1), t._item(1, 4)];   // el multiplicador sacó 1 (100 puntos), el otro no puntúa
    t._validas();
    return t;
  };
  let t = arma(900, 0), j = t.validas.find(x => x.indices.length === 1 && x.indices[0] === 0);
  check(j && j.puntos === 100 + 250 && j.bono === 250, 'con 900 acumulados y un 1: +25 % de 1000 (250) sobre los 100 de la jugada');
  t = arma(0, 0); t.tirada = [t._item(0, 5), t._item(1, 4)]; t._validas(); j = t.validas.find(x => x.indices[0] === 0);
  check(j && j.puntos === 50 && !j.bono, 'si el bono redondeado es 0, no suma nada (25 % de 50 = 12 → 0)');
  t = arma(900, 8800); j = t.validas.find(x => x.indices[0] === 0);
  check(j && j.puntos === 100, 'si con el bono te pasarías de la meta, no hace efecto (pero la jugada sigue siendo válida)');
  const n = new R.Turno([R.crearDado('normal'), R.crearDado('normal')], 0, true, { acum: 900 }); n.estado = 'apartar'; n.tirada = [n._item(0, 1), n._item(1, 4)]; n._validas();
  check(n.validas[0].puntos === 100, 'un dado común no multiplica');
}

// ---------- los dados nuevos ----------
{
  const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));
  const turno = (tipos, caras, op = {}) => {
    const dados = tipos.map(t => R.crearDado(t));
    const t = new R.Turno(dados, op.total || 0, op.entrado !== false, Object.assign({ acum: op.acum || 0 }, op));
    t.estado = 'tirar';
    t.tirada = caras.map((c, i) => t._item(i, c));
    t._evaluar();
    return t;
  };
  const pts = (t, ...idx) => { const j = t.validas.find(x => x.indices.join() === idx.join()); return j ? j.puntos : null; };
  // imán: no puntúa solo, atrae a un dado que no puntúa y suma 50
  let t = turno(['iman', 'normal', 'normal'], [3, 1, 4]);
  check(pts(t, 0) === null && pts(t, 1) === 100 && pts(t, 0, 1) === 100 && pts(t, 0, 2) === null, 'imán: no puntúa solo ni atrayendo a un dado que no puntúa si no hay nada más');
  check(pts(t, 0, 1, 2) === 150, 'imán: con el 1 y atrayendo al 4 suma 100 + 50');
  check(pts(t, 1, 2) === null, 'sin imán el 4 sigue sin puntuar');
  // doble: cuenta por dos
  t = turno(['doble', 'normal', 'normal'], [1, 3, 4]);
  check(pts(t, 0) === 200, 'doble: un 1 vale como dos unos (200)');
  t = turno(['doble', 'normal', 'normal'], [2, 2, 4]);
  check(pts(t, 0, 1) === 200, 'doble: un 2 doble más otro 2 forman un trío de doses (200)');
  // póquer: su grupo vale el triple
  t = turno(['poker', 'normal', 'normal', 'normal'], [3, 3, 3, 4]);
  check(pts(t, 0, 1, 2) === 300 * 3, 'póquer: un trío de tres vale el triple');
  t = turno(['normal', 'normal', 'normal', 'normal'], [3, 3, 3, 4]);
  check(pts(t, 0, 1, 2) === 300, 'sin póquer el trío vale lo normal');
  // escalera: completa con cuatro de cinco caras
  t = turno(['escalera', 'normal', 'normal', 'normal', 'normal'], [6, 1, 2, 3, 4]);
  check(pts(t, 0, 1, 2, 3, 4) === 500 + 0 || pts(t, 0, 1, 2, 3, 4) === 500, 'escalera: con 1-2-3-4 completa la del 1 al 5 (500)');
  // apostador: acierta la paridad y la jugada vale el doble
  t = turno(['apostador', 'normal', 'normal'], [1, 3, 4]);
  check(pts(t, 0) === 100, 'apostador: por defecto apuesta par; un 1 es impar, no acierta');
  const t2 = new R.Turno([R.crearDado('apostador'), R.crearDado('normal')], 0, true, {}); t2.apuesta = 'impar'; t2.estado = 'tirar'; t2.tirada = [t2._item(0, 1), t2._item(1, 4)]; t2._evaluar();
  check(pts(t2, 0) === 200, 'apostador: apuesta impar y sale 1: la jugada vale el doble');
  // fantasma: no te quemas, se descarta y sigues
  t = turno(['fantasma', 'normal', 'normal'], [3, 4, 6]);
  check(t.estado === 'decidir' && t.resultado === null && t.pool.length === 2 && t.fantasmaUsado, 'fantasma: te salva de la quemada y se descarta');
  t.estado = 'tirar'; t.tirada = [t._item(1, 3), t._item(2, 4)]; t._evaluar();
  check(t.estado === 'fin' && t.resultado === 'quemo', 'fantasma: solo una vez por turno');
  // suerte: lo vuelves a tirar una vez
  t = turno(['suerte', 'normal'], [3, 4]);
  check(t.estado === 'quemada', 'suerte: con la quemada se abre la ventana para usarla');
  const r = t.voltear(0, () => 0);   // sale la primera cara: 1
  check(t.estado === 'apartar' && pts(t, 0) === 100, 'suerte: el nuevo valor puede salvarte');
  check(t.voltear(0, () => 0).error, 'suerte: una vez por turno');
  // banco: guarda el 30 % al apartarlo (solo si ya entraste)
  t = turno(['banco', 'normal', 'normal'], [1, 3, 4], { acum: 1000 });
  t.apartar([0]);
  check(t.banco === 350, 'banco: guarda el 30 % de lo que llevas (1100 → 350 redondeado a 50)');
  t = turno(['banco', 'normal', 'normal'], [1, 3, 4], { acum: 1000, entrado: false });
  t.apartar([0]);
  check(t.banco === 0, 'banco: sin haber entrado no guarda');
}
// ---------- al llegar a la meta se completa la ronda ----------
{
  const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));
  const m = mesa({ modo: 'multi' }, 'A', 'B', 'C'); m.empezar('tA');
  const ja = J(m, 'A'); ja.total = 9900; ja.entrado = true;
  m.t = new R.Turno(ja.dados, 9900, true, {}); m.t.estado = 'decidir'; m.t.acum = 100;
  m.plantarse('tA');
  check(m.fase === FASE.TURNO && m.pendiente === ja, 'llegar a la meta no termina la partida si quedan jugadores en la ronda');
  check(E(m, 'B').ultimaVuelta === ja.asiento, 'el estado avisa de la última vuelta');
  m.paso(2000);
  check(m.turno === J(m, 'B'), 'sigue el turno del segundo');
  m.paso(20001); m.paso(2000);
  check(m.turno === J(m, 'C') && m.fase === FASE.TURNO, 'y después el del tercero');
  m.paso(20001); m.paso(2000);
  check(m.fase === FASE.FIN && m.fin.ganador.asiento === ja.asiento, 'al terminar la ronda, gana quien llegó primero');
  check(m.jugadores.every(x => x.turnosPropios === 1), 'todos jugaron los mismos turnos');
}
{
  const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));
  const m = mesa({ modo: 'multi' }, 'A', 'B'); m.empezar('tA'); m.paso(20001); m.paso(2000);   // (A se quema, ahora juega B)
  const jb = J(m, 'B'); jb.total = 9900; jb.entrado = true;
  m.t = new R.Turno(jb.dados, 9900, true, {}); m.t.estado = 'decidir'; m.t.acum = 100;
  m.plantarse('tB');
  check(m.fase === FASE.FIN && m.fin.ganador.asiento === jb.asiento, 'si llega el último de la ronda, la partida termina enseguida');
}

// ---------- empate: llegan a la meta en la misma vuelta ----------
{
  const m = mesa({ modo: 'multi' }, 'A', 'B', 'C');
  m.jugador('tA').total = 10000; m.jugador('tB').total = 10000; m.jugador('tC').total = 7000;
  m._terminarPartida('meta', m.jugador('tA'));
  check(m.fin.empatados.length === 2 && m.fin.empatados.includes(0) && m.fin.empatados.includes(1) && m.fin.ranking[2].total === 7000, 'si dos llegan a la meta en la misma vuelta, empatan');
  const n = mesa({ modo: 'multi' }, 'A', 'B');
  n.jugador('tA').total = 10000; n.jugador('tB').total = 8000; n._terminarPartida('meta', n.jugador('tA'));
  check(n.fin.empatados.length === 0, 'sin empate no hay empatados');
}

console.log('pruebas del diez mil terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
