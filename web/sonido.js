'use strict';
// Los efectos de sonido de las mesas: se generan por código con Web Audio (no hay archivos que bajar).
// Timbres limpios: osciladores con envolvente, campanitas con armónicos (un poco desafinados, como un metal), ruido filtrado para el papel y los roces,
// y un eco corto que les da cuerpo. Cada caso tiene su carácter (ganar, perder, empatar, salvado, victoria...).

const Sonido = (() => {
  const piso = 0.0001;
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

  // El motor de un contexto de audio (el de la página, o uno de prueba).
  function motor(ctx) {
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    const maestro = ctx.createGain(); maestro.gain.value = 0.7; maestro.connect(comp);
    // un eco corto y suave (una "sala chica") que le da cuerpo a las campanitas
    const sala = ctx.createConvolver();
    const n = Math.floor(ctx.sampleRate * 0.5), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    sala.buffer = ir;
    const mojado = ctx.createGain(); mojado.gain.value = 0.28; sala.connect(mojado); mojado.connect(comp);
    const ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const r = ruidoBuf.getChannelData(0); for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;
    let bus = maestro;   // (por donde sale lo que está sonando: permite bajarle el volumen a un sonido)

    const salida = (g, eco) => { g.connect(bus); if (eco) { const s = ctx.createGain(); s.gain.value = eco; g.connect(s); s.connect(sala); } };
    const envolvente = (g, t, ataque, dur, vol) => { g.gain.setValueAtTime(piso, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(piso, t + dur); };

    // Una nota: onda, de f0 a f1, con volumen y envolvente. op: a (ataque), lp (filtro pasa bajos), vib [Hz, cents], eco.
    function osc(tipo, f0, f1, t, dur, vol, op = {}) {
      const o = ctx.createOscillator(); o.type = tipo;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * (op.glide || 1));
      const g = ctx.createGain(); envolvente(g, t, op.a || 0.005, dur, vol);
      let nodo = o;
      if (op.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = op.lp; o.connect(f); nodo = f; }
      if (op.vib) { const l = ctx.createOscillator(); l.frequency.value = op.vib[0]; const lg = ctx.createGain(); lg.gain.value = op.vib[1]; l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + 0.05); }
      nodo.connect(g); salida(g, op.eco);
      o.start(t); o.stop(t + dur + 0.05);
    }
    // Una campanita: la nota y sus armónicos, cada uno con su caída.
    function campana(f, t, dur, vol, eco = 0.5) {
      [[1, 1, 1], [2, 0.42, 0.7], [2.76, 0.26, 0.5], [5.4, 0.1, 0.3]].forEach(([m, v, d]) => osc('sine', f * m, f * m, t, dur * d, vol * v, { a: 0.002, eco }));
    }
    // Un soplido de ruido con filtro (papel, roce, chasquido).
    function ruido(t, dur, vol, tipo, f, q = 1, barrido) {
      const s = ctx.createBufferSource(); s.buffer = ruidoBuf;
      const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (barrido) fl.frequency.exponentialRampToValueAtTime(barrido, t + dur);
      const g = ctx.createGain(); envolvente(g, t, 0.002, dur, vol);
      s.connect(fl); fl.connect(g); salida(g);
      s.start(t, Math.random() * 0.5, dur + 0.05);
    }

    // ---- las recetas (t es el instante en que empieza) ----
    const R = {
      ganar(t) {   // arpegio mayor ascendente, de campanitas, con un brillo al final
        [72, 76, 79, 84].forEach((n, i) => campana(mtof(n), t + i * 0.085, 0.55, 0.16));
        campana(mtof(91), t + 0.34, 0.8, 0.12); osc('sine', mtof(96), mtof(96), t + 0.38, 0.5, 0.05, { eco: 0.6 });
      },
      victoria(t) {   // un arpegio largo y un acorde brillante, con una lluvia de monedas
        [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => campana(mtof(n), t + i * 0.07, 0.6, 0.15));
        [84, 88, 91, 96].forEach(n => campana(mtof(n), t + 0.52, 1.1, 0.14, 0.7));
        [0.62, 0.72, 0.79, 0.9, 0.98, 1.06].forEach((d, i) => osc('sine', 1900 + i * 230, 1900 + i * 230, t + d, 0.18, 0.06, { eco: 0.6 }));
      },
      perder(t) {   // dos notas que bajan, blandas, con un vibrato lento (el "wah-wah" triste)
        osc('triangle', mtof(67), mtof(65.6), t, 0.42, 0.24, { lp: 1500, vib: [5, 14], a: 0.03, eco: 0.3 });
        osc('triangle', mtof(63), mtof(58), t + 0.36, 0.8, 0.26, { lp: 1200, vib: [5.5, 22], a: 0.03, eco: 0.3 });
      },
      empatar(t) {   // dos notas iguales, tranquilas: ni sube ni baja
        campana(mtof(72), t, 0.45, 0.17, 0.4); campana(mtof(72), t + 0.2, 0.55, 0.14, 0.4);
      },
      salvado(t) {   // el alivio: un suspiro que cae y una campanita que sube
        ruido(t, 0.28, 0.12, 'lowpass', 3500, 0.7, 500);
        osc('sine', mtof(62), mtof(74), t + 0.1, 0.3, 0.14, { a: 0.02, glide: 0.8, eco: 0.3 });
        campana(mtof(79), t + 0.34, 0.7, 0.18);
      },
      carta(t) {   // el papel al deslizarse: un soplido filtrado y un golpecito suave
        ruido(t, 0.06, 0.55, 'bandpass', 3200, 1.1, 1800);
        osc('sine', 420, 240, t, 0.04, 0.16, { a: 0.001 });
      },
      flip(t) {   // dos roces seguidos, el segundo más agudo
        ruido(t, 0.045, 0.34, 'bandpass', 2600, 1.2, 1500);
        ruido(t + 0.06, 0.05, 0.38, 'bandpass', 3600, 1.2, 2200);
      },
      ficha(t) {   // el "clic" de una ficha de cerámica al caer sobre otra
        osc('sine', 2400, 2300, t, 0.09, 0.16, { a: 0.001, eco: 0.3 }); osc('sine', 3500, 3400, t, 0.06, 0.1, { a: 0.001 });
        ruido(t, 0.025, 0.12, 'highpass', 5000, 0.8);
      },
      moneda(t) {   // la monedita clásica: dos notas, la segunda más alta y larga
        campana(mtof(83), t, 0.16, 0.16, 0.3); campana(mtof(88), t + 0.07, 0.5, 0.18, 0.5);
      },
      turno(t) {   // un aviso amable de dos notas ascendentes
        campana(mtof(76), t, 0.4, 0.15, 0.45); campana(mtof(81), t + 0.11, 0.6, 0.17, 0.5);
      },
      tic(t) {   // un tic seco, de madera
        osc('sine', 1250, 900, t, 0.035, 0.24, { a: 0.001 }); ruido(t, 0.02, 0.14, 'bandpass', 2200, 2);
      },
      comprar(t) {   // la caja registradora: un clic, y una campanita
        ruido(t, 0.03, 0.14, 'highpass', 3000, 0.8); campana(mtof(84), t + 0.03, 0.18, 0.15, 0.3); campana(mtof(91), t + 0.1, 0.7, 0.18, 0.5);
      },
      usar(t) {   // un destello mágico: dos notas que suben y chispas
        campana(mtof(79), t, 0.3, 0.14, 0.5); campana(mtof(86), t + 0.08, 0.6, 0.16, 0.6);
        [0.16, 0.22, 0.28].forEach((d, i) => osc('sine', 3000 + i * 500, 3000 + i * 500, t + d, 0.12, 0.04, { eco: 0.6 }));
      },
      tienda(t) {   // el timbre de una puerta al abrir: tres notas suaves
        [72, 76, 79].forEach((n, i) => campana(mtof(n), t + i * 0.13, 0.7, 0.14, 0.55));
      },
      golpe(t) {   // te cae algo en contra: un golpe grave y un acorde que no suena bien
        osc('sine', 90, 38, t, 0.5, 0.5, { a: 0.002 });
        osc('sawtooth', mtof(45), mtof(45), t, 0.55, 0.12, { lp: 700, a: 0.003 }); osc('sawtooth', mtof(51), mtof(51), t, 0.55, 0.1, { lp: 700, a: 0.003 });
        ruido(t, 0.18, 0.18, 'lowpass', 900, 0.8);
      },
      robo(t) {   // te sacan fichas: una caída rápida y blanda
        osc('triangle', 620, 180, t, 0.3, 0.22, { lp: 1800, a: 0.004, eco: 0.2 }); campana(mtof(80), t, 0.1, 0.05, 0.2);
      },
      clic(t) { osc('sine', 820, 520, t, 0.05, 0.3, { a: 0.001 }); },
      roce(t) { osc('sine', 1500, 1500, t, 0.03, 0.09, { a: 0.003 }); },
    };

    return {
      // Suena `nombre` a partir del instante `t`; `vol` (0 a 1) lo baja o lo sube.
      sonar(nombre, t, vol = 1) {
        bus = maestro;
        if (vol !== 1) { bus = ctx.createGain(); bus.gain.value = vol; bus.connect(maestro); }
        R[nombre](t);
        bus = maestro;
      },
    };
  }
  const NOMBRES = ['ganar', 'victoria', 'perder', 'empatar', 'salvado', 'carta', 'flip', 'ficha', 'moneda', 'turno', 'tic', 'comprar', 'usar', 'tienda', 'golpe', 'robo', 'clic', 'roce'];

  // ---------- reproducción (solo en el navegador) ----------
  let ctx = null, mot = null;
  let activo = true;
  try { activo = localStorage.getItem('bj_sonido') !== '0'; } catch (e) { /* sin memoria */ }
  const hace = {};   // (cuándo sonó cada cosa por última vez: para no apilar el mismo sonido muchas veces en un instante)

  // iPhone: el audio web queda mudo si el interruptor lateral está en silencio, salvo que la página reproduzca un <audio> de verdad. Se reproduce uno en silencio y en bucle.
  let silencio = null;
  function audioDeSilencio() {
    if (silencio || typeof Audio === 'undefined') return;
    try {
      const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer), t = (o, x) => { for (let i = 0; i < x.length; i++) b[o + i] = x.charCodeAt(i); };
      t(0, 'RIFF'); v.setUint32(4, 36 + n, true); t(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); t(36, 'data'); v.setUint32(40, n, true);
      b.fill(128, 44);
      let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      silencio = new Audio('data:audio/wav;base64,' + btoa(bin));
      silencio.loop = true; silencio.setAttribute('playsinline', ''); silencio.volume = 0.01;
    } catch (e) { silencio = null; }
  }

  // El navegador no deja sonar nada hasta que la persona toca la pantalla una vez: ahí se crea el audio (en iPhone solo cuenta el final del toque).
  function desbloquear() {
    if (typeof window === 'undefined') return;
    try {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* no existe */ }
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        mot = motor(ctx);
        ctx.onstatechange = () => { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); };
      }
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      audioDeSilencio();
      if (silencio && silencio.paused) { const p = silencio.play(); if (p && p.catch) p.catch(() => {}); }
      if (!ctx._probado) { ctx._probado = true; const bf = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = bf; src.connect(ctx.destination); src.start(0); }
    } catch (e) { ctx = null; mot = null; }
  }

  // `tono` ya no se usa (se conserva por compatibilidad); `volDb` baja o sube el volumen de este sonido.
  function play(nombre, tono = 1, volDb = 0) {
    if (!activo || !ctx || !mot || !NOMBRES.includes(nombre)) return;
    if (ctx.state !== 'running') { try { ctx.resume().catch(() => {}); } catch (e) { /* nada */ } return; }
    const ahora = performance.now();
    if (hace[nombre] && ahora - hace[nombre] < 25) return;
    hace[nombre] = ahora;
    try { mot.sonar(nombre, ctx.currentTime + 0.01, Math.pow(10, volDb / 20)); } catch (e) { /* si algo falla, simplemente no suena */ }
  }

  function setActivo(v) { activo = !!v; try { localStorage.setItem('bj_sonido', activo ? '1' : '0'); } catch (e) { /* sin memoria */ } if (activo) desbloquear(); }

  return { play, desbloquear, setActivo, get activo() { return activo; }, NOMBRES, motor };
})();

if (typeof module !== 'undefined') module.exports = Sonido;
