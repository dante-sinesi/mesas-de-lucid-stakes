'use strict';
// Prueba del service worker (web/sw.js) con un entorno de mentira: se instala, no toca las consultas del juego, prefiere la red y cae a la copia guardada si la red falla.
// Uso: node pruebas/test_sw.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

(async () => {
  const eventos = {}, guardado = {}, tareas = [];
  let redCaida = false;
  const cache = {
    addAll: async urls => { urls.forEach(u => { guardado[u] = 'copia de ' + u; }); },
    put: async (req, res) => { guardado[req.url] = res; },
  };
  const entorno = {
    self: { addEventListener: (n, f) => { eventos[n] = f; }, skipWaiting: async () => { entorno.saltado = true; }, clients: { claim: async () => { entorno.reclamado = true; } } },
    location: { origin: 'https://juego.test' },
    caches: { open: async () => cache, keys: async () => ['bj-viejo', 'bj-118'], delete: async k => { entorno.borrada = k; return true; }, match: async req => guardado[typeof req === 'string' ? req : req.url] || null },
    fetch: async req => { if (redCaida) throw new Error('sin red'); return { ok: true, clone() { return this; }, de: 'red:' + req.url }; },
    URL, Promise, console,
  };
  entorno.self.skipWaiting = entorno.self.skipWaiting;
  vm.createContext(entorno);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'sw.js'), 'utf8'), entorno);

  check(typeof eventos.install === 'function' && typeof eventos.activate === 'function' && typeof eventos.fetch === 'function', 'registra install, activate y fetch');
  await new Promise(r => { eventos.install({ waitUntil: p => p.then(r) }); });
  check(Object.keys(guardado).includes('comun.js') && Object.keys(guardado).includes('./') && entorno.saltado, 'al instalarse guarda el cascarón y se activa enseguida');
  await new Promise(r => { eventos.activate({ waitUntil: p => p.then(r) }); });
  check(entorno.borrada === 'bj-viejo' && entorno.reclamado, 'al activarse borra las copias viejas y toma el control');

  const pedido = (url, metodo = 'GET') => ({ url, method: metodo });
  const probar = async req => { let resp = undefined; eventos.fetch({ request: req, respondWith: p => { resp = p; } }); return resp === undefined ? undefined : await resp; };
  check(await probar(pedido('https://juego.test/api/estado?sala=ABCD')) === undefined, 'las consultas del juego (/api/) no se tocan');
  check(await probar(pedido('https://juego.test/api/accion', 'POST')) === undefined, 'los pedidos que no son GET no se tocan');
  check(await probar(pedido('https://otro.test/x.js')) === undefined, 'lo de otro sitio no se toca');
  const r1 = await probar(pedido('https://juego.test/comun.js'));
  check(r1 && r1.de === 'red:https://juego.test/comun.js', 'lo estático va primero a la red (así llegan las versiones nuevas)');
  redCaida = true;
  guardado['https://juego.test/comun.js'] = 'copia guardada';
  check(await probar(pedido('https://juego.test/comun.js')) === 'copia guardada', 'si la red falla, usa la copia guardada');
  console.log('pruebas del service worker terminadas, fallos:', fallos);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('ERROR', e); process.exit(1); });
