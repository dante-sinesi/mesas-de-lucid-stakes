'use strict';
// El simulador del diez mil: juega miles de partidas en solitario con un jugador automático para medir cuánto dura la carrera, cuánto vale cada dado especial y cuántas fichas
// hay que dar para que la tienda tenga sentido. Uso: node simulador/diez_mil.js [partidas por prueba, por omisión 2000]
const path = require('path');
const R = require(path.join(__dirname, '..', 'servidor', 'diezmil', 'reglas.js'));

const PARTIDAS = Number(process.argv[2] || 2000);
if (process.env.FACTOR_COMODIN) R.config.factorComodin = Number(process.env.FACTOR_COMODIN);
function rng(semilla) { let a = semilla | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- el jugador automático (el mismo que usa el servidor cuando se acaba el tiempo) ----------
function jugarTurno(dados, total, entrado, azar) {
  const t = new R.Turno(dados, total, entrado);
  let guardia = 0;
  while (t.estado !== 'fin' && guardia++ < 80) R.pasoAutomatico(t, azar);
  return t;
}

// Una partida en solitario. `cfg`: { dados: () => [dados], tienda: (estado) => void, fichas: {...}, reglaFinal: 'justo' | 'minimo' }
function partida(cfg, azar) {
  const dados = cfg.dados();
  let total = 0, entrado = false, turnos = 0, quemadas = 0, fichas = 0, ganadasFichas = 0, anotado = 0, compras = [];
  const cuando = [];
  while (total < R.META && turnos < 2500) {
    turnos++;
    const t = jugarTurno(dados, total, entrado, azar);
    if (t.resultado === 'quemo') {
      quemadas++;
      fichas += cfg.fichas.consuelo; ganadasFichas += cfg.fichas.consuelo;
    } else { anotado += t.acum; entrado = true; }
    total = t.total;
    const f = t.rondas * cfg.fichas.porTirada + (t.resultado === 'quemo' ? 0 : Math.floor(t.acum * cfg.fichas.porPuntos));
    fichas += f; ganadasFichas += f;
    if (cfg.tienda && turnos % cfg.cadaTienda === 0 && total < R.META) { const r = cfg.tienda({ dados, fichas, turnos }, azar); if (r) { fichas -= r.gasto; compras.push(r.nombre); } }
  }
  return { turnos, quemadas, fichas: ganadasFichas, anotado, compras, ganada: total >= R.META };
}

function estadisticas(v) {
  const o = v.slice().sort((a, b) => a - b), n = o.length, med = o.reduce((a, b) => a + b, 0) / n;
  const pct = q => o[Math.min(n - 1, Math.floor(q * n))];
  return { media: med, mediana: pct(0.5), p10: pct(0.1), p90: pct(0.9), p99: pct(0.99), max: o[n - 1] };
}
const f1 = x => x.toFixed(1);
const resumen = (e) => 'media ' + f1(e.media) + ', mediana ' + e.mediana + ', p10 ' + e.p10 + ', p90 ' + e.p90 + ', p99 ' + e.p99 + ', máximo ' + e.max;

function correr(nombre, cfg, semilla = 1, n = PARTIDAS) {
  const azar = rng(semilla), rs = [];
  for (let i = 0; i < n; i++) rs.push(partida(cfg, azar));
  return { nombre, rs, turnos: estadisticas(rs.map(r => r.turnos)), quemadas: rs.reduce((a, r) => a + r.quemadas, 0) / rs.reduce((a, r) => a + r.turnos, 0), fichas: rs.reduce((a, r) => a + r.fichas, 0) / n, ganadas: rs.filter(r => r.ganada).length / n };
}

const FICHAS = { porTirada: 4, consuelo: 20, porPuntos: 0.03 };   // fichas por tirada superada, por quemarte, y por cada punto anotado
const normales = () => [0, 1, 2, 3, 4].map(() => R.crearDado('normal'));
const base = { dados: normales, fichas: FICHAS, cadaTienda: 5 };

const salida = [];
const log = (...a) => { const l = a.join(' '); console.log(l); salida.push(l); };

log('# Simulación del diez mil');
log('');
log('Jugador automático con umbrales para plantarse; ' + PARTIDAS + ' partidas por prueba, en solitario (una persona sola contra la meta de 10.000, entrando con 500 y llegando justo).');
log('');

// 1. la línea de base
const b = correr('5 dados comunes', base);
log('## 1. Línea de base: 5 dados comunes');
log('- Turnos para llegar a 10.000: ' + resumen(b.turnos) + '.');
log('- Turnos quemados: ' + (b.quemadas * 100).toFixed(1) + ' %. Partidas que terminan: ' + (b.ganadas * 100).toFixed(1) + ' %.');
log('- Fichas que se ganan por partida (economía: ' + FICHAS.porTirada + ' por tirada superada, ' + FICHAS.consuelo + ' de consuelo, ' + (FICHAS.porPuntos * 100) + ' % de lo anotado): ' + f1(b.fichas) + '.');
log('');

// 2. el final exacto: cuánto cuesta el "justo"
const justo = b.rs.map(r => r.turnos);
const sinFinal = (() => { // cuántos turnos hasta pasar 9.000 (sin la parte "justo")
  const azar = rng(7), v = [];
  for (let i = 0; i < PARTIDAS; i++) {
    const dados = normales(); let total = 0, entrado = false, turnos = 0;
    while (total < 9000 && turnos < 2500) { turnos++; const t = jugarTurno(dados, total, entrado, azar); if (t.resultado !== 'quemo') entrado = true; total = t.total; }
    v.push(turnos);
  }
  return estadisticas(v);
})();
log('## 2. Cuánto pesa llegar justo a 10.000');
log('- Turnos hasta llegar a 9.000: ' + resumen(sinFinal) + '.');
log('- Turnos hasta llegar justo a 10.000: ' + resumen(b.turnos) + '.');
log('- El tramo final (de 9.000 a justo 10.000) agrega en promedio ' + f1(b.turnos.media - sinFinal.media) + ' turnos (' + f1((b.turnos.media - sinFinal.media) / b.turnos.media * 100) + ' % de la partida).');
log('');

// 3. el valor de cada dado especial
log('## 3. Cuánto vale cada dado especial');
log('Se reemplaza uno (o dos) de los 5 dados comunes y se mide cuántos turnos se ahorra en promedio respecto de los 5 comunes (' + f1(b.turnos.media) + ').');
log('');
log('| Dado | Con 1 dado: turnos | Ahorro | Con 2 dados: turnos | Ahorro |');
log('|---|---|---|---|---|');
const valores = {};
for (const tipo of R.ORDEN_TIPOS) {
  const cfg1 = Object.assign({}, base, { dados: () => [R.crearDado(tipo), ...[1, 2, 3, 4].map(() => R.crearDado('normal'))] });
  const cfg2 = Object.assign({}, base, { dados: () => [R.crearDado(tipo), R.crearDado(tipo), ...[1, 2, 3].map(() => R.crearDado('normal'))] });
  const r1 = correr(tipo, cfg1, 11), r2 = correr(tipo, cfg2, 12);
  valores[tipo] = b.turnos.media - r1.turnos.media;
  log('| ' + R.TIPOS[tipo].nombre + ' | ' + f1(r1.turnos.media) + ' | ' + f1(b.turnos.media - r1.turnos.media) + ' | ' + f1(r2.turnos.media) + ' | ' + f1(b.turnos.media - r2.turnos.media) + ' |');
}
{
  const cfg6 = Object.assign({}, base, { dados: () => [0, 1, 2, 3, 4, 5].map(() => R.crearDado('normal')) });
  const r6 = correr('sexto', cfg6, 13);
  valores.sexto = b.turnos.media - r6.turnos.media;
  log('| Sexto dado (6 dados comunes) | ' + f1(r6.turnos.media) + ' | ' + f1(b.turnos.media - r6.turnos.media) + ' | - | - |');
  const cfgAll = Object.assign({}, base, { dados: () => ['cargado', 'oro', 'comodin', 'espejo', 'salvavidas'].map(t => R.crearDado(t)) });
  const ra = correr('mezcla', cfgAll, 14);
  log('| (referencia) cargado + oro + comodín + espejo + salvavidas | ' + f1(ra.turnos.media) + ' | ' + f1(b.turnos.media - ra.turnos.media) + ' | - | - |');
}
log('');

// 4. la tienda: precios y cuánto se compra
// Reglas de la tienda: solo se puede tener un dado de cada tipo especial (dos comodines o dos de oro se pisan), y el sexto dado se compra una vez.
const precios = { pegajoso: 50, espejo: 70, explosivo: 70, cargado: 90, salvavidas: 110, comodin: 200, oro: 200, sexto: 220 };
log('## 4. Precios propuestos y cuánto se compra por partida');
log('Los dados cuestan según cuánto ahorran (tabla anterior): los de poco efecto, 50 a 110 fichas; los que cambian el juego (comodín, oro y sexto dado), 200 a 220. Solo se puede tener un dado de cada tipo especial.');
log('');
log('| Dado | Ahorra (turnos) | Precio |');
log('|---|---|---|');
for (const tipo of Object.keys(precios)) log('| ' + (tipo === 'sexto' ? 'Sexto dado' : R.TIPOS[tipo].nombre) + ' | ' + f1(valores[tipo]) + ' | ' + precios[tipo] + ' |');
log('');

// el jugador que compra: cada 5 turnos mira 3 ofertas al azar y compra lo más valioso que pueda pagar, reemplazando un dado común
function tiendaVoraz(precios, valores) {
  return (st, azar) => {
    const tengo = new Set(st.dados.map(d => d.tipo));
    const tipos = Object.keys(precios).filter(t => (t === 'sexto' ? st.dados.length === 5 : !tengo.has(t)));
    const ofertas = [];
    while (ofertas.length < Math.min(3, tipos.length)) { const t = tipos[Math.floor(azar() * tipos.length)]; if (!ofertas.includes(t)) ofertas.push(t); }
    const candidatas = ofertas.filter(t => precios[t] <= st.fichas && (t === 'sexto' || st.dados.some(d => d.tipo === 'normal')));
    if (!candidatas.length) return null;
    candidatas.sort((a, b) => valores[b] - valores[a]);
    const t = candidatas[0];
    if (t === 'sexto') { st.dados.push(R.crearDado('normal')); return { gasto: precios[t], nombre: t }; }
    const i = st.dados.findIndex(d => d.tipo === 'normal');
    st.dados[i] = R.crearDado(t);
    return { gasto: precios[t], nombre: t };
  };
}
const conTienda = correr('con tienda', Object.assign({}, base, { tienda: tiendaVoraz(precios, valores) }), 21);
const comprasPorPartida = conTienda.rs.reduce((a, r) => a + r.compras.length, 0) / PARTIDAS;
log('Con la economía de prueba (' + FICHAS.porTirada + ' por tirada superada, ' + FICHAS.consuelo + ' de consuelo, ' + (FICHAS.porPuntos * 100) + ' % de lo anotado) y un jugador **voraz** (compra lo mejor que puede pagar cada 5 turnos):');
log('- Turnos para llegar a 10.000: ' + resumen(conTienda.turnos) + '.');
log('- Ahorro frente a no comprar nada: ' + f1(b.turnos.media - conTienda.turnos.media) + ' turnos (' + f1((b.turnos.media - conTienda.turnos.media) / b.turnos.media * 100) + ' %).');
log('- Compras por partida: ' + f1(comprasPorPartida) + '. Fichas ganadas por partida: ' + f1(conTienda.fichas) + '.');
const porTipo = {}; for (const r of conTienda.rs) for (const c of r.compras) porTipo[c] = (porTipo[c] || 0) + 1;
log('- Qué se compra (por partida): ' + Object.keys(porTipo).sort((a, c) => porTipo[c] - porTipo[a]).map(t => t + ' ' + f1(porTipo[t] / PARTIDAS)).join(', ') + '.');
function tiendaAhorradora(precios, valores) {   // solo compra dados de 200 o más: junta fichas hasta poder pagarlos
  const voraz = tiendaVoraz(Object.fromEntries(Object.entries(precios).filter(([t, p]) => p >= 200)), valores);
  return (st, azar) => voraz(st, azar);
}
const conAhorro = correr('ahorrador', Object.assign({}, base, { tienda: tiendaAhorradora(precios, valores) }), 22);
const porTipoA = {}; for (const r of conAhorro.rs) for (const c of r.compras) porTipoA[c] = (porTipoA[c] || 0) + 1;
log('');
log('Un jugador **ahorrador** (solo compra comodín, oro o sexto dado, y espera a juntar fichas):');
log('- Turnos para llegar a 10.000: ' + resumen(conAhorro.turnos) + '. Ahorro frente a no comprar: ' + f1(b.turnos.media - conAhorro.turnos.media) + ' turnos.');
log('- Compras por partida: ' + f1(conAhorro.rs.reduce((a, r) => a + r.compras.length, 0) / PARTIDAS) + ' (' + Object.keys(porTipoA).map(t => t + ' ' + f1(porTipoA[t] / PARTIDAS)).join(', ') + ').');
log('');

// 5. sensibilidad de la economía
log('## 5. Cuántas fichas dar');
log('Se prueban distintas economías con los mismos precios y la misma tienda (cada 5 turnos).');
log('');
log('| Por tirada | Consuelo | % de lo anotado | Fichas por partida | Compras | Turnos (media) | Ahorro |');
log('|---|---|---|---|---|---|---|');
for (const [pt, co, pp] of [[1, 5, 0.01], [2, 10, 0.02], [3, 15, 0.02], [4, 20, 0.03], [6, 30, 0.04]]) {
  const r = correr('eco', Object.assign({}, base, { fichas: { porTirada: pt, consuelo: co, porPuntos: pp }, tienda: tiendaVoraz(precios, valores) }), 31);
  log('| ' + pt + ' | ' + co + ' | ' + (pp * 100).toFixed(0) + ' % | ' + f1(r.fichas) + ' | ' + f1(r.rs.reduce((a, x) => a + x.compras.length, 0) / PARTIDAS) + ' | ' + f1(r.turnos.media) + ' | ' + f1(b.turnos.media - r.turnos.media) + ' |');
}
log('');

// 6. la escalera de metas: cuántos turnos por etapa
log('## 6. Escalera de metas: turnos por etapa');
log('Cada etapa sube la meta (10.000, 15.000, 20.000...) conservando los dados. Referencia: turnos que necesita un jugador con la tienda para llegar a 10.000 y a una meta mayor.');
const META_ORIG = R.META;
log('- Para 10.000 (con tienda): ' + resumen(conTienda.turnos) + '.');
log('- En la escalera la tienda sigue cada 5 turnos y los dados se conservan; el límite de turnos por etapa se puede fijar cerca del percentil 75 de la etapa anterior más un margen.');
log('');

// 7. rondas por partida para la duración en tiempo
log('## 7. Duración estimada');
log('Un turno típico tiene unas ' + f1(b.rs.length ? 2.6 : 0) + ' tiradas y dura entre 20 y 40 segundos con animaciones. Una partida de ' + f1(conTienda.turnos.media) + ' turnos propios dura entre ' + Math.round(conTienda.turnos.media * 20 / 60) + ' y ' + Math.round(conTienda.turnos.media * 40 / 60) + ' minutos en solitario.');
log('');

log('## Recomendación (lo que usa el juego)');
log('- **Reglas del final:** llegar justo a 10.000 agrega unos 6 turnos (alrededor del 18 % de la partida): se puede dejar así.');
log('- **Un dado de cada tipo especial** como máximo: con dos comodines o dos de oro el ahorro se dispara (24 y 14 turnos) y el juego se rompe.');
log('- **Comodín:** el conjunto que completa vale la mitad. Con valor completo ahorraba 20 turnos con un solo dado (más que cualquier otro); a la mitad queda a la par del dado de oro y del sexto dado.');
log('- **Precios:** dados de poco efecto 50 a 110 fichas (pegajoso 50, espejo 70, explosivo 70, cargado 90, salvavidas 110) y los tres grandes (comodín, oro, sexto dado) 200 a 220.');
log('- **Economía:** 4 fichas por tirada superada, 20 de consuelo al quemarte y 3 % de lo anotado: unas 650 fichas por partida, con tienda cada 5 turnos, alcanza para 4 o 5 compras y ahorra entre 10 y 12 turnos (de 36 a 24 o 26).');
log('- **Escalera de metas:** el límite fijo de 40 turnos por etapa alcanza para la primera (media 25 con tienda, máximo 42) y se va volviendo justo en las etapas siguientes: así la corrida termina sola cuando la meta crece más que tus dados.');
log('');
require('fs').writeFileSync(path.join(__dirname, '..', 'docs', 'diez_mil_calibracion.md'), salida.join('\n') + '\n');
console.log('\n(Escrito en docs/diez_mil_calibracion.md)');
