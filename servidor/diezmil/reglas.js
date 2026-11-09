'use strict';
// Las reglas del diez mil: puntajes, dados especiales y un turno. Sin red ni tiempo: lo usan el servidor (mesa_dm.js) y el simulador de la economía.
//
// Reglas (ver docs/brainstorm_diez_mil.md, "Decisiones tomadas"):
// - Se tiran 5 dados (6 con el sexto dado). Puntúan: cada 1 = 100, cada 5 = 50, los tríos (tres 1 = 1000, los demás número x 100), cuatro iguales (el doble del trío),
//   cinco iguales (5000) y las escaleras 1-2-3-4-5 (500) y 2-3-4-5-6 (750).
// - En un turno se aparta al menos un conjunto que puntúa (todos sus dados tienen que puntuar) y se vuelve a tirar con el resto, o se planta uno y anota lo acumulado.
// - Si ninguna jugada puntúa, el turno se quema: se pierde lo acumulado. Si todos los dados puntuaron, se vuelve a tirar con todos (dados calientes).
// - Hay que acumular 500 en un turno para "entrar" la primera vez. Hay que llegar justo a 10.000: una jugada que se pasaría no se puede apartar.

const META = 10000;
const ENTRADA = 500;
const config = { factorComodin: 0.5, bonoMultiplicador: 0.25 };   // (lo que vale un conjunto completado con un comodín, frente al mismo conjunto con dados de verdad)

// ---------- los dados ----------
// `caras`: los seis valores del dado (un dado cargado repite caras). Las marcas dicen qué hace de especial.
const TIPOS = {
  normal: { nombre: 'Dado común', caras: [1, 2, 3, 4, 5, 6] },
  cargado: { nombre: 'Dado cargado', caras: [1, 1, 5, 5, 3, 4], desc: 'Sale 1 o 5 mucho más seguido.' },
  oro: { nombre: 'Dado de oro', caras: [1, 2, 3, 4, 5, 6], oro: true, desc: 'Si el conjunto que apartas lo incluye, vale el doble.' },
  comodin: { nombre: 'Dado comodín', caras: [1, 2, 3, 4, 5, 6], comodin: true, desc: 'Cuenta como la cara que te convenga, pero su conjunto vale la mitad.' },
  salvavidas: { nombre: 'Dado salvavidas', caras: [1, 2, 3, 4, 5, 6], salvavidas: true, desc: 'Si te quemarías, cuenta como un 5 (una vez por turno).' },
  espejo: { nombre: 'Dado espejo', caras: [1, 2, 3, 4, 5, 6], espejo: true, desc: 'Una vez por turno, lo volteas a su cara opuesta, incluso tras quemarte.' },
  pegajoso: { nombre: 'Dado pegajoso', caras: [1, 2, 3, 4, 5, 6], pegajoso: true, desc: 'Al apartarlo para puntuar, vuelve a tu mano y se tira otra vez con los demás.' },
  multiplicador: { nombre: 'Dado multiplicador', caras: [1, 2, 3, 4, 5, 6], multiplicador: true, desc: 'Si lo apartas para puntuar, suma un 25 % extra a lo que llevas en el turno (si con eso te pasarías de la meta, no hace efecto).' },
  iman: { nombre: 'Dado imán', caras: [1, 2, 3, 4, 5, 6], iman: true, desc: 'Su cara no puntúa. Si lo apartas junto a una jugada, atrae a un dado de la tirada (aunque no puntúe) y suma 50 por él.' },
  banco: { nombre: 'Dado banco', caras: [1, 2, 3, 4, 5, 6], banco: true, desc: 'Al apartarlo para puntuar guarda el 30 % de lo que llevas. Si te quemas, conservas lo guardado (solo si ya entraste).' },
  poker: { nombre: 'Dado de póquer', caras: [1, 2, 3, 4, 5, 6], poker: true, desc: 'Si forma un grupo de 3 o 4 dados iguales, ese grupo vale el triple.' },
  suerte: { nombre: 'Dado de la suerte', caras: [1, 2, 3, 4, 5, 6], suerte: true, desc: 'Una vez por turno lo vuelves a tirar, incluso tras quemarte.' },
  vampiro: { nombre: 'Dado vampiro', caras: [1, 2, 3, 4, 5, 6], vampiro: true, desc: 'Al puntuar con él, le robas 50 puntos a quien va primero (si te lleva ventaja). Solo en salas con objetos.' },
  doble: { nombre: 'Dado doble', caras: [1, 2, 3, 4, 5, 6], doble: true, desc: 'Cuenta como dos dados de la misma cara.' },
  fantasma: { nombre: 'Dado fantasma', caras: [1, 2, 3, 4, 5, 6], fantasma: true, desc: 'Si te quemarías, no te quemas: el fantasma se descarta y vuelves a tirar (una vez por turno).' },
  escalera: { nombre: 'Dado de escalera', caras: [1, 2, 3, 4, 5, 6], escalera: true, desc: 'Completa una escalera si con los otros dados tienes cuatro de sus cinco caras.' },
  apostador: { nombre: 'Dado apostador', caras: [1, 2, 3, 4, 5, 6], apostador: true, desc: 'Antes de tirar apuestas par o impar: si aciertas y puntúa, su jugada vale el doble.' },
  explosivo: { nombre: 'Dado explosivo', caras: [1, 2, 3, 4, 5, 6], explosivo: true, desc: 'Si sale 1, suma 500 extra; si sale 2, te quemas aunque otros dados puntúen.' },
};
const ORDEN_TIPOS = ['cargado', 'oro', 'comodin', 'salvavidas', 'espejo', 'pegajoso', 'explosivo', 'multiplicador', 'iman', 'banco', 'poker', 'suerte', 'vampiro', 'doble', 'fantasma', 'escalera', 'apostador'];
const crearDado = (tipo = 'normal') => ({ tipo, caras: TIPOS[tipo].caras.slice() });
const marcas = dado => TIPOS[dado.tipo] || TIPOS.normal;

