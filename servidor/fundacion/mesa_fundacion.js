'use strict';
// Una mesa de Fundación (el Catan de dados): un mapa común de hexágonos, de 1 a 8 jugadores que construyen caminos, pueblos y ciudades con dados de recursos.
// Toda la lógica de la sala vive aquí; la red solo la consulta (como MesaDM y Mesa13). Las reglas están en reglas.js y el jugador automático en bot.js. Diseño: docs/catan_dados.md y docs/catan_flujo.md.
//
// Fases: ESPERA -> INICIAL (cada uno pone dos pueblos y dos caminos, en serpiente) -> TURNO -> FIN.
// Un turno tiene cuatro etapas: producción (los dos dados de número), dados (guardar y volver a tirar, hasta 3 tiradas), construir (elegir el edificio si alcanza para más de uno) y colocar (poner la pieza).

const R = require('./reglas');
const Bot = require('./bot');
const Bots = require('../bots');
const { TIEMPO_VALIDO, escalarTiempos } = require('../tiempo');

const FASE = { ESPERA: 'espera', INICIAL: 'inicial', TURNO: 'turno', FIN: 'fin' };
const TIEMPOS = { produccion: 15000, dados: 25000, construir: 25000, inicial: 30000, fin: 1600, ausente: 2500, ausencia: 180000, reemplazo: 30000 };
const CLAVES_TIEMPO = ['produccion', 'dados', 'construir', 'inicial'];   // los plazos que cambian con el tiempo de la sala
const MAX_APODO = 16;
const MAX_ASIENTOS = 8;
const SEGUIDOS_PARA_BOT = 2;   // a la segunda vez seguida que se acaba el tiempo, un bot toma el lugar hasta que el jugador vuelva a actuar

class MesaFundacion {
  constructor(op = {}) {
    this.juego = 'fundacion';
    this.modo = op.modo === 'solo' ? 'solo' : 'multi';
    this.meta = R.METAS.includes(Number(op.meta)) ? Number(op.meta) : 10;
    this.maxAsientos = this.modo === 'multi' ? (op.asientos || MAX_ASIENTOS) : 1;
    this.clave = op.clave || null;
    this.azar = op.azar || Math.random;
    this.ahora = op.ahora || (() => Date.now());
    this.tiempoModo = TIEMPO_VALIDO(op.tiempoModo);
    this.tiempos = Object.assign({}, TIEMPOS, escalarTiempos(TIEMPOS, CLAVES_TIEMPO, this.tiempoModo), op.tiempos || {});
    this.sinTiempo = !!op.sinTiempo || this.tiempoModo === 'libre';
    this.pausa = null;
    this.version = 0;
    this.fase = FASE.ESPERA;
    this.jugadores = [];
    this._limpiarPartida();
    if (this.modo === 'multi') this._ponerBots(op.bots);
  }

  _limpiarPartida() {
    this.mapa = null; this.tab = null; this.carreras = { camino: null, ejercito: null };
    this.orden = []; this.inicial = null; this.turnoIdx = 0; this.ronda = 1; this.t = null;
    this.finDeVuelta = false; this.llegoMeta = null; this.limite = null; this.finTurnoEn = null; this.botEn = null;
    this.eventos = []; this.contadorEventos = 0; this.fin = null; this.semilla = 0; this.nMapa = 0;
  }

  // ---------- jugadores ----------

  jugador(token) { return this.jugadores.find(j => j.token === token) || null; }
  porAsiento(asiento) { return this.jugadores.find(j => j.asiento === asiento) || null; }
  static _nuevo(token, apodo, asiento) { return { token, apodo, asiento, conectado: true, bot: false, expulsado: false, fallos: 0, turnos: 0, automaticos: 0, construidos: 0 }; }
  anfitrion() { return this.jugadores.filter(j => j.conectado && !j.bot).sort((a, b) => a.asiento - b.asiento)[0] || null; }
  _humanos() { return this.jugadores.filter(j => !j.bot); }

