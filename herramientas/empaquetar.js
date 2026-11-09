'use strict';
// Arma paquete/mesas-lucid-stakes.zip con lo que se sube al servidor: server.js, package.json, servidor/ y web/. Nunca incluye datos/ (salas y partidas guardadas) ni las pruebas.
// Las rutas dentro del zip llevan barras normales (/), como espera el servidor Linux. Uso: npm run paquete
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'paquete', 'mesas-lucid-stakes.zip');
const incluir = ['server.js', 'package.json', 'package-lock.json', 'servidor', 'web'];

function archivos(rel) {
  const abs = path.join(raiz, rel), st = fs.statSync(abs);
  if (st.isFile()) return [rel];
  return fs.readdirSync(abs).sort().flatMap(n => archivos(rel + '/' + n));
}
const lista = incluir.flatMap(archivos);
if (lista.some(f => /(^|\/)datos\/|salas\.json|partidas_dm/i.test(f))) { console.error('El paquete incluye datos guardados: se aborta.'); process.exit(1); }

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const partes = [], central = []; let pos = 0;
for (const f of lista) {
  const dato = fs.readFileSync(path.join(raiz, f)), comp = zlib.deflateRawSync(dato), nombre = Buffer.from(f, 'utf8'), crc = crc32(dato);
  const d = fs.statSync(path.join(raiz, f)).mtime, hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(0x0800, 6); loc.writeUInt16LE(8, 8); loc.writeUInt16LE(hora, 10); loc.writeUInt16LE(fecha, 12); loc.writeUInt32LE(crc, 14); loc.writeUInt32LE(comp.length, 18); loc.writeUInt32LE(dato.length, 22); loc.writeUInt16LE(nombre.length, 26);
  const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10); cen.writeUInt16LE(hora, 12); cen.writeUInt16LE(fecha, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(dato.length, 24); cen.writeUInt16LE(nombre.length, 28); cen.writeUInt32LE(pos, 42);
  partes.push(loc, nombre, comp); central.push(Buffer.concat([cen, nombre])); pos += 30 + nombre.length + comp.length;
}
const cd = Buffer.concat(central), fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(lista.length, 8); fin.writeUInt16LE(lista.length, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(pos, 16);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, Buffer.concat([...partes, cd, fin]));
console.log('Paquete listo: ' + destino + ' (' + lista.length + ' archivos, sin datos guardados)');