// ---------- puntaje de un conjunto de dados ----------
const valorGrupo = (cara, k) => {
  const trio = cara === 1 ? 1000 : cara * 100;
  if (k === 3) return trio;
  if (k === 4) return trio * 2;
  if (k === 5) return 5000;
  return 0;
};
const valorSuelto = cara => (cara === 1 ? 100 : (cara === 5 ? 50 : 0));

// El mejor puntaje de las cantidades `c` (c[1..6]) con `w[f]` comodines asignados a cada cara, o null si algún dado queda sin puntuar.
// Un comodín no puede puntuar suelto: solo dentro de un grupo de 3 o más o de una escalera.
function sinEscalera(c, w) {
  let total = 0;
  for (let f = 1; f <= 6; f++) {
    const k = c[f];
    if (k === 0) continue;
    if (k > 6) return null;
    if (k >= 3) {
      if (k === 6) { const s = valorSuelto(f); if (!s) return null; total += 5000 + s; } else total += valorGrupo(f, k);
    } else {
      if (!valorSuelto(f) || w[f] > 0) return null;
      total += valorSuelto(f) * k;
    }
  }
  return total;
}
function mejorParticion(c, w) {
  let mejor = sinEscalera(c, w);
  for (const [desde, hasta, valor] of [[1, 5, 500], [2, 6, 750]]) {
    let ok = true;
    for (let f = desde; f <= hasta; f++) if (c[f] < 1) ok = false;
    if (!ok) continue;
    const c2 = c.slice(), w2 = w.slice();
    for (let f = desde; f <= hasta; f++) { c2[f]--; if (w2[f] > 0) w2[f]--; }   // (la escalera usa primero un comodín de esa cara)
    const r = sinEscalera(c2, w2);
    if (r !== null && (mejor === null || valor + r > mejor)) mejor = valor + r;
  }
  return mejor;
}

