'use strict';
// El arte de Fundación en píxeles planos y pegados (sin espacios ni biseles): los hexágonos (32 de ancho), las fichas de número, las piezas, el bandido, los dados de recursos (15 x 15) y el icono del juego.
// Lo usan la pantalla de la partida (fundacion.js) y las pantallas de entrada (mesas.js). Los dibujos son funciones del tamaño: se calculan una vez y se guardan.

const FU_ARTE = (() => {
  const css = V.css;
  const BEIGE = [0.96, 0.93, 0.84], TINTA = [0.15, 0.09, 0.20];
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const fr = (g, x, y, w, h, col) => { g.fillStyle = css(col); g.fillRect(x, y, w, h); };

  // ---------- formas en coordenadas de 0 a 1 ----------
  const circ = (u, v, cx, cy, r) => (u - cx) * (u - cx) + (v - cy) * (v - cy) <= r * r;
  const box = (u, v, x0, y0, x1, y1) => u >= x0 && u < x1 && v >= y0 && v < y1;
  const elip = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
  function poly(P, u, v) { let d = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > v) !== (P[j][1] > v)) && (u < (P[j][0] - P[i][0]) * (v - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) d = !d; } return d; }
  const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h = (h ^ (h >>> 13)) >>> 0; return (Math.imul(h, 1274126177) >>> 0) % 1000; };

  // ---------- los dibujos de las caras de los dados de recursos ----------
  function madera(u, v) { if (box(u, v, 0.43, 0.82, 0.57, 0.98)) return 'k'; for (const [ay, by, hw] of [[0.04, 0.38, 0.24], [0.22, 0.60, 0.34], [0.40, 0.84, 0.44]]) { if (v >= ay && v < by) { const w = hw * (v - ay) / (by - ay); if (Math.abs(u - 0.5) <= w) return u < 0.46 ? 'l' : (u < 0.56 ? 'm' : 'd'); } } return null; }
  function lana(u, v) { if (box(u, v, 0.32, 0.72, 0.41, 0.94) || box(u, v, 0.60, 0.72, 0.69, 0.94)) return 'k'; if (circ(u, v, 0.84, 0.50, 0.11)) return circ(u, v, 0.87, 0.47, 0.03) ? 'w' : 'k'; for (const [cx, cy, r] of [[0.30, 0.52, 0.19], [0.48, 0.40, 0.22], [0.66, 0.52, 0.19], [0.48, 0.62, 0.20]]) if (circ(u, v, cx, cy, r)) return v < 0.55 ? 'w' : 'l'; return null; }
  function trigo(u, v) { if (box(u, v, 0.46, 0.34, 0.54, 0.98)) return 'k'; for (const y0 of [0.26, 0.44, 0.62]) for (const s of [-1, 1]) { const cx = 0.5 + s * 0.14, cy = y0 + 0.06; if (((u - cx) / 0.10) ** 2 + ((v - cy) / 0.085) ** 2 <= 1) return s < 0 ? 'l' : 'm'; } if (((u - 0.5) / 0.085) ** 2 + ((v - 0.14) / 0.13) ** 2 <= 1) return 'm'; return null; }
  function oro(u, v) { const r = Math.hypot(u - 0.5, v - 0.5); if (r > 0.43) return null; if (r > 0.34) return 'd'; if (Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.15) return 'd'; return u + v < 0.92 ? 'l' : 'm'; }
  function iso(u, v, ox, oy, s) { const a = (u - ox) / s, b = (v - oy) / s; if (poly([[0.10, 0.40], [0.30, 0.22], [0.92, 0.22], [0.72, 0.40]], a, b)) return 'l'; if (poly([[0.10, 0.40], [0.72, 0.40], [0.72, 0.76], [0.10, 0.76]], a, b)) return 'm'; if (poly([[0.72, 0.40], [0.92, 0.22], [0.92, 0.58], [0.72, 0.76]], a, b)) return 'd'; return null; }
  const ladrillo = (u, v) => iso(u, v, 0, 0.10, 1);
  function mineral(u, v) { for (const [cx, cy, r] of [[0.33, 0.62, 0.27], [0.72, 0.68, 0.21], [0.52, 0.30, 0.19]]) { const d = Math.hypot(u - cx, v - cy); if (d <= r) { if (d > r * 0.86) return 'k'; const t = ((u - cx) + (v - cy)) / r; return t < -0.45 ? 'l' : (t > 0.55 ? 'd' : 'm'); } } return null; }
  const SIMB = { madera, ladrillo, lana, trigo, mineral, oro };
  const RECURSOS = ['madera', 'ladrillo', 'lana', 'trigo', 'mineral', 'oro'];   // el valor de cada cara (0 a 5): el dado 3D muestra el valor + 1
  const EST = {
    madera: { cuerpo: [0.18, 0.49, 0.23], esquina: [0.55, 0.80, 0.40], pal: { l: [0.80, 0.96, 0.68], m: [0.56, 0.84, 0.44], d: [0.34, 0.62, 0.27], k: [0.60, 0.42, 0.22] } },
    ladrillo: { cuerpo: [0.66, 0.28, 0.14], esquina: [0.95, 0.60, 0.38], pal: { l: [1.0, 0.76, 0.52], m: [0.90, 0.46, 0.23], d: [0.42, 0.16, 0.07] } },
    lana: { cuerpo: [0.55, 0.80, 0.40], esquina: [0.85, 0.97, 0.75], pal: { w: [1, 1, 1], l: [0.78, 0.85, 0.90], k: [0.16, 0.14, 0.20] } },
    trigo: { cuerpo: [0.89, 0.74, 0.22], esquina: [1.0, 0.93, 0.55], pal: { k: [0.50, 0.33, 0.04], m: [0.72, 0.45, 0.06], l: [1.0, 0.93, 0.55] } },
    mineral: { cuerpo: [0.30, 0.34, 0.44], esquina: [0.58, 0.63, 0.74], pal: { l: [0.90, 0.92, 0.96], m: [0.68, 0.71, 0.78], d: [0.46, 0.49, 0.58], k: [0.14, 0.16, 0.24] } },
    oro: { cuerpo: [1.0, 0.80, 0.28], esquina: [1.0, 0.95, 0.6], pal: { d: [0.60, 0.36, 0.04], m: [1.0, 0.93, 0.55], l: [1.0, 0.98, 0.82] } }
  };
  // El dado de recursos en 3D: la escena de los dados del diez mil con un modelo de 15 cubitos de lado (marco de marfil y una cara de color por recurso).
  D3.ESTILOS.recurso = { n: 15, cuerpo: [0.96, 0.93, 0.84], esquina: [0.80, 0.62, 0.25], caras: RECURSOS.map(k => ({ cuerpo: EST[k].cuerpo, pal: EST[k].pal, fn: SIMB[k] })) };
  D3.ESTILOS.recursoM = Object.assign({}, D3.ESTILOS.recurso, { n: 9 });   // (menos cubitos por lado: más liviano en el celular)
  const cacheD = {};
  function dado2d(k) {   // el mismo dado de frente (15 x 15), para las tarjetas de costo
    if (cacheD[k]) return cacheD[k];
    const N = 15, est = EST[k], c = cvs(N, N), g = c.getContext('2d'), f = (x, y, col) => fr(g, x, y, 1, 1, col);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const bd = x === 0 || x === N - 1 || y === 0 || y === N - 1, es = (x === 0 || x === N - 1) && (y === 0 || y === N - 1);
      const t = es ? 0.9 : (bd ? 0.86 : 1 - ((x * 7 + y * 13) % 5) * 0.012), b = es ? est.esquina : est.cuerpo;
      f(x, y, [b[0] * t, b[1] * t, b[2] * t]);
    }
    const M = N - 2; for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) { const ch = SIMB[k]((x + 0.5) / M, (y + 0.5) / M); if (ch && est.pal[ch]) f(x + 1, y + 1, est.pal[ch]); }
    return cacheD[k] = c;
  }

  // ---------- los hexágonos (32 de ancho) ----------
  const PH = {
    bosque: { o: [0.05, 0.20, 0.08], b: [0.15, 0.42, 0.20], h: [0.24, 0.54, 0.28], s: [0.10, 0.32, 0.15], l: [0.42, 0.80, 0.38], m: [0.20, 0.60, 0.27], d: [0.06, 0.30, 0.12], k: [0.40, 0.24, 0.10] },
    colinas: { o: [0.34, 0.13, 0.05], b: [0.66, 0.29, 0.13], h: [0.82, 0.42, 0.22], s: [0.50, 0.21, 0.09], a: [0.97, 0.72, 0.42], a2: [1.0, 0.84, 0.58], b2: [0.95, 0.60, 0.34], c: [0.62, 0.28, 0.12], c2: [0.78, 0.40, 0.20], z: [0.97, 0.84, 0.62], n: [0.36, 0.15, 0.06] },
    pastos: { o: [0.18, 0.40, 0.09], b: [0.46, 0.76, 0.30], h: [0.60, 0.86, 0.44], s: [0.36, 0.64, 0.22], w: [0.99, 0.99, 0.96], l: [0.80, 0.84, 0.88], k: [0.18, 0.17, 0.20], g: [0.28, 0.56, 0.16] },
    campos: { o: [0.50, 0.36, 0.04], b: [0.89, 0.74, 0.22], h: [0.97, 0.86, 0.45], s: [0.76, 0.60, 0.12], k: [0.50, 0.33, 0.04], m: [0.74, 0.46, 0.06], l: [1.0, 0.93, 0.55] },
    montana: { o: [0.22, 0.25, 0.32], b: [0.46, 0.51, 0.60], h: [0.60, 0.65, 0.74], s: [0.37, 0.42, 0.51], l: [0.74, 0.79, 0.88], p: [0.32, 0.36, 0.46], w: [0.98, 0.99, 1.0] },
    desierto: { o: [0.52, 0.42, 0.22], b: [0.89, 0.80, 0.55], h: [0.96, 0.90, 0.70], s: [0.78, 0.68, 0.42], d: [0.81, 0.69, 0.41], c: [0.22, 0.52, 0.24], e: [0.13, 0.37, 0.15] }
  };
  const colocar = (lista, fn, u, v) => { for (const [cx, cy, s] of lista) { const a = (u - cx) / s + 0.5, b = (v - cy) / s + 0.5; if (a >= 0 && a < 1 && b >= 0 && b < 1) { const c = fn(a, b); if (c) return c; } } return null; };
  function lomas(u, v) { for (const [cx, base, rx, ry, c] of [[0.64, 0.98, 0.62, 0.40, 'c'], [0.28, 0.78, 0.50, 0.40, 'b'], [0.76, 0.66, 0.48, 0.36, 'a']]) { if (v <= base && elip(u, v, cx, base, rx, ry)) { if (!elip(u, v - 0.035, cx, base, rx, ry)) return 'n'; return ((u - cx) / rx + (v - base) / ry) < -0.95 ? c + '2' : c; } } return 'z'; }
  const MOT = {
    bosque: (u, v) => colocar([[0.30, 0.31, 0.32], [0.70, 0.29, 0.30], [0.27, 0.70, 0.30], [0.72, 0.72, 0.32]], madera, u, v),
    colinas: lomas,
    pastos: (u, v, i, j) => colocar([[0.28, 0.30, 0.30], [0.72, 0.30, 0.28], [0.50, 0.80, 0.30]], lana, u, v) || (hash(i, j) < 28 ? 'g' : null),
    campos: (u, v) => colocar([[0.24, 0.34, 0.46], [0.76, 0.34, 0.46], [0.50, 0.80, 0.46]], trigo, u, v),
    montana: (u, v) => { const pico = (ax, ay, by, hw) => { if (v < ay || v >= by) return null; const w = hw * (v - ay) / (by - ay); if (Math.abs(u - ax) > w) return null; if (v < ay + (by - ay) * 0.30) return 'w'; return u < ax ? 'l' : 'p'; }; return pico(0.38, 0.20, 0.72, 0.30) || pico(0.70, 0.34, 0.76, 0.24); },
    desierto: (u, v) => {
      if (box(u, v, 0.24, 0.30, 0.31, 0.64) || box(u, v, 0.15, 0.40, 0.31, 0.46) || box(u, v, 0.15, 0.34, 0.20, 0.46) || box(u, v, 0.31, 0.46, 0.40, 0.52) || box(u, v, 0.35, 0.38, 0.40, 0.52)) return u < 0.28 ? 'c' : 'e';
      const d = v - (0.62 + 0.05 * Math.sin(u * 9)); if (d > 0 && d < 0.05) return 'd';
      const d2 = v - (0.84 + 0.04 * Math.sin(u * 7 + 1)); if (d2 > 0 && d2 < 0.04) return 'd';
      return null;
    }
  };
  const WD = 32, HT = Math.round(WD * 1.1547), PASO = 28;   // ancho y alto del hexágono y paso entre filas (en píxeles de arte)
  function ficha(g, cx, cy, Rc, n) {
    for (let j = -Rc; j <= Rc; j++) for (let i = -Rc; i <= Rc; i++) { const d = Math.hypot(i, j); if (d > Rc + 0.3) continue; fr(g, cx + i, cy + j, 1, 1, d > Rc - 1.0 ? [0.45, 0.34, 0.18] : BEIGE); }
    const l = V.celdas(String(n)), rojo = n === 6 || n === 8, w = l.ancho, x0 = Math.round(cx + 0.5 - w / 2), y0 = Math.round(cy + 0.5 - 5.5);
    l.celdas.forEach(p => fr(g, x0 + p[0], y0 + p[1], 1, 1, rojo ? [0.78, 0.15, 0.12] : TINTA));
  }
  const cacheA = {};
  // El borde del hexágono solo (el interior queda transparente): sirve para marcar un terreno sin tapar lo que hay encima.
  function aroHex(col, rw) {
    const key = col.join(',') + '|' + rw; if (cacheA[key]) return cacheA[key];
    const c = cvs(WD, HT), g = c.getContext('2d'), ins = (x, y) => { const a = x / WD, b = y / HT; return a >= 0 && a <= 1 && b >= 0 && b <= 1 && b >= 0.5 * Math.abs(a - 0.5) && b <= 1 - 0.5 * Math.abs(a - 0.5); };
    for (let j = 0; j < HT; j++) for (let i = 0; i < WD; i++) { const x = i + 0.5, y = j + 0.5; if (!ins(x, y)) continue; if (!(ins(x - rw, y) && ins(x + rw, y) && ins(x, y - rw) && ins(x, y + rw))) fr(g, i, j, 1, 1, col); }
    return cacheA[key] = c;
  }
  const cacheT = {};
  // op: { rim: color del borde, rimW: grosor, dim: oscurecido }
  function tile(tipo, n, op) {
    op = op || {}; const key = tipo + '|' + n + '|' + (op.rim ? 'R' : '') + (op.dim ? 'D' : ''); if (cacheT[key]) return cacheT[key];
    const c = cvs(WD, HT), g = c.getContext('2d'), P = PH[tipo], mot = MOT[tipo], rw = op.rimW || 1.2;
    const ins = (x, y) => { const a = x / WD, b = y / HT; return a >= 0 && a <= 1 && b >= 0 && b <= 1 && b >= 0.5 * Math.abs(a - 0.5) && b <= 1 - 0.5 * Math.abs(a - 0.5); };
    for (let j = 0; j < HT; j++) for (let i = 0; i < WD; i++) {
      const x = i + 0.5, y = j + 0.5; if (!ins(x, y)) continue;
      let col;
      if (!(ins(x - rw, y) && ins(x + rw, y) && ins(x, y - rw) && ins(x, y + rw))) col = op.rim || P.o;
      else { const ch = mot(x / WD, y / HT, i, j) || (!ins(x - 2.4, y - 2.4) ? 'h' : (!ins(x + 2.4, y + 2.4) ? 's' : 'b')); col = P[ch] || P.b; }
      fr(g, i, j, 1, 1, col);
    }
    if (n) ficha(g, Math.floor(WD / 2), Math.floor(HT / 2), 6, n);
    if (op.dim) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(8,6,20,.58)'; g.fillRect(0, 0, WD, HT); }
    return cacheT[key] = c;
  }

  // ---------- las piezas ----------
  const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
  const set = (g, x, y, ch) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch; };
  const rect = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, ch); };
  const tri = (g, cx, y0, h) => { for (let k = 0; k < h; k++) for (let x = cx - k; x <= cx + k; x++) set(g, x, y0 + k, k > 0 && x === cx - k ? 'L' : (k > 0 && x === cx + k ? 'R' : 'r')); };   // techo a dos aguas: luz a la izquierda, sombra a la derecha
  function casaF() { const g = grid(11, 10); tri(g, 5, 0, 6); rect(g, 1, 6, 9, 9, 'w'); rect(g, 9, 6, 9, 9, 'W'); rect(g, 2, 7, 3, 8, 'v'); rect(g, 7, 7, 8, 8, 'v'); rect(g, 4, 7, 6, 9, 'd'); return g.map(r => r.join('')); }
  function ciudadF() {
    const g = grid(15, 14); tri(g, 7, 0, 4); set(g, 7, 0, 'y'); rect(g, 5, 4, 9, 13, 'w'); rect(g, 9, 4, 9, 13, 'W'); [[6, 6], [8, 6], [6, 9], [8, 9]].forEach(([x, y]) => set(g, x, y, 'v')); rect(g, 7, 11, 7, 13, 'd');
    tri(g, 2, 6, 3); rect(g, 0, 9, 4, 13, 'w'); rect(g, 4, 9, 4, 13, 'W'); set(g, 1, 11, 'v'); set(g, 3, 11, 'v'); rect(g, 2, 12, 2, 13, 'd');
    tri(g, 12, 6, 3); rect(g, 10, 9, 14, 13, 'w'); rect(g, 14, 9, 14, 13, 'W'); set(g, 11, 11, 'v'); set(g, 13, 11, 'v'); rect(g, 12, 12, 12, 13, 'd');
    return g.map(r => r.join(''));
  }
  const mulC = (c, k) => c.map(v => Math.min(1, v * k)), luzC = c => c.map(v => Math.min(1, v * 1.22 + 0.10));
  const palCasa = c => ({ r: c, R: mulC(c, 0.58), L: luzC(c), w: [0.97, 0.93, 0.82], W: [0.74, 0.66, 0.52], v: [0.50, 0.76, 0.98], d: [0.40, 0.22, 0.09], y: [0.98, 0.82, 0.25], m: [0.84, 0.88, 0.95], M: [0.55, 0.61, 0.74], n: [0.27, 0.29, 0.40], e: [0.10, 0.07, 0.16], s: [0.96, 0.78, 0.60], h: [0.22, 0.15, 0.36], H: [0.40, 0.30, 0.60], x: [1, 0.42, 0.36] });
  function deFilas(filas, pal) { const c = cvs(filas[0].length, filas.length), g = c.getContext('2d'); filas.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== '.' && pal[ch]) fr(g, x, y, 1, 1, pal[ch]); })); return c; }
  // Contorno oscuro de un píxel, pegado a la pieza (el mismo tono de los bordes de los hexágonos).
  function conBorde(src) {
    const w = src.width + 2, h = src.height + 2, c = cvs(w, h), g = c.getContext('2d'), t = cvs(w, h), tg = t.getContext('2d');
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tg.drawImage(src, 1 + dx, 1 + dy);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgb(18,10,36)'; tg.fillRect(0, 0, w, h);
    g.drawImage(t, 0, 0); g.drawImage(src, 1, 1); return c;
  }
  const cachePz = {};
  const memo = (k, f) => cachePz[k] || (cachePz[k] = f());
  const casa = c => memo('casa' + c, () => conBorde(deFilas(casaF(), palCasa(c))));
  const ciudad = c => memo('ciudad' + c, () => conBorde(deFilas(ciudadF(), palCasa(c))));
  const camino = c => memo('camino' + c, () => deFilas(['eeeeeeeeeeeeee', 'kkkkkkkkkkkkkk', 'kkkkkkkkkkkkkk', 'eeeeeeeeeeeeee'], { e: [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55], k: c }));
  const CAB = ['....r....', '...rr....', '..mmmmm..', '.mmmmmmM.', '.mmeeemM.', '.mmmmmmM.', '..MMMMM..', '.rrrrrrr.', '.rrryrrr.', '.rrrrrrr.', '..MM.MM..', '..nn.nn..'];
  const caballero = c => memo('cab' + c, () => conBorde(deFilas(CAB, palCasa(c))));
  const BAN = ['...hhh...', '..hhhhh..', '.hhHHHhh.', '.hhesehh.', '.hhssshh.', '..hxxxh..', '.hhhhhhh.', 'hhhhhhhhH', 'hhhhhhhhH', '.hhhhhhH.', '.hh...hh.', '.nn...nn.'];
  const bandido = () => memo('bandido', () => conBorde(deFilas(BAN, palCasa([0.5, 0.5, 0.5]))));
  const CANDADO = ['.###.', '#...#', '#...#', '#####', '##.##', '#####'];

  // ---------- el icono del juego: un pueblo y una ciudad inclinados, con la sombra dura de los otros iconos ----------
  function icono(tam) {
    const k = tam || 1, c = cvs(Math.round(120 * k * 2), Math.round(92 * k * 2)), g = c.getContext('2d');
    g.scale(2 * k, 2 * k); g.imageSmoothingEnabled = false;
    const pon = (img, esc, x, y, rot) => { const w = img.width * esc, h = img.height * esc; g.save(); g.translate(x, y); g.rotate(rot * Math.PI / 180); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowOffsetX = 3; g.shadowOffsetY = 3; g.drawImage(img, -w / 2, -h / 2, w, h); g.restore(); };
    pon(casa([0.95, 0.65, 0.20]), 5, 30, 58, -8); pon(ciudad([0.45, 0.70, 1.0]), 5, 79, 46, 6);
    c.style.width = 120 * k + 'px'; c.style.height = 92 * k + 'px'; c.style.imageRendering = 'pixelated'; c.className = 'iconoFu';
    return c;
  }

  return { WD, HT, PASO, RECURSOS, SIMB, EST, tile, aroHex, casa, ciudad, camino, caballero, bandido, dado2d, icono, CANDADO, deFilas, fr, cvs, ficha, PH };
})();
