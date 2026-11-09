'use strict';
// Una mesa de diez mil: por turnos con amigos, o en solitario (carrera y escalera de metas). Toda la lógica de la sala vive aquí; la red solo la consulta.
// Las reglas del turno están en reglas.js; los números de la economía salen del simulador (docs/diez_mil_calibracion.md).
//
// Fases: ESPERA (en la sala, antes de empezar) -> TURNO (un jugador tira, aparta y se planta) -> TIENDA (cada 5 rondas, todos a la vez) -> ... -> FIN.

const R = require('./reglas');
const Bots = require('../bots');
const { TIEMPO_VALIDO, escalarTiempos } = require('../tiempo');
const CLAVES_TIEMPO = ['tirar', 'apartar', 'decidir', 'eleccion', 'tienda'];   // los plazos que cambian con el tiempo de la sala

const FASE = { ESPERA: 'espera', TURNO: 'turno', TIENDA: 'tienda', FIN: 'fin' };
const TIEMPOS = { tirar: 12000, apartar: 15000, decidir: 12000, quemada: 5000, eleccion: 10000, fin: 1500, tienda: 30000, ausente: 2500, ausencia: 180000, reemplazo: 30000 };
const MAX_APODO = 16;
const MAX_ASIENTOS = 8;
const CADA_TIENDA = 5;      // la tienda se abre cada tantas rondas (cada 5 turnos propios)
const OBJETOS_MAX = 2;
const ETAPA_TURNOS = 40;    // escalera de metas: turnos de cada etapa
const SALTO_META = 5000;    // escalera de metas: cuánto sube la meta en cada etapa
const REACCIONES = 6;
const FICHAS = { porTirada: 4, consuelo: 20, porPuntos: 0.03 };   // fichas por tirada superada, por quemarte y por cada punto anotado
const PRECIOS = { pegajoso: 50, espejo: 70, explosivo: 70, multiplicador: 150, iman: 120, banco: 130, poker: 250, suerte: 120, vampiro: 140, doble: 200, fantasma: 150, escalera: 140, apostador: 90, cargado: 90, salvavidas: 110, comodin: 200, oro: 200, sexto: 220 };
const PRECIO_GRABADO = valor => (valor === 1 ? 100 : (valor === 5 ? 60 : 30));
const OBJETOS = {
  trabado: { nombre: 'Dado trabado', precio: 60, desc: 'El elegido tira con un dado menos en su próximo turno.' },
  robo: { nombre: 'Robo', precio: 90, desc: 'Le robas 200 puntos al jugador elegido.' },
};

class MesaDM {
  constructor(op = {}) {
    this.juego = 'diezmil';
    this.modo = ['multi', 'carrera', 'escalera'].includes(op.modo) ? op.modo : 'multi';
    this.tomarDados = !!op.tomarDados;                                   // ¿el siguiente puede tomar los dados del que se quemó?
    this.hostil = op.hostil === undefined ? true : !!op.hostil;          // ¿hay objetos contra otros jugadores?
    this.cupo = op.cupo === undefined ? true : !!op.cupo;                // ¿hay cupo de entrada (500 en un turno, o 300 tras dos quemadas)? Por omisión sí; la sala con amigos lo elige
    this.maxAsientos = this.modo === 'multi' ? (op.asientos || MAX_ASIENTOS) : 1;
    this.clave = op.clave || null;
    this.azar = op.azar || Math.random;
    this.ahora = op.ahora || (() => Date.now());
    this.tiempoModo = TIEMPO_VALIDO(op.tiempoModo);   // 'normal', 'extendido' o 'libre'
    this.tiempos = Object.assign({}, TIEMPOS, escalarTiempos(TIEMPOS, CLAVES_TIEMPO, this.tiempoModo), op.tiempos || {});
    this.cadaTienda = op.cadaTienda || CADA_TIENDA;
    this.version = 0;
    this.fase = FASE.ESPERA;
    this.ronda = 1;
    this.etapa = 1;
    this.sinTiempo = !!op.sinTiempo || this.tiempoModo === 'libre';   // sala sin límite de tiempo
    this.pausa = null;           // cuándo se pausó (sala de un jugador con la pestaña oculta), o null
    this.metaBase = op.meta || R.META;   // (la meta de la sala: clásica 10.000 o corta 5.000; la escalera la sube por etapas)
    this.meta = this.metaBase;
    this.jugadores = [];
    this.turno = null;           // el jugador al que le toca
    this.t = null;               // su turno (reglas.js)
    this.limite = null;          // cuándo vence el plazo de lo que toca hacer ahora
    this.finTurnoEn = null;      // cuándo empieza el turno siguiente (una pausa para ver cómo terminó el anterior)
    this.eleccion = null;        // "tomar los dados": { acum, n } hasta que el jugador elige
    this.herencia = null;        // lo que dejó el que se quemó: { acum, n }
    this.pendiente = null;       // quien llegó a la meta en una sala con amigos: la ronda se completa para que todos jueguen los mismos turnos
    this.rollId = 0;             // cuenta las tiradas, para que el cliente anime cada una una sola vez
    this.ultimoTurno = null;     // cómo terminó el último turno: { id, asiento, resultado, acum, motivo }
    this.contadorTurnos = 0;
    this.avisos = []; this.contadorAvisos = 0;
    this.reacciones = []; this.contadorReacciones = 0;
    this.fin = null;
    this.botEn = null;           // cuándo juega el bot al que le toca (null = todavía no se fijó)
    if (this.modo === 'multi') this._ponerBots(op.bots);
  }

  // ---------- jugadores ----------

