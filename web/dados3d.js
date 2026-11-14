'use strict';
// Los dados del diez mil: dados y mesa de cubitos de Lucid Stakes (la mesa y los dados del casino), dibujados en un lienzo 2D sin librerías.
// Es un pequeño renderizador de cubitos con la misma cámara que el juego (ortogonal, mirando desde arriba a 52 grados), la misma luz, los mismos modelos (dado de 8 x 8 x 8
// cubitos con los puntos hundidos, mesa de cubitos) y la misma caída (fórmula del tiempo de scripts/casino/dice_3d.gd). Se probó en prototipos/dados/.

const D3 = (() => {
  // ---------- constantes de scripts/casino/dice_3d.gd ----------
  const N = 8, VOX = 0.09, HALF = 0.36, TABLE_X = 11.6, TABLE_Z = 5.0, TABLE_VOX = 0.12, DROP = 4.4;
  const PIPS = {
    1: [[0.5, 0.5]],
    2: [[0.27, 0.27], [0.73, 0.73]],
    3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
    4: [[0.27, 0.27], [0.27, 0.73], [0.73, 0.27], [0.73, 0.73]],
    5: [[0.27, 0.27], [0.27, 0.73], [0.5, 0.5], [0.73, 0.27], [0.73, 0.73]],
    6: [[0.27, 0.27], [0.27, 0.5], [0.27, 0.73], [0.73, 0.27], [0.73, 0.5], [0.73, 0.73]],
  };
  const FACES = {
    1: [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
    6: [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    2: [[1, 0, 0], [0, 0, 1], [0, 1, 0]],
    5: [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    3: [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    4: [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  };
  const VELOCIDAD = 1.7;   // (la caída corre más rápido que en el juego: el diez mil pide ritmo)
  const YAWS = [-0.32, 0.2, -0.14, 0.34, -0.24, 0.1];
  const TAU = Math.PI * 2;

  // La pinta de cada tipo de dado (cuerpo, puntos y esquinas). El común es el dado del casino del juego.
  const ESTILOS = {
    normal: { cuerpo: [0.96, 0.93, 0.84], pip: [0.15, 0.09, 0.20], esquina: [0.80, 0.62, 0.25] },
    cargado: { cuerpo: [0.36, 0.20, 0.12], pip: [1.0, 0.86, 0.5], esquina: [0.80, 0.62, 0.25] },
    oro: { cuerpo: [1.0, 0.80, 0.28], pip: [0.36, 0.20, 0.04], esquina: [1.0, 0.95, 0.6] },
    comodin: { cuerpo: [0.58, 0.36, 0.88], pip: [1.0, 1.0, 1.0], esquina: [1.0, 0.85, 0.35] },
    salvavidas: { cuerpo: [0.36, 0.86, 0.56], pip: [0.04, 0.24, 0.12], esquina: [0.95, 1.0, 0.9] },
    espejo: { cuerpo: [0.74, 0.86, 0.96], pip: [0.12, 0.22, 0.38], esquina: [0.55, 0.72, 0.92] },
    pegajoso: { cuerpo: [0.96, 0.62, 0.20], pip: [0.30, 0.12, 0.02], esquina: [1.0, 0.85, 0.35] },
    multiplicador: { cuerpo: [0.20, 0.72, 0.78], pip: [1.0, 1.0, 1.0], esquina: [1.0, 0.85, 0.35] },
    iman: { cuerpo: [0.70, 0.12, 0.20], pip: [0.92, 0.92, 0.95], esquina: [0.80, 0.82, 0.88] },
    banco: { cuerpo: [0.30, 0.45, 0.32], pip: [1.0, 0.88, 0.45], esquina: [0.86, 0.72, 0.30] },
    poker: { cuerpo: [0.14, 0.14, 0.18], pip: [1.0, 0.92, 0.55], esquina: [0.90, 0.20, 0.25] },
    suerte: { cuerpo: [0.30, 0.78, 0.40], pip: [1.0, 0.98, 0.7], esquina: [1.0, 0.85, 0.35] },
    vampiro: { cuerpo: [0.38, 0.06, 0.16], pip: [0.96, 0.90, 0.86], esquina: [0.80, 0.18, 0.28] },
    doble: { cuerpo: [0.88, 0.50, 0.78], pip: [0.30, 0.08, 0.26], esquina: [1.0, 0.82, 0.92] },
    fantasma: { cuerpo: [0.88, 0.90, 0.98], pip: [0.34, 0.38, 0.60], esquina: [0.66, 0.72, 0.92] },
    escalera: { cuerpo: [0.62, 0.42, 0.24], pip: [1.0, 0.92, 0.70], esquina: [0.46, 0.30, 0.16] },
    apostador: { cuerpo: [0.22, 0.24, 0.70], pip: [1.0, 0.86, 0.35], esquina: [0.90, 0.30, 0.30] },
    explosivo: { cuerpo: [0.86, 0.20, 0.18], pip: [1.0, 0.92, 0.5], esquina: [0.20, 0.08, 0.08] },
  };

  // ---------- cámara y luz ----------
  const INCL = 52 * Math.PI / 180;
  const FWD = [0, -Math.sin(INCL), -Math.cos(INCL)];
  const UPV = [0, Math.cos(INCL), -Math.sin(INCL)];
  const HACIA_CAM = [0, Math.sin(INCL), Math.cos(INCL)];
  const MENOS_L = (() => { const a = -58 * Math.PI / 180, b = -28 * Math.PI / 180; const v = [0, Math.sin(a), -Math.cos(a)]; const x = v[0] * Math.cos(b) + v[2] * Math.sin(b), z = -v[0] * Math.sin(b) + v[2] * Math.cos(b); return [-x, -v[1], -z]; })();
  const LUZ = 0.70, AMB = [0.62 * 0.7, 0.58 * 0.7, 0.72 * 0.7];   // (medidos contra capturas del juego)

  // ---------- matemática mínima ----------
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const MI = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function mEje(ax, ang) { const [x, y, z] = norm(ax), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c; return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c]; }
  function mMul(A, B) { const R = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return R; }
  const mVec = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
  function mArco(de, a) { const f = norm(de), t = norm(a), c = dot(f, t); if (c > 0.9999) return MI; if (c < -0.9999) return mEje([1, 0, 0], Math.PI); return mEje(cross(f, t), Math.acos(c)); }
  function orient(v, yaw) { let q = MI; if (v === 6) q = mEje([1, 0, 0], Math.PI); else if (v !== 1) q = mArco(FACES[v][0], [0, 1, 0]); return mMul(mEje([0, 1, 0], yaw), q); }
  function h(x, y, z, k) { let v = (BigInt(x) * 73856093n) ^ (BigInt(y) * 19349663n) ^ (BigInt(z) * 83492791n) ^ (BigInt(k) * 2654435761n); if (v < 0n) v = -v; return Number(v % 1000n) / 1000; }
  function rng(semilla) { let a = (semilla | 0) + 0x6D2B79F5; return (lo, hi) => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; return lo === undefined ? r : lo + r * (hi - lo); }; }

  // ---------- los modelos ----------
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const clave = (x, y, z) => x + ',' + y + ',' + z;
  const ejesDe = d => (d[1] !== 0 ? [[1, 0, 0], [0, 0, 1]] : (d[2] !== 0 ? [[1, 0, 0], [0, 1, 0]] : [[0, 1, 0], [0, 0, 1]]));

  function voxelesDado(est) {
    const NN = est.n || N, vox = new Map(), c = est.cuerpo;
    for (let x = 0; x < NN; x++) for (let y = 0; y < NN; y++) for (let z = 0; z < NN; z++) {
      const bordes = (x === 0 || x === NN - 1 ? 1 : 0) + (y === 0 || y === NN - 1 ? 1 : 0) + (z === 0 || z === NN - 1 ? 1 : 0);
      const tono = 1 - (bordes >= 2 ? 0.09 : 0) - ((x * 7 + y * 13 + z * 17) % 5) * 0.012;
      let col = [c[0] * tono, c[1] * tono, c[2] * tono];
      if (est.esquina && bordes === 3) col = [est.esquina[0] * tono, est.esquina[1] * tono, est.esquina[2] * tono];
      vox.set(clave(x, y, z), col);
    }
    for (const v in FACES) {
      const [n, u, w] = FACES[v];
      const base = [n[0] > 0 ? NN - 1 : 0, n[1] > 0 ? NN - 1 : 0, n[2] > 0 ? NN - 1 : 0];
      for (let k = 0; k < 3; k++) if (n[k] === 0) base[k] = 0;
      for (const pip of (est.caras ? [] : PIPS[v])) {
        const su = Math.min(Math.max(Math.round(pip[0] * NN) - 1, 0), NN - 2), sw = Math.min(Math.max(Math.round(pip[1] * NN) - 1, 0), NN - 2);
        for (let du = 0; du < 2; du++) for (let dw = 0; dw < 2; dw++) {
          const p = [0, 1, 2].map(k => base[k] + u[k] * (su + du) + w[k] * (sw + dw));
          vox.delete(clave(p[0], p[1], p[2]));
          vox.set(clave(p[0] - n[0], p[1] - n[1], p[2] - n[2]), est.pip);
        }
      }
    }
    if (est.caras) for (const v in FACES) {   // un dado con una cara de color por recurso (Fundación): cada cara se pinta con su dibujo
      const [n, u, w] = FACES[v], cara = est.caras[v - 1];
      const base = [n[0] > 0 ? NN - 1 : 0, n[1] > 0 ? NN - 1 : 0, n[2] > 0 ? NN - 1 : 0];
      for (let k = 0; k < 3; k++) if (n[k] === 0) base[k] = 0;
      const M = NN - 2;
      for (let iu = 1; iu <= M; iu++) for (let iw = 1; iw <= M; iw++) {
        const tono = 1 - ((iu * 7 + iw * 13) % 5) * 0.012;
        let col = cara.cuerpo.map(x => x * tono);
        const ch = cara.fn((iu - 0.5) / M, (iw - 0.5) / M);
        if (ch && cara.pal[ch]) col = cara.pal[ch];
        const p = [0, 1, 2].map(k => base[k] + u[k] * iu + w[k] * iw);
        vox.set(clave(p[0], p[1], p[2]), col);
      }
    }
    return vox;
  }
  function carasDe(vox, lado, desp) {
    const out = [];
    for (const [k, col] of vox) {
      const [x, y, z] = k.split(',').map(Number);
      DIRS.forEach((d, di) => {
        if (vox.has(clave(x + d[0], y + d[1], z + d[2]))) return;
        const [a, b] = ejesDe(d);
        out.push({ c: [(x + 0.5 + d[0] * 0.5) * lado + desp[0], (y + 0.5 + d[1] * 0.5) * lado + desp[1], (z + 0.5 + d[2] * 0.5) * lado + desp[2]], n: di, col, a, b });
      });
    }
    return out;
  }

  // La mesa del casino (tier 2 de _build_table)
  function voxelesMesa() {
    const vox = new Map(), xn = Math.floor(TABLE_X / TABLE_VOX), zn = Math.floor(TABLE_Z / TABLE_VOX);
    const oro = [0.92, 0.74, 0.28];
    const gemaDe = (ex, ez) => ((ex + ez) % 2 === 0 ? [0.25, 0.45, 0.90] : [0.45, 0.20, 0.65]);
    for (let x = 0; x < xn; x++) for (let z = 0; z < zn; z++) {
      const d = Math.min(x, xn - 1 - x, z, zn - 1 - z), rim = d < 2, n = ((x * 31 + z * 17) % 7) * 0.012;
      const bordeC = [0.22 - n, 0.12 - n, 0.07 - n], tapaC = [0.29 - n, 0.16 - n, 0.09 - n], bajoC = [0.17 - n, 0.09 - n, 0.05 - n];
      let fieltro = [0.05 + n, 0.34 + n * 0.8, 0.23 + n];
      if (((x + z) % 14 === 0 || (x - z + 1400) % 14 === 0) && d > 8) fieltro = [0.07, 0.42, 0.29];
      if (rim) { vox.set(clave(x, 0, z), bordeC); vox.set(clave(x, 1, z), d === 1 ? oro : tapaC); }
      else vox.set(clave(x, -1, z), fieltro);
      for (let y = -4; y < -1; y++) vox.set(clave(x, y, z), bajoC);
    }
    for (const [ex, ez] of [[0, 0], [xn - 3, 0], [0, zn - 3], [xn - 3, zn - 3]]) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) vox.set(clave(ex + dx, 2, ez + dz), gemaDe(ex, ez));
    for (const [ex, ez] of [[5, 5], [xn - 8, 5], [5, zn - 8], [xn - 8, zn - 8]]) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) vox.set(clave(ex + dx, 0, ez + dz), dx === 1 && dz === 1 ? gemaDe(ex, ez) : oro);
    return vox;
  }

  // ---------- la caída (throw_state de dice_3d.gd) ----------
  function estadoTiro(i, t, cara, semilla, rest) {
    const r = rng(semilla * 7919 + i * 131 + cara * 17);
    const sx = r(-0.9, 0.9), sz = r(-0.6, 0.6);
    const eje = norm([r(-1, 1), r(-0.4, 0.4), r(-1, 1)]);
    const a0 = TAU * r(2.2, 3.4) * (r() > 0.5 ? 1 : -1);
    const yaw0 = YAWS[i % YAWS.length] + r(-0.25, 0.25);
    const tAterriza = 0.55 + 0.09 * (i % 6), asienta = tAterriza + 0.75;
    let pos, squash = 0;
    if (t < tAterriza) {
      const k = t / tAterriza;
      pos = [rest[0] + sx * (1 - k), HALF + (DROP - HALF) * (1 - k * k), rest[2] + sz * (1 - k)];
    } else {
      const u = t - tAterriza;
      pos = [rest[0] + sx * 0.12 * Math.exp(-u * 3), HALF + Math.abs(Math.sin(u * 9)) * 0.7 * Math.exp(-u * 3.4), rest[2] + sz * 0.1 * Math.exp(-u * 3)];
      squash = 0.2 * Math.exp(-u * 14) * (Math.abs(Math.sin(u * 9)) < 0.35 ? 1 : 0.4);
    }
    const ang = a0 * Math.pow(Math.max(1 - t / asienta, 0), 2);
    const R = mMul(mEje(eje, ang), orient(cara, yaw0));
    const ext = HALF * (Math.abs(R[3]) + Math.abs(R[4]) + Math.abs(R[5]));
    pos[1] += ext - HALF;
    return { pos, R, squash, tAterriza, fin: asienta + 0.05, finalR: orient(cara, yaw0) };
  }

  const CANDADO = ['..###..', '.#...#.', '.#...#.', '#######', '#######', '###.###', '###.###', '#######'];

  // ---------- el sprite plano de un dado (para fichas de tienda, ayuda y jugadores): la cara de arriba con su número ----------
  function sprite(tipo, valor, tam) {
    const est = ESTILOS[tipo] || ESTILOS.normal, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas'); cv.width = Math.round(tam * dpr); cv.height = Math.round(tam * dpr); cv.style.width = tam + 'px'; cv.style.height = tam + 'px'; cv.className = 'dadoSprite';
    const g = cv.getContext('2d'); g.scale(cv.width / 8, cv.height / 8); g.imageSmoothingEnabled = false;
    const col = (c, t = 1) => 'rgb(' + c.map(v => Math.round(Math.min(1, v * t) * 255)).join(',') + ')';
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
      const borde = x === 0 || x === 7 || y === 0 || y === 7, esq = (x === 0 || x === 7) && (y === 0 || y === 7);
      g.fillStyle = esq ? col(est.esquina, 0.9) : col(est.cuerpo, borde ? 0.86 : 1 - ((x * 7 + y * 13) % 5) * 0.012);
      g.fillRect(x, y, 1.02, 1.02);
    }
    g.fillStyle = col(est.pip);
    for (const p of PIPS[valor] || []) {
      const su = Math.min(Math.max(Math.round(p[0] * N) - 1, 0), N - 2), sw = Math.min(Math.max(Math.round(p[1] * N) - 1, 0), N - 2);
      g.fillRect(su, sw, 2, 2);
    }
    return cv;
  }

  // ---------- la escena ----------
  class Escena {
    // `lienzo`: el canvas; `contenedor`: de quien toma el ancho; opciones: { maxAlto }
    constructor(lienzo, contenedor, opciones = {}) {
      this.lienzo = lienzo; this.contenedor = contenedor; this.ctx = lienzo.getContext('2d');
      this.maxAlto = opciones.maxAlto || 9999; this.forzarFila = !!opciones.forzarFila; this.espaciado = opciones.espaciado; this.forzarGrilla = !!opciones.forzarGrilla; this.sinMesa = !!opciones.sinMesa; this.velocidad = opciones.velocidad; this.sombra = opciones.sombra !== false; this.dprMax = opciones.dprMax; this.escalaMax = opciones.escalaMax; this.sinValores = !!opciones.sinValores; this.sombraFiel = !!opciones.sombraFiel;   // (opciones de Fundación: en fila o en dos filas de 3, sin la mesa de fieltro)
      this.mesaCaras = carasDe(voxelesMesa(), TABLE_VOX, [-TABLE_X / 2, 0, -TABLE_Z / 2]);
      this.modelos = {};
      this.dados = [];          // por lugar: { tipo, valor, pos, R, squash, apartado, seleccionado, brillo, anim }
      this.modo = 'fila';
      this.alAterrizar = null; this.alTerminar = null; this.alTocar = null;
      this.anim = 0; this.pantalla = [];
      lienzo.addEventListener('pointerdown', ev => this._toque(ev));
      this.ajustar();
    }
    _modelo(tipo) { if (!this.modelos[tipo]) { const est = ESTILOS[tipo] || ESTILOS.normal, n = est.n || N, lado = VOX * N / n; this.modelos[tipo] = carasDe(voxelesDado(est), lado, [-HALF, -HALF, -HALF]); this.modelos[tipo].lado = lado; } return this.modelos[tipo]; }

    // Los lugares de reposo según cuántos dados hay y cómo es la pantalla (en fila en pantallas anchas; en dos filas en celular).
    _reposo(i, n) {
      if (this.modo === 'fila') { const sp = this.forzarFila ? (this.espaciado || 0.86) : (n <= 5 ? 1.9 : 1.6); return [(i - (n - 1) / 2) * sp, HALF, 0]; }
      const cols = 3, fila = Math.floor(i / cols), enFila = fila === 0 ? Math.min(n, cols) : n - cols;
      const c = i % cols, sp = 1.8;
      return [(c - (enFila - 1) / 2) * sp, HALF, (fila - (n > cols ? 0.5 : 0)) * 1.9];
    }

    // Pone los dados de la mano: `tipos` es la lista de tipos por lugar. Los valores que ya tenían se conservan.
    configurar(tipos) {
      const n = tipos.length;
      this.dados = tipos.map((tipo, i) => {
        const previo = this.dados[i];
        const valor = previo ? previo.valor : 1 + (i % 6);
        const e = previo && previo.tipo === tipo && previo.n === n ? previo : { tipo, n, valor, R: orient(valor, YAWS[i % YAWS.length]), squash: 0, apartado: false, seleccionado: false, anim: null };
        e.tipo = tipo; e.n = n; e.pos = this._reposo(i, n);
        return e;
      });
    }
    // Pone el valor que muestra cada dado en reposo (sin animar).
    mostrar(valores) {
      this.dados.forEach((d, i) => { if (valores[i] !== undefined && valores[i] !== null && !d.anim) { d.mostrarValor = true; if (d.valor !== valores[i]) { d.valor = valores[i]; d.R = orient(valores[i], YAWS[i % YAWS.length]); } } });
    }
    marcar(i, apartado, seleccionado) { const d = this.dados[i]; if (d) { d.apartado = !!apartado; d.seleccionado = !!seleccionado; } }
    quitarMarcas() { this.dados.forEach(d => { d.apartado = false; d.seleccionado = false; }); }

    // Tira los dados de los lugares `lugares` (con los valores `valores`, uno por lugar); `semilla` hace distinta cada tirada.
    tirar(lugares, valores, semilla) {
      const t0 = performance.now();
      lugares.forEach((i, k) => {
        const d = this.dados[i]; if (!d) return;
        d.valor = valores[k]; d.mostrarValor = true; d.apartado = false; d.seleccionado = false;
        d.anim = { t0, semilla, aterrizo: false };
      });
      this._animar();
    }
    hayTiro() { return this.dados.some(d => d.anim); }
    _animar() { if (!this.anim) this.anim = requestAnimationFrame(() => this._cuadro()); }
    _cuadro() {
      this.anim = 0;
      const ahora = performance.now();
      let sigue = false;
      this.dados.forEach((d, i) => {
        if (!d.anim) return;
        const t = (ahora - d.anim.t0) / 1000 * (this.velocidad || VELOCIDAD);
        const s = estadoTiro(i, t, d.valor, d.anim.semilla, this._reposo(i, d.n));
        if (t >= s.tAterriza && !d.anim.aterrizo) { d.anim.aterrizo = true; if (this.alAterrizar) this.alAterrizar(i); }
        if (t < s.fin) { d.pos = s.pos; d.R = s.R; d.squash = s.squash; sigue = true; }
        else { d.pos = this._reposo(i, d.n); d.R = s.finalR; d.squash = 0; d.anim = null; }
      });
      this.dibujar();
      if (sigue) this._animar();
      else if (this.alTerminar) { const f = this.alTerminar; f(); }
    }

    ajustar() {
      const dpr = Math.min(window.devicePixelRatio || 1, this.dprMax || 2), ancho = Math.max(this.contenedor.clientWidth || (window.innerWidth - 24), 200);
      this.modo = this.forzarGrilla ? 'grilla' : ((this.forzarFila || ancho >= 560) ? 'fila' : 'grilla');
      const nD = Math.max(this.dados.length, 1), vw = this.modo === 'fila' ? (this.forzarFila ? Math.max((nD - 1) * (this.espaciado || 0.86) + 1.5, 2.2) : 9.75) : 5.6, vh = this.modo === 'fila' ? (this.forzarFila ? 2.7 : 3.22) : 4.4;
      this.sc = Math.min(ancho / vw, this.escalaMax || 118, this.maxAlto / vh);
      this.W = Math.round(this.sc * vw); this.H = Math.round(this.sc * vh);
      this.lienzo.style.width = this.W + 'px'; this.lienzo.style.height = this.H + 'px';
      this.lienzo.width = Math.round(this.W * dpr); this.lienzo.height = Math.round(this.H * dpr);
      this.dpr = dpr; this.ox = this.W / 2; this.oy = this.H / 2 + (this.modo === 'grilla' ? this.sc * 0.2 : (this.forzarFila ? this.sc * 0.4 : 0));
      this.dados.forEach((d, i) => { if (!d.anim) d.pos = this._reposo(i, d.n); });
      this.fondo = this.sinMesa ? (() => { const c = document.createElement('canvas'); c.width = this.lienzo.width; c.height = this.lienzo.height; return c; })() : this._dibujarMesa();
      this.dibujar();
    }
    proy(p) { return [this.ox + p[0] * this.sc, this.oy - (p[1] * UPV[1] + p[2] * UPV[2]) * this.sc]; }
    color(col, nW, t = 1) {
      const f = Math.max(0, dot(nW, MENOS_L)) * LUZ;
      const c = [0, 1, 2].map(k => Math.round(255 * Math.min(1, Math.max(0, col[k] * (AMB[k] + f) * t))));
      return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }
    _poli(ctx, p, c) { ctx.fillStyle = c; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.lineTo(p[6], p[7]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    _dibujarMesa() {
      const cv = document.createElement('canvas'); cv.width = this.lienzo.width; cv.height = this.lienzo.height;
      const ctx = cv.getContext('2d'); ctx.scale(this.dpr, this.dpr); ctx.lineWidth = 0.7;
      const items = [], h2 = TABLE_VOX / 2;
      for (const f of this.mesaCaras) {
        if (f.n !== 2 && f.n !== 4) continue;   // (la cámara solo ve las caras de arriba y las de adelante)
        const hw = f.a.map(v => v * h2), hb = f.b.map(v => v * h2), c = f.c;
        const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => this.proy([c[0] + hw[0] * s + hb[0] * t, c[1] + hw[1] * s + hb[1] * t, c[2] + hw[2] * s + hb[2] * t]));
        items.push({ d: dot(c, FWD), p: [P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]], c: this.color(f.col, DIRS[f.n]) });
      }
      items.sort((a, b) => b.d - a.d);
      for (const it of items) this._poli(ctx, it.p, it.c);
      return cv;
    }

    dibujar() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.lienzo.width, this.lienzo.height);
      ctx.drawImage(this.fondo, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.lineWidth = 0.7; ctx.lineJoin = 'round';
      // las sombras (y el aro dorado de los dados elegidos)
      this.dados.forEach(d => {
        const rec = this.sombra;   // (los dados llevan su sombra, salvo en las escenas que la desactivan: ahí solo se ve el aro dorado si están elegidos)
        if (!d.seleccionado && !rec) return;
        const alto = Math.max(d.pos[1] - HALF - (d.apartado || d.seleccionado ? 0.15 : 0), 0), cerca = 1 - Math.min(Math.max(alto / DROP, 0), 1), m = 0.5 * (0.55 + 0.7 * cerca);
        let P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => this.proy([d.pos[0] + s * m, 0.012, d.pos[2] + t * m]));
        if (this.sombraFiel) {   // la sombra es la silueta del cubo (girado como esté) proyectada hacia abajo, sobre el plano de la mesa y con su perspectiva
          const h = this._modelo(d.tipo).lado / 2, pts = [];
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const v = mVec(d.R, [sx * h, sy * h, sz * h]); pts.push([d.pos[0] + v[0], d.pos[2] + v[2]]); }
          pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
          const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), inf = [], sup = [];
          for (const p of pts) { while (inf.length >= 2 && cruz(inf[inf.length - 2], inf[inf.length - 1], p) <= 0) inf.pop(); inf.push(p); }
          for (const p of pts.slice().reverse()) { while (sup.length >= 2 && cruz(sup[sup.length - 2], sup[sup.length - 1], p) <= 0) sup.pop(); sup.push(p); }
          P = inf.slice(0, -1).concat(sup.slice(0, -1)).map(([x, z]) => this.proy([x, 0.012, z]));
        }
        ctx.fillStyle = d.seleccionado ? 'rgba(242,201,76,' + (rec ? (0.25 + 0.2 * cerca).toFixed(3) : '0.08') + ')' : 'rgba(0,0,0,' + (0.1 + 0.34 * cerca).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); P.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fill();
        if (d.seleccionado) { ctx.strokeStyle = 'rgba(255,224,120,.95)'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 0.7; }
      });
      const items = [], h2 = VOX / 2;
      this.pantalla = [];
      this.dados.forEach((d, i) => {
        const R = d.R, S = [1 + d.squash * 0.7, 1 - d.squash, 1 + d.squash * 0.7];
        const levanta = d.anim ? 0 : (d.seleccionado ? 0.18 : (d.apartado ? 0.1 : 0));
        const pos = [d.pos[0], d.pos[1] + levanta, d.pos[2]];
        const tinte = d.seleccionado ? 1.22 : (d.apartado ? 0.78 : 1);
        const normales = DIRS.map(v => mVec(R, v)), vis = normales.map(n => dot(n, HACIA_CAM) > 0.001);
        const ra = [], rb = [], mod = this._modelo(d.tipo), h2d = mod.lado / 2;
        DIRS.forEach((v, di) => { const [a, b] = ejesDe(v); ra[di] = mVec(R, a).map(x => x * h2d); rb[di] = mVec(R, b).map(x => x * h2d); });
        for (const f of mod) {
          if (!vis[f.n]) continue;
          const c0 = mVec(R, f.c), A = ra[f.n], B = rb[f.n];
          const cW = [c0[0] * S[0] + pos[0], c0[1] * S[1] + pos[1], c0[2] * S[2] + pos[2]];
          const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => this.proy([(c0[0] + A[0] * s + B[0] * t) * S[0] + pos[0], (c0[1] + A[1] * s + B[1] * t) * S[1] + pos[1], (c0[2] + A[2] * s + B[2] * t) * S[2] + pos[2]]));
          items.push({ d: dot(cW, FWD), p: [P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]], c: this.color(f.col, normales[f.n], tinte) });
        }
        const centro = this.proy([pos[0], pos[1], pos[2]]);
        this.pantalla[i] = { x: centro[0], y: centro[1], r: this.sc * 0.5 };
      });
      items.sort((a, b) => b.d - a.d);
      for (const it of items) this._poli(ctx, it.p, it.c);
      // el número de cada dado, debajo, cuando ya terminó de caer (las caras inclinadas cuestan de leer)
      const px = Math.max(11, Math.round(this.sc * 0.24));
      ctx.font = '700 ' + px + 'px "Lucid Stakes", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      this.dados.forEach((d, i) => {
        if (d.anim || this.sinValores || !this.pantalla[i] || !d.mostrarValor || (ESTILOS[d.tipo] && ESTILOS[d.tipo].caras)) return;
        const c = this.pantalla[i], y = c.y + this.sc * 0.66;
        ctx.strokeStyle = 'rgba(8,4,16,.85)'; ctx.strokeText(String(d.valor), c.x, y);
        ctx.fillStyle = d.apartado ? 'rgb(140,150,140)' : 'rgb(255,243,196)'; ctx.fillText(String(d.valor), c.x, y);
      });
      ctx.lineWidth = 0.7;
      // el candado de los dados apartados
      this.dados.forEach((d, i) => {
        if (!d.apartado || d.anim) return;
        const c = this.pantalla[i], u = Math.max(2, this.sc * 0.045), x0 = c.x - 3.5 * u, y0 = c.y - this.sc * 0.95;
        CANDADO.forEach((fila, j) => { for (let k = 0; k < 7; k++) if (fila[k] === '#') { ctx.fillStyle = j < 3 ? 'rgb(240,230,150)' : (j > 4 && k === 3 ? 'rgb(60,40,20)' : 'rgb(110,240,140)'); ctx.fillRect(x0 + k * u, y0 + j * u, u + 0.4, u + 0.4); } });
      });
    }

    _toque(ev) {
      if (!this.alTocar) return;
      const r = this.lienzo.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      let mejor = -1, dm = Infinity;
      this.pantalla.forEach((p, i) => { if (!p) return; const dd = Math.hypot(p.x - x, p.y - y); if (dd < p.r * 1.15 && dd < dm) { dm = dd; mejor = i; } });
      if (mejor >= 0) this.alTocar(mejor);
    }
  }

  return { Escena, sprite, ESTILOS, orient, estadoTiro, FACES, PIPS, voxelesDado, mVec, DIRS, HALF };
})();

if (typeof module !== 'undefined') module.exports = D3;
