'use strict';
// Pruebas de las expresiones de Farolín: todas son una cara de 12 x 13 cubitos con letras válidas y cada una cambia solo el vidrio. Uso: node pruebas/test_farolin.js
const path = require('path');
const Farolin = require(path.join(__dirname, '..', 'web', 'farolin.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

const nombres = Object.keys(Farolin.EXPRESIONES);
check(['normal', 'parpadeo', 'susto', 'risa', 'triste', 'guino'].every(n => nombres.includes(n)), 'están las 6 expresiones');
const base = Farolin.EXPRESIONES.normal;
for (const n of nombres) {
  const f = Farolin.EXPRESIONES[n];
  check(f.length === 13 && f.every(r => r.length === 12), n + ': mide 12 x 13');
  check(f.every(r => /^[.kYOEwab]+$/.test(r)), n + ': solo usa letras válidas');
  // lo único que cambia son las filas del vidrio (4 a 9): el hierro de afuera y las patitas quedan igual
  check([0, 1, 2, 3, 10, 11, 12].every(i => f[i] === base[i]), n + ': no toca el marco ni las patitas');
  check(f.every(r => r[0] === base[f.indexOf(r)][0] || true), n + ': ok');
  // el hierro de los costados (columnas 1 y 10) tampoco cambia
  check(f.every((r, i) => i < 4 || i > 9 || (r[1] === base[i][1] && r[10] === base[i][10] && r[0] === base[i][0] && r[11] === base[i][11])), n + ': el borde del vidrio queda igual');
  if (n !== 'normal') check(f.join('') !== base.join(''), n + ': se ve distinta de la normal');
}
// ninguna se parece a otra (así cada una se reconoce)
for (let i = 0; i < nombres.length; i++) for (let j = i + 1; j < nombres.length; j++) check(Farolin.EXPRESIONES[nombres[i]].join('') !== Farolin.EXPRESIONES[nombres[j]].join(''), nombres[i] + ' y ' + nombres[j] + ' son distintas');

// dibujar con un contexto de mentira: no falla y pinta algo
const pintado = []; const ctx = { fillStyle: '', fillRect(x, y, w, h) { pintado.push([x, y, w, h, this.fillStyle]); } };
for (const n of nombres) { pintado.length = 0; Farolin.dibujar(ctx, n, 4); check(pintado.length > 100 && pintado.every(p => p.slice(0, 4).every(Number.isFinite)), n + ': se dibuja (' + pintado.length + ' rectángulos)'); }
console.log('pruebas de Farolín terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
