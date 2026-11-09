'use strict';
// Las salas y la red: crear sala, entrar con apodo, acciones y el estado por long polling. Sin dependencias.
// Cada sala es una mesa de un juego (hoy el Diez mil); se guardan en un archivo para sobrevivir a un reinicio del servidor.

const fs = require('fs');
const path = require('path');
const { MesaDM, TIEMPOS: TIEMPOS_DM, PRECIOS: PRECIOS_DM, OBJETOS: OBJETOS_DM } = require('./diezmil/mesa_dm');
const { TIPOS: TIPOS_DM, ORDEN_TIPOS } = require('./diezmil/reglas');
const { Mesa13, TIEMPOS: TIEMPOS_TJ, MAZOS_VALIDOS, PUNTOS_VALIDOS } = require('./trecejack/mesa_13');
const { ESPECIALES: ESPECIALES_TJ, ORDEN_ESPECIALES, tablaPatrones } = require('./trecejack/reglas');
const { MesaFundacion } = require('./fundacion/mesa_fundacion');
const Bots = require('./bots');
const { TIEMPO_VALIDO, escalarTiempos } = require('./tiempo');

const ESPERA_MAX_MS = 20000;        // cuánto se deja abierta una consulta antes de contestar "sin cambios" (Hostinger corta a los 120 s)
const DESCONEXION_MS = 35000;       // sin consultas por este tiempo, el jugador figura desconectado
const SALA_VIEJA_MS = 24 * 3600 * 1000;
const SALA_ABANDONADA_MS = 30 * 60 * 1000;   // una sala donde no queda nadie conectado se borra a la media hora
const SALA_VACIA_MS = 30 * 1000;             // una sala que espera y se quedó sin nadie (por ejemplo una mesa libre del mapa que se tomó y se dejó) se borra a los 30 s
const MAX_SALAS = 100;
const MAX_CUERPO = 4096;
const ACCIONES_DM = ['empezar', 'tirar', 'apartar', 'plantarse', 'voltear', 'apuesta', 'tomar', 'comprar', 'listo', 'usar', 'reaccion', 'nueva', 'salir', 'retomar', 'pausar', 'reanudar', 'tut', 'config', 'visibilidad', 'clave', 'botmas', 'botmenos'];   // las del diez mil
const ACCIONES_TJ = ['empezar', 'pedir', 'plantarse', 'comprar', 'listo', 'reaccion', 'nueva', 'salir', 'retomar', 'pausar', 'reanudar', 'config', 'visibilidad', 'clave', 'botmas', 'botmenos'];   // las del 13 Jack
const ACCIONES_FU = ['empezar', 'seguir', 'tirar', 'terminar', 'elegir', 'atras', 'colocar', 'pasar', 'nueva', 'salir', 'retomar', 'pausar', 'reanudar', 'config', 'visibilidad', 'clave', 'botmas', 'botmenos'];   // las de Fundación
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // (sin letras que se confunden: I, L, O, 0, 1)

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

class Salas {
  constructor(op = {}) {
    this.carpetaWeb = op.carpetaWeb || path.join(__dirname, '..', 'web');
    this.archivo = op.archivo === undefined ? path.join(__dirname, '..', 'datos', 'salas.json') : op.archivo;
    this.ahora = op.ahora || (() => Date.now());
        this.inicio = this.ahora();   // (cuándo arrancó este proceso: sirve para ver si el servidor se reinició)
    this.salas = new Map();   // codigo -> { mesa, creada, uso, vistos: Map(token -> ms), esperando: Set }
    this._sucio = false;
    this.archivoPartidas = this.archivo ? path.join(path.dirname(this.archivo), 'partidas_dm.jsonl') : null;   // (una línea por partida de Diez mil terminada, sin apodos: sirve para calibrar la tienda con partidas reales)
    this._cargar();
  }

  // ---------- salas ----------