// Los dados que no cambian si te quemas o no se tratan como comunes al calcular la probabilidad (así se juntan más y el cálculo es más rápido).
const CUENTAN_PARA_QUEMARSE = new Set(['normal', 'cargado', 'comodin', 'salvavidas', 'explosivo', 'iman', 'doble', 'escalera', 'fantasma']);
const claseQuema = dado => (CUENTAN_PARA_QUEMARSE.has(dado.tipo) ? dado.tipo : 'normal');
const memo = new Map();
// Los dados de `items` ({ valor, comodin, oro, explosivo }): su puntaje si todos puntúan (con el mejor reparto de los comodines), o null.
function puntuarSimple(items) {
  const fijos = items.filter(i => !i.comodin), nw = items.length - fijos.length;
  const base = [0, 0, 0, 0, 0, 0, 0];
  for (const i of fijos) base[i.valor] += i.doble ? 2 : 1;   // (el dado doble cuenta por dos)
  const clave = base.join('') + 'w' + nw;
  let bruto = memo.get(clave);
  if (bruto === undefined) {
    bruto = null;
    const asignar = (resta, desde, w) => {
      if (resta === 0) {
        const c = base.map((b, f) => b + w[f]);
        const v = mejorParticion(c, w);
        if (v !== null && (bruto === null || v > bruto)) bruto = v;
        return;
      }
      for (let f = desde; f <= 6; f++) { w[f]++; asignar(resta - 1, f, w); w[f]--; }
    };
    asignar(nw, 1, [0, 0, 0, 0, 0, 0, 0]);
    memo.set(clave, bruto);
  }
  if (bruto === null) return null;
  let puntos = bruto;
  if (nw > 0 && config.factorComodin !== 1) puntos = Math.max(50, Math.round(bruto * config.factorComodin / 50) * 50);
  if (items.some(i => i.oro || (i.apostador && (i.valor % 2 === 0) === (i.apuesta !== 'impar')))) puntos *= 2;   // (el apostador acierta si la cara tiene la paridad apostada)
  puntos += 500 * items.filter(i => i.explosivo && i.valor === 1).length;
  for (const f of new Set(items.filter(i => i.poker && !i.comodin).map(i => i.valor))) { if (base[f] === 3 || base[f] === 4) puntos += 2 * valorGrupo(f, base[f]); }   // (el póquer triplica su grupo)
  return puntos;
}
// El dado de escalera completa una escalera si con los otros tienes cuatro de sus cinco caras.
function puntuarConEscalera(items) {
  const esc = items.find(i => i.escalera);
  let mejor = puntuarSimple(items);
  if (!esc) return mejor;
  const caras = new Set(items.filter(i => i !== esc && !i.comodin).map(i => i.valor));
  for (let f = 1; f <= 6; f++) {
    if (f === esc.valor) continue;
    const completa = [[1, 5], [2, 6]].some(([d, h]) => f >= d && f <= h && Array.from({ length: h - d + 1 }, (_, k) => d + k).every(c => c === f || caras.has(c)));
    if (!completa) continue;
    const v = puntuarSimple(items.map(i => (i === esc ? Object.assign({}, i, { valor: f }) : i)));
    if (v !== null && (mejor === null || v > mejor)) mejor = v;
  }
  return mejor;
}
// El dado imán no puntúa: atrae a un dado cualquiera de la jugada (que suma 50 en vez de lo que valga).
const CLAVE_MARCAS = ['comodin', 'oro', 'explosivo', 'iman', 'poker', 'doble', 'escalera', 'apostador'];
const memoPuntos = new Map();
function puntuar(items) {
  // (se recuerda el resultado por dados: ordenados, porque el orden no cambia el puntaje)
  const clave = items.map(i => i.valor + CLAVE_MARCAS.map(m => (i[m] ? 1 : 0)).join('') + (i.apostador ? i.apuesta : '')).sort().join('/');
  let v = memoPuntos.get(clave);
  if (v === undefined) {
    v = puntuarSinMemo(items);
    if (memoPuntos.size > 20000) memoPuntos.clear();
    memoPuntos.set(clave, v);
  }
  return v;
}
function puntuarSinMemo(items) {
  const imanes = items.filter(i => i.iman);
  if (!imanes.length) return items.length ? puntuarConEscalera(items) : null;
  const otros = items.filter(i => !i.iman), n = otros.length;
  let mejor = null;
  for (let m = 0; m < (1 << n); m++) {
    let k = 0; const resto = [];
    for (let b = 0; b < n; b++) { if (m & (1 << b)) k++; else resto.push(otros[b]); }
    if (k > imanes.length || !resto.length) continue;
    const v = puntuarConEscalera(resto);
    if (v !== null && (mejor === null || v + 50 * k > mejor)) mejor = v + 50 * k;
  }
  return mejor;
}