  jugador(token) { return this.jugadores.find(j => j.token === token) || null; }
  porAsiento(asiento) { return this.jugadores.find(j => j.asiento === asiento) || null; }

  // ---------- bots y reglas de la sala de espera (solo el anfitrión, y solo antes de empezar) ----------
  _crearBot(asiento) { return Object.assign(MesaDM._nuevo(Bots.tokenBot(), Bots.nombreLibre(this.jugadores), asiento, this.cupo), { bot: true }); }
  _ponerBots(n) {
    n = Bots.cantidadValida(n, this.maxAsientos);
    for (let k = 0; k < n; k++) this.jugadores.push(this._crearBot(this.maxAsientos - n + k));
    this.jugadores.sort((a, b) => a.asiento - b.asiento);
  }
  _anfitrionEnEspera(token) {
    const j = this.jugador(token);
    if (!j) return { error: 'No estás en la sala' };
    if (this.fase !== FASE.ESPERA || this.modo !== 'multi' || this.tutorial) return { error: 'Ahora no se puede' };
    if (this.anfitrion() !== j) return { error: 'Solo puede quien armó la sala' };
    return { j };
  }
  agregarBot(token, asiento) {
    const s = this._anfitrionEnEspera(token);
    if (s.error) return { ok: false, error: s.error };
    asiento = Number(asiento);
    if (!(asiento >= 0 && asiento < this.maxAsientos) || Math.floor(asiento) !== asiento || this.porAsiento(asiento)) return { ok: false, error: 'Ese asiento no está libre' };
    this.jugadores.push(this._crearBot(asiento));
    this.jugadores.sort((a, b) => a.asiento - b.asiento);
    this._cambio();
    return { ok: true };
  }
  quitarBot(token, asiento) {
    const s = this._anfitrionEnEspera(token);
    if (s.error) return { ok: false, error: s.error };
    const b = this.porAsiento(Number(asiento));
    if (!b || !b.bot) return { ok: false, error: 'Ahí no hay un bot' };
    this.jugadores = this.jugadores.filter(x => x !== b);
    this._cambio();
    return { ok: true };
  }
  // Cambiar las reglas esperando: `d` trae lo que cambia (lo que falte o no valga queda como está).
  configurar(token, d) {
    const s = this._anfitrionEnEspera(token);
    if (s.error) return { ok: false, error: s.error };
    d = d || {};
    if (d.asientos !== undefined) {
      const n = Math.floor(Number(d.asientos));
      if (!(n >= 2 && n <= MAX_ASIENTOS)) return { ok: false, error: 'Entre 2 y 8 jugadores' };
      if (n < this.jugadores.length) return { ok: false, error: 'Ya hay más jugadores sentados' };
      this.maxAsientos = n;
    }
    if (d.tiempo !== undefined) {
      this.tiempoModo = TIEMPO_VALIDO(d.tiempo);
      this.tiempos = Object.assign({}, TIEMPOS, escalarTiempos(TIEMPOS, CLAVES_TIEMPO, this.tiempoModo));
      this.sinTiempo = this.tiempoModo === 'libre';
    }
    if (d.meta !== undefined) { this.metaBase = Number(d.meta) === 5000 ? 5000 : 10000; this.meta = this.metaBase; }
    if (d.tomarDados !== undefined) this.tomarDados = !!d.tomarDados;
    if (d.hostil !== undefined) this.hostil = !!d.hostil;
    if (d.cupo !== undefined) { this.cupo = !!d.cupo; for (const j of this.jugadores) j.entrado = !this.cupo; }
    this._cambio();
    return { ok: true };
  }

  _quitarBot() {   // cuando entra un humano y no hay lugar, se va un bot
    const b = this.jugadores.filter(j => j.bot).pop();
    if (b) this.salir(b.token);
  }
  _humanos() { return this.jugadores.filter(j => !j.bot); }

  // (sin cupo de entrada, todos nacen "entrados": pueden plantarse con cualquier puntaje)
  static _nuevo(token, apodo, asiento, cupo = true) {
    return { token, apodo, asiento, conectado: true, sale: false, dados: [0, 1, 2, 3, 4].map(() => R.crearDado('normal')), total: 0, entrado: !cupo, fichas: 0, turnosPropios: 0, turnosEtapa: 0, quemadas: 0, quemadasSeguidas: 0, fallosEntrada: 0, mejorTurno: 0, compras: [],
      oferta: [], compradas: [], listo: false, objetos: [], trabados: 0 };
  }

  unirse(token, apodo) {
    const ya = this.jugador(token);
    if (ya) { ya.conectado = true; ya.sale = false; ya.desde = undefined; this.avanzar(); this._cambio(); return { ok: true, asiento: ya.asiento }; }
    apodo = String(apodo || '').trim().replace(/\s+/g, ' ').slice(0, MAX_APODO);
    if (!apodo) return { ok: false, error: 'Escribe un apodo' };
    if (this.fase === FASE.FIN) return { ok: false, error: 'La partida terminó' };
    const bot = this.jugadores.find(j => j.bot && j.apodo.toLowerCase() === apodo.toLowerCase());
    if (bot) bot.apodo = Bots.nombreLibre(this.jugadores.filter(x => x !== bot).concat([{ apodo }]));   // (un humano que se llama como un bot se queda con el nombre)
    else if (this.jugadores.some(j => j.apodo.toLowerCase() === apodo.toLowerCase())) return { ok: false, error: 'Ese apodo ya está en uso en la sala' };
    if (this.jugadores.length >= this.maxAsientos) this._quitarBot();
    if (this.jugadores.length >= this.maxAsientos) this._liberarAusente();
    if (this.jugadores.length >= this.maxAsientos) return { ok: false, error: 'La sala está llena' };
    let asiento = 0;
    while (this.porAsiento(asiento)) asiento++;
    const nuevo = MesaDM._nuevo(token, apodo, asiento, this.cupo);
    if (this.fase !== FASE.ESPERA && this.modo === 'multi') nuevo.tardio = true;   // (se sumó con la partida en curso: hasta su primer turno se le avisa)
    this.jugadores.push(nuevo);
    this.jugadores.sort((a, b) => a.asiento - b.asiento);
    if (this.fase === FASE.TIENDA) nuevo.oferta = this._ofertar(nuevo);
    if (this.fase === FASE.ESPERA && this.modo !== 'multi') this._empezar();   // (en solitario se empieza al entrar)
    this.avanzar(); this._cambio();
    return { ok: true, asiento };
  }