  // La configuración de la sala: { juego: 'diezmil', modoDM, tomarDados, hostil, metaDM, tiempo, clave }. Lo que falte o no valga toma el valor por omisión.
  crear(cfg) {
    if (this.salas.size >= MAX_SALAS) return { ok: false, error: 'Hay demasiadas salas abiertas, prueba más tarde' };
    if (cfg === null || typeof cfg !== 'object') return { ok: false, error: 'Falta la configuración de la sala' };
    if (cfg.tutorial) return this._crearTutorial(cfg);
    if (cfg.juego === 'diezmil') return this._crearDiezMil(cfg);
    if (cfg.juego === 'trecejack') return this._crearTrece(cfg);
    if (cfg.juego === 'fundacion') return this._crearFundacion(cfg);
    return { ok: false, error: 'Ese juego todavía no está disponible' };
  }

  // Una sala de práctica para el tutorial: solo, sin relojes y con los dados que mande el guion (acción 'tut'). No se guarda y se borra al salir.
  _crearTutorial(cfg) {
    if (cfg.juego !== 'diezmil') return { ok: false, error: 'Ese juego todavía no está disponible' };
    const T = 3600000, cola = [];
    let codigo;
    do { codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join(''); } while (this.salas.has(codigo));
    const mesa = new MesaDM({ modo: 'carrera', tiempos: { tirar: T, apartar: T, decidir: T, eleccion: T, tienda: T, ausente: T, ausencia: T, reemplazo: T }, azar: () => (cola.length ? (cola.shift() - 1) / 6 + 0.01 : 0.5) });
    mesa.cola = cola; mesa.tutorial = true;
    this.salas.set(codigo, this._nueva(mesa));
    return { ok: true, sala: codigo, juego: 'diezmil', conClave: false, clave: null, tutorial: true };
  }