// Todas las jugadas posibles de una tirada: [{ indices, puntos }] con los lugares (dentro de `tirada`) de los dados que se apartan.
function jugadas(tirada) {
  const out = [], n = tirada.length;
  for (let m = 1; m < (1 << n); m++) {
    const idx = [], items = [];
    for (let i = 0; i < n; i++) if (m & (1 << i)) { idx.push(i); items.push(tirada[i]); }
    const p = puntuar(items);
    if (p !== null) out.push({ indices: idx, puntos: p });
  }
  return out;
}

// ---------- un turno ----------
// El turno guarda: los dados del jugador, los puntos acumulados, qué dados quedan para tirar (`pool`: lugares) y la última tirada.
// estado: 'tirar' (hay que tirar), 'apartar' (hay que apartar una jugada), 'decidir' (seguir o plantarse), 'quemada' (te quemaste: ventana para el espejo), 'fin'.
// Las formas de repartir k dados idénticos entre las 6 caras: { cuentas: [cuántos en cada cara], peso: su probabilidad }
const COMBOS = {};
function combinaciones(k) {
  if (COMBOS[k]) return COMBOS[k];
  const fact = n => (n <= 1 ? 1 : n * fact(n - 1)), out = [];
  const rec = (i, resto, cuentas) => {
    if (i === 5) { const c = cuentas.concat([resto]); out.push({ cuentas: c, peso: fact(k) / c.reduce((t, x) => t * fact(x), 1) / Math.pow(6, k) }); return; }
    for (let x = 0; x <= resto; x++) rec(i + 1, resto - x, cuentas.concat([x]));
  };
  rec(0, k, []);
  return (COMBOS[k] = out);
}

class Turno {
  constructor(dados, total, entrado, opciones = {}) {
    this.dados = dados;
    this.meta = opciones.meta || META;              // (la meta de la partida: 10.000, o más en la escalera de metas)
    this.total = total;
    this.entrado = entrado;
    this.acum = opciones.acum || 0;                 // (con "tomar los dados", empieza con lo que dejó el que se quemó)
    this.pool = opciones.pool ? opciones.pool.slice() : dados.map((_, i) => i);
    this.entrada = opciones.entrada || ENTRADA;     // (puntos a juntar en un turno para entrar: 500, o 300 tras dos quemadas sin entrar)
    this.piedad = !!opciones.piedad;                // (tras dos quemadas seguidas, la primera tirada del turno no puede quemarte)
    this.trabados = opciones.trabados || 0;         // (dados que no se pueden tirar en la primera tirada: efecto de una trampa)
    this.tirada = [];                               // [{ slot, valor, ... }]
    this.validas = [];
    this.estado = 'tirar';
    this.salvavidasUsado = false;
    this.espejosUsados = new Set();   // (también vale para los dados de la suerte)
    this.fantasmaUsado = false;
    this.historial = [];                            // (lo que se fue apartando en el turno, para que lo vean los demás: [{ puntos, dados: [{ tipo, valor }] }])
    this.banco = 0;                                 // (lo guardado por un dado banco: se conserva si te quemas)
    this.apuesta = 'par';                           // (la apuesta del dado apostador)
    this.rondas = 0;                                // (cuántas tiradas superó)
    this.resultado = null;                          // 'planto' | 'quemo' | 'gano'
    this.motivo = null;                             // por qué se quemó: 'sin_jugada' | 'explosion' | 'pasado'
  }

