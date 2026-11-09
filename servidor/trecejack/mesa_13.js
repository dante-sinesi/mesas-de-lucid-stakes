'use strict';
// Una mesa de 13 Jack: cada jugador tiene su propio mazo de 13 cartas y juega 4 manos por mazo, por turnos (una mano cada uno por vuelta). Toda la lógica de la sala vive aquí; la red solo la consulta.
// Las reglas de una mano están en reglas.js. Pedir o plantarse: las cartas usadas no vuelven (salvo las pegajosas) y se sabe siempre cuáles quedan.
//
// Fases: ESPERA -> TURNO (una mano de un jugador) -> RESUMEN (al terminar un mazo) -> TIENDA (cada 2 mazos, si hay cartas especiales) -> ... -> FIN.

const R = require('./reglas');
const Bots = require('../bots');
const { TIEMPO_VALIDO, escalarTiempos } = require('../tiempo');
const CLAVES_TIEMPO = ['turno', 'resumen', 'tienda'];   // los plazos que cambian con el tiempo de la sala

const FASE = { ESPERA: 'espera', TURNO: 'turno', RESUMEN: 'resumen', TIENDA: 'tienda', FIN: 'fin' };
const TIEMPOS = { turno: 20000, fin: 1600, resumen: 20000, tienda: 45000, ausente: 2500, ausencia: 180000, reemplazo: 30000 };
const MAX_APODO = 16;
const MAX_ASIENTOS = 8;
const CADA_TIENDA = 2;        // la tienda se abre cada tantos mazos
const MAZOS_VALIDOS = [3, 5, 8];
const PUNTOS_VALIDOS = [250, 400, 650];   // los objetivos por puntos (más o menos lo que se suma en 3, 5 y 8 mazos)
const TOPE_MAZOS = 20;                    // por si nadie llega a los puntos: la partida termina igual
const REACCIONES = 6;
const FICHAS = { cada: 5, por21: 5, porPasada: 3 };   // 1 ficha cada 5 puntos del mazo, +5 por cada 21 exacto y +3 por cada mano en la que te pasaste

const snap = c => (c.e === 'ruleta' && c.v ? { r: c.r, e: c.e, p: R.paloDe(c), v: c.v } : { r: c.r, e: c.e, p: R.paloDe(c) });

class Mesa13 {
  constructor(op = {}) {
    this.juego = 'trecejack';
    this.modo = op.modo === 'solo' ? 'solo' : 'multi';
    this.especiales = op.especiales === undefined ? true : !!op.especiales;   // ¿hay cartas especiales y tienda?
    this.objetivo = op.objetivo === 'puntos' ? 'puntos' : 'mazos';             // la partida termina por cantidad de mazos o al llegar a cierto puntaje
    this.mazos = MAZOS_VALIDOS.includes(op.mazos) ? op.mazos : 5;              // cuántos mazos dura la partida (objetivo por mazos)
    this.metaPuntos = PUNTOS_VALIDOS.includes(op.metaPuntos) ? op.metaPuntos : 400;   // el puntaje que hay que alcanzar (objetivo por puntos)
    this.maxAsientos = this.modo === 'multi' ? (op.asientos || MAX_ASIENTOS) : 1;
    this.clave = op.clave || null;
    this.azar = op.azar || Math.random;
    this.ahora = op.ahora || (() => Date.now());
    this.tiempoModo = TIEMPO_VALIDO(op.tiempoModo);   // 'normal', 'extendido' o 'libre'
    this.tiempos = Object.assign({}, TIEMPOS, escalarTiempos(TIEMPOS, CLAVES_TIEMPO, this.tiempoModo), op.tiempos || {});
    this.cadaTienda = op.cadaTienda || CADA_TIENDA;
    this.sinTiempo = !!op.sinTiempo || this.tiempoModo === 'libre';
    this.pausa = null;
    this.version = 0;
    this.fase = FASE.ESPERA;
    this.mazoN = 1;               // el mazo en juego (1, 2, ...)
    this.mano = 1;                // la mano de este mazo (1 a 4)
    this.jugadores = [];
    this.turno = null;            // el jugador al que le toca
    this.limite = null;           // cuándo vence el plazo de lo que toca hacer ahora
    this.finManoEn = null;        // cuándo empieza el turno siguiente (una pausa para ver cómo terminó la mano)
    this.ultimaMano = null;       // cómo terminó la última mano: { id, asiento, cartas, total, pasado, puntos, motivo }
    this.contadorManos = 0;
    this.reacciones = []; this.contadorReacciones = 0;
    this.fin = null;
    this.botEn = null;            // cuándo juega el bot al que le toca (null = todavía no se fijó)
    if (this.modo === 'multi') this._ponerBots(op.bots);
  }