  // El guion del tutorial prepara lo que va a salir: { cola: [caras...], total, entrado }.
  _tutorial(s, token, datos) {
    const m = s.mesa, j = m.jugador(token);
    const num = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v)) || a));
    if (Array.isArray(datos.cola)) datos.cola.slice(0, 40).forEach(n => m.cola.push(num(n, 1, 6)));
    if (datos.total !== undefined) { j.total = num(datos.total, 0, 9950); if (m.t) m.t.total = j.total; }
    if (datos.entrado !== undefined) { j.entrado = !!datos.entrado; if (m.t) m.t.entrado = !!datos.entrado; }
    this._avisar(s);
    return { ok: true };
  }

  // Cuántos asientos tiene la sala (2 a 8; por omisión 8) y si es pública (aparece en el mapa; solo con amigos y sin clave).
  _asientos(n) { n = Math.floor(Number(n)); return n >= 2 && n <= 8 ? n : 8; }
  _publica(cfg, multi) { return multi && !!cfg.publica && !cfg.clave; }

  // Una clave de 6 caracteres para entrar a la sala (los mismos que el código, sin letras que se confunden).
  _clave() { return Array.from({ length: 6 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join(''); }

  // Una sala de diez mil: { juego: 'diezmil', modoDM: 'multi' | 'carrera' | 'escalera', tomarDados, hostil, clave }.
  _crearDiezMil(cfg) {
    if (this.salas.size >= MAX_SALAS) return { ok: false, error: 'Hay demasiadas salas abiertas, prueba más tarde' };
    const modo = ['multi', 'carrera', 'escalera'].includes(cfg.modoDM) ? cfg.modoDM : 'multi';
    const meta = Number(cfg.metaDM) === 5000 ? 5000 : 10000, tiempo = modo !== 'multi' ? 'libre' : TIEMPO_VALIDO(cfg.tiempo);   // (en solitario no corre el tiempo)
    const asientos = this._asientos(cfg.asientos), publica = this._publica(cfg, modo === 'multi');
    const conf = { modoDM: modo, metaDM: meta, tiempo, asientos: modo === 'multi' ? asientos : 1, publica, tomarDados: cfg.tomarDados === undefined ? false : !!cfg.tomarDados, hostil: cfg.hostil === undefined ? true : !!cfg.hostil, cupo: modo !== 'multi' || !!cfg.cupo, bots: modo === 'multi' ? Bots.cantidadValida(cfg.bots, asientos) : 0 };   // (el cupo de entrada solo se elige con amigos y empieza apagado; en solitario rige siempre)
    let codigo;
    do { codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join(''); } while (this.salas.has(codigo));
    const clave = cfg.clave ? this._clave() : null;
    const sdm = this._nueva(new MesaDM({ modo, meta, tiempoModo: tiempo, asientos, tomarDados: conf.tomarDados, hostil: conf.hostil && modo === 'multi', cupo: conf.cupo, bots: conf.bots, clave }));
    sdm.publica = publica && !clave;
    this.salas.set(codigo, sdm);
    this._sucio = true;
    return Object.assign({ ok: true, sala: codigo, juego: 'diezmil', conClave: !!clave, clave }, conf);
  }

  // Una sala de 13 Jack: { juego: 'trecejack', modoTJ: 'multi' | 'solo', especiales, mazosTJ: 3 | 5 | 8, tiempo, clave }.
  _crearTrece(cfg) {
    if (this.salas.size >= MAX_SALAS) return { ok: false, error: 'Hay demasiadas salas abiertas, prueba más tarde' };
    const modo = cfg.modoTJ === 'solo' ? 'solo' : 'multi', tiempo = modo === 'solo' ? 'libre' : TIEMPO_VALIDO(cfg.tiempo);   // (en solitario no corre el tiempo)
    const mazos = MAZOS_VALIDOS.includes(Number(cfg.mazosTJ)) ? Number(cfg.mazosTJ) : 5, especiales = cfg.especiales === undefined ? true : !!cfg.especiales;
    const objetivo = cfg.objetivoTJ === 'puntos' ? 'puntos' : 'mazos', metaPuntos = PUNTOS_VALIDOS.includes(Number(cfg.puntosTJ)) ? Number(cfg.puntosTJ) : 400;
    const asientos = this._asientos(cfg.asientos), publica = this._publica(cfg, modo === 'multi');
    const conf = { asientos: modo === 'multi' ? asientos : 1, publica, modoTJ: modo, objetivoTJ: objetivo, mazosTJ: mazos, puntosTJ: metaPuntos, especiales, tiempo, bots: modo === 'multi' ? Bots.cantidadValida(cfg.bots, asientos) : 0 };
    let codigo;
    do { codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join(''); } while (this.salas.has(codigo));
    const clave = cfg.clave ? this._clave() : null;
    const stj = this._nueva(new Mesa13({ modo, mazos, objetivo, metaPuntos, especiales, tiempoModo: tiempo, asientos, bots: conf.bots, clave }));
    stj.publica = publica && !clave;
    this.salas.set(codigo, stj);
    this._sucio = true;
    return Object.assign({ ok: true, sala: codigo, juego: 'trecejack', conClave: !!clave, clave }, conf);
  }

  // Una sala de Fundación: { juego: 'fundacion', modoFU: 'multi' | 'solo', metaFU: 8 | 10 | 12, asientos: 1 a 8, tiempo, bots, clave }.
  _crearFundacion(cfg) {
    if (this.salas.size >= MAX_SALAS) return { ok: false, error: 'Hay demasiadas salas abiertas, prueba más tarde' };
    const modo = cfg.modoFU === 'solo' ? 'solo' : 'multi', tiempo = modo === 'solo' ? 'libre' : TIEMPO_VALIDO(cfg.tiempo);   // (en solitario no corre el tiempo)
    const meta = [8, 10, 12].includes(Number(cfg.metaFU)) ? Number(cfg.metaFU) : 10;
    const a = Math.floor(Number(cfg.asientos)), asientos = modo === 'multi' ? (a >= 1 && a <= 8 ? a : 4) : 1, publica = this._publica(cfg, modo === 'multi');
    const conf = { asientos, publica, modoFU: modo, metaFU: meta, tiempo, bots: modo === 'multi' ? Bots.cantidadValida(cfg.bots, asientos) : 0 };
    let codigo;
    do { codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join(''); } while (this.salas.has(codigo));
    const clave = cfg.clave ? this._clave() : null;
    const sfu = this._nueva(new MesaFundacion({ modo, meta, tiempoModo: tiempo, asientos, bots: conf.bots, clave }));
    sfu.publica = publica && !clave;
    this.salas.set(codigo, sfu);
    this._sucio = true;
    return Object.assign({ ok: true, sala: codigo, juego: 'fundacion', conClave: !!clave, clave }, conf);
  }

  // Lo público de una sala (sin entrar): qué juego es y si pide clave.
  info(codigo) {
    const s = this.sala(codigo);
    if (!s) return { ok: false, error: 'No existe esa sala' };
    return { ok: true, juego: s.mesa.juego, conClave: !!s.mesa.clave };
  }

  // Las mesas del mapa y de la lista: las salas públicas, sin clave, que esperan y tienen a alguien conectado. No dicen quién las armó.
  publicas() {
    const out = [];
    for (const [codigo, s] of this.salas) {
      const m = s.mesa;
      if (!s.publica || m.clave || m.tutorial || m.modo !== 'multi' || m.fase !== 'espera' || (!m.jugadores.some(j => j.conectado && !j.bot) && !s.huboHumano)) continue;   // (una sala que se quedó sin nadie sigue en la lista hasta que se borra, a los 30 s)
      const sillas = [];
      for (let i = 0; i < m.maxAsientos; i++) { const p = m.porAsiento(i); sillas.push(p ? (p.bot ? 'b' : 'h') : null); }
      out.push({ sala: codigo, juego: m.juego, asientos: m.maxAsientos, sillas, creada: s.creada, datos: m.juego === 'fundacion' ? { meta: m.meta } : (m.juego === 'trecejack' ? { objetivo: m.objetivo, mazos: m.mazos, metaPuntos: m.metaPuntos, especiales: m.especiales } : { meta: m.metaBase, cupo: m.cupo, hostil: m.hostil, tomarDados: m.tomarDados }) });
    }
    return out.sort((a, b) => b.creada - a.creada);
  }

  _nueva(mesa) { return { mesa, creada: this.ahora(), uso: this.ahora(), vistos: new Map(), esperando: new Set(), publica: false, vacioDesde: null }; }

  sala(codigo) { return this.salas.get(String(codigo || '').toUpperCase()) || null; }

  entrar(codigo, token, apodo, clave) {
    const s = this.sala(codigo);
    if (!s) return { ok: false, error: 'No existe esa sala' };
    if (!validoToken(token)) return { ok: false, error: 'Falta el identificador' };
    if (s.mesa.clave && !s.mesa.jugador(token) && String(clave || '').trim().toUpperCase() !== s.mesa.clave) return { ok: false, error: clave ? 'La clave no es correcta' : 'Esta sala tiene clave', pideClave: true };
    const r = s.mesa.unirse(token, apodo);
    if (r.ok) r.juego = s.mesa.juego;
    if (r.ok) { s.huboHumano = true; s.vistos.set(token, this.ahora()); s.uso = this.ahora(); this._sucio = true; this._avisar(s); }
    return r;
  }

  accion(codigo, token, accion, datos = {}) {
    const s = this.sala(codigo);
    if (!s) return { ok: false, error: 'No existe esa sala' };
    if (!s.mesa.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    const tj = s.mesa.juego === 'trecejack', fu = s.mesa.juego === 'fundacion';
    if (!(fu ? ACCIONES_FU : (tj ? ACCIONES_TJ : ACCIONES_DM)).includes(accion)) return { ok: false, error: 'Acción desconocida' };
    if (accion === 'tut') return s.mesa.tutorial ? this._tutorial(s, token, datos) : { ok: false, error: 'Acción desconocida' };
    if (accion === 'salir' && s.mesa.tutorial) { this.salas.delete(String(codigo).toUpperCase()); return { ok: true }; }
    s.vistos.set(token, this.ahora());
    s.uso = this.ahora();
    s.mesa.avanzar();
    const m = s.mesa;
    let r;
    if (['config', 'visibilidad', 'clave', 'botmas', 'botmenos'].includes(accion)) { r = this._accionSala(s, token, accion, datos); this._sucio = true; this._avisar(s); return r; }
    if (fu) {
      switch (accion) {
        case 'empezar': r = m.empezar(token); break;
        case 'seguir': r = m.seguir(token); break;
        case 'tirar': r = m.tirar(token, datos.guardar); break;
        case 'terminar': r = m.terminarDados(token); break;
        case 'elegir': r = m.elegir(token, datos.edificio); break;
        case 'atras': r = m.atras(token); break;
        case 'colocar': r = m.colocar(token, datos.lugar); break;
        case 'pasar': r = m.pasar(token); break;
        case 'nueva': r = m.nuevaPartida(token); break;
        case 'pausar': r = m.pausar(token); break;
        case 'reanudar': r = m.reanudar(token); break;
        case 'retomar': r = m.retomar(token); break;
        case 'salir': m.salir(token); s.vistos.delete(token); r = { ok: true }; break;
      }
      this._sucio = true;
      this._avisar(s);
      return r;
    }
    if (tj) {
      switch (accion) {
        case 'empezar': r = m.empezar(token); break;
        case 'pedir': r = m.pedir(token); break;
        case 'plantarse': r = m.plantarse(token); break;
        case 'comprar': r = m.comprar(token, datos.indice, datos.lugar); break;
        case 'listo': r = m.listo(token); break;
        case 'reaccion': r = m.reaccionar(token, datos.r); break;
        case 'nueva': r = m.nuevaPartida(token); break;
        case 'pausar': r = m.pausar(token); break;
        case 'reanudar': r = m.reanudar(token); break;
        case 'retomar': r = m.retomar(token); break;
        case 'salir': m.salir(token); s.vistos.delete(token); r = { ok: true }; break;
      }
      this._sucio = true;
      this._avisar(s);
      return r;
    }
    switch (accion) {
      case 'empezar': r = m.empezar(token); break;
      case 'tirar': r = m.tirar(token); break;
      case 'apartar': r = m.apartar(token, datos.indices, datos.luego); break;
      case 'plantarse': r = m.plantarse(token); break;
      case 'voltear': r = m.voltear(token, datos.slot); break;
      case 'apuesta': r = m.apostar(token, datos.v); break;
      case 'tomar': r = m.tomar(token, datos.si); break;
      case 'comprar': r = m.comprar(token, datos.indice, { slot: datos.slot, cara: datos.cara, valor: datos.valor }); break;
      case 'listo': r = m.listo(token); break;
      case 'usar': r = m.usar(token, datos.indice, datos.objetivo); break;
      case 'reaccion': r = m.reaccionar(token, datos.r); break;
      case 'nueva': r = m.nuevaPartida(token); break;
      case 'pausar': r = m.pausar(token); break;
      case 'reanudar': r = m.reanudar(token); break;
      case 'salir': m.salir(token); s.vistos.delete(token); r = { ok: true }; break;
    }
    this._sucio = true;
    this._avisar(s);
    return r;
  }

  // Lo que solo hace el anfitrión mientras la sala espera: cambiar reglas, visibilidad y clave, y sumar o quitar bots.
  _accionSala(s, token, accion, d) {
    const m = s.mesa;
    if (accion === 'botmas') return m.agregarBot(token, d.asiento);
    if (accion === 'botmenos') return m.quitarBot(token, d.asiento);
    const e = m._anfitrionEnEspera(token);
    if (e.error) return { ok: false, error: e.error };
    if (accion === 'config') return m.configurar(token, d);
    if (accion === 'visibilidad') {
      if (d.publica && m.clave) return { ok: false, error: 'Una sala con clave no puede ser pública' };
      s.publica = !!d.publica; m._cambio();
      return { ok: true };
    }
    if (d.clave) { if (!m.clave) m.clave = this._clave(); s.publica = false; } else m.clave = null;   // 'clave'
    m._cambio();
    return { ok: true };
  }

  // El estado para un jugador. Si `desde` es la versión que ya tiene y no hay nada nuevo, se queda esperando (long polling).
  estado(codigo, token, desde, responder) {
    const s = this.sala(codigo);
    if (!s) return responder({ ok: false, error: 'No existe esa sala' });
    const j = s.mesa.jugador(token);
    if (j) { s.vistos.set(token, this.ahora()); if (!j.conectado) { s.mesa.unirse(token); this._sucio = true; } }
    s.mesa.avanzar();
    const e = () => Object.assign({ ok: true, publica: !!s.publica, sala: String(codigo).toUpperCase(), pid: process.pid, arranque: this.inicio, clave: s.mesa.jugador(token) ? (s.mesa.clave || null) : null }, s.mesa.estado(token));
    if (s.mesa.version !== desde) return responder(e());
    const w = { token, desde, responder: x => responder(x), e };
    w.timer = setTimeout(() => { s.esperando.delete(w); responder(e()); }, ESPERA_MAX_MS);
    s.esperando.add(w);
    return w;
  }

  quitarEspera(codigo, w) {
    const s = this.sala(codigo);
    if (s && w && w.timer) { clearTimeout(w.timer); s.esperando.delete(w); }
  }

  // Anota (una sola vez) cómo terminó una partida de Diez mil: modo, meta y, por jugador, turnos, quemadas, compras y turnos que jugó el servidor.
  _anotarFin(s) {
    const m = s.mesa;
    if (!this.archivoPartidas || m.juego !== 'diezmil' || !m.fin || m.fin.anotada || m.tutorial) return;
    m.fin.anotada = true;
    const f = m.fin;
    const linea = { fecha: new Date(this.ahora()).toISOString(), modo: f.modo, meta: f.meta, etapa: f.etapa, motivo: f.motivo, jugadores: f.ranking.map(r => {
      const j = m.porAsiento(r.asiento) || {};
      return { bot: !!r.bot, turnos: r.turnos, quemadas: r.quemadas, mejorTurno: r.mejorTurno, total: r.total, fichas: r.fichas, dados: r.dados, compras: j.compras || [], automaticos: j.automaticos || 0 };
    }) };
    try { fs.mkdirSync(path.dirname(this.archivoPartidas), { recursive: true }); fs.appendFileSync(this.archivoPartidas, JSON.stringify(linea) + '\n'); } catch (e) { /* si no se puede escribir, no pasa nada */ }
  }

  _avisar(s) {
    this._anotarFin(s);
    for (const w of Array.from(s.esperando)) {
      if (s.mesa.version !== w.desde) { clearTimeout(w.timer); s.esperando.delete(w); w.responder(w.e()); }
    }
  }

  // Lo que se hace cada medio segundo: avanzar los plazos, marcar desconectados y borrar salas viejas.
  tic() {
    const t = this.ahora();
    for (const [codigo, s] of this.salas) {
      const sinNadie = !s.mesa.jugadores.some(j => j.conectado && !j.bot);
      if (!sinNadie) s.vacioDesde = null; else if (s.vacioDesde === null) s.vacioDesde = t;
      if (!s.mesa.tutorial && s.mesa.fase === 'espera' && s.vacioDesde !== null && t - s.vacioDesde > SALA_VACIA_MS) { for (const w of s.esperando) clearTimeout(w.timer); this.salas.delete(codigo); this._sucio = true; continue; }
      if (t - s.uso > SALA_VIEJA_MS || (sinNadie && t - s.uso > SALA_ABANDONADA_MS)) { for (const w of s.esperando) clearTimeout(w.timer); this.salas.delete(codigo); this._sucio = true; continue; }
      const antes = s.mesa.version;
      for (const j of s.mesa.jugadores) {
        if (j.bot) continue;   // (los bots no tienen conexión)
        const visto = s.vistos.get(j.token);
        if (j.conectado && visto !== undefined && t - visto > DESCONEXION_MS) s.mesa.desconectar(j.token);
        else if (j.conectado && visto === undefined && t - s.uso > DESCONEXION_MS) s.mesa.desconectar(j.token);   // (tras un reinicio nadie figura visto hasta que vuelva)
      }
      s.mesa.avanzar();
      if (s.mesa.version !== antes) { this._sucio = true; this._avisar(s); }
    }
    this._guardar();
  }

  // ---------- guardado ----------

  _guardar() {
    if (!this._sucio || !this.archivo) return;
    this._sucio = false;
    try {
      fs.mkdirSync(path.dirname(this.archivo), { recursive: true });
      const datos = {};
      for (const [codigo, s] of this.salas) if (!s.mesa.tutorial) datos[codigo] = { creada: s.creada, uso: s.uso, publica: !!s.publica, mesa: s.mesa.guardar() };
      fs.writeFileSync(this.archivo + '.tmp', JSON.stringify(datos));
      fs.renameSync(this.archivo + '.tmp', this.archivo);
    } catch (e) { /* si no se puede escribir, las salas siguen en memoria */ }
  }

  _cargar() {
    if (!this.archivo) return;
    try {
      const datos = JSON.parse(fs.readFileSync(this.archivo, 'utf8'));
      for (const codigo of Object.keys(datos)) {
        const juego = datos[codigo].mesa.juego;
        if (juego !== 'diezmil' && juego !== 'trecejack' && juego !== 'fundacion') continue;   // (las salas de otros juegos guardadas por una versión vieja se descartan)
        const s = this._nueva(juego === 'fundacion' ? MesaFundacion.desde(datos[codigo].mesa, {}) : (juego === 'trecejack' ? Mesa13.desde(datos[codigo].mesa, {}) : MesaDM.desde(datos[codigo].mesa, {})));
        s.creada = datos[codigo].creada; s.uso = datos[codigo].uso; s.publica = !!datos[codigo].publica;
        this.salas.set(codigo, s);
      }
    } catch (e) { /* sin archivo o dañado: se empieza sin salas */ }
  }

  // ---------- HTTP ----------

  manejar(req, res) {
    const url = new URL(req.url, 'http://x');
    const ruta = url.pathname;
    const json = (codigo, obj) => { res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

    if (req.method === 'GET' && ruta === '/api/estado') {
      const w = this.estado(url.searchParams.get('sala'), url.searchParams.get('token'), parseInt(url.searchParams.get('v') || '-1', 10), obj => json(200, obj));
      if (w && w.timer) req.on('close', () => this.quitarEspera(url.searchParams.get('sala'), w));
      return;
    }
    if (req.method === 'GET' && ruta === '/api/catalogo') return json(200, { trecejack: { especiales: ESPECIALES_TJ, orden: ORDEN_ESPECIALES, patrones: tablaPatrones() }, diezmil: { dados: TIPOS_DM, orden: ORDEN_TIPOS, precios: PRECIOS_DM, objetos: OBJETOS_DM } });
    if (req.method === 'GET' && ruta === '/api/salas') return json(200, { ok: true, salas: this.publicas() });
    if (req.method === 'GET' && ruta === '/api/sala') return json(200, this.info(url.searchParams.get('sala')));
    if (req.method === 'POST' && ruta.startsWith('/api/')) {
      let cuerpo = '';
      req.on('data', d => { cuerpo += d; if (cuerpo.length > MAX_CUERPO) req.destroy(); });
      req.on('end', () => {
        let d;
        try { d = JSON.parse(cuerpo || '{}'); } catch (e) { return json(400, { ok: false, error: 'Pedido inválido' }); }
        try {
          if (ruta === '/api/crear') return json(200, this.crear(d));
          if (ruta === '/api/entrar') return json(200, this.entrar(d.sala, d.token, d.apodo, d.clave));
          if (ruta === '/api/accion') return json(200, this.accion(d.sala, d.token, d.accion, d));
          json(404, { ok: false, error: 'No existe' });
        } catch (e) { console.error('error en', ruta, e); json(500, { ok: false, error: 'Error del servidor, intenta de nuevo' }); }
      });
      return;
    }
    if (req.method === 'GET') return this._estatico(ruta, res);
    res.writeHead(405); res.end();
  }

  _estatico(ruta, res) {
    if (ruta === '/') ruta = '/index.html';
    const archivo = path.normalize(path.join(this.carpetaWeb, ruta));
    if (!archivo.startsWith(this.carpetaWeb) || !fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    const ext = path.extname(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': ext === '.woff2' ? 'public, max-age=86400' : 'no-cache' });
    fs.createReadStream(archivo).pipe(res);
  }
}

function validoToken(t) { return typeof t === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(t); }

module.exports = { Salas };