  // ---------- bots y reglas de la sala de espera (solo el anfitrión, y solo antes de empezar) ----------
  _crearBot(asiento) { return Object.assign(MesaFundacion._nuevo(Bots.tokenBot(), Bots.nombreLibre(this.jugadores), asiento), { bot: true }); }
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
  // Las reglas de la sala: jugadores (1 a 8), tiempo por fase y meta de puntos.
  configurar(token, d) {
    const s = this._anfitrionEnEspera(token);
    if (s.error) return { ok: false, error: s.error };
    d = d || {};
    if (d.asientos !== undefined) {
      const n = Math.floor(Number(d.asientos));
      if (!(n >= 1 && n <= MAX_ASIENTOS)) return { ok: false, error: 'Entre 1 y 8 jugadores' };
      if (n < this.jugadores.length) return { ok: false, error: 'Ya hay más jugadores sentados' };
      this.maxAsientos = n;
    }
    if (d.tiempo !== undefined) {
      this.tiempoModo = TIEMPO_VALIDO(d.tiempo);
      this.tiempos = Object.assign({}, TIEMPOS, escalarTiempos(TIEMPOS, CLAVES_TIEMPO, this.tiempoModo));
      this.sinTiempo = this.tiempoModo === 'libre';
    }
    if (d.meta !== undefined && R.METAS.includes(Number(d.meta))) this.meta = Number(d.meta);
    this._cambio();
    return { ok: true };
  }
  _quitarBot() { const b = this.jugadores.filter(j => j.bot).pop(); if (b) this.jugadores = this.jugadores.filter(x => x !== b); }

  unirse(token, apodo) {
    const ya = this.jugador(token);
    if (ya) { ya.conectado = true; ya.desde = undefined; if (!ya.bot) { ya.expulsado = false; ya.fallos = 0; } this.avanzar(); this._cambio(); return { ok: true, asiento: ya.asiento }; }
    apodo = String(apodo || '').trim().replace(/\s+/g, ' ').slice(0, MAX_APODO);
    if (!apodo) return { ok: false, error: 'Escribe un apodo' };
    if (this.fase !== FASE.ESPERA) return { ok: false, error: 'La partida ya empezó' };
    const bot = this.jugadores.find(j => j.bot && j.apodo.toLowerCase() === apodo.toLowerCase());
    if (bot) bot.apodo = Bots.nombreLibre(this.jugadores.filter(x => x !== bot).concat([{ apodo }]));   // (un humano que se llama como un bot se queda con el nombre)
    else if (this.jugadores.some(j => j.apodo.toLowerCase() === apodo.toLowerCase())) return { ok: false, error: 'Ese apodo ya está en uso en la sala' };
    if (this.jugadores.length >= this.maxAsientos) this._quitarBot();
    if (this.jugadores.length >= this.maxAsientos) return { ok: false, error: 'La sala está llena' };
    let asiento = 0;
    while (this.porAsiento(asiento)) asiento++;
    this.jugadores.push(MesaFundacion._nuevo(token, apodo, asiento));
    this.jugadores.sort((a, b) => a.asiento - b.asiento);
    if (this.modo !== 'multi') this._empezar();   // (en solitario se empieza al entrar)
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

  // Quien se va en medio de la partida deja su lugar a un bot (con sus piezas); en solitario, la partida termina.
  salir(token) {
    const j = this.jugador(token);
    if (!j) return;
    if (this.fase === FASE.ESPERA || this.fase === FASE.FIN) this.jugadores = this.jugadores.filter(x => x !== j);
    else if (this.modo !== 'multi') { this.jugadores = this.jugadores.filter(x => x !== j); this._terminarPartida('abandono', j); }
    else { j.bot = true; j.token = Bots.tokenBot(); j.conectado = true; j.expulsado = false; }
    if (!j.bot && this.jugadores.every(x => x.bot)) this.jugadores = [];   // (sin humanos no hay sala: los bots se van con el último)
    if (!this._humanos().length && this.fase !== FASE.ESPERA) this.jugadores = [];
    if (!this.jugadores.length) { this.fase = FASE.ESPERA; this._limpiarPartida(); }
    this.avanzar(); this._cambio();
  }

  _ausentes(ms) { const t = this.ahora(); return this.jugadores.filter(j => !j.conectado && j.desde !== undefined && t - j.desde >= ms); }
  _limpiarAusentes() {
    if (this.modo !== 'multi' || this.fase !== FASE.ESPERA) return false;
    const fuera = this._ausentes(this.tiempos.ausencia);
    if (!fuera.length) return false;
    for (const j of fuera) this.salir(j.token);
    return true;
  }

  // ---------- empezar ----------

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
    this._limpiarPartida();
    for (const j of this.jugadores) Object.assign(j, { turnos: 0, automaticos: 0, construidos: 0, fallos: 0, expulsado: false });
    this.nMapa = this.jugadores.length; this.semilla = Math.floor(this.azar() * 2147483647);
    this.mapa = R.crearMapa(this.semilla, this.nMapa); this.tab = R.nuevoTablero(this.mapa);
    this.orden = R.mezclar(this.jugadores.map(j => j.asiento), R.rng(this.semilla + 1));
    this.inicial = { plan: R.ordenInicial(this.orden.length).map(i => this.orden[i]), idx: 0, sub: 'pueblo', ultimoPueblo: null };
    this.fase = FASE.INICIAL;
    this._fijarLimite();
  }