  _item(slot, valor) {
    const m = marcas(this.dados[slot]);
    return { slot, valor, comodin: !!m.comodin, oro: !!m.oro, explosivo: !!m.explosivo, espejo: !!m.espejo, salvavidas: !!m.salvavidas, pegajoso: !!m.pegajoso, multiplicador: !!m.multiplicador,
      iman: !!m.iman, banco: !!m.banco, poker: !!m.poker, suerte: !!m.suerte, vampiro: !!m.vampiro, doble: !!m.doble, fantasma: !!m.fantasma, escalera: !!m.escalera, apostador: !!m.apostador, apuesta: this.apuesta };
  }

  // ---------- probabilidades ----------

  // Probabilidad (0 a 1) de que tirar los dados de `pool`, llevando `acum` puntos, NO te queme (sin contar los espejos, que te salvarían después).
  // Es exacta: se recorren las combinaciones de caras agrupando los dados idénticos (para cinco dados comunes son solo 252 casos).
  probNoQuemar(pool, acum) {
    if (this.piedad && this.rondas === 0 && pool.length === this.pool.length) return 1;   // (la piedad: esa tirada no puede quemarte)
    let slots = pool.slice();
    if (this.trabados > 0 && this.rondas === 0 && slots.length > 1) slots = slots.slice(0, Math.max(1, slots.length - this.trabados));
    const clave = slots.map(s => claseQuema(this.dados[s]) + this.dados[s].caras.join('')).sort().join('/') + '|' + acum + '|' + this.total + '|' + this.meta + '|' + (this.salvavidasUsado ? 1 : 0) + (this.fantasmaUsado ? 1 : 0) + this.apuesta;
    this._memoProb = this._memoProb || new Map();
    if (this._memoProb.has(clave)) return this._memoProb.get(clave);
    const grupos = new Map();
    for (const s of slots) { const d = this.dados[s], k = claseQuema(d) + d.caras.join(''); if (!grupos.has(k)) grupos.set(k, { slots: [], caras: d.caras }); grupos.get(k).slots.push(s); }
    const lista = Array.from(grupos.values()).map(g => ({ g, opciones: combinaciones(g.slots.length) }));
    let sinQuemar = 0;
    const rec = (i, peso, items) => {
      if (i === lista.length) { if (!this._quemaria(items, acum)) sinQuemar += peso; return; }
      const { g, opciones } = lista[i];
      for (const op of opciones) {
        const hechos = [];
        let n = 0;
        for (let c = 0; c < 6; c++) for (let q = 0; q < op.cuentas[c]; q++) hechos.push(this._item(g.slots[n++], g.caras[c]));
        rec(i + 1, peso * op.peso, items.concat(hechos));
      }
    };
    rec(0, 1, []);
    this._memoProb.set(clave, sinQuemar);
    return sinQuemar;
  }
  // ¿Esta tirada (ya armada) te quemaría? (misma regla que `_evaluar`, sin cambiar el estado)
  _quemaria(items, acum) {
    const copia = items.map(i => Object.assign({}, i));
    const explota = copia.some(i => i.explosivo && i.valor === 2);
    const hay = () => jugadas(copia).some(j => this.total + acum + j.puntos <= this.meta);
    let ok = hay();
    if (!ok && !explota && !this.salvavidasUsado) { const sv = copia.find(i => i.salvavidas); if (sv) { sv.valor = 5; ok = hay(); } }
    if (!ok && !explota && !this.fantasmaUsado && copia.some(i => i.fantasma)) ok = true;   // (el fantasma te salva una vez)
    return !(ok && !explota);
  }
  // La probabilidad de no quemarte en la tirada que sigue si apartas la jugada `jug` (de `validas`).
  probTras(jug) {
    const apartados = jug.indices.map(i => this.tirada[i]);
    const ss = new Set(apartados.map(a => a.slot)), vuelven = apartados.filter(a => a.pegajoso).map(a => a.slot);
    let pool = Array.from(new Set(this.pool.filter(sl => !ss.has(sl)).concat(vuelven)));
    if (pool.length === 0) pool = this.dados.map((_, i) => i);   // dados calientes
    return this.probNoQuemar(pool, this.acum + jug.puntos);
  }

