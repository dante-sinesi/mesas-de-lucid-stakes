'use strict';
// Punto de entrada: el servidor HTTP de las mesas de Lucid Stakes. (Hostinger: archivo de entrada "server.js"; el puerto lo da la variable PORT.)
const http = require('http');
const { Salas } = require('./servidor/salas');

const salas = new Salas();
setInterval(() => { try { salas.tic(); } catch (e) { console.error('error en el tic', e); } }, 500);
// Un error inesperado se anota, pero el servidor sigue: así una falla en una sala no cuelga a todas.
process.on('uncaughtException', e => console.error('uncaughtException', e));
process.on('unhandledRejection', e => console.error('unhandledRejection', e));

const servidor = http.createServer((req, res) => {
  try { salas.manejar(req, res); } catch (e) { res.writeHead(500); res.end('Error'); }
});
servidor.listen(process.env.PORT || 3000, () => console.log('Mesas de Lucid Stakes escuchando en el puerto ' + (process.env.PORT || 3000)));
