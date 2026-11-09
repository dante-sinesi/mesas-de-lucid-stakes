'use strict';
// Pruebas de las reglas del diez mil: puntajes, comodines, dados especiales y el turno. Uso: node pruebas/test_diezmil_reglas.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };
const it = (valor, extra = {}) => Object.assign({ valor }, extra);
const p = (...v) => R.puntuar(v.map(x => (typeof x === 'object' ? x : it(x))));

// ---------- puntaje ----------
check(p(1) === 100 && p(5) === 50 && p(1, 1) === 200 && p(1, 5) === 150 && p(5, 5) === 100, 'los 1 valen 100 y los 5 valen 50');
check(p(2) === null && p(1, 2) === null && p(3, 3) === null && p(6, 6, 1) === null, 'un dado que no puntúa invalida la jugada');
check(p(1, 1, 1) === 1000 && p(2, 2, 2) === 200 && p(3, 3, 3) === 300 && p(4, 4, 4) === 400 && p(5, 5, 5) === 500 && p(6, 6, 6) === 600, 'los tríos');
check(p(1, 1, 1, 1) === 2000 && p(3, 3, 3, 3) === 600 && p(5, 5, 5, 5) === 1000, 'cuatro iguales valen el doble del trío');
check(p(2, 2, 2, 2, 2) === 5000 && p(1, 1, 1, 1, 1) === 5000, 'cinco iguales valen 5000');
check(p(1, 2, 3, 4, 5) === 500 && p(2, 3, 4, 5, 6) === 750, 'las escaleras');
check(p(1, 2, 3, 4, 6) === null, 'sin escalera completa no puntúa');
check(p(3, 3, 3, 1, 5) === 450 && p(2, 2, 2, 5, 5) === 300, 'un trío más sueltos');
check(p(1, 1, 1, 5, 5) === 1100, 'trío de 1 y dos 5');
check(p(1, 2, 3, 4, 5, 5) === 550 && p(1, 1, 2, 3, 4, 5) === 600 && p(2, 3, 4, 5, 6, 6) === null, 'con seis dados: escalera más un suelto, y si el sobrante no puntúa no vale');
check(p(2, 2, 2, 2, 2, 1) === 5100 && p(6, 6, 6, 6, 6, 6) === null, 'seis dados: cinco iguales más un suelto');

// ---------- dados especiales ----------
check(p(it(1, { oro: true })) === 200 && p(it(1, { oro: true }), 5) === 300, 'un dado de oro duplica el conjunto que lo incluye');
check(p(it(1, { explosivo: true })) === 600 && p(it(5, { explosivo: true })) === 50, 'el explosivo suma 500 si sale 1');
check(p(it(2, { comodin: true }), 3, 3) === 150 && p(it(2, { comodin: true }), 6, 6) === 300, 'un comodín completa un trío con la cara que convenga (el conjunto vale la mitad)');
check(p(it(4, { comodin: true })) === null && p(it(4, { comodin: true }), 1) === null, 'un comodín solo (o con un suelto) no puntúa');
check(p(it(6, { comodin: true }), 1, 2, 3, 4) === 250, 'un comodín completa una escalera (vale la mitad)');
check(p(it(3, { comodin: true }), it(3, { comodin: true }), 1, 1, 1) === 2500, 'dos comodines con tres 1: el mejor reparto (cinco 1 = 5000, a la mitad)');

// ---------- jugadas ----------
const jug = vals => R.jugadas(vals.map(v => it(v)));
check(jug([1, 5, 2, 3, 6]).map(j => j.puntos).sort((a, b) => a - b).join() === '50,100,150', 'las jugadas de una tirada con un 1 y un 5');
check(jug([2, 3, 4, 6, 6]).length === 0, 'una tirada sin 1, 5 ni tríos no tiene jugadas');
check(jug([3, 3, 3, 4, 6]).some(j => j.puntos === 300 && j.indices.join() === '0,1,2'), 'el trío de 3 es una jugada');

