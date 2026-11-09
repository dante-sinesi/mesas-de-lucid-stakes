// Prueba de hosting: ¿aguanta "long polling" y "server-sent events" en este servidor?
// Sin dependencias. Un contador compartido: lo que se suma en una pestaña tiene que verse al instante en las otras.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = process.env.PORT || 3000;
const ESPERA_MAX_MS = 25000;   // cuánto se deja abierta una consulta antes de contestar "sin cambios"
const inicio = Date.now();

let version = 0;
let contador = 0;
const esperando = new Set();   // consultas abiertas: { res, desde, timer }
const flujos = new Set();      // conexiones de eventos (SSE)

function json(res, codigo, obj) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function estado() {
  return { version, contador, ahora: Date.now() };
}

function cambio() {
  version++;
  for (const w of esperando) {
    clearTimeout(w.timer);
    json(w.res, 200, estado());
  }
  esperando.clear();
  for (const f of flujos) f.write('data: ' + JSON.stringify(estado()) + '\n\n');
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/api/estado') {   // long polling
    const desde = parseInt(url.searchParams.get('v') || '-1', 10);
    if (version > desde) return json(res, 200, estado());
    const w = { res };
    w.timer = setTimeout(() => { esperando.delete(w); json(res, 200, estado()); }, ESPERA_MAX_MS);
    esperando.add(w);
    req.on('close', () => { clearTimeout(w.timer); esperando.delete(w); });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/sumar') {
    contador++;
    cambio();
    return json(res, 200, estado());
  }
  if (req.method === 'GET' && url.pathname === '/api/eventos') {   // SSE
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('data: ' + JSON.stringify(estado()) + '\n\n');
    flujos.add(res);
    const latido = setInterval(() => res.write(': latido\n\n'), 5000);
    req.on('close', () => { clearInterval(latido); flujos.delete(res); });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/info') {
    return json(res, 200, { node: process.version, pid: process.pid, segundos_encendido: Math.round((Date.now() - inicio) / 1000), consultas_abiertas: esperando.size, flujos_abiertos: flujos.size });
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  }
  res.writeHead(404);
  res.end('no encontrado');
});

servidor.listen(PUERTO, () => console.log('Prueba de hosting escuchando en el puerto ' + PUERTO));