  // Tira los dados de `pool`; `azar()` da un número en [0, 1).
  tirar(azar) {
    if (this.estado !== 'tirar') return { ok: false, error: 'Ahora no se puede tirar' };
    let slots = this.pool.slice();
    if (this.trabados > 0 && this.rondas === 0 && slots.length > 1) slots = slots.slice(0, Math.max(1, slots.length - this.trabados));
    const lanzar = () => slots.map(s => this._item(s, this.dados[s].caras[Math.min(5, Math.floor(azar() * 6))]));
    this.tirada = lanzar();
    if (this.piedad && this.rondas === 0) for (let k = 0; k < 8 && !this._sinQuemarse(); k++) this.tirada = lanzar();   // (piedad: se vuelve a tirar hasta que haya una jugada)
    return this._evaluar();
  }

  _sinQuemarse() { this._validas(); return this.validas.length > 0 && !this.tirada.some(i => i.explosivo && i.valor === 2); }

  // Calcula las jugadas de la tirada y si te quemaste (y si el espejo todavía te puede salvar).
  _evaluar() {
    const explota = this.tirada.some(i => i.explosivo && i.valor === 2);
    this._validas();
    if (this.validas.length === 0 && !explota && !this.salvavidasUsado) {   // (el salvavidas cuenta como un 5 si te quemarías)
      const sv = this.tirada.find(i => i.salvavidas);
      if (sv) { this.salvavidasUsado = true; sv.valor = 5; sv.salvado = true; this._validas(); }
    }
    if (this.validas.length === 0 && !explota && !this.fantasmaUsado) {   // (el fantasma se descarta en vez de quemarte)
      const f = this.tirada.find(i => i.fantasma);
      if (f) {
        this.fantasmaUsado = true; this.explota = false;
        this.pool = this.pool.filter(s => s !== f.slot);
        if (this.pool.length === 0) this.pool = this.dados.map((_, i) => i);
        this.ultimaJugada = { slots: [f.slot], puntos: 0, calientes: false, fantasma: true };
        this.estado = 'decidir'; this.rondas++;
        return { ok: true, quemada: false, fantasma: true };
      }
    }
    this.explota = explota;
    if (this.validas.length > 0 && !explota) { this.rondas++; this.estado = 'apartar'; return { ok: true, quemada: false }; }
    this.motivo = explota ? 'explosion' : (this._hayJugadas() ? 'pasado' : 'sin_jugada');
    if (this._espejoSalva()) { this.estado = 'quemada'; return { ok: true, quemada: true, ventana: true }; }
    return this._quemar();
  }
  _hayJugadas() { return jugadas(this.tirada).length > 0; }
  _validas() {
    this.validas = jugadas(this.tirada).filter(j => this.total + this.acum + j.puntos <= this.meta);
    // el dado multiplicador: la jugada que lo incluye suma un porcentaje de lo acumulado (redondeado a 50), salvo que con eso te pasaras de la meta
    for (const j of this.validas) {
      if (!j.indices.some(i => this.tirada[i].multiplicador)) continue;
      const bono = Math.round((this.acum + j.puntos) * config.bonoMultiplicador / 50) * 50;
      if (bono > 0 && this.total + this.acum + j.puntos + bono <= this.meta) { j.puntos += bono; j.bono = bono; }
    }
  }
  // ¿Algún espejo sin usar convertiría esta quemada en una jugada válida?
  _espejoSalva() {
    for (const it of this.tirada) {
      if (it.suerte && !this.espejosUsados.has(it.slot)) return true;   // (la suerte puede salvarte)
      if (!it.espejo || this.espejosUsados.has(it.slot)) continue;
      const antes = it.valor; it.valor = 7 - antes;
      const explota = this.tirada.some(i => i.explosivo && i.valor === 2);
      const hay = !explota && jugadas(this.tirada).some(j => this.total + this.acum + j.puntos <= this.meta);
      it.valor = antes;
      if (hay) return true;
    }
    return false;
  }
  _quemar() { this.estado = 'fin'; this.resultado = 'quemo'; return { ok: true, quemada: true, ventana: false }; }
  // Se acabó la ventana de la quemada (o no había nada que hacer).
  aceptarQuemada() { if (this.estado !== 'quemada') return { ok: false, error: 'No te quemaste' }; return this._quemar(); }

