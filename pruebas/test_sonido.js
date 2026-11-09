'use strict';
// Pruebas de los efectos de sonido: cada receta se arma sobre un contexto de audio de mentira y se revisa que lo que programa sea válido
// (sin frecuencias ni volúmenes en cero en las rampas exponenciales, sin valores raros) y que todos los sonidos que pide el juego existan.
// Que de verdad suenen bien se comprueba escuchando (ver demo_sonidos). Uso: node pruebas/test_sonido.js
const fs = require('fs');
const path = require('path');
const Sonido = require(path.join(__dirname, '..', 'web', 'sonido.js'));

let fallos = 0;
const check = (ok, msg) => { if (!ok) { fallos++; console.log('FALLA', msg); } };

// un AudioContext de mentira que anota lo que se programa
function contexto() {
  const reg = { osc: 0, ruido: 0, rampasExp: [], valores: [], raros: 0, finMax: 0 };
  const param = (nombre) => ({
    value: 0,
    setValueAtTime(v, t) { chequear(v, t); this.value = v; },
    linearRampToValueAtTime(v, t) { chequear(v, t); },
    exponentialRampToValueAtTime(v, t) { chequear(v, t); reg.rampasExp.push([nombre, v]); },
  });
  const chequear = (v, t) => { reg.valores.push(v); if (!Number.isFinite(v) || !Number.isFinite(t)) reg.raros++; };
  const nodo = (extra = {}) => Object.assign({ connect() { return this; }, disconnect() {} }, extra);
  const c = {
    sampleRate: 44100, currentTime: 0, destination: nodo(),
    createGain() { return nodo({ gain: param('ganancia') }); },
    createDynamicsCompressor() { return nodo({ threshold: param('umbral'), ratio: param('razon') }); },
    createConvolver() { return nodo({ buffer: null }); },
    createBiquadFilter() { return nodo({ type: '', frequency: param('filtro'), Q: param('q') }); },
    createBuffer(canales, n) { const d = new Float32Array(n); return { getChannelData() { return d; } }; },
    createOscillator() { reg.osc++; return nodo({ type: 'sine', frequency: param('frecuencia'), detune: param('detune'), start(t) { reg.finMax = Math.max(reg.finMax, t); }, stop(t) { reg.finMax = Math.max(reg.finMax, t); } }); },
    createBufferSource() { reg.ruido++; return nodo({ buffer: null, start(t, desde, dur) { reg.finMax = Math.max(reg.finMax, t + (dur || 0)); } }); },
  };
  return { c, reg };
}

check(Sonido.NOMBRES.length === 18, 'hay 18 sonidos (' + Sonido.NOMBRES.length + ')');
for (const n of Sonido.NOMBRES) {
  const { c, reg } = contexto();
  let error = null;
  try { Sonido.motor(c).sonar(n, 0.01, 1); } catch (e) { error = e; }
  check(!error, n + ': se arma sin errores' + (error ? ' (' + error.message + ')' : ''));
  check(reg.osc + reg.ruido >= 1, n + ': programa al menos una nota o un soplido');
  check(reg.raros === 0, n + ': sin valores inválidos');
  check(reg.rampasExp.every(([, v]) => v > 0), n + ': las rampas exponenciales van a valores positivos (' + reg.rampasExp.filter(([, v]) => !(v > 0)).map(x => x[0]).join() + ')');
  check(reg.finMax < 2.5, n + ': dura menos de 2,5 s (' + reg.finMax.toFixed(2) + ')');
  check(reg.valores.every(v => Math.abs(v) < 50000), n + ': valores en rango');
}
// volumen: con vol distinto de 1 se arma un canal propio
{ const { c } = contexto(); let ok = true; try { Sonido.motor(c).sonar('carta', 0.01, 0.5); } catch (e) { ok = false; } check(ok, 'un sonido con el volumen cambiado se arma bien'); }

// todos los sonidos que el juego pide existen
const juego = ['comun.js', 'diezmil.js', 'trecejack.js', 'tutorial.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8')).join(' ');
const pedidos = new Set();
for (const m of juego.matchAll(/Sonido\.play\(([^;]*)\)/g)) for (const q of m[1].replace(/[!=]==\s*'[a-z]+'/g, '').matchAll(/'([a-z]+)'/g)) pedidos.add(q[1]);   // (sin contar las comparaciones, que no son sonidos)
check(pedidos.size >= 8, 'el juego pide varios sonidos (' + pedidos.size + ')');
for (const p of pedidos) check(Sonido.NOMBRES.includes(p), 'el juego pide "' + p + '" y existe');

// sin navegador no hace nada ni falla
Sonido.play('carta'); Sonido.desbloquear(); Sonido.setActivo(false);
check(Sonido.activo === false, 'el silencio se puede activar sin navegador');
console.log('pruebas del sonido terminadas, fallos:', fallos);
process.exit(fallos ? 1 : 0);