  desconectar(token) {
    const j = this.jugador(token);
    if (!j) return;
    if (j.conectado) j.desde = this.ahora();
    j.conectado = false;
    this.avanzar(); this._cambio();
  }

  salir(token) {
    const j = this.jugador(token);
    if (!j) return;
    const eraSuTurno = this.turno === j && this.fase === FASE.TURNO;
    this.jugadores = this.jugadores.filter(x => x !== j);
    if (!j.bot && !this._humanos().length) this.jugadores = [];   // (sin humanos no hay sala: los bots se van con el último)
    if (this.fase === FASE.FIN) { this._cambio(); return; }
    if (this.modo !== 'multi' && this.fase !== FASE.ESPERA) { this._terminarPartida('abandono', null); this._cambio(); return; }
    if (!this.jugadores.length) { this.fase = FASE.ESPERA; this.turno = null; this.t = null; this.limite = null; this.herencia = null; this.eleccion = null; this._cambio(); return; }
    if (eraSuTurno) { this.herencia = null; this.eleccion = null; this._pasarAlSiguiente(j.asiento); }
    this.avanzar(); this._cambio();
  }

  _ausentes(ms) { const t = this.ahora(); return this.jugadores.filter(j => !j.conectado && j.desde !== undefined && t - j.desde >= ms); }
  _limpiarAusentes() {
    const fuera = this._ausentes(this.tiempos.ausencia).filter(j => this.modo === 'multi');
    if (!fuera.length) return false;
    for (const j of fuera) this.salir(j.token);
    return true;
  }
  _liberarAusente() {
    const c = this._ausentes(this.tiempos.reemplazo).filter(j => this.turno !== j).sort((a, b) => a.desde - b.desde)[0];
    if (c) this.salir(c.token);
  }
  // Quien puede empezar la partida: el de menor asiento que esté conectado.
  anfitrion() { return this.jugadores.filter(j => j.conectado && !j.bot).sort((a, b) => a.asiento - b.asiento)[0] || null; }

  // ---------- empezar y pasar de turno ----------