  // ---------- jugadores ----------

  jugador(token) { return this.jugadores.find(j => j.token === token) || null; }
  porAsiento(asiento) { return this.jugadores.find(j => j.asiento === asiento) || null; }

  // ---------- bots y reglas de la sala de espera (solo el anfitrión, y solo antes de empezar) ----------
  _crearBot(asiento) { const b = Object.assign(Mesa13._nuevo(Bots.tokenBot(), Bots.nombreLibre(this.jugadores), asiento), { bot: true }); this._prepararMazo(b); return b; }
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
    if (d.especiales !== undefined) this.especiales = !!d.especiales;
    if (d.objetivo !== undefined) this.objetivo = d.objetivo === 'puntos' ? 'puntos' : 'mazos';
    if (d.mazos !== undefined && MAZOS_VALIDOS.includes(Number(d.mazos))) this.mazos = Number(d.mazos);
    if (d.metaPuntos !== undefined && PUNTOS_VALIDOS.includes(Number(d.metaPuntos))) this.metaPuntos = Number(d.metaPuntos);
    this._cambio();
    return { ok: true };
  }

  _quitarBot() {   // cuando entra un humano y no hay lugar, se va un bot
    const b = this.jugadores.filter(j => j.bot).pop();
    if (b) this.salir(b.token);
  }
  _humanos() { return this.jugadores.filter(j => !j.bot); }

  static _nuevo(token, apodo, asiento) {
    return { token, apodo, asiento, conectado: true, total: 0, fichas: 0, base: R.baseInicial(), mazo: [], mano: [], manos: [], puntosMazo: 0, veintiunosMazo: 0, pasadasMazo: 0,
      mejorMano: 0, pasadas: 0, veintiunos: 0, manosJugadas: 0, automaticos: 0, compras: [], oferta: [], compradas: [], listo: false, resumen: null };
  }

  unirse(token, apodo) {
    const ya = this.jugador(token);
    if (ya) { ya.conectado = true; ya.desde = undefined; this.avanzar(); this._cambio(); return { ok: true, asiento: ya.asiento }; }
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
    const nuevo = Mesa13._nuevo(token, apodo, asiento);
    if (this.fase !== FASE.ESPERA && this.modo === 'multi') nuevo.tardio = true;   // (se sumó con la partida en curso: juega desde la mano siguiente)
    this._prepararMazo(nuevo);
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
    if (this.modo !== 'multi' && this.fase !== FASE.ESPERA) { this._terminarPartida('abandono'); this._cambio(); return; }
    if (!this.jugadores.length) { this.fase = FASE.ESPERA; this.turno = null; this.limite = null; this.finManoEn = null; this._cambio(); return; }
    if (eraSuTurno) { this.finManoEn = null; this._pasarAlSiguiente(j.asiento); }
    this.avanzar(); this._cambio();
  }

  _ausentes(ms) { const t = this.ahora(); return this.jugadores.filter(j => !j.conectado && j.desde !== undefined && t - j.desde >= ms); }
  _limpiarAusentes() {
    const fuera = this._ausentes(this.tiempos.ausencia).filter(() => this.modo === 'multi');
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
    this.mazoN = 1; this.mano = 1;
    for (const j of this.jugadores) this._prepararMazo(j);
    this._iniciarTurno(this.jugadores.slice().sort((a, b) => a.asiento - b.asiento)[0]);
  }

  _prepararMazo(j) {
    j.mazo = R.mazoNuevo(j.base, this.azar);
    j.mano = []; j.manos = []; j.puntosMazo = 0; j.veintiunosMazo = 0; j.pasadasMazo = 0; j.fichasExtra = 0; j.adelanto = false; j.retrocesoUsado = false;
  }

  _iniciarTurno(j) {
    this.fase = FASE.TURNO;
    this.turno = j;
    this.finManoEn = null;
    this.botEn = null;
    j.mano = [];
    this.limite = this.ahora() + (j.conectado ? this.tiempos.turno : this.tiempos.ausente);
    if (j.adelanto) { j.adelanto = false; if (j.mazo.length >= 2) this._sacar(j); }   // (el adelanto: la mano empieza con una carta ya puesta)
    if (!j.mazo.length) this._terminarMano(j, 'sinCartas');   // (sin cartas en el mazo no se puede jugar la mano)
  }

  // Después del turno de `desde` (un asiento), le toca al siguiente de la vuelta; si era el último, empieza la mano siguiente (o termina el mazo).
  _pasarAlSiguiente(desde) {
    const orden = this.jugadores.slice().sort((a, b) => a.asiento - b.asiento);
    const sig = orden.find(j => j.asiento > desde);
    if (sig) { this._iniciarTurno(sig); return; }
    this.mano++;
    if (this.mano > R.MANOS_POR_MAZO) { this._finMazo(); return; }
    this._iniciarTurno(orden[0]);
  }
  _siguienteTurno() { this._pasarAlSiguiente(this.turno ? this.turno.asiento : -1); }

  // ---------- la mano ----------

  _suTurno(token) {
    const j = this.jugador(token);
    if (!j) return { error: 'No estás en la sala' };
    if (this.fase !== FASE.TURNO || this.turno !== j) return { error: 'No es tu turno' };
    if (this.finManoEn !== null) return { error: 'La mano ya terminó' };
    return { j };
  }

  pedir(token) {
    const s = this._suTurno(token);
    if (s.error) return { ok: false, error: s.error };
    const r = this._pedir(s.j);
    if (!r.ok) return r;
    this.avanzar(); this._cambio();
    return { ok: true };
  }
  // Saca la carta de arriba del mazo (la ruleta sortea su valor al salir).
  _sacar(j) {
    const c = j.mazo.shift();
    if (c.e === 'ruleta') c.v = 1 + Math.floor(this.azar() * 11);
    j.mano.push(c);
    return c;
  }
  _pedir(j) {
    if (!j.mazo.length) return { ok: false, error: 'No quedan cartas en tu mazo' };
    this._sacar(j);
    const ev = R.evaluar(j.mano);
    if (ev.pasado && !j.retrocesoUsado && j.mano.length > 1 && j.mano.some(c => c.e === 'retroceso')) {   // el retroceso: la última carta vuelve al mazo y te plantas con lo anterior
      const ult = j.mano.pop(); delete ult.v;
      j.mazo.splice(Math.floor(this.azar() * (j.mazo.length + 1)), 0, ult);
      j.retrocesoUsado = true;
      this._terminarMano(j, 'retroceso');
    } else if (ev.pasado) this._terminarMano(j, 'pasado');
    else if (ev.total === 21) this._terminarMano(j, 'veintiuno');
    else if (!j.mazo.length) this._terminarMano(j, 'sinCartas');
    else this.limite = this.ahora() + (j.conectado ? this.tiempos.turno : this.tiempos.ausente);
    return { ok: true };
  }

  plantarse(token) {
    const s = this._suTurno(token);
    if (s.error) return { ok: false, error: s.error };
    if (!s.j.mano.length) return { ok: false, error: 'Pide al menos una carta' };
    this._terminarMano(s.j, 'planto');
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // Cierra la mano del jugador: puntos, estadísticas y las pegajosas vuelven al mazo. Después hay una pausa corta para ver cómo terminó.
  _terminarMano(j, motivo) {
    const ev = R.evaluar(j.mano), puntos = R.puntosDeMano(j.mano, ev);
    const cartas = j.mano.map(snap);
    const pat = R.patrones(j.mano, ev);
    j.manos.push({ cartas, total: ev.total, pasado: ev.pasado, puntos, motivo, patrones: pat });
    j.total += puntos; j.puntosMazo += puntos; j.manosJugadas++;
    if (ev.pasado) { j.pasadas++; j.pasadasMazo++; }
    if (!ev.pasado && ev.total === 21) { j.veintiunos++; j.veintiunosMazo++; }
    j.mejorMano = Math.max(j.mejorMano, puntos);
    if (j.mano.some(c => c.e === 'mecenas')) j.fichasExtra = (j.fichasExtra || 0) + 4;
    if (j.mano.some(c => c.e === 'adelanto')) j.adelanto = true;
    for (const c of j.mano) if (c.e === 'pegajosa') j.mazo.splice(Math.floor(this.azar() * (j.mazo.length + 1)), 0, { r: c.r, e: c.e, p: c.p, i: c.i });
    this.ultimaMano = { id: ++this.contadorManos, asiento: j.asiento, cartas, total: ev.total, pasado: ev.pasado, puntos, motivo, patrones: pat, mazo: this.mazoN, mano: this.mano };
    this.limite = null;
    this.finManoEn = this.ahora() + (this.tiempos.fin);
  }

  // ---------- el final de un mazo, la tienda y el final de la partida ----------

  _finMazo() {
    for (const j of this.jugadores) {
      const sobran = j.mazo.length, bono = R.BONO_MAZO_VACIO[sobran] || 0;   // (las cartas que no usaste: ninguna da un premio grande)
      j.total += bono; j.puntosMazo += bono;
      const fichas = Math.max(0, Math.floor(j.puntosMazo / FICHAS.cada)) + FICHAS.por21 * j.veintiunosMazo + FICHAS.porPasada * j.pasadasMazo + (j.fichasExtra || 0);
      j.fichas += fichas;
      j.resumen = { manos: j.manos.slice(), puntos: j.puntosMazo, fichas, mazo: this.mazoN, bono, sobran };
      j.listo = !!j.bot;
    }
    this.fase = FASE.RESUMEN;
    this.turno = null; this.finManoEn = null;
    this.limite = this.ahora() + this.tiempos.resumen;
  }

  _despuesDelResumen() {
    if (this.objetivo === 'puntos') {   // por puntos: al terminar el mazo, si alguien llegó a la meta (todos jugaron los mismos mazos) se termina; gana quien más tiene
      if (this.jugadores.some(j => j.total >= this.metaPuntos)) { this._terminarPartida('puntos'); return; }
      if (this.mazoN >= TOPE_MAZOS) { this._terminarPartida('tope'); return; }
    } else if (this.mazoN >= this.mazos) { this._terminarPartida('mazos'); return; }
    if (this.especiales && this.mazoN % this.cadaTienda === 0) { this._abrirTienda(); return; }
    this._siguienteMazo();
  }

  _siguienteMazo() {
    this.mazoN++; this.mano = 1;
    for (const j of this.jugadores) { this._prepararMazo(j); j.tardio = false; }
    this._iniciarTurno(this.jugadores.slice().sort((a, b) => a.asiento - b.asiento)[0]);
  }

  _ofertar(j) {
    const tengo = j.base.filter(c => c.e).map(c => c.e);
    const pool = R.ORDEN_ESPECIALES.filter(t => !tengo.includes(t));
    const out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.min(pool.length - 1, Math.floor(this.azar() * pool.length)), 1)[0]);
    return out.map(tipo => R.ofertaCarta(tipo, this.azar));   // (cada oferta trae su propio número y palo)
  }
  _abrirTienda() {
    this.fase = FASE.TIENDA;
    this.turno = null;
    this.limite = this.ahora() + this.tiempos.tienda;
    for (const j of this.jugadores) { j.listo = false; j.compradas = []; j.oferta = this._ofertar(j); }
    for (const j of this.jugadores) if (j.bot) this._comprarBot(j);
  }
  // El bot compra la especial más útil que le alcance (según un orden fijo) y reemplaza una casilla común; después queda listo.
  _comprarBot(j) {
    const orden = ['oro', 'multiplicador', 'comodin', 'salvavidas', 'fantasma', 'borrador', 'espejo', 'doble', 'diamante', 'racha', 'camaleon', 'mecenas', 'vidente', 'retroceso', 'adelanto', 'cofre', 'ruleta', 'pegajosa', 'ancla'];
    const idx = j.oferta.map((o, i) => i).sort((a, b) => orden.indexOf(j.oferta[a].tipo) - orden.indexOf(j.oferta[b].tipo));
    for (const i of idx) {
      const o = j.oferta[i], lugar = j.base.findIndex(c => !c.e);
      if (lugar < 0 || j.fichas < o.precio) continue;
      j.fichas -= o.precio; j.base[lugar] = { r: o.r, e: o.tipo, p: o.p }; j.compradas.push(i); j.compras.push(o.tipo);
    }
    j.listo = true;
  }

  // Compra la oferta `indice` y reemplaza la casilla `lugar` de tu mazo (0 a 12) por esa carta, con su número y su palo (la casilla no puede ser ya una especial).
  comprar(token, indice, lugar) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.TIENDA) return { ok: false, error: 'La tienda está cerrada' };
    indice = Number(indice); lugar = Number(lugar);
    const o = j.oferta[indice];
    if (!o) return { ok: false, error: 'Esa oferta no existe' };
    if (j.compradas.includes(indice)) return { ok: false, error: 'Ya la compraste' };
    if (!(lugar >= 0 && lugar < R.RANGOS) || Math.floor(lugar) !== lugar) return { ok: false, error: 'Elige la carta que reemplaza' };
    if (j.base[lugar].e) return { ok: false, error: 'Esa carta ya es especial' };
    if (j.fichas < o.precio) return { ok: false, error: 'No te alcanzan las fichas' };
    j.fichas -= o.precio;
    j.base[lugar] = { r: o.r, e: o.tipo, p: o.p };
    j.compradas.push(indice); j.compras.push(o.tipo);
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  // "Listo": en el resumen de un mazo o en la tienda, para seguir sin esperar el reloj.
  listo(token) {
    const j = this.jugador(token);
    if (!j) return { ok: false, error: 'No estás en la sala' };
    if (this.fase !== FASE.RESUMEN && this.fase !== FASE.TIENDA) return { ok: false, error: 'Ahora no hace falta' };
    j.listo = true;
    this.avanzar(); this._cambio();
    return { ok: true };
  }

  _terminarPartida(motivo) {
    const ranking = this.jugadores.map(j => ({ asiento: j.asiento, apodo: j.apodo, bot: !!j.bot, total: j.total, fichas: j.fichas, mejorMano: j.mejorMano, pasadas: j.pasadas, veintiunos: j.veintiunos, manosJugadas: j.manosJugadas, especiales: j.base.filter(c => c.e).map(c => c.e) }))
      .sort((a, b) => b.total - a.total || a.asiento - b.asiento);
    const empatados = this.modo === 'multi' && ranking.length > 1 ? ranking.filter(r => r.total === ranking[0].total).map(r => r.asiento) : [];   // (quienes comparten el primer puesto)
    this.fin = { motivo, ganador: ranking.length ? { asiento: ranking[0].asiento, apodo: ranking[0].apodo, total: ranking[0].total } : null, empatados: empatados.length > 1 ? empatados : [], ranking, mazos: this.mazos, objetivo: this.objetivo, metaPuntos: this.metaPuntos, mazoN: this.mazoN, modo: this.modo, especiales: this.especiales };
    this.fase = FASE.FIN;
    this.turno = null; this.limite = null; this.finManoEn = null;
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
    for (const j of this.jugadores) Object.assign(j, Mesa13._nuevo(j.token, j.apodo, j.asiento), { conectado: j.conectado });
    this.fin = null; this.mazoN = 1; this.mano = 1; this.turno = null; this.ultimaMano = null; this.contadorManos = 0;
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
    if (this.pausa === null && this.jugadores.length === 1) { this.pausa = this.ahora(); this._cambio(); }
    return { ok: true };
  }
  reanudar(token) {
    if (!this.jugador(token)) return { ok: false, error: 'No estás en la sala' };
    if (this.pausa !== null) {
      const d = this.ahora() - this.pausa;
      this.pausa = null;
      if (this.limite !== null) this.limite += d;
      if (this.finManoEn !== null) this.finManoEn += d;
      this._cambio();
    }
    return { ok: true };
  }

  _paso() {
    const t = this.ahora();
    if (this.fase === FASE.FIN || this.fase === FASE.ESPERA) return false;
    if (this._limpiarAusentes()) return true;
    if (this.fase === FASE.RESUMEN || this.fase === FASE.TIENDA) {
      const presentes = this.jugadores.filter(j => j.conectado);
      if (t >= this.limite || presentes.every(j => j.listo)) {
        if (this.fase === FASE.RESUMEN) this._despuesDelResumen(); else this._siguienteMazo();
        return true;
      }
      return false;
    }
    if (this.fase === FASE.TURNO) {
      if (!this.turno) return false;
      if (this.finManoEn !== null) {
        if (t >= this.finManoEn) { this._siguienteTurno(); return true; }
        return false;
      }
      if (this.turno.bot || (!this.turno.conectado && this.modo === 'multi')) {   // juega el bot (o el bot que reemplaza a quien se desconectó: guarda su lugar y sigue su partida)
        if (this.botEn === null) this.botEn = t + Bots.demora('decidir');
        if (t < this.botEn) return false;
        this.botEn = null;
        const j = this.turno;
        if (R.botPide(j.mano, j.mazo)) this._pedir(j); else this._terminarMano(j, 'planto');
        return true;
      }
      if (!this.turno.conectado && this.limite - t > this.tiempos.ausente) this.limite = t + this.tiempos.ausente;   // (quien se desconecta juega rápido solo)
      if (t >= this.limite) {   // se acabó el tiempo: el servidor se planta por él (si no tenía cartas, pide una antes)
        const j = this.turno;
        if (j.conectado) j.automaticos++;
        if (!j.mano.length) this._pedir(j);
        if (this.finManoEn === null) this._terminarMano(j, 'tiempo');
        return true;
      }
    }
    return false;
  }

  _cambio() { this.version++; }

  // ---------- guardar y recuperar la sala ----------

  guardar() {
    return { juego: 'trecejack', modo: this.modo, especiales: this.especiales, mazos: this.mazos, objetivo: this.objetivo, metaPuntos: this.metaPuntos, tiempoModo: this.tiempoModo, maxAsientos: this.maxAsientos, clave: this.clave, version: this.version, fase: this.fase, mazoN: this.mazoN, mano: this.mano,
      turno: this.turno ? this.turno.asiento : null, contadorManos: this.contadorManos, contadorReacciones: this.contadorReacciones, jugadores: this.jugadores, fin: this.fin };
  }

  static desde(datos, op = {}) {
    const m = new Mesa13(Object.assign({}, op, { modo: datos.modo, especiales: datos.especiales, mazos: datos.mazos, objetivo: datos.objetivo, metaPuntos: datos.metaPuntos, tiempoModo: datos.tiempoModo, asientos: datos.maxAsientos, clave: datos.clave }));
    m.version = datos.version; m.fase = datos.fase; m.mazoN = datos.mazoN || 1; m.mano = datos.mano || 1; m.contadorManos = datos.contadorManos || 0; m.contadorReacciones = datos.contadorReacciones || 0;
    m.jugadores = datos.jugadores; m.fin = datos.fin || null;
    for (const j of m.jugadores) if (!j.base) j.base = R.baseInicial();   // (salas guardadas por una versión vieja)
    if (m.fase === FASE.TURNO) {
      for (const j of m.jugadores) { j.mazo = (j.mano || []).concat(j.mazo || []); j.mano = []; }   // (una mano a medias se vuelve a empezar: las cartas pedidas vuelven al mazo)
      const j = m.porAsiento(datos.turno) || m.jugadores[0];
      if (j) m._iniciarTurno(j); else m.fase = FASE.ESPERA;
    } else if (m.fase === FASE.RESUMEN) m.limite = m.ahora() + m.tiempos.resumen;
    else if (m.fase === FASE.TIENDA) m.limite = m.ahora() + m.tiempos.tienda;
    return m;
  }

  // ---------- lo que ve cada jugador ----------

  // Las 13 cartas del mazo de alguien: cuáles quedan (con su especial) y cuáles ya salieron.
  _cartasDe(j) {
    return j.base.map((c, i) => ({ i, r: c.r, e: c.e || null, p: R.paloDe(c), quedan: j.mazo.some(x => x.i === i), enMano: this.fase === FASE.TURNO && j.mano.some(x => x.i === i) }));   // (en la mano solo mientras se juega: entre mazos la mano ya no cuenta)
  }

  estado(token) {
    const yo = this.jugador(token), activo = !!yo && this.turno === yo && this.fase === FASE.TURNO && this.finManoEn === null;
    let turno = null;
    if (this.fase === FASE.TURNO && this.turno) {
      const j = this.turno, ev = R.evaluar(j.mano), terminada = this.finManoEn !== null;
      const tieneVidente = j.mano.some(c => c.e === 'vidente') && j.mazo.length > 0 && !terminada;
      turno = { de: j.asiento, mano: j.mano.map(snap), total: ev.total, pasado: ev.pasado, fantasma: ev.fantasma, borrada: ev.borrada, terminada, manoId: this.contadorManos,
        prob: activo && j.mano.length && !terminada ? R.probNoPasar(j.mano, j.mazo) : null, proxima: tieneVidente ? snap(j.mazo[0]) : null,
        puedePedir: activo && j.mazo.length > 0, puedePlantarse: activo && j.mano.length > 0, patrones: R.patrones(j.mano, ev), historial: j.manos.map(m => ({ cartas: m.cartas, total: m.total, pasado: m.pasado, puntos: m.puntos, patrones: m.patrones })) };
    }
    const out = {
      juego: 'trecejack', sinTiempo: !!this.sinTiempo, pausa: this.pausa !== null, tiempos: { turno: this.tiempos.turno, resumen: this.tiempos.resumen, tienda: this.tiempos.tienda }, version: this.version, ahora: this.ahora(),
      modo: this.modo, fase: this.fase, limite: this.limite, mazoN: this.mazoN, mano: this.mano, mazos: this.mazos, objetivo: this.objetivo, metaPuntos: this.metaPuntos, manosPorMazo: R.MANOS_POR_MAZO, especiales: this.especiales, maxAsientos: this.maxAsientos, tiempoModo: this.tiempoModo, cadaTienda: this.cadaTienda,
      turnoDe: this.turno ? this.turno.asiento : null, yo: yo ? yo.asiento : null, anfitrion: this.anfitrion() ? this.anfitrion().asiento : null,
      jugadores: this.jugadores.map(j => ({ asiento: j.asiento, apodo: j.apodo, total: j.total, fichas: j.fichas, conectado: j.conectado, bot: !!j.bot, listo: j.listo, tardio: !!j.tardio, mejorMano: j.mejorMano, pasadas: j.pasadas, veintiunos: j.veintiunos,
        manosJugadas: j.manosJugadas, quedan: j.mazo.length, cartas: this._cartasDe(j), manos: j.manos.map(m => ({ cartas: m.cartas, total: m.total, pasado: m.pasado, puntos: m.puntos, patrones: m.patrones })), resumen: j.resumen })),
      turno, ultimaMano: this.ultimaMano, fin: this.fin, reacciones: this.reacciones.slice(), contadorReacciones: this.contadorReacciones,
    };
    if (yo) out.mio = { oferta: yo.oferta.map((o, i) => Object.assign({}, o, { comprada: yo.compradas.includes(i) })), listo: yo.listo };
    return out;
  }
}

module.exports = { Mesa13, FASE, TIEMPOS, FICHAS, MAZOS_VALIDOS, PUNTOS_VALIDOS, CADA_TIENDA };