  // Voltea un dado espejo de la tirada a su cara opuesta (una vez por turno por dado).
  voltear(slot, azar) {
    if (this.estado !== 'apartar' && this.estado !== 'quemada') return { ok: false, error: 'Ahora no se puede voltear' };
    const it = this.tirada.find(i => i.slot === slot);
    if (!it || !(it.espejo || it.suerte)) return { ok: false, error: 'Ese dado no se puede voltear' };
    if (this.espejosUsados.has(slot)) return { ok: false, error: 'Ya usaste ese espejo en este turno' };
    this.espejosUsados.add(slot);
    if (it.suerte) it.valor = this.dados[slot].caras[Math.min(5, Math.floor((azar || Math.random)() * 6))];   // (la suerte lo vuelve a tirar)
    else it.valor = 7 - it.valor;
    const antes = this.estado;
    const r = this._evaluarSinContar(antes);
    return r;
  }
  _evaluarSinContar(antes) {
    const explota = this.tirada.some(i => i.explosivo && i.valor === 2);
    this._validas();
    this.explota = explota;
    if (this.validas.length > 0 && !explota) { if (antes === 'quemada') this.rondas++; this.estado = 'apartar'; return { ok: true, quemada: false }; }
    if (antes === 'quemada') {
      if (this._espejoSalva()) return { ok: true, quemada: true, ventana: true };
      this.motivo = explota ? 'explosion' : (this._hayJugadas() ? 'pasado' : 'sin_jugada');
      return this._quemar();
    }
    this.motivo = explota ? 'explosion' : (this._hayJugadas() ? 'pasado' : 'sin_jugada');
    if (this._espejoSalva()) { this.estado = 'quemada'; return { ok: true, quemada: true, ventana: true }; }
    return this._quemar();
  }

  // Aparta los dados de la tirada en los lugares `indices` (tiene que ser una jugada válida).
  apartar(indices) {
    if (this.estado !== 'apartar') return { ok: false, error: 'Ahora no se puede apartar' };
    const clave = Array.from(new Set(indices)).sort((a, b) => a - b).join(',');
    const j = this.validas.find(x => x.indices.join(',') === clave);
    if (!j) return { ok: false, error: 'Esos dados no son una jugada que puntúe' };
    this.acum += j.puntos;
    const apartados = j.indices.map(i => this.tirada[i]);
    this.historial.push({ puntos: j.puntos, dados: apartados.map(a => ({ tipo: this.dados[a.slot].tipo, valor: a.valor })) });
    if (this.entrado && apartados.some(a => a.banco)) this.banco = Math.max(this.banco, Math.round(this.acum * 0.3 / 50) * 50);   // (el dado banco guarda el 30 %)
    const slotsApartados = new Set(apartados.map(a => a.slot));
    const vuelven = apartados.filter(a => a.pegajoso).map(a => a.slot);   // (los pegajosos vuelven a la mano)
    this.pool = Array.from(new Set(this.pool.filter(sl => !slotsApartados.has(sl)).concat(vuelven)));
    if (this.pool.length === 0) this.pool = this.dados.map((_, i) => i);   // dados calientes
    this.estado = 'decidir';
    this.ultimaJugada = { slots: Array.from(slotsApartados), puntos: j.puntos, calientes: this.pool.length === this.dados.length && slotsApartados.size === this.dados.length };
    return { ok: true, puntos: j.puntos, acum: this.acum };
  }