  empezar(token) {
    if (this.fase !== FASE.ESPERA) return { ok: false, error: 'La partida ya empezó' };
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.anfitrion() !== j) return { ok: false, error: 'Solo puede empezar quien armó la sala' };
    this._empezar();
    this.avanzar(); this._cambio();
    return { ok: true };
  }
  _empezar() {
    this.fase = FASE.TURNO;
    this.ronda = 1;
    this._iniciarTurno(this.jugadores.slice().sort((a, b) => a.asiento - b.asiento)[0]);
  }

  // Para entrar hacen falta 500 en un turno; tras dos quemadas seguidas sin haber entrado, 300 (no rige en el tutorial).
  _entradaDe(j) { return !this.tutorial && (j.fallosEntrada || 0) >= 2 ? 300 : R.ENTRADA; }

  _iniciarTurno(j) {
    this.fase = FASE.TURNO;
    this.turno = j;
    this.finTurnoEn = null;
    this.botEn = null;
    this.eleccion = null;
    const trabados = j.trabados; j.trabados = 0;
    this.t = new R.Turno(j.dados, j.total, j.entrado, { meta: this.meta, trabados, entrada: this._entradaDe(j), piedad: !this.tutorial && (j.quemadasSeguidas || 0) >= 2 });
    if (this.tomarDados && this.herencia && this.herencia.acum > 0 && this.jugadores.length > 1) {
      this.eleccion = { acum: this.herencia.acum, n: this.herencia.n };
      this.limite = this.ahora() + this.tiempos.eleccion;
    } else {
      this.herencia = null;
      this.limite = this.ahora() + (j.conectado ? this.tiempos.tirar : this.tiempos.ausente);
    }
  }

  // Después del turno de `desde` (un asiento), le toca al siguiente (o hay tienda si terminó una ronda de las que la abren).
  _pasarAlSiguiente(desde) {
    const orden = this.jugadores.slice().sort((a, b) => a.asiento - b.asiento);
    const sig = orden.find(j => j.asiento > desde);
    if (sig && this.modo === 'multi') { this._iniciarTurno(sig); return; }
    if (this.pendiente) {   // terminó la última vuelta: gana quien llegó primero a la meta
      const g = this.jugadores.includes(this.pendiente) ? this.pendiente : orden.slice().sort((a, b) => b.total - a.total)[0];
      this._terminarPartida('meta', g);
      return;
    }
    // terminó la ronda
    const rondaTerminada = this.ronda;
    this.ronda++;
    if (rondaTerminada % this.cadaTienda === 0) { this._abrirTienda(); return; }
    this._iniciarTurno(orden[0]);
  }

  _siguienteTurno() {
    const j = this.turno;
    this._pasarAlSiguiente(j ? j.asiento : -1);
  }

  // ---------- el turno ----------

  _suTurno(token, estados) {
    const j = this.jugador(token);
    if (!j) return { error: 'No estás en la sala' };
    if (this.fase === FASE.FIN) return { error: 'La partida terminó' };
    if (this.fase !== FASE.TURNO || this.turno !== j) return { error: 'No es tu turno' };
    if (this.eleccion) return { error: 'Primero elige si tomas los dados' };
    if (estados && !estados.includes(this.t.estado)) return { error: 'Ahora no se puede hacer eso' };
    return { j };
  }
  _plazo(estado) { return this.ahora() + (this.turno.conectado ? this.tiempos[estado] : this.tiempos.ausente); }

  tirar(token) {
    const s = this._suTurno(token, ['tirar', 'decidir']);
    if (s.error) return { ok: false, error: s.error };
    this._hacerTirar();
    this.avanzar(); this._cambio();
    return { ok: true };
  }
  _hacerTirar() {
    if (this.t.estado === 'decidir') this.t.seguir();
    const r = this.t.tirar(this.azar);
    this.rollId++;
    this._trasTirada(r);
  }
  _trasTirada(r) {
    if (!r.ok) return;
    if (r.quemada) {
      if (r.ventana) this.limite = this._plazo('quemada');
      else this._terminarTurno();
    } else this.limite = this._plazo(this.t.estado === 'decidir' ? 'decidir' : 'apartar');   // (el fantasma deja el turno en 'decidir')
  }

  // `luego` ('tirar' o 'plantarse') encadena la decisión en el mismo toque: aparta y sigue, sin parar en el estado de decidir.
  apartar(token, indices, luego) {
    const s = this._suTurno(token, ['apartar']);
    if (s.error) return { ok: false, error: s.error };
    if (!Array.isArray(indices)) return { ok: false, error: 'Elige los dados' };
    const r = this.t.apartar(indices.map(Number));
    if (!r.ok) return r;
    this.limite = this._plazo('decidir');
    this._tras_apartar();
    if (this.t.estado === 'decidir' && luego === 'tirar') this._hacerTirar();
    else if (this.t.estado === 'decidir' && luego === 'plantarse') {
      const p = this.t.plantarse();
      if (p.ok) this._terminarTurno();
    }
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // Efecto del dado vampiro: roba 50 puntos a quien va primero (si te lleva ventaja) y los suma a lo que llevas en el turno.
  _tras_apartar() {
    const t = this.t, j = this.turno;
    if (!t || !t.ultimaJugada || !this.hostil || this.modo !== 'multi') return;
    if (!t.ultimaJugada.slots.some(s => t.dados[s].tipo === 'vampiro')) return;
    const lider = this.jugadores.filter(x => x !== j && x.total > t.total).sort((a, b) => b.total - a.total)[0];
    if (!lider || t.total + t.acum + 50 > t.meta) return;
    const robo = Math.min(50, lider.total);
    lider.total -= robo; t.acum += robo; t.ultimaJugada.puntos += robo;
    if (t.historial.length) t.historial[t.historial.length - 1].puntos += robo;
    this._aviso({ tipo: 'vampiro', de: j.asiento, a: lider.asiento, puntos: robo });
  }

  // Apuesta del dado apostador: 'par' o 'impar' (antes de tirar).
  apostar(token, v) {
    const s = this._suTurno(token, ['tirar', 'decidir']);
    if (s.error) return { ok: false, error: s.error };
    if (!this.t.pool.some(sl => this.t.dados[sl].tipo === 'apostador')) return { ok: false, error: 'No tienes un dado apostador en la mano' };
    this.t.apuesta = v === 'impar' ? 'impar' : 'par';
    this._cambio();
    return { ok: true };
  }

  plantarse(token) {
    const s = this._suTurno(token, ['decidir']);
    if (s.error) return { ok: false, error: s.error };
    const r = this.t.plantarse();
    if (!r.ok) return r;
    this._terminarTurno();
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  voltear(token, slot) {
    const s = this._suTurno(token, ['apartar', 'quemada']);
    if (s.error) return { ok: false, error: s.error };
    const r = this.t.voltear(Number(slot), this.azar);
    if (!r.ok) return r;
    if (this.t.estado === 'apartar') this.limite = this._plazo('apartar');
    else if (this.t.estado === 'fin') this._terminarTurno();
    else this.limite = this._plazo('quemada');
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // Terminó el turno actual (te plantaste, ganaste o te quemaste): fichas, estadísticas, y ver si se acabó la partida o la etapa.
  _terminarTurno() {
    const j = this.turno, t = this.t, quemo = t.resultado === 'quemo';
    const fichas = t.rondas * FICHAS.porTirada + (quemo ? FICHAS.consuelo : Math.floor(t.acum * FICHAS.porPuntos));
    j.fichas += fichas;
    j.total = t.total; j.entrado = t.entrado;
    if (quemo && t.banco > 0 && t.entrado && t.total + t.banco <= this.meta) j.total += t.banco;   // (lo guardado por el dado banco se conserva)
    j.turnosPropios++; j.turnosEtapa++; j.tardio = false;
    j.quemadasSeguidas = quemo ? (j.quemadasSeguidas || 0) + 1 : 0;
    j.fallosEntrada = quemo && !j.entrado ? (j.fallosEntrada || 0) + 1 : 0;   // (quemadas seguidas sin haber entrado)
    this.contadorTurnos++;
    if (quemo) {
      j.quemadas++;
      this.herencia = this.tomarDados && t.motivo !== 'pasado' && t.acum > 0 && this.jugadores.length > 1 ? { acum: t.acum, n: Math.max(1, t.pool.length) } : null;
    } else { this.herencia = null; j.mejorTurno = Math.max(j.mejorTurno, t.acum); }
    this.ultimoTurno = { id: this.contadorTurnos, asiento: j.asiento, resultado: t.resultado, acum: t.acum, motivo: t.motivo, banco: quemo && t.entrado ? t.banco : 0, fichas, tiradas: t.rondas + (quemo ? 1 : 0) };
    this.limite = null;
    this.finTurnoEn = this.ahora() + this.tiempos.fin;
    if (t.resultado === 'gano') { this._alcanzoLaMeta(j); return; }
    if (this.modo === 'escalera' && j.turnosEtapa >= ETAPA_TURNOS) this._terminarPartida('etapa', j);
  }

  _alcanzoLaMeta(j) {
    if (this.modo === 'escalera') {   // sube la meta, los dados se conservan y empieza otra etapa
      this._aviso({ tipo: 'etapa', de: j.asiento, etapa: this.etapa });
      this.etapa++; this.meta += SALTO_META;
      j.total = 0; j.entrado = false; j.fallosEntrada = 0; j.turnosEtapa = 0; j.fichas += 100;
      return;
    }
    if (this.modo === 'multi' && this.jugadores.some(x => x.asiento > j.asiento)) {   // (los que juegan después de él tienen un turno menos: se completa la ronda)
      if (!this.pendiente) { this.pendiente = j; this._aviso({ tipo: 'ultima', de: j.asiento }); }
      return;
    }
    this._terminarPartida('meta', this.pendiente || j);
  }

  _terminarPartida(motivo, ganador) {
    const ranking = this.jugadores.map(j => ({ asiento: j.asiento, apodo: j.apodo, bot: !!j.bot, total: j.total, turnos: j.turnosPropios, quemadas: j.quemadas, mejorTurno: j.mejorTurno, fichas: j.fichas, dados: j.dados.map(d => d.tipo), etapa: this.etapa }))
      .sort((a, b) => Number(b.asiento === (ganador ? ganador.asiento : -1)) - Number(a.asiento === (ganador ? ganador.asiento : -1)) || b.total - a.total || a.asiento - b.asiento);   // (el que ganó primero; después por puntos)
    const empatados = motivo === 'meta' && this.modo === 'multi' && ganador ? ranking.filter(r => r.total === ganador.total).map(r => r.asiento) : [];   // (llegaron a la meta en la misma vuelta: comparten el primer puesto)
    this.fin = { motivo, empatados: empatados.length > 1 ? empatados : [], ganador: ganador ? { asiento: ganador.asiento, apodo: ganador.apodo, total: ganador.total, turnos: ganador.turnosPropios, automaticos: ganador.automaticos || 0 } : null, ranking, ronda: this.ronda, etapa: this.etapa, meta: this.meta, modo: this.modo, turnos: this.contadorTurnos };
    this.fase = FASE.FIN;
    this.limite = null; this.finTurnoEn = null;
  }

  _aviso(a) { this.avisos.push(Object.assign({ id: ++this.contadorAvisos }, a)); if (this.avisos.length > 10) this.avisos.shift(); }

  // ---------- tomar los dados ----------

  tomar(token, si) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.TURNO || this.turno !== j || !this.eleccion) return { ok: false, error: 'No hay nada que elegir' };
    this._resolverEleccion(!!si);
    this.avanzar(); this._cambio();
    return { ok: true };
  }
  _resolverEleccion(tomo) {
    const j = this.turno, e = this.eleccion;
    this.eleccion = null;
    this.herencia = null;
    if (tomo && e) {
      const pool = j.dados.map((_, i) => i).slice(0, Math.min(e.n, j.dados.length));
      this.t = new R.Turno(j.dados, j.total, j.entrado, { meta: this.meta, acum: e.acum, pool, entrada: this._entradaDe(j) });
      this._aviso({ tipo: 'tomo', de: j.asiento, acum: e.acum });
    }
    this.limite = this._plazo('tirar');
  }

  // ---------- la tienda ----------

  _ofertar(j) {
    const conHostiles = this.hostil && this.modo === 'multi' && this.jugadores.length > 1;
    const tipos = Object.keys(PRECIOS).filter(t => t !== 'sexto' && (t !== 'vampiro' || conHostiles) && !j.dados.some(d => d.tipo === t)).map(t => ({ tipo: 'dado', id: t, precio: PRECIOS[t] }));
    const pool = tipos.slice();
    if (j.dados.length === 5) pool.push({ tipo: 'sexto', precio: PRECIOS.sexto });
    pool.push({ tipo: 'grabado', precio: PRECIO_GRABADO(5) });
    if (this.hostil && this.modo === 'multi' && this.jugadores.length > 1 && j.objetos.length < OBJETOS_MAX) for (const id of Object.keys(OBJETOS)) pool.push({ tipo: 'objeto', id, precio: OBJETOS[id].precio });
    const out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.min(pool.length - 1, Math.floor(this.azar() * pool.length)), 1)[0]);
    return out;
  }

  _abrirTienda() {
    this.fase = FASE.TIENDA;
    this.turno = null; this.t = null; this.eleccion = null; this.herencia = null;
    this.limite = this.ahora() + this.tiempos.tienda;
    for (const j of this.jugadores) { j.listo = false; j.compradas = []; j.oferta = this._ofertar(j); }
    for (const j of this.jugadores) if (j.bot) this._comprarBot(j);
  }
  // El bot compra lo más caro que le alcance (los dados especiales y el sexto; nada de grabados ni objetos contra otros) y queda listo.
  _comprarBot(j) {
    const orden = j.oferta.map((o, i) => i).sort((a, b) => j.oferta[b].precio - j.oferta[a].precio);
    for (const i of orden) {
      const o = j.oferta[i];
      if (j.fichas < o.precio) continue;
      if (o.tipo === 'dado') {
        const slot = j.dados.findIndex(d => d.tipo === 'normal');
        if (slot < 0 || j.dados.some(d => d.tipo === o.id)) continue;
        j.dados[slot] = R.crearDado(o.id);
      } else if (o.tipo === 'sexto') {
        if (j.dados.length >= 6) continue;
        j.dados.push(R.crearDado('normal'));
      } else continue;
      j.fichas -= o.precio; (j.compras = j.compras || []).push(o.tipo === 'dado' ? o.id : o.tipo); j.compradas.push(i);
    }
    j.listo = true;
  }
  _cerrarTienda() {
    for (const j of this.jugadores) { j.oferta = []; j.compradas = []; j.listo = false; }
    const orden = this.jugadores.slice().sort((a, b) => a.asiento - b.asiento);
    this._iniciarTurno(orden[0]);
  }

  // Compra la oferta `indice`. `extra`: { slot } (a qué dado reemplaza) o { slot, cara, valor } (el grabado).
  comprar(token, indice, extra = {}) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.TIENDA) return { ok: false, error: 'La tienda está cerrada' };
    indice = Number(indice);
    const o = j.oferta[indice];
    if (!o) return { ok: false, error: 'Esa oferta no existe' };
    if (j.compradas.includes(indice)) return { ok: false, error: 'Ya lo compraste' };
    const slot = Number(extra.slot);
    let precio = o.precio;
    if (o.tipo === 'dado') {
      if (!(slot >= 0 && slot < j.dados.length)) return { ok: false, error: 'Elige qué dado reemplazas' };
      if (j.dados.some(d => d.tipo === o.id)) return { ok: false, error: 'Ya tienes un dado de ese tipo' };
    } else if (o.tipo === 'sexto') {
      if (j.dados.length >= 6) return { ok: false, error: 'Ya tienes seis dados' };
    } else if (o.tipo === 'grabado') {
      const cara = Number(extra.cara), valor = Number(extra.valor);
      if (!(slot >= 0 && slot < j.dados.length) || !(cara >= 0 && cara < 6) || !(valor >= 1 && valor <= 6)) return { ok: false, error: 'Elige el dado, la cara y el número' };
      if (j.dados[slot].caras[cara] === valor) return { ok: false, error: 'Esa cara ya tiene ese número' };
      precio = PRECIO_GRABADO(valor);
    } else if (o.tipo === 'objeto') {
      if (j.objetos.length >= OBJETOS_MAX) return { ok: false, error: 'No tienes lugar para otro objeto' };
    }
    if (j.fichas < precio) return { ok: false, error: 'No te alcanzan las fichas' };
    j.fichas -= precio;
    (j.compras = j.compras || []).push(o.tipo === 'dado' || o.tipo === 'objeto' ? o.id : o.tipo);   // (para calibrar la tienda con partidas reales)
    if (o.tipo === 'dado') j.dados[slot] = R.crearDado(o.id);
    else if (o.tipo === 'sexto') j.dados.push(R.crearDado('normal'));
    else if (o.tipo === 'grabado') j.dados[slot].caras[Number(extra.cara)] = Number(extra.valor);
    else if (o.tipo === 'objeto') j.objetos.push(o.id);
    j.compradas.push(indice);
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  listo(token) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.TIENDA) return { ok: false, error: 'La tienda está cerrada' };
    j.listo = true;
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // ---------- objetos contra otros ----------

  usar(token, indice, objetivo) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.TURNO) return { ok: false, error: 'Ahora no se puede' };
    if (!this.hostil) return { ok: false, error: 'Los objetos contra otros jugadores están desactivados en esta sala' };
    const id = j.objetos[Number(indice)];
    if (!id) return { ok: false, error: 'No hay nada ahí' };
    const blanco = this.porAsiento(Number(objetivo));
    if (!blanco || blanco === j) return { ok: false, error: 'Elige a otro jugador' };
    if (id === 'trabado') blanco.trabados++;
    else if (id === 'robo') {
      if (!blanco.entrado || blanco.total < 200) return { ok: false, error: 'A ese jugador no le puedes robar todavía' };
      if (!j.entrado) return { ok: false, error: 'Primero tienes que haber entrado' };
      if (j.total + 200 > this.meta) return { ok: false, error: 'Te pasarías de la meta' };
      blanco.total -= 200; j.total += 200;
      if (this.t && this.turno === j) this.t.total = j.total;
      if (this.t && this.turno === blanco) this.t.total = blanco.total;
    }
    j.objetos.splice(Number(indice), 1);
    this._aviso({ tipo: 'objeto', de: j.asiento, a: blanco.asiento, obj: id });
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // ---------- reacciones rápidas ----------

  reaccionar(token, r) {
    const j = this.jugador(token);
    r = Math.floor(Number(r));
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (!(r >= 0 && r < REACCIONES)) return { ok: false, error: 'Reacción desconocida' };
    const t = this.ahora();
    if (j.ultimaReaccion && t - j.ultimaReaccion < 2000) return { ok: false, error: 'Más despacio' };
    j.ultimaReaccion = t;
    this.reacciones.push({ id: ++this.contadorReacciones, asiento: j.asiento, r });
    if (this.reacciones.length > 8) this.reacciones.shift();
    this._cambio();
    return { ok: true };
  }

  // ---------- una partida nueva ----------

  nuevaPartida(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.FIN) return { ok: false, error: 'La partida todavía no terminó' };
    for (const j of this.jugadores) Object.assign(j, MesaDM._nuevo(j.token, j.apodo, j.asiento, this.cupo), { conectado: j.conectado });
    this.fin = null; this.pendiente = null; this.ronda = 1; this.etapa = 1; this.meta = this.metaBase; this.herencia = null; this.eleccion = null; this.turno = null; this.t = null; this.contadorTurnos = 0; this.ultimoTurno = null;
    this.fase = FASE.ESPERA;
    if (this.modo !== 'multi' && this.jugadores.length) this._empezar();   // (en solitario se vuelve a empezar solo; con amigos, empieza quien armó la sala)
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // ---------- el paso del tiempo ----------

  avanzar() {
    if (this.pausa !== null) return;
    for (let i = 0; i < 20; i++) {
      if (!this._paso()) break;
      this._cambio();
    }
  }

  // Pausa: en una sala de un solo jugador, mientras la pestaña está oculta el tiempo no corre (al volver se le devuelve lo que pasó).
  pausar(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.pausa === null && this.jugadores.filter(j => !j.sale).length === 1) { this.pausa = this.ahora(); this._cambio(); }
    return { ok: true };
  }
  reanudar(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.pausa !== null) {
      const d = this.ahora() - this.pausa;
      this.pausa = null;
      if (this.limite !== null) this.limite += d;
      if (this.finTurnoEn !== null) this.finTurnoEn += d;
      this._cambio();
    }
    return { ok: true };
  }

  _paso() {
    const t = this.ahora();
    if (this.fase === FASE.FIN || this.fase === FASE.ESPERA) return false;
    if (this._limpiarAusentes()) return true;
    if (this.fase === FASE.TIENDA) {
      const presentes = this.jugadores.filter(j => j.conectado);
      if (t >= this.limite || presentes.every(j => j.listo)) { this._cerrarTienda(); return true; }
      return false;
    }
    if (this.fase === FASE.TURNO) {
      if (!this.turno || !this.t) return false;
      if (this.t.estado === 'fin') {
        if (this.finTurnoEn !== null && t >= this.finTurnoEn) { this._siguienteTurno(); return true; }
        return false;
      }
      if (!this.turno.bot && !this.turno.conectado && this.modo === 'multi' && !this.tutorial) this.turno.reemplazado = true;
      if (this.turno.bot || (!this.turno.conectado && this.modo === 'multi' && !this.tutorial)) {   // juega el bot (o el bot que reemplaza a quien se desconectó: guarda su lugar y sigue su partida)
        if (this.botEn === null) this.botEn = t + Bots.demora(this.eleccion ? 'decidir' : this.t.estado);
        if (t < this.botEn) return false;
        this.botEn = null; this._pasoBot();
        return true;
      }
      if (this.eleccion) { if (t >= this.limite || !this.turno.conectado) { this._resolverEleccion(false); return true; } return false; }
      if (!this.turno.conectado && this.limite - t > this.tiempos.ausente) this.limite = t + this.tiempos.ausente;   // (quien se desconecta juega rápido solo)
      if (t >= this.limite) { if (this.turno.conectado && !this.tutorial) this.turno.automaticos = (this.turno.automaticos || 0) + 1; if (this.modo === 'multi' && !this.tutorial) { this.t._quemar(); this._terminarTurno(); } else this._automatico(); return true; }   // (se cuentan los turnos que jugó el servidor por alguien presente)
    }
    return false;
  }

  // Una jugada del bot: elige si toma los dados que dejó otro (si son muchos puntos) o hace lo que toque en su turno.
  _pasoBot() {
    if (this.eleccion) { this._resolverEleccion(this.eleccion.acum >= 350); return; }
    this._automatico();
  }

  // Cuando se acaba el tiempo: en las salas con amigos el turno se quema (para no frenar a los demás); en solitario juega solo lo que corresponda.
  _automatico() {
    const t = this.t;
    if (t.estado === 'tirar') this._hacerTirar();
    else if (t.estado === 'apartar') { t.apartar(R.elegirJugada(t).indices); this._tras_apartar(); this.limite = this._plazo('decidir'); }
    else if (t.estado === 'decidir') {
      if (R.debePlantarse(t)) { t.plantarse(); this._terminarTurno(); } else this._hacerTirar();
    } else if (t.estado === 'quemada') {
      for (const it of t.tirada) { if ((it.espejo || it.suerte) && !t.espejosUsados.has(it.slot)) { t.voltear(it.slot, this.azar); if (t.estado === 'apartar') break; } }
      if (t.estado === 'apartar') this.limite = this._plazo('apartar');
      else { t.aceptarQuemada(); this._terminarTurno(); }
    }
  }


  // Quien volvió después de que un bot jugó por él retoma el control (y se apaga el aviso).
  retomar(token) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    j.reemplazado = false;
    this._cambio();
    return { ok: true };
  }

  _cambio() { this.version++; }

  // ---------- guardar y recuperar la sala ----------

  guardar() {
    return { juego: 'diezmil', modo: this.modo, tomarDados: this.tomarDados, hostil: this.hostil, cupo: this.cupo, tiempoModo: this.tiempoModo, maxAsientos: this.maxAsientos, clave: this.clave, version: this.version, fase: this.fase, ronda: this.ronda, etapa: this.etapa, meta: this.meta, metaBase: this.metaBase,
      turno: this.turno ? this.turno.asiento : null, pendiente: this.pendiente ? this.pendiente.asiento : null, contadorTurnos: this.contadorTurnos, contadorReacciones: this.contadorReacciones,
      jugadores: this.jugadores.map(j => Object.assign({}, j, { dados: j.dados.map(d => ({ tipo: d.tipo, caras: d.caras.slice() })) })), fin: this.fin };
  }

  static desde(datos, op = {}) {
    const m = new MesaDM(Object.assign({}, op, { modo: datos.modo, tomarDados: datos.tomarDados, hostil: datos.hostil, cupo: datos.cupo, tiempoModo: datos.tiempoModo, asientos: datos.maxAsientos, clave: datos.clave, meta: datos.metaBase }));
    m.version = datos.version; m.fase = datos.fase; m.ronda = datos.ronda; m.etapa = datos.etapa || 1; m.meta = datos.meta || R.META; m.contadorTurnos = datos.contadorTurnos || 0; m.contadorReacciones = datos.contadorReacciones || 0;
    m.jugadores = datos.jugadores; m.fin = datos.fin || null; m.pendiente = datos.pendiente !== null && datos.pendiente !== undefined ? m.porAsiento(datos.pendiente) : null;
    if (m.fase === FASE.TURNO) { const j = m.porAsiento(datos.turno) || m.jugadores[0]; if (j) m._iniciarTurno(j); else m.fase = FASE.ESPERA; }   // (un turno a medias se vuelve a empezar)
    else if (m.fase === FASE.TIENDA) { m.limite = m.ahora() + m.tiempos.tienda; }
    return m;
  }

  // ---------- lo que ve cada jugador ----------

  estado(token) {
    const yo = this.jugador(token), activo = yo && this.turno === yo;
    const t = this.t;
    let turno = null;
    if (this.fase === FASE.TURNO && t && this.turno) {
      const dados = this.turno.dados;
      turno = {
        estado: this.eleccion ? 'eleccion' : t.estado, acum: t.acum, pool: t.pool.slice(), rollId: this.rollId, explota: !!t.explota, motivo: t.motivo || null,
        tirada: t.tirada.map(i => ({ slot: i.slot, valor: i.valor, tipo: dados[i.slot].tipo, salvado: !!i.salvado })),
        ultimaJugada: t.ultimaJugada || null,
        historial: t.historial,
        puedePlantarse: !!activo && !this.eleccion && t.puedePlantarse(),
        piedad: !!t.piedad && t.rondas === 0 && t.estado === 'tirar',
        entrada: t.entrada,
        validas: activo && t.estado === 'apartar' ? t.validas.map(v => ({ indices: v.indices, puntos: v.puntos, prob: Math.round(t.probTras(v) * 100) })) : [],
        prob: activo && !this.eleccion && (t.estado === 'tirar' || t.estado === 'decidir') ? Math.round(t.probNoQuemar(t.pool, t.acum) * 100) : null,
        espejos: t.estado === 'quemada' || t.estado === 'apartar' ? t.tirada.filter(i => i.espejo && !t.espejosUsados.has(i.slot)).map(i => i.slot) : [],
        suertes: t.estado === 'quemada' || t.estado === 'apartar' ? t.tirada.filter(i => i.suerte && !t.espejosUsados.has(i.slot)).map(i => i.slot) : [],
        apuesta: activo && (t.estado === 'tirar' || t.estado === 'decidir') && t.pool.some(sl => t.dados[sl].tipo === 'apostador') ? t.apuesta : null,
        eleccion: this.eleccion ? { acum: this.eleccion.acum, n: this.eleccion.n } : null,
      };
    }
    const out = {
      juego: 'diezmil', tutorial: !!this.tutorial, sinTiempo: !!(this.sinTiempo || this.tutorial), pausa: this.pausa !== null, tiempos: { tirar: this.tiempos.tirar, apartar: this.tiempos.apartar, decidir: this.tiempos.decidir, quemada: this.tiempos.quemada, eleccion: this.tiempos.eleccion }, version: this.version, ahora: this.ahora(), modo: this.modo, fase: this.fase, limite: this.limite, ronda: this.ronda, etapa: this.etapa, meta: this.meta, tomarDados: this.tomarDados, hostil: this.hostil, cupo: this.cupo, maxAsientos: this.maxAsientos, tiempoModo: this.tiempoModo, metaBase: this.metaBase, cadaTienda: this.cadaTienda,
      ultimaVuelta: this.pendiente ? this.pendiente.asiento : null, turnoDe: this.turno ? this.turno.asiento : null, yo: yo ? yo.asiento : null, reemplazado: !!(yo && yo.reemplazado), anfitrion: this.anfitrion() ? this.anfitrion().asiento : null, etapaTurnos: ETAPA_TURNOS,
      jugadores: this.jugadores.map(j => ({ asiento: j.asiento, apodo: j.apodo, total: j.total, entrado: j.entrado, fichas: j.fichas, conectado: j.conectado, turnos: j.turnosPropios, turnosEtapa: j.turnosEtapa, quemadas: j.quemadas, nObjetos: j.objetos.length, mejorTurno: j.mejorTurno, tardio: !!j.tardio,
        dados: j.dados.map(d => ({ tipo: d.tipo, caras: d.caras.slice() })), listo: j.listo, bot: !!j.bot })),
      turno, ultimoTurno: this.ultimoTurno, fin: this.fin,
      avisos: this.avisos.slice(), contadorAvisos: this.contadorAvisos, reacciones: this.reacciones.slice(), contadorReacciones: this.contadorReacciones,
    };
    if (yo) out.mio = { objetos: yo.objetos.slice(), oferta: yo.oferta.map((o, i) => Object.assign({}, o, { comprada: yo.compradas.includes(i) })), listo: yo.listo };
    return out;
  }
}

module.exports = { MesaDM, FASE, TIEMPOS, PRECIOS, OBJETOS, FICHAS, PRECIO_GRABADO, ETAPA_TURNOS, CADA_TIENDA };
