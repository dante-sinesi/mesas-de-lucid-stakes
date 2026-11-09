'use strict';
// Pruebas del generador de QR: cada matriz (con la máscara forzada) se compara con la que arma la biblioteca `qrcode` de Python. Uso: node pruebas/test_qr.js
const fs = require('fs');
const path = require('path');
const QR = require(path.join(__dirname, '..', 'web', 'qr.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'qr_referencia.json'), 'utf8'));
for (const r of ref) {
  const m = QR.matriz(r.texto, { mascara: r.mascara });
  const filas = m.map(f => f.map(v => (v ? '1' : '0')).join(''));
  check(m.length === 17 + 4 * r.version, 'versión ' + r.version + ' para ' + r.texto.slice(0, 20) + '… (tamaño ' + m.length + ')');
  check(filas.join('|') === r.filas.join('|'), 'la matriz coincide: versión ' + r.version + ', máscara ' + r.mascara + ', ' + r.texto.slice(0, 20) + '…');
}
const auto = QR.matriz('https://mesas.dsinesi.com/?sala=K7QD');
check(auto.length >= 21 && auto.every(f => f.length === auto.length), 'sin máscara forzada arma una matriz cuadrada');
let largo = false; try { QR.matriz('q'.repeat(400)); } catch (e) { largo = true; }
check(largo, 'un texto demasiado largo da error');

console.log('pruebas del QR terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