// ---------- el turno ----------
const dados5 = () => [0, 1, 2, 3, 4].map(() => R.crearDado('normal'));
const azarDe = valores => { let i = 0; return () => (valores[i++ % valores.length] - 1) / 6 + 0.01; };   // devuelve la cara pedida
{
  const t = new R.Turno(dados5(), 0, false);
  let r = t.tirar(azarDe([1, 5, 2, 3, 6]));
  check(r.ok && !r.quemada && t.estado === 'apartar', 'una tirada con puntos deja apartar');
  check(!t.apartar([2]).ok && t.apartar([0]).ok && t.acum === 100 && t.pool.length === 4, 'apartar un 1: 100 puntos y quedan 4 dados');
  check(!t.puedePlantarse() && t.plantarse().ok === false, 'sin 500 no se puede entrar');
  t.seguir();
  r = t.tirar(azarDe([1, 1, 5, 5, 2]));
  check(!r.quemada && t.apartar([0, 1, 2, 3]).ok && t.acum === 100 + 300 && t.pool.length === 0 + 5, 'si apartas todos los dados puntúan: dados calientes (vuelves a tener 5)');
  check(t.puedePlantarse() === false, 'con 400 todavía no alcanza para entrar');
  t.seguir();
  t.tirar(azarDe([1, 2, 3, 4, 6]));
  t.apartar([0]);
  check(t.puedePlantarse() && t.plantarse().ok && t.total === 500 && t.entrado && t.resultado === 'planto', 'con 500 se entra y se anota');
}
{
  const t = new R.Turno(dados5(), 0, false);
  const r = t.tirar(azarDe([2, 3, 4, 6, 6]));
  check(r.quemada && !r.ventana && t.estado === 'fin' && t.resultado === 'quemo' && t.motivo === 'sin_jugada', 'una tirada sin puntos quema el turno');
}
{
  // ya entró: se puede plantar con poco
  const t = new R.Turno(dados5(), 9000, true);
  t.tirar(azarDe([5, 2, 3, 4, 6]));
  t.apartar([0]);
  check(t.puedePlantarse() && t.plantarse().total === 9050, 'quien ya entró se planta con cualquier cantidad');
}
// llegar justo a 10.000
{
  const t = new R.Turno(dados5(), 9950, true);
  t.tirar(azarDe([1, 5, 2, 3, 4]));
  check(t.estado === 'apartar' && t.validas.length > 0 && t.validas.every(j => j.puntos === 50), 'cerca del final solo valen las jugadas que no se pasan de 10.000');
  t.apartar([1]);
  check(t.plantarse().ok && t.total === 10000 && t.resultado === 'gano', 'llegar justo a 10.000 gana');
}
{
  const t = new R.Turno(dados5(), 9950, true);
  const r = t.tirar(azarDe([1, 1, 2, 3, 4]));
  check(r.quemada && t.motivo === 'pasado', 'si todas las jugadas se pasarían de 10.000, se quema (pasado)');
}
// salvavidas
{
  const d = dados5(); d[2] = R.crearDado('salvavidas');
  const t = new R.Turno(d, 0, false);
  const r = t.tirar(azarDe([2, 3, 4, 6, 3]));
  check(!r.quemada && t.estado === 'apartar' && t.validas.some(j => j.puntos === 50), 'el salvavidas cuenta como un 5 si te quemarías');
  t.apartar([t.validas[0].indices[0]]); t.seguir();
  const r2 = t.tirar(azarDe([2, 3, 4, 6]));
  check(r2.quemada, 'y solo una vez por turno');
}
// espejo
{
  const d = dados5(); d[0] = R.crearDado('espejo');
  const t = new R.Turno(d, 0, false);
  const r = t.tirar(azarDe([6, 2, 3, 4, 6]));   // el espejo sale 6: voltea a 1
  check(r.quemada && r.ventana && t.estado === 'quemada', 'con una quemada y un espejo que la arregla hay ventana');
  const v = t.voltear(0);
  check(v.ok && !v.quemada && t.estado === 'apartar' && t.validas.some(j => j.puntos === 100), 'voltear el espejo (6 pasa a 1) salva el turno');
  check(!t.voltear(0).ok, 'el espejo se usa una vez por turno');
}
{
  const d = dados5(); d[0] = R.crearDado('espejo');
  const t = new R.Turno(d, 0, false);
  t.tirar(azarDe([6, 2, 3, 4, 6]));
  t.aceptarQuemada();
  check(t.resultado === 'quemo' && t.estado === 'fin', 'aceptar la quemada termina el turno');
}
{
  const d = dados5(); d[0] = R.crearDado('espejo');
  const t = new R.Turno(d, 0, false);
  const r = t.tirar(azarDe([3, 2, 3, 4, 6]));   // el espejo sale 3: voltea a 4, no arregla nada
  check(r.quemada && !r.ventana, 'si el espejo no arregla nada, no hay ventana');
}
// explosivo
{
  const d = dados5(); d[1] = R.crearDado('explosivo');
  const t = new R.Turno(d, 0, false);
  const r = t.tirar(azarDe([1, 2, 3, 4, 5]));   // el explosivo (lugar 1) sale 2
  check(r.quemada && t.motivo === 'explosion', 'el explosivo con 2 quema aunque otros dados puntúen');
}
// pegajoso
{
  const d = dados5(); d[0] = R.crearDado('pegajoso');
  const t = new R.Turno(d, 0, false);
  t.tirar(azarDe([1, 2, 3, 4, 6]));
  t.apartar([0]);
  check(t.pool.length === 5 && t.pool.includes(0), 'el pegajoso apartado vuelve a la mano');
}
// trabados
{
  const t = new R.Turno(dados5(), 0, false, { trabados: 1 });
  t.tirar(azarDe([1, 1, 1, 1, 1]));
  check(t.tirada.length === 4, 'una trampa deja un dado sin tirar en la primera tirada');
}
// tomar los dados (herencia)
{
  const t = new R.Turno(dados5(), 0, false, { acum: 300, pool: [0, 1, 2] });
  check(t.acum === 300 && t.pool.length === 3, 'se puede empezar con puntos y dados heredados');
  t.tirar(azarDe([5, 1, 3]));
  t.apartar([0, 1]);
  check(t.acum === 450 && t.pool.length === 1, 'y se sigue desde ahí');
}

console.log('pruebas de las reglas del diez mil terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
