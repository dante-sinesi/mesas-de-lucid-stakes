'use strict';
// Una mesa de Fundación (el Catan de dados, versión 2): un mapa común de hexágonos, de 1 a 8 jugadores que cobran tarjetas de recursos con cada tirada y construyen caminos, pueblos y ciudades.
// Toda la lógica de la sala vive aquí; la red solo la consulta (como MesaDM y Mesa13). Las reglas están en reglas.js, las misiones y pedidos en misiones.js y el jugador automático en bot.js. Diseño: docs/catan_dados.md y docs/catan_flujo.md.
//
// Fases: ESPERA -> INICIAL (cada uno pone dos pueblos y dos caminos, en serpiente) -> TURNO -> FIN.
// Un turno tiene tres momentos: tirada (los dos dados de número; cobran todos; automática y sin reloj), descarte (solo quien tiene el turno y solo si tiene más de 6 tarjetas) y turno (construir, entregar pedidos y pasar, con un solo reloj).
// Mientras se elige un lugar (sub 'colocar') el jugador está construyendo un edificio. Si se acaba el reloj, el turno se pasa solo.

const R = require('./reglas');
const M = require('./misiones');
const Bot = require('./bot');
const Bots = require('../bots');
const { TIEMPO_VALIDO, escalarTiempos } = require('../tiempo');