  // Seguir tirando con los dados que quedan.
  seguir() {
    if (this.estado !== 'decidir') return { ok: false, error: 'Ahora no se puede seguir' };
    this.estado = 'tirar';
    return { ok: true };
  }

  puedePlantarse() { return this.estado === 'decidir' && this.acum > 0 && (this.entrado || this.acum >= this.entrada) && this.total + this.acum <= this.meta; }
  plantarse() {
    if (!this.puedePlantarse()) return { ok: false, error: this.entrado ? 'No puedes plantarte ahora' : 'Necesitas ' + this.entrada + ' puntos para entrar' };
    this.total += this.acum;
    this.entrado = true;
    this.estado = 'fin';
    this.resultado = this.total === this.meta ? 'gano' : 'planto';
    return { ok: true, anotado: this.acum, total: this.total };
  }
}

// ---------- el jugador automático (lo usa el simulador y el servidor cuando se acaba el tiempo o alguien se desconecta) ----------
const UMBRAL = { 1: 300, 2: 300, 3: 500, 4: 1000, 5: 2000, 6: 2500 };   // cuándo se planta según cuántos dados le quedan
const BONO_RESTO = { 0: 300, 1: 0, 2: 30, 3: 80, 4: 150, 5: 250, 6: 350 };
// La jugada que elige entre las válidas de la tirada: la que llega justo a la meta, o la que más suma contando los dados que le quedan para seguir.
function elegirJugada(t) {
  const falta = t.meta - t.total - t.acum;
  const justo = t.validas.find(j => j.puntos === falta);
  if (justo) return justo;
  let mejor = -Infinity, elegida = t.validas[0];
  for (const j of t.validas) {
    const vuelven = t.tirada.filter((x, i) => j.indices.includes(i) && x.pegajoso).length;
    const quedan = t.pool.length - j.indices.length + vuelven;
    const v = j.puntos + BONO_RESTO[quedan <= 0 ? 0 : Math.min(quedan, 6)];
    if (v > mejor) { mejor = v; elegida = j; }
  }
  return elegida;
}
function debePlantarse(t) {
  return t.puedePlantarse() && (t.total + t.acum === t.meta || t.acum >= UMBRAL[Math.min(t.pool.length, 6)] || t.meta - t.total - t.acum < 1000);
}
// Un paso del jugador automático sobre el turno `t` (hace lo que corresponda al estado en que está).
function pasoAutomatico(t, azar) {
  if (t.estado === 'tirar') return t.tirar(azar);
  if (t.estado === 'quemada') {
    for (const it of t.tirada) { if ((it.espejo || it.suerte) && !t.espejosUsados.has(it.slot)) { t.voltear(it.slot, azar); if (t.estado === 'apartar') return { ok: true }; } }
    return t.estado === 'quemada' ? t.aceptarQuemada() : { ok: true };
  }
  if (t.estado === 'apartar') return t.apartar(elegirJugada(t).indices);
  if (t.estado === 'decidir') return debePlantarse(t) ? t.plantarse() : t.seguir();
  return { ok: false };
}

module.exports = { elegirJugada, debePlantarse, pasoAutomatico, UMBRAL, config, META, ENTRADA, TIPOS, ORDEN_TIPOS, crearDado, marcas, puntuar, jugadas, Turno, valorGrupo, valorSuelto };
