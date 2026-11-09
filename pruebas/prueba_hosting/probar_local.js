// Prueba en esta PC: arranca el servidor, comprueba el long polling y los eventos (SSE), y lo cierra. Uso: node probar_local.js
const { spawn } = require('child_process');
const path = require('path');

const PUERTO = 3917;
const base = 'http://localhost:' + PUERTO;
const hijo = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: { ...process.env, PORT: String(PUERTO) }, stdio: 'ignore' });
const pausa = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } else console.log('ok   ', msg); };

(async () => {
  await pausa(1200);
  const e0 = await (await fetch(base + '/api/estado?v=-1')).json();
  check(e0.version === 0 && e0.contador === 0, 'estado inicial');

  const t0 = Date.now();
  const espera = fetch(base + '/api/estado?v=' + e0.version).then(r => r.json());
  await pausa(700);
  await fetch(base + '/api/sumar', { method: 'POST' });
  const e1 = await espera;
  const dt = Date.now() - t0;
  check(e1.version === 1 && e1.contador === 1, 'la consulta que esperaba recibió el cambio');
  check(dt >= 650 && dt < 1200, 'y la recibió apenas ocurrió (' + dt + ' ms, esperaba ~700)');

  const r = await fetch(base + '/api/eventos');
  const lector = r.body.getReader();
  const dec = new TextDecoder();
  let mensajes = 0;
  (async () => { for (;;) { const { value, done } = await lector.read(); if (done) break; mensajes += (dec.decode(value).match(/data:/g) || []).length; } })().catch(() => {});
  await pausa(300);
  await fetch(base + '/api/sumar', { method: 'POST' });
  await pausa(300);
  check(mensajes === 2, 'eventos SSE: el de apertura y el del cambio (' + mensajes + ')');

  const i = await (await fetch(base + '/api/info')).json();
  check(i.flujos_abiertos === 1 && i.consultas_abiertas === 0, 'info del servidor: un flujo abierto y ninguna consulta colgada');
  check((await fetch(base + '/')).status === 200, 'la página se sirve');
  hijo.kill();
  console.log('terminado, fallos:', fallos);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('ERROR', e.message); hijo.kill(); process.exit(1); });
