'use strict';
// Pruebas de las salas y la red: crear, entrar, acciones, long polling, desconexión, guardado y el servidor HTTP. Uso: node pruebas/test_salas.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { Salas } = require(path.join(__dirname, '..', 'servidor', 'salas.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const TA = 'tokenAAAAAAAAAAAAAAAA', TB = 'tokenBBBBBBBBBBBBBBBB';
const sala = (S, cfg) => S.crear(Object.assign({ juego: 'diezmil', modoDM: 'multi' }, cfg));

(async () => {
  // ---------- en memoria ----------
  {
    const reloj = { t: 1000000 };
    const S = new Salas({ archivo: null, ahora: () => reloj.t });
    const c = sala(S);
    check(c.ok && /^[A-Z2-9]{4}$/.test(c.sala) && c.juego === 'diezmil', 'crear da un código de 4 letras');
    check(!S.crear({}).ok && !S.crear({ juego: 'otro' }).ok && !S.crear(null).ok, 'sin un juego que exista no se crea la sala');
    check(!S.entrar('ZZZZ', TA, 'Ana').ok, 'no se entra a una sala que no existe');
    check(!S.entrar(c.sala, 'corto', 'Ana').ok, 'el identificador tiene que ser largo');
    check(S.entrar(c.sala.toLowerCase(), TA, 'Ana').ok, 'el código se acepta en minúsculas');
    check(S.entrar(c.sala, TB, 'Beto').ok, 'entra el segundo');
    check(!S.accion(c.sala, 'tokenZZZZZZZZZZZZZZZZ', 'tirar').ok, 'quien no está en la sala no actúa');
    check(!S.accion(c.sala, TA, 'hackear').ok, 'una acción desconocida no se acepta');

    let e = null;
    S.estado(c.sala, TA, -1, x => { e = x; });
    check(e && e.ok && e.yo === 0 && e.jugadores.length === 2 && e.juego === 'diezmil', 'el estado inicial llega al instante');
    const v = e.version;
    // long polling: sin cambios se queda esperando y con una acción contesta
    let r2 = null;
    S.estado(c.sala, TA, v, x => { r2 = x; });
    check(r2 === null, 'sin cambios la consulta queda esperando');
    S.accion(c.sala, TA, 'empezar');
    check(r2 && r2.version > v && r2.fase === 'turno', 'al empezar la partida, la consulta se contesta enseguida con el cambio');
    check(!JSON.stringify(r2).includes(TA) && !JSON.stringify(r2).includes(TB), 'el estado no incluye los identificadores secretos');

    // desconexión por falta de consultas y vuelta al consultar
    reloj.t += 36000;
    S.tic();
    check(S.sala(c.sala).mesa.jugador(TA).conectado === false, 'sin consultas por 35 s figura desconectado');
    S.estado(c.sala, TA, -1, x => { e = x; });
    check(S.sala(c.sala).mesa.jugador(TA).conectado === true, 'al volver a consultar se reconecta');

    // salas viejas
    reloj.t += 25 * 3600 * 1000;
    S.tic();
    check(S.salas.size === 0, 'las salas sin uso por 24 h se borran');
  }

  // ---------- guardado ----------
  {
    const archivo = path.join(os.tmpdir(), 'salas_' + process.pid + '.json');
    try { fs.unlinkSync(archivo); } catch (e) { /* no existía */ }
    const S = new Salas({ archivo });
    const c = sala(S);
    S.entrar(c.sala, TA, 'Ana');
    S.entrar(c.sala, TB, 'Beto');
    S.accion(c.sala, TA, 'empezar');
    S.tic();
    check(fs.existsSync(archivo), 'la sala se guarda en el archivo');
    const T = new Salas({ archivo });
    const m = T.sala(c.sala).mesa;
    check(m.jugadores.length === 2 && m.fase === 'turno', 'tras un reinicio la sala sigue como estaba');
    check(T.accion(c.sala, TA, 'tirar').ok, 'y se puede seguir jugando');
    // una sala de otro juego guardada por una versión vieja se descarta
    const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    datos.VIEJ = { creada: 1, uso: 1, mesa: { juego: 'otro', jugadores: [] } };
    fs.writeFileSync(archivo, JSON.stringify(datos));
    const U = new Salas({ archivo });
    check(!U.sala('VIEJ') && U.sala(c.sala), 'las salas de un juego que ya no existe se descartan al cargar');
    fs.unlinkSync(archivo);
  }

  // ---------- HTTP ----------
  {
    const S = new Salas({ archivo: null });
    const srv = http.createServer((req, res) => S.manejar(req, res));
    await new Promise(r => srv.listen(0, r));
    const base = 'http://localhost:' + srv.address().port;
    const post = (ruta, cuerpo) => fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }).then(r => r.json());

    const idx = await fetch(base + '/');
    check(idx.status === 200 && (await idx.text()).includes('Lucid Stakes'), 'la página de inicio se sirve');
    check((await fetch(base + '/comun.js')).headers.get('content-type').startsWith('text/javascript'), 'el script se sirve con su tipo');
    check((await fetch(base + '/fonts/lucid-stakes-400.woff2')).status === 200, 'la fuente se sirve');
    const cat = await (await fetch(base + '/api/catalogo')).json();
    check(cat.diezmil && Object.keys(cat.diezmil.dados).length >= 18 && !cat.catalogo, 'el catálogo de dados se sirve al navegador');
    check((await fetch(base + '/../server.js')).status === 404 && (await fetch(base + '/%2e%2e/server.js')).status === 404, 'no se puede salir de la carpeta web');
    check((await post('/api/nada', {})).ok === false, 'una ruta desconocida da error');

    const c = await post('/api/crear', { juego: 'diezmil', modoDM: 'multi' });
    check(c.ok, 'crear por HTTP');
    check((await post('/api/entrar', { sala: c.sala, token: TA, apodo: 'Ana' })).ok, 'entrar A por HTTP');
    check((await post('/api/entrar', { sala: c.sala, token: TB, apodo: 'Beto' })).ok, 'entrar B por HTTP');
    const e0 = await (await fetch(base + '/api/estado?sala=' + c.sala + '&token=' + TB + '&v=-1')).json();
    const t0 = Date.now();
    const espera = fetch(base + '/api/estado?sala=' + c.sala + '&token=' + TB + '&v=' + e0.version).then(r => r.json());
    await pausa(500);
    await post('/api/accion', { sala: c.sala, token: TA, accion: 'empezar' });
    const e1 = await espera;
    const dt = Date.now() - t0;
    check(e1.version > e0.version && dt >= 450 && dt < 1000, 'la consulta de B espera y recibe el cambio de A apenas ocurre (' + dt + ' ms)');
    check(!(await post('/api/accion', { sala: c.sala, token: TB, accion: 'tirar' })).ok, 'tirar fuera de turno da error');
    const mal = await fetch(base + '/api/crear', { method: 'POST', body: '{no es json' });
    check(mal.status === 400, 'un cuerpo inválido da 400');
    srv.close(); srv.closeAllConnections && srv.closeAllConnections();
  }

  console.log('pruebas de las salas terminadas, fallos:', fallos);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('ERROR', e); process.exit(1); });