const FASE = { ESPERA: 'espera', INICIAL: 'inicial', TURNO: 'turno', FIN: 'fin' };
const TIEMPOS = { tirada: 6000, turno: 45000, inicial: 30000, fin: 1600, ausente: 2500, ausencia: 180000, reemplazo: 30000 };
const CLAVES_TIEMPO = ['turno', 'inicial'];   // los plazos que cambian con el tiempo de la sala
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
    this.eventos = []; this.contadorEventos = 0; this.fin = null; this.semilla = 0; this.nMapa = 0; this.grupo = null; this.tiradaHasta = null;
  }

  // ---------- jugadores ----------

  jugador(token) { return this.jugadores.find(j => j.token === token) || null; }
  porAsiento(asiento) { return this.jugadores.find(j => j.asiento === asiento) || null; }
  static _nuevo(token, apodo, asiento) { return { token, apodo, asiento, conectado: true, bot: false, expulsado: false, fallos: 0, turnos: 0, automaticos: 0, construidos: 0, mano: R.manoVacia(), pvExtra: 0 }; }
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
    if (!j.bot && this.fase !== FASE.ESPERA && this.jugadores.every(x => x.bot)) this.jugadores = [];   // (en plena partida, sin humanos no hay sala: los bots se van con el último; en la sala de espera se quedan, por si vuelve)
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
    for (const j of this.jugadores) Object.assign(j, { turnos: 0, automaticos: 0, construidos: 0, fallos: 0, expulsado: false, mano: R.manoVacia(), pvExtra: 0 });
    this.nMapa = this.jugadores.length; this.semilla = Math.floor(this.azar() * 2147483647);
    this.mapa = R.crearMapa(this.semilla, this.nMapa); this.tab = R.nuevoTablero(this.mapa); this.grupo = M.nuevoGrupo(R.rng(this.semilla + 2));
    this.orden = R.mezclar(this.jugadores.map(j => j.asiento), R.rng(this.semilla + 1));
    this.inicial = { plan: R.ordenInicial(this.orden.length).map(i => this.orden[i]), idx: 0, sub: 'pueblo', ultimoPueblo: null };
    this.fase = FASE.INICIAL;
    this._fijarLimite();
  }

  // ---------- los plazos ----------

  _actor() {
    if (this.fase === FASE.INICIAL) return this.porAsiento(this.inicial.plan[this.inicial.idx]);
    if (this.fase === FASE.TURNO && this.t) return this.porAsiento(this.t.asiento);
    return null;
  }
  // El reloj: uno por cada colocación inicial y uno por turno (corre desde que termina la tirada y vale para descartar, construir y entregar).
  _fijarLimite(clave) { this.limite = this.ahora() + (this.tiempos[clave] || this.tiempos.turno); this.botEn = null; }
  _juegaElBot(j) { return j.bot || j.expulsado || (!j.conectado && this.modo === 'multi'); }
  // Cuánto espera un bot entre jugadas: lo justo para que los demás vean lo que hace.
  _demoraBot() { return this.fase === FASE.INICIAL ? 1800 : 2200; }

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
      if (this.tiradaHasta !== null) this.tiradaHasta += d;
      if (this.finTurnoEn !== null) this.finTurnoEn += d;
      this._cambio();
    }
    return { ok: true };
  }

  _paso() {
    const t = this.ahora();
    if (this.fase === FASE.FIN || this.fase === FASE.ESPERA) return this._limpiarAusentes();
    if (this.finTurnoEn !== null) { if (t >= this.finTurnoEn) { this._siguienteTurno(); return true; } return false; }
    if (this.fase === FASE.TURNO && this.t && this.t.sub === 'tirada') { if (this.tiradaHasta !== null && t >= this.tiradaHasta) { this._despuesDeTirada(); return true; } return false; }
    const j = this._actor();
    if (!j) return false;
    if (this._juegaElBot(j)) {   // juega el bot (o el que reemplaza a quien se fue o no actuó: guarda su lugar)
      if (!j.bot && !j.reemplazado && (j.expulsado || !j.conectado)) { j.reemplazado = true; this._cambio(); }
      if (this.botEn === null) this.botEn = t + this._demoraBot();
      if (t < this.botEn) return false;
      this.botEn = null;
      this._jugadaBot(j);
      return true;
    }
    if (this.limite !== null && t >= this.limite) { this._agotado(j); return true; }
    return false;
  }

  // Se acabó el tiempo: en la colocación inicial juega un bot esa pieza; en un turno, se descarta al azar lo que faltaba (si había que descartar) y el turno se pasa solo. A la segunda vez seguida, un bot toma el lugar hasta que vuelva a actuar.
  _agotado(j) {
    j.automaticos++; j.fallos++;
    if (j.fallos >= SEGUIDOS_PARA_BOT) { j.expulsado = true; j.reemplazado = true; }
    if (this.fase === FASE.INICIAL) { this._jugadaBot(j); return; }
    if (this.t && this.t.sub === 'descarte') this._descartar(j, R.descarteAzar(j.mano, this.azar));
    this._finTurno('tiempo');
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
  // La tirada y la cobranza: dos dados de número; con 7 el bandido salta; con otro número cobran todos los que tienen un edificio junto a ese número.
  _iniciarTurno(asiento) {
    const nums = R.tirarNumeros(this.azar), antes = this.tab.bandido;
    let detalle = []; const gana = [];
    if (nums.suma === 7) R.moverBandido(this.mapa, this.tab, this.azar);
    else {
      const pr = R.produccion(this.mapa, this.tab, nums.suma, MAX_ASIENTOS); detalle = pr.detalle;
      for (const j of this.jugadores) { const g = pr.gana[j.asiento]; if (R.totalMano(g)) { j.mano = R.sumarMano(j.mano, g); gana.push({ asiento: j.asiento, mano: g }); } }
    }
    this.t = { asiento, sub: 'tirada', num: nums, gana, detalle, hexes: nums.suma === 7 ? [] : R.hexesDe(this.mapa, nums.suma), bandidoAntes: antes, bandido: this.tab.bandido, edificio: null, lugar: null, terminado: false, motivo: null, exceso: 0 };
    this.finTurnoEn = null; this.limite = null; this.botEn = null;
    this.tiradaHasta = this.ahora() + this.tiempos.tirada;
  }
  // Pasada la tirada: si el jugador tiene más de 6 tarjetas, primero descarta; después construye y entrega. Desde acá corre el reloj del turno.
  _despuesDeTirada() {
    const t = this.t, j = this.porAsiento(t.asiento); this.tiradaHasta = null;
    t.exceso = j ? R.exceso(j.mano) : 0;
    t.sub = t.exceso > 0 ? 'descarte' : 'turno';
    this._fijarLimite('turno');
  }
  _descartar(j, quitar) {
    if (!R.descarteValido(j.mano, quitar)) return { ok: false, error: 'Descarta justo las tarjetas que sobran' };
    j.mano = j.mano.map((n, r) => n - quitar[r]); this.t.sub = 'turno'; this.t.exceso = 0;
    return { ok: true };
  }
  _construir(j, edificio) {
    if (!R.posibles(this.mapa, this.tab, j.asiento, j.mano).includes(edificio)) return { ok: false, error: 'No puedes construir eso ahora' };
    this.t.edificio = edificio; this.t.sub = 'colocar';
    return { ok: true };
  }
  _colocar(j, lugar) {
    const t = this.t;
    if (!R.lugares(this.mapa, this.tab, j.asiento, t.edificio).includes(lugar)) return { ok: false, error: 'Ahí no se puede' };
    j.mano = R.pagar(R.COSTOS[t.edificio], j.mano);
    R.poner(this.tab, t.edificio, j.asiento, lugar); this._evento(j.asiento, t.edificio, lugar); j.construidos++;
    t.lugar = lugar; t.ultimo = t.edificio; t.edificio = null; t.sub = 'turno';   // (dónde se construyó: los demás lo ven resaltado)
    this.carreras = R.carreras(this.tab, MAX_ASIENTOS, this.carreras);
    this._revisarMisiones(j);
    return { ok: true };
  }
  _entregar(j, id) {
    const m = this.grupo.activas.find(x => x.id === id);
    if (!m || m.por !== null || !M.PEDIDOS[id]) return { ok: false, error: 'Ese pedido ya no está' };
    const q = M.entrega(id, j.mano); if (!q) return { ok: false, error: 'No tienes las tarjetas para ese pedido' };
    j.mano = j.mano.map((n, r) => n - q[r]); M.tomar(this.grupo, id, j.asiento); j.pvExtra += M.PV; this._evento(j.asiento, 'pedido', id);
    return { ok: true };
  }
  // Las misiones de condición que el jugador acaba de cumplir: se las lleva (y se reponen al terminar su turno).
  _revisarMisiones(j) {
    for (const id of M.cumplidas(this.grupo, this.mapa, this.tab, j.asiento)) { M.tomar(this.grupo, id, j.asiento); j.pvExtra += M.PV; this._evento(j.asiento, 'mision', id); }
  }
  _puntosDe(asiento) { const j = this.porAsiento(asiento); return R.puntos(this.tab, asiento, this.carreras, j ? j.pvExtra : 0); }
  _finTurno(motivo) {
    const t = this.t, j = this.porAsiento(t.asiento);
    if (j) { j.turnos++; this._revisarMisiones(j); }
    t.terminado = true; t.motivo = motivo; t.sub = 'fin'; t.edificio = null;
    this.carreras = R.carreras(this.tab, MAX_ASIENTOS, this.carreras);
    t.grupo = M.finDeTurno(this.grupo, this.azar, this.jugadores.length);   // (lo que se llevó alguien o venció sale y se repone)
    const llego = this.jugadores.find(x => this._puntosDe(x.asiento) >= this.meta);
    if (llego) {
      if (this.modo !== 'multi') { this._terminarPartida('meta'); return; }
      if (!this.finDeVuelta) { this.finDeVuelta = true; this.llegoMeta = llego.asiento; }
    }
    this.finTurnoEn = this.ahora() + (this.modo !== 'multi' ? this.tiempos.fin : (j && this._juegaElBot(j) ? 3600 : 2600)); this.limite = null; this.botEn = null;   // (en las salas con otros, el resultado del turno se queda a la vista un rato)
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

  // Lo que hace el jugador automático en el momento actual: una sola jugada por vez (así los demás ven qué hace).
  _jugadaBot(j) {
    const as = j.asiento;
    if (this.fase === FASE.INICIAL) {
      const ini = this.inicial;
      const lugares = ini.sub === 'pueblo' ? R.lugaresPueblo(this.mapa, this.tab, as, true) : R.lugaresCamino(this.mapa, this.tab, as, ini.ultimoPueblo);
      this._colocarInicial(j, Bot.mejorLugar(this.mapa, this.tab, as, ini.sub, lugares, this.azar));
      return;
    }
    const t = this.t; if (!t || t.sub === 'tirada') return;   // (la tirada espera sola)
    if (t.sub === 'descarte') { this._descartar(j, Bot.descartar(this.mapa, this.tab, as, j.mano, R.exceso(j.mano))); return; }
    if (t.sub === 'colocar') { t.sub = 'turno'; t.edificio = null; }
    const d = Bot.decidir(this.mapa, this.tab, as, j.mano, this.grupo, this.azar);
    if (d.tipo === 'entregar') this._entregar(j, d.id);
    else if (d.tipo === 'construir') {
      if (!this._construir(j, d.edificio).ok) { this._finTurno('paso'); return; }
      const lugares = R.lugares(this.mapa, this.tab, as, d.edificio);
      this._colocar(j, Bot.mejorLugar(this.mapa, this.tab, as, d.edificio, lugares, this.azar));
    } else this._finTurno('paso');
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
  seguir(token) { const s = this._suTurno(token, ['tirada']); if (s.error) return { ok: false, error: s.error }; this._despuesDeTirada(); return this._hecho(s.j, { ok: true }); }   // (saltea la espera de la tirada)
  descartar(token, quitar) { const s = this._suTurno(token, ['descarte']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._descartar(s.j, Array.isArray(quitar) ? quitar.map(Number) : null)); }
  construir(token, edificio) { const s = this._suTurno(token, ['turno']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._construir(s.j, String(edificio))); }
  atras(token) { const s = this._suTurno(token, ['colocar']); if (s.error) return { ok: false, error: s.error }; this.t.sub = 'turno'; this.t.edificio = null; return this._hecho(s.j, { ok: true }); }
  entregar(token, id) { const s = this._suTurno(token, ['turno']); if (s.error) return { ok: false, error: s.error }; return this._hecho(s.j, this._entregar(s.j, String(id))); }
  pasar(token) { const s = this._suTurno(token, ['turno', 'colocar']); if (s.error) return { ok: false, error: s.error }; this._finTurno('paso'); return this._hecho(s.j, { ok: true }); }

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
    return { juego: 'fundacion', v: 2, modo: this.modo, meta: this.meta, tiempoModo: this.tiempoModo, maxAsientos: this.maxAsientos, clave: this.clave, fase: this.fase, version: this.version,
      jugadores: this.jugadores, semilla: this.semilla, nMapa: this.nMapa, tab: this.tab, carreras: this.carreras, orden: this.orden, inicial: this.inicial, turnoIdx: this.turnoIdx, ronda: this.ronda,
      t: this.t, grupo: this.grupo, finDeVuelta: this.finDeVuelta, llegoMeta: this.llegoMeta, eventos: this.eventos, contadorEventos: this.contadorEventos, fin: this.fin };
  }
  static desde(datos, op = {}) {
    const m = new MesaFundacion(Object.assign({}, op, { modo: datos.modo, meta: datos.meta, tiempoModo: datos.tiempoModo, asientos: datos.maxAsientos, clave: datos.clave, bots: 0 }));
    m.jugadores = (datos.jugadores || []).map(j => Object.assign({ mano: R.manoVacia(), pvExtra: 0 }, j)); m.fase = datos.fase; m.version = datos.version || 0;
    if (datos.v !== 2 && datos.fase !== FASE.ESPERA) { m.fase = FASE.ESPERA; return m; }   // (una partida de la versión 1 no sirve en la 2: la sala vuelve a la espera)
    Object.assign(m, { semilla: datos.semilla || 0, nMapa: datos.nMapa || 0, carreras: datos.carreras || { camino: null, ejercito: null }, orden: datos.orden || [], inicial: datos.inicial || null, turnoIdx: datos.turnoIdx || 0, ronda: datos.ronda || 1,
      t: datos.t || null, grupo: datos.grupo || null, finDeVuelta: !!datos.finDeVuelta, llegoMeta: datos.llegoMeta === undefined ? null : datos.llegoMeta, eventos: datos.eventos || [], contadorEventos: datos.contadorEventos || 0, fin: datos.fin || null });
    if (m.fase === FASE.INICIAL || m.fase === FASE.TURNO) {
      m.mapa = R.crearMapa(m.semilla, m.nMapa); m.tab = datos.tab;
      if (m.fase === FASE.INICIAL) m._fijarLimite('inicial');
      else if (m.t && m.t.terminado) m.finTurnoEn = m.ahora() + m.tiempos.fin;
      else if (m.t && m.t.sub === 'tirada') m.tiradaHasta = m.ahora() + m.tiempos.tirada;
      else m._fijarLimite('turno');
    }
    return m;
  }

  // ---------- lo que ve cada jugador ----------

  _lugaresPara(j) {   // dónde puede poner pieza ahora quien le toca
    if (this.fase === FASE.INICIAL && this._actor() === j) return this.inicial.sub === 'pueblo' ? R.lugaresPueblo(this.mapa, this.tab, j.asiento, true) : R.lugaresCamino(this.mapa, this.tab, j.asiento, this.inicial.ultimoPueblo);
    if (this.fase === FASE.TURNO && this.t && this.t.asiento === j.asiento && this.t.sub === 'colocar' && this.finTurnoEn === null) return R.lugares(this.mapa, this.tab, j.asiento, this.t.edificio);
    return [];
  }
  _grupoPublico() {
    if (!this.grupo) return null;
    const n = this.jugadores.length;
    return { turno: this.grupo.turno, misiones: this.grupo.activas.map(m => Object.assign(M.describe(m.id), { quedan: M.quedanTurnos(this.grupo, m, n), por: m.por })) };
  }

  // La mano de cada jugador es privada: cada uno recibe la suya completa y, de los demás, solo cuántas tarjetas tienen. Las ganancias de la tirada son públicas.
  estado(token) {
    const yo = this.jugador(token), activo = !!yo && this._actor() === yo && this.finTurnoEn === null;
    let turno = null;
    if (this.fase === FASE.TURNO && this.t) {
      const t = this.t;
      turno = { de: t.asiento, sub: t.sub, num: t.num, gana: t.gana, detalle: t.detalle, hexes: t.hexes, bandidoAntes: t.bandidoAntes, bandido: t.bandido, edificio: t.edificio, exceso: t.exceso, terminado: t.terminado, motivo: t.motivo, lugar: t.lugar === undefined ? null : t.lugar, ultimo: t.ultimo || null, grupo: t.grupo || null };
      if (activo && (t.sub === 'turno' || t.sub === 'colocar')) {
        turno.posibles = R.posibles(this.mapa, this.tab, yo.asiento, yo.mano);
        turno.motivos = {}; R.EDIFICIOS.filter(e => !R.lugares(this.mapa, this.tab, yo.asiento, e).length).forEach(e => { turno.motivos[e] = R.motivoSinLugar(this.mapa, this.tab, yo.asiento, e); });
        turno.entregables = this.grupo.activas.filter(m => m.por === null && M.PEDIDOS[m.id] && M.entrega(m.id, yo.mano)).map(m => m.id);
      }
    }
    const out = {
      juego: 'fundacion', sinTiempo: !!this.sinTiempo, pausa: this.pausa !== null, tiempos: { turno: this.tiempos.turno, inicial: this.tiempos.inicial, tirada: this.tiempos.tirada }, version: this.version, ahora: this.ahora(),
      modo: this.modo, fase: this.fase, limite: this.limite, meta: this.meta, ronda: this.ronda, finDeVuelta: this.finDeVuelta, llegoMeta: this.llegoMeta, maxAsientos: this.maxAsientos, tiempoModo: this.tiempoModo,
      turnoDe: this.fase === FASE.TURNO && this.t ? this.t.asiento : (this.fase === FASE.INICIAL && this.inicial ? this._actor().asiento : null),
      yo: yo ? yo.asiento : null, mano: yo ? yo.mano.slice() : null, manoMax: R.MANO_MAX, reemplazado: !!(yo && yo.reemplazado), anfitrion: this.anfitrion() ? this.anfitrion().asiento : null,
      jugadores: this.jugadores.map(j => { const c = this.tab ? R.piezas(this.tab, j.asiento) : { pueblo: 0, ciudad: 0, camino: 0, caballero: 0 }; return { asiento: j.asiento, apodo: j.apodo, conectado: j.conectado, bot: !!j.bot, expulsado: !!j.expulsado, puntos: this.tab ? this._puntosDe(j.asiento) : 0, misiones: j.pvExtra || 0, tarjetas: R.totalMano(j.mano || R.manoVacia()), pueblos: c.pueblo, ciudades: c.ciudad, caminos: c.camino, caballeros: c.caballero, quedan: this.tab ? R.quedan(this.tab, j.asiento) : null, turnos: j.turnos }; }),
      inicial: this.fase === FASE.INICIAL && this.inicial ? { de: this._actor().asiento, sub: this.inicial.sub, idx: this.inicial.idx, total: this.inicial.plan.length, ultimoPueblo: this.inicial.ultimoPueblo } : null,
      turno, grupo: this._grupoPublico(), carreras: this.carreras, eventos: this.eventos.slice(), contadorEventos: this.contadorEventos, fin: this.fin, orden: this.orden,
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