  // ---------- los plazos ----------

  _sub() { return this.fase === FASE.INICIAL ? 'inicial' : (this.t ? this.t.sub : null); }
  _actor() {
    if (this.fase === FASE.INICIAL) return this.porAsiento(this.inicial.plan[this.inicial.idx]);
    if (this.fase === FASE.TURNO && this.t) return this.porAsiento(this.t.asiento);
    return null;
  }
  _fijarLimite() {
    const sub = this._sub(), clave = sub === 'colocar' || sub === 'construir' ? 'construir' : sub;
    this.limite = this.ahora() + (this.tiempos[clave] || this.tiempos.dados);
    this.botEn = null;
  }
  _juegaElBot(j) { return j.bot || j.expulsado || (!j.conectado && this.modo === 'multi'); }

  avanzar() {
    if (this.pausa !== null) return;
    for (let i = 0; i < 30; i++) { if (!this._paso()) break; this._cambio(); }
  }
  pausar(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.pausa === null && this.jugadores.length === 1) { this.pausa = this.ahora(); this._cambio(); }
    return { ok: true };
  }
  reanudar(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.pausa !== null) {
      const d = this.ahora() - this.pausa; this.pausa = null;
      if (this.limite !== null) this.limite += d;
      if (this.finTurnoEn !== null) this.finTurnoEn += d;
      this._cambio();
    }
    return { ok: true };
  }

  _paso() {
    const t = this.ahora();
    if (this.fase === FASE.FIN || this.fase === FASE.ESPERA) return this._limpiarAusentes();
    if (this.finTurnoEn !== null) { if (t >= this.finTurnoEn) { this._siguienteTurno(); return true; } return false; }
    const j = this._actor();
    if (!j) return false;
    if (this._juegaElBot(j)) {   // juega el bot (o el que reemplaza a quien se fue o no actuó: guarda su lugar)
      if (!j.bot && !j.reemplazado && (j.expulsado || !j.conectado)) { j.reemplazado = true; this._cambio(); }
      if (this.botEn === null) this.botEn = t + Bots.demora(this._sub() === 'dados' ? 'tirar' : 'decidir');
      if (t < this.botEn) return false;
      this.botEn = null;
      this._jugadaBot(j);
      return true;
    }
    if (this.limite !== null && t >= this.limite) { this._agotado(j); return true; }
    return false;
  }

  // Se acabó el tiempo: un bot juega lo que falta de este turno. A la segunda vez seguida, un bot toma el lugar hasta que vuelva a actuar.
  _agotado(j) {
    j.automaticos++; j.fallos++;
    if (j.fallos >= SEGUIDOS_PARA_BOT) { j.expulsado = true; j.reemplazado = true; }
    const turno = this.t, idx = this.inicial ? this.inicial.idx : -1, fase = this.fase;
    for (let i = 0; i < 80; i++) {
      this._jugadaBot(j);
      if (this.fase !== fase || this.finTurnoEn !== null || this.t !== turno || (this.inicial && this.inicial.idx !== idx)) break;
    }
  }
  _manual(j) { j.fallos = 0; j.expulsado = false; }
  // Quien volvió después de que un bot jugó por él retoma el control (y se apaga el aviso).
  retomar(token) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    j.reemplazado = false;
    this._manual(j);
    this._cambio();
    return { ok: true };
  }


  // ---------- la colocación inicial ----------

  _colocarInicial(j, lugar) {
    const ini = this.inicial;
    if (ini.sub === 'pueblo') {
      if (!R.lugaresPueblo(this.mapa, this.tab, j.asiento, true).includes(lugar)) return { ok: false, error: 'Ahí no se puede poner un pueblo' };
      R.poner(this.tab, 'pueblo', j.asiento, lugar); this._evento(j.asiento, 'pueblo', lugar);
      ini.sub = 'camino'; ini.ultimoPueblo = lugar;
    } else {
      if (!R.lugaresCamino(this.mapa, this.tab, j.asiento, ini.ultimoPueblo).includes(lugar)) return { ok: false, error: 'Ahí no se puede poner un camino' };
      R.poner(this.tab, 'camino', j.asiento, lugar); this._evento(j.asiento, 'camino', lugar);
      ini.sub = 'pueblo'; ini.ultimoPueblo = null; ini.idx++;
      if (ini.idx >= ini.plan.length) { this._empezarTurnos(); return { ok: true }; }
    }
    this._fijarLimite();
    return { ok: true };
  }
  _empezarTurnos() {
    this.fase = FASE.TURNO; this.turnoIdx = 0; this.inicial = null;
    this._iniciarTurno(this.orden[0]);
  }

  // ---------- el turno ----------

  _evento(asiento, tipo, lugar) { this.eventos.push({ id: ++this.contadorEventos, asiento, tipo, lugar }); if (this.eventos.length > 8) this.eventos.shift(); }
  _tirar6(n) { const d = []; for (let i = 0; i < n; i++) d.push(Math.floor(this.azar() * 6)); return d; }

  _iniciarTurno(asiento) {
    const nums = R.tirarNumeros(this.azar);
    if (nums.suma === 7) R.moverBandido(this.mapa, this.tab, this.azar);
    const gana = R.produccion(this.mapa, this.tab, nums.suma, MAX_ASIENTOS)[asiento] || [];
    this.t = { asiento, sub: 'produccion', num: nums, gana, hexes: nums.suma === 7 ? [] : R.hexesDe(this.mapa, nums.suma), bandido: this.tab.bandido, fijos: gana.length, dados: gana.slice(), tirada: 0, edificio: null, posibles: [], terminado: false, motivo: null };
    this.finTurnoEn = null;
    this._fijarLimite();
  }
  _seguir(j) {   // de la producción a los dados: se hace la primera tirada de los dados libres
    const t = this.t; t.dados = t.dados.slice(0, t.fijos).concat(this._tirar6(R.DADOS - t.fijos)); t.tirada = 1; t.sub = 'dados';
    this._fijarLimite();
    return { ok: true };
  }
  // Se vuelven a tirar los dados libres que no se guardan (`guardar`: posiciones de los dados que se quedan, sin contar los fijados).
  _tirar(j, guardar) {
    const t = this.t;
    if (t.tirada >= R.TIRADAS) return { ok: false, error: 'Ya no quedan tiradas' };
    const keep = new Set(); for (const i of guardar || []) { if (!Number.isInteger(i) || i < t.fijos || i >= R.DADOS) return { ok: false, error: 'Ese dado no se puede guardar' }; keep.add(i); }
    for (let i = t.fijos; i < R.DADOS; i++) if (!keep.has(i)) t.dados[i] = Math.floor(this.azar() * 6);
    t.tirada++;
    this._fijarLimite();
    return { ok: true };
  }
  _terminarDados(j) {
    const t = this.t;
    t.posibles = R.posibles(this.mapa, this.tab, j.asiento, t.dados);
    if (!t.posibles.length) { this._finTurno('sinEdificio'); return { ok: true }; }
    if (t.posibles.length === 1) { t.edificio = t.posibles[0]; t.sub = 'colocar'; } else t.sub = 'construir';
    this._fijarLimite();
    return { ok: true };
  }
  _elegir(j, edificio) {
    const t = this.t;
    if (!t.posibles.includes(edificio)) return { ok: false, error: 'No alcanza para eso' };
    t.edificio = edificio; t.sub = 'colocar'; this._fijarLimite();
    return { ok: true };
  }
  _colocar(j, lugar) {
    const t = this.t;
    if (!R.lugares(this.mapa, this.tab, j.asiento, t.edificio).includes(lugar)) return { ok: false, error: 'Ahí no se puede' };
    t.gastados = R.pagar(R.COSTOS[t.edificio], t.dados).usados;
    R.poner(this.tab, t.edificio, j.asiento, lugar); this._evento(j.asiento, t.edificio, lugar); j.construidos++;
    this._finTurno('construyo');
    return { ok: true };
  }
  _puntosDe(asiento) { return R.puntos(this.tab, asiento, this.carreras); }
  _finTurno(motivo) {
    const t = this.t, j = this.porAsiento(t.asiento);
    if (j) j.turnos++;
    t.terminado = true; t.motivo = motivo; t.sub = 'fin';
    this.carreras = R.carreras(this.tab, MAX_ASIENTOS, this.carreras);
    const llego = this.jugadores.find(x => this._puntosDe(x.asiento) >= this.meta);
    if (llego) {
      if (this.modo !== 'multi') { this._terminarPartida('meta'); return; }
      if (!this.finDeVuelta) { this.finDeVuelta = true; this.llegoMeta = llego.asiento; }
    }
    this.finTurnoEn = this.ahora() + this.tiempos.fin; this.limite = null; this.botEn = null;
  }
  _siguienteTurno() {
    this.finTurnoEn = null;
    let n = 0;
    do {
      this.turnoIdx++;
      if (this.turnoIdx >= this.orden.length) { this.turnoIdx = 0; this.ronda++; if (this.finDeVuelta) { this._terminarPartida('meta'); return; } }
      n++;
    } while (!this.porAsiento(this.orden[this.turnoIdx]) && n < 20);
    if (!this.porAsiento(this.orden[this.turnoIdx])) { this._terminarPartida('abandono'); return; }
    this._iniciarTurno(this.orden[this.turnoIdx]);
  }
  _terminarPartida(motivo) {
    const ranking = this.jugadores.map(j => { const c = R.piezas(this.tab, j.asiento); return { asiento: j.asiento, apodo: j.apodo, bot: j.bot, puntos: this._puntosDe(j.asiento), pueblos: c.pueblo, ciudades: c.ciudad, caminos: c.camino, caballeros: c.caballero, turnos: j.turnos, construidos: j.construidos }; })
      .sort((a, b) => b.puntos - a.puntos || a.turnos - b.turnos || a.asiento - b.asiento);
    const empatados = ranking.length > 1 ? ranking.filter(r => r.puntos === ranking[0].puntos && r.turnos === ranking[0].turnos).map(r => r.asiento) : [];
    this.fin = { motivo, modo: this.modo, meta: this.meta, ganador: ranking.length ? { asiento: ranking[0].asiento, apodo: ranking[0].apodo, puntos: ranking[0].puntos, turnos: ranking[0].turnos } : null, empatados: empatados.length > 1 ? empatados : [], ranking, turnos: ranking.reduce((m, r) => Math.max(m, r.turnos), 0) };
    this.fase = FASE.FIN; this.t = null; this.limite = null; this.finTurnoEn = null; this.inicial = null;
  }

  // Lo que hace el jugador automático en la etapa actual.
  _jugadaBot(j) {
    const as = j.asiento;
    if (this.fase === FASE.INICIAL) {
      const ini = this.inicial;
      const lugares = ini.sub === 'pueblo' ? R.lugaresPueblo(this.mapa, this.tab, as, true) : R.lugaresCamino(this.mapa, this.tab, as, ini.ultimoPueblo);
      this._colocarInicial(j, Bot.mejorLugar(this.mapa, this.tab, as, ini.sub, lugares, this.azar));
      return;
    }
    const t = this.t; if (!t) return;
    if (t.sub === 'produccion') { this._seguir(j); return; }
    if (t.sub === 'dados') {
      const quedan = R.TIRADAS - t.tirada;
      if (Bot.seguirTirando(this.mapa, this.tab, as, t.dados, t.fijos, quedan)) this._tirar(j, Bot.guardar(this.mapa, this.tab, as, t.dados, t.fijos, quedan - 1).keep);
      else this._terminarDados(j);
      return;
    }
    if (t.sub === 'construir') { this._elegir(j, Bot.elegirEdificio(t.posibles)); return; }
    if (t.sub === 'colocar') {
      const lugares = R.lugares(this.mapa, this.tab, as, t.edificio);
      this._colocar(j, Bot.mejorLugar(this.mapa, this.tab, as, t.edificio, lugares, this.azar));
    }
  }

  // ---------- las acciones de un jugador ----------

  _suTurno(token, subs) {
    const j = this.jugador(token);
    if (!j) return { error: 'No estás en la sala' };
    if (this.fase !== FASE.TURNO || !this.t || this.t.asiento !== j.asiento || this.finTurnoEn !== null) return { error: 'No es tu turno' };
    if (subs && !subs.includes(this.t.sub)) return { error: 'Ahora no se puede' };
    return { j };
  }
  _hecho(j, r) { if (r.ok) { this._manual(j); this.avanzar(); this._cambio(); } return r; }
  colocar(token, lugar) {
    lugar = Number(lugar);
    if (!Number.isInteger(lugar)) return { ok: false, error: 'Lugar inválido' };
    if (this.fase === FASE.INICIAL) {
      const j = this.jugador(token);
      if (!j) return { ok: false, error: 'No estás en la sala' };
      if (this._actor() !== j) return { ok: false, error: 'No es tu turno' };
      return this._hecho(j, this._colocarInicial(j, lugar));
    }
    const s = this._suTurno(token, ['colocar']); if (s.error) return { ok: false, error: s.error };
    return this._hecho(s.j, this._colocar(s.j, lugar));
  }
  seguir(token) { const s = this._suTurno(token, ['produccion']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._seguir(s.j)); }
  tirar(token, guardar) { const s = this._suTurno(token, ['dados']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._tirar(s.j, Array.isArray(guardar) ? guardar.map(Number) : [])); }
  terminarDados(token) { const s = this._suTurno(token, ['dados']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._terminarDados(s.j)); }
  elegir(token, edificio) { const s = this._suTurno(token, ['construir']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._elegir(s.j, String(edificio))); }
  atras(token) {
    const s = this._suTurno(token, ['colocar']); if (s.error) return { ok: false, error: s.error };
    if (this.t.posibles.length < 2) return { ok: false, error: 'No hay a dónde volver' };
    this.t.sub = 'construir'; this.t.edificio = null; this._fijarLimite();
    return this._hecho(s.j, { ok: true });
  }
  pasar(token) { const s = this._suTurno(token, ['dados', 'construir', 'colocar']); if (s.error) return { ok: false, error: s.error }; this._finTurno('paso'); return this._hecho(s.j, { ok: true }); }

  // ---------- una partida nueva ----------

  nuevaPartida(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.FIN) return { ok: false, error: 'La partida todavía no terminó' };
    this._limpiarPartida();
    this.fase = FASE.ESPERA;
    if (this.modo !== 'multi' && this.jugadores.length) this._empezar();   // (en solitario se vuelve a empezar solo; con amigos, empieza quien armó la sala)
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  _cambio() { this.version++; }

  // ---------- guardar y recuperar la sala ----------

  guardar() {
    return { juego: 'fundacion', modo: this.modo, meta: this.meta, tiempoModo: this.tiempoModo, maxAsientos: this.maxAsientos, clave: this.clave, fase: this.fase, version: this.version,
      jugadores: this.jugadores, semilla: this.semilla, nMapa: this.nMapa, tab: this.tab, carreras: this.carreras, orden: this.orden, inicial: this.inicial, turnoIdx: this.turnoIdx, ronda: this.ronda,
      t: this.t, finDeVuelta: this.finDeVuelta, llegoMeta: this.llegoMeta, eventos: this.eventos, contadorEventos: this.contadorEventos, fin: this.fin };
  }
  static desde(datos, op = {}) {
    const m = new MesaFundacion(Object.assign({}, op, { modo: datos.modo, meta: datos.meta, tiempoModo: datos.tiempoModo, asientos: datos.maxAsientos, clave: datos.clave, bots: 0 }));
    m.jugadores = datos.jugadores; m.fase = datos.fase; m.version = datos.version || 0;
    Object.assign(m, { semilla: datos.semilla || 0, nMapa: datos.nMapa || 0, carreras: datos.carreras || { camino: null, ejercito: null }, orden: datos.orden || [], inicial: datos.inicial || null, turnoIdx: datos.turnoIdx || 0, ronda: datos.ronda || 1,
      t: datos.t || null, finDeVuelta: !!datos.finDeVuelta, llegoMeta: datos.llegoMeta === undefined ? null : datos.llegoMeta, eventos: datos.eventos || [], contadorEventos: datos.contadorEventos || 0, fin: datos.fin || null });
    if (m.fase === FASE.INICIAL || m.fase === FASE.TURNO) {
      m.mapa = R.crearMapa(m.semilla, m.nMapa); m.tab = datos.tab;
      if (m.fase === FASE.TURNO && m.t && m.t.terminado) m.finTurnoEn = m.ahora() + m.tiempos.fin; else m._fijarLimite();
    }
    return m;
  }

  // ---------- lo que ve cada jugador ----------

  _lugaresPara(j) {   // dónde puede poner pieza ahora quien le toca
    if (this.fase === FASE.INICIAL && this._actor() === j) return this.inicial.sub === 'pueblo' ? R.lugaresPueblo(this.mapa, this.tab, j.asiento, true) : R.lugaresCamino(this.mapa, this.tab, j.asiento, this.inicial.ultimoPueblo);
    if (this.fase === FASE.TURNO && this.t && this.t.asiento === j.asiento && this.t.sub === 'colocar' && this.finTurnoEn === null) return R.lugares(this.mapa, this.tab, j.asiento, this.t.edificio);
    return [];
  }

  estado(token) {
    const yo = this.jugador(token), activo = !!yo && this._actor() === yo && this.finTurnoEn === null;
    let turno = null;
    if (this.fase === FASE.TURNO && this.t) {
      const t = this.t;
      turno = { de: t.asiento, sub: t.sub, num: t.num, gana: t.gana, hexes: t.hexes, bandido: t.bandido, fijos: t.fijos, dados: t.dados, tirada: t.tirada, tiradas: R.TIRADAS, edificio: t.edificio, posibles: t.posibles, terminado: t.terminado, motivo: t.motivo, gastados: t.gastados || [] };
      if (activo && t.sub === 'dados') {
        const objetivos = R.EDIFICIOS.filter(e => R.lugares(this.mapa, this.tab, yo.asiento, e).length > 0);
        turno.prob = R.tabla(objetivos, t.dados.slice(0, t.fijos), t.dados.slice(t.fijos), R.TIRADAS - t.tirada);
        turno.alcanza = R.posibles(this.mapa, this.tab, yo.asiento, t.dados);
      }
    }
    const out = {
      juego: 'fundacion', sinTiempo: !!this.sinTiempo, pausa: this.pausa !== null, tiempos: { dados: this.tiempos.dados, construir: this.tiempos.construir, inicial: this.tiempos.inicial, produccion: this.tiempos.produccion }, version: this.version, ahora: this.ahora(),
      modo: this.modo, fase: this.fase, limite: this.limite, meta: this.meta, ronda: this.ronda, finDeVuelta: this.finDeVuelta, llegoMeta: this.llegoMeta, maxAsientos: this.maxAsientos, tiempoModo: this.tiempoModo,
      turnoDe: this.fase === FASE.TURNO && this.t ? this.t.asiento : (this.fase === FASE.INICIAL && this.inicial ? this._actor().asiento : null),
      yo: yo ? yo.asiento : null, reemplazado: !!(yo && yo.reemplazado), anfitrion: this.anfitrion() ? this.anfitrion().asiento : null,
      jugadores: this.jugadores.map(j => { const c = this.tab ? R.piezas(this.tab, j.asiento) : { pueblo: 0, ciudad: 0, camino: 0, caballero: 0 }; return { asiento: j.asiento, apodo: j.apodo, conectado: j.conectado, bot: !!j.bot, expulsado: !!j.expulsado, puntos: this.tab ? this._puntosDe(j.asiento) : 0, pueblos: c.pueblo, ciudades: c.ciudad, caminos: c.camino, caballeros: c.caballero, quedan: this.tab ? R.quedan(this.tab, j.asiento) : null, turnos: j.turnos }; }),
      inicial: this.fase === FASE.INICIAL && this.inicial ? { de: this._actor().asiento, sub: this.inicial.sub, idx: this.inicial.idx, total: this.inicial.plan.length, ultimoPueblo: this.inicial.ultimoPueblo } : null,
      turno, carreras: this.carreras, eventos: this.eventos.slice(), contadorEventos: this.contadorEventos, fin: this.fin, orden: this.orden,
    };
    if (this.mapa) {
      out.mapa = { semilla: this.semilla, radio: this.mapa.radio, hexes: this.mapa.hexes.map(h => ({ id: h.id, a: h.a, y: h.y, tipo: h.tipo, num: h.num, vertices: h.vertices })), vertices: this.mapa.vertices.map(v => ({ id: v.id, a: v.a, y: v.y, hexes: v.hexes, vecinos: v.vecinos, aristas: v.aristas })), aristas: this.mapa.aristas };
      out.tab = { vert: this.tab.vert.map(v => (v ? [v.p, v.ciudad ? 1 : 0] : null)), aris: this.tab.aris, cab: this.tab.cab, bandido: this.tab.bandido };
    }
    if (yo && activo) out.lugares = this._lugaresPara(yo);
    return out;
  }
}

module.exports = { MesaFundacion, FASE, TIEMPOS, MAX_ASIENTOS };
