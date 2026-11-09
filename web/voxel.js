'use strict';
// El dibujo de cubitos del juego (scripts/ui/voxel_draw.gd, voxel_button.gd, casino_icons.gd y la carta del casino) pasado a canvas:
// los botones, las cartas, los palos y el paño de la mesa se ven igual que en el casino del juego. Los colores son los del casino (nivel 3).
// Los colores son [r, g, b] de 0 a 1, como en Godot.

const V = (() => {
  const claro = (c, a) => [c[0] + (1 - c[0]) * a, c[1] + (1 - c[1]) * a, c[2] + (1 - c[2]) * a];
  const oscuro = (c, a) => [c[0] * (1 - a), c[1] * (1 - a), c[2] * (1 - a)];
  const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')';

  const MARMOL = [0.93, 0.90, 0.83], ORO = [1.0, 0.85, 0.40], PLACA = [0.13, 0.07, 0.22], PLACA_ARRIBA = [0.22, 0.12, 0.34];
  const CORRUPTO_A = [0.38, 0.10, 0.54], CORRUPTO_B = [0.64, 0.22, 0.80];

  // El nivel "casino" de casino_theme.gd (el del juego, el tercero).
  const TEMA = { corrupcion: 0.10, adorno: 2, fieltro: [0.05, 0.30, 0.20], borde_carta: [0.92, 0.74, 0.28], carta: [0.98, 0.97, 0.93], carta_dentro: [1.0, 0.99, 0.97],
    dorso: [0.20, 0.10, 0.42], dorso_punto: [0.92, 0.74, 0.28], filete: [0.92, 0.74, 0.28] };

  function ruido(x, y, semilla) {
    let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(semilla, 83492791);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (Math.abs(h) % 10000) / 10000;
  }
  const corruptoColor = n => mezcla(CORRUPTO_A, CORRUPTO_B, (n * 7) % 1);

  // Un cubito de lado s: cara + luz arriba y a la izquierda + sombra abajo y a la derecha.
  function cubo(ctx, x, y, s, col, simple) {
    if (s >= 5) s -= 1;
    ctx.fillStyle = css(col); ctx.fillRect(x, y, s, s);
    if (s < 2) return;
    const b = Math.max(1, Math.floor(s * 0.22));
    const luz = claro(col, 0.38), sombra = oscuro(col, 0.42);
    if (simple) {
      ctx.fillStyle = css(luz); ctx.fillRect(x, y, s, b);
      ctx.fillStyle = css(sombra); ctx.fillRect(x, y + s - b, s, b);
      return;
    }
    ctx.fillStyle = css(luz); ctx.fillRect(x, y, s, b);
    ctx.fillStyle = css(oscuro(luz, 0.15)); ctx.fillRect(x, y, b, s);
    ctx.fillStyle = css(sombra); ctx.fillRect(x, y + s - b, s, b);
    ctx.fillStyle = css(claro(sombra, 0.1)); ctx.fillRect(x + s - b, y, b, s);
  }

  // ---------- texto de cubitos ----------

  function anchoLinea(t) {
    if (!t.length) return 0;
    const ultimo = GLIFOS[t[t.length - 1]] || [];
    const ancho = ultimo.reduce((m, c) => Math.max(m, c[0] + 1), 0);
    return t.length * FUENTE.avance - 1 + Math.max(0, ancho - FUENTE.ancho);
  }
  function celdas(t) {
    const out = [];
    for (let i = 0; i < t.length; i++) for (const c of (GLIFOS[t[i]] || [])) out.push([i * FUENTE.avance + c[0], c[1]]);
    return { celdas: out, ancho: anchoLinea(t), alto: FUENTE.alto };
  }
  // Las letras del juego: más claras, con contorno oscuro y (opcional) sombra dura abajo a la derecha.
  function texto(ctx, ox, oy, cel, s, color, sombra) {
    color = mezcla(color, [1, 1, 1], 0.35);
    const o = Math.max(1, s * 0.4);
    ctx.fillStyle = 'rgba(0,0,5,0.92)';
    for (const c of cel) ctx.fillRect(ox + c[0] * s - o, oy + c[1] * s - o, s + o * 2, s + o * 2);
    if (sombra && s >= 2) {
      const dx = Math.max(1, s * 0.45), dy = Math.max(1, s * 0.65);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      for (const c of cel) ctx.fillRect(ox + c[0] * s + dx, oy + c[1] * s + dy, s, s);
    }
    for (const c of cel) cubo(ctx, ox + c[0] * s, oy + c[1] * s, s, color);
  }

  // ---------- la tarjeta de los botones (Draw.card) ----------
  // estado: 0 normal, 1 resaltado, 2 apretado, 3 desactivado.
  function tarjeta(ctx, x, y, w, h, s, estado, corr, semilla, oro, brillo) {
    const cols = Math.max(Math.floor(w / s), 3), filas = Math.max(Math.floor(h / s), 3);
    let placa = estado === 1 ? PLACA_ARRIBA : PLACA;
    if (oro) placa = estado !== 1 ? [0.50, 0.34, 0.09] : [0.66, 0.46, 0.13];
    if (estado === 2) placa = oscuro(placa, 0.2);
    if (estado === 3) placa = oscuro(placa, 0.3);
    let borde = oro ? ORO : MARMOL;
    if (estado === 1) borde = claro(borde, 0.12);
    if (estado === 3) borde = oscuro(borde, 0.45);
    const ox = x + (w - cols * s) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ox + s * 0.8, y + s * 1.2, cols * s, filas * s);
    ctx.fillStyle = css(placa); ctx.fillRect(ox, y, cols * s, filas * s);
    for (let j = 1; j < filas - 1; j++) for (let i = 1; i < cols - 1; i++) {
      const n = ruido(i, j, semilla + 5);
      if (n < 0.025) cubo(ctx, ox + i * s, y + j * s, s, claro(placa, 0.10 + n), true);
    }
    for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
      if (i !== 0 && j !== 0 && i !== cols - 1 && j !== filas - 1) continue;
      const n = ruido(i, j, semilla), k = corr * (0.30 + 0.70 * j / filas);
      if (n < k * 0.10) continue;
      let col = oscuro(borde, ruido(i, j, semilla + 3) * 0.2);
      if (n < k * 0.34) col = corruptoColor(n);
      cubo(ctx, ox + i * s, y + j * s, s, col);
    }
    for (let i = 1; i < cols - 1; i++) {   // chorreras que cuelgan del borde de abajo
      if (ruido(i, filas, semilla + 9) < corr * 0.14) {
        const largo = 1 + Math.floor(ruido(i, filas, semilla + 11) * 2);
        for (let k = 0; k < largo; k++) cubo(ctx, ox + i * s, y + (filas + k) * s, s, corruptoColor(ruido(i, k, semilla + 13)));
      }
    }
    if (brillo >= 0 && estado !== 3) {   // franja de brillo en diagonal
      const sx = ox + brillo * (cols * s + 80) - 40;
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, y, cols * s, filas * s); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 22, y); ctx.lineTo(sx + 2, y + filas * s); ctx.lineTo(sx - 20, y + filas * s); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // ---------- los palos (casino_icons.gd) ----------
  const PALETA = { o: [0.10, 0.05, 0.16], a: [0.62, 0.40, 0.95], b: [0.82, 0.68, 1.0], c: [0.36, 0.20, 0.60], w: [0.84, 0.97, 1.0], i: [0.55, 0.82, 1.0],
    y: [1.0, 0.85, 0.30], h: [1.0, 0.95, 0.65], r: [1.0, 0.30, 0.20], d: [0.17, 0.17, 0.22], g: [0.60, 0.62, 0.72] };
  const DIBUJOS = {
    cubo: ['.ooooooo.', 'obbbbbbao', 'obbbbbaao', 'obbbbaaao', 'obbaaaaao', 'obaaaaaco', 'oaaaaaaco', 'occccccco', '.ooooooo.'],
    hielo: ['....w....', '.i..w..i.', '..i.w.i..', '...www...', 'wwwwwwwww', '...www...', '..i.w.i..', '.i..w..i.', '....w....'],
    bomba: ['......h.y', '.....r.h.', '....or...', '..ooddoo.', '.odggdddo', '.odgdddd.', '.odddddd.', '..oddddo.', '...oooo..'],
    sol: ['....y....', '.y..y..y.', '..yhhhy..', '.yhhyyyy.', 'yyhyyyyyy', '.yyyyyyy.', '..yyyyy..', '.y..y..y.', '....y....'],
  };
  const PALOS = ['cubo', 'hielo', 'bomba', 'sol'];
  function icono(ctx, id, cx, cy, tam) {
    const filas = DIBUJOS[id], s = tam / 9, ox = cx - tam / 2, oy = cy - tam / 2;
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
      const ch = filas[j][i];
      if (ch === '.') continue;
      const col = PALETA[ch], px = ox + i * s, py = oy + j * s;
      ctx.fillStyle = css(col); ctx.fillRect(px, py, s, s);
      ctx.fillStyle = css(claro(col, 0.25)); ctx.fillRect(px, py, s, Math.max(s * 0.25, 1));
      ctx.fillStyle = css(oscuro(col, 0.25)); ctx.fillRect(px, py + s * 0.8, s, Math.max(s * 0.2, 1));
    }
  }

  // ---------- la carta (_CardView) ----------
  const CW = 96, CH = 134;
  const RANGOS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  // `color` (opcional): el color propio de una carta especial; pinta su fondo y su borde.
  function carta(ctx, rango, palo, tapada, color) {
    const t = TEMA, orn = t.adorno;
    if (color && color.f) {   // carta especial: un color de fondo y otro de borde (se mezclan en franjas y tachuelas)
      const f = color.f, b = color.b;
      ctx.fillStyle = css(b); ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = css(claro(f, 0.45)); ctx.fillRect(7, 7, CW - 14, CH - 14);
      // damero suave del color de fondo
      for (let j = 0; j < CH - 14; j += 16) for (let i = ((j / 16) % 2) * 8; i < CW - 14; i += 16) { ctx.fillStyle = css(claro(f, 0.3)); ctx.fillRect(7 + i, 7 + j, 8, 8); }
      ctx.strokeStyle = css(oscuro(b, 0.45)); ctx.lineWidth = 2; ctx.strokeRect(7, 7, CW - 14, CH - 14);
      const l = celdas(RANGOS[rango]), col = palo % 2 === 0 ? [0.15, 0.08, 0.25] : [0.7, 0.12, 0.12];
      texto(ctx, 12, 12, l.celdas, 3, col, false);
      icono(ctx, PALOS[palo], CW * 0.5, CH * 0.58, 50);
      icono(ctx, PALOS[palo], CW - 20, CH - 20, 16);
      ctx.fillStyle = css(claro(b, 0.5));
      for (const p of [[2, 2], [CW - 5, 2], [2, CH - 5], [CW - 5, CH - 5], [CW / 2 - 1, 2], [CW / 2 - 1, CH - 5]]) ctx.fillRect(p[0], p[1], 3, 3);
      ctx.strokeStyle = css(oscuro(b, 0.6)); ctx.lineWidth = 2; ctx.strokeRect(1, 1, CW - 2, CH - 2);
      return;
    }
    ctx.fillStyle = css(color ? oscuro(color, 0.4) : t.carta); ctx.fillRect(0, 0, CW, CH);
    if (!tapada) {
      ctx.fillStyle = css(color ? claro(color, 0.5) : t.carta_dentro); ctx.fillRect(3, 3, CW - 6, CH - 6);
      const l = celdas(RANGOS[rango]);
      const col = palo % 2 === 0 ? [0.15, 0.08, 0.25] : [0.7, 0.12, 0.12];
      texto(ctx, 10, 8, l.celdas, 3, col, false);
      icono(ctx, PALOS[palo], CW * 0.5, CH * 0.58, 52);
      icono(ctx, PALOS[palo], CW - 17, CH - 17, 18);
    } else {
      ctx.fillStyle = css(t.dorso); ctx.fillRect(6, 6, CW - 12, CH - 12);
      for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) {
        if ((i + j) % 2) continue;
        ctx.fillStyle = css(t.dorso_punto);
        if (orn >= 2) {   // en los niveles altos el damero es de rombos dorados
          const cx = 14 + i * 14 + 6, cy = 14 + j * 15 + 6;
          ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy); ctx.closePath(); ctx.fill();
        } else ctx.fillRect(14 + i * 14, 14 + j * 15, 12, 12);
      }
      ctx.strokeStyle = css(t.filete, 0.9); ctx.lineWidth = orn >= 2 ? 2 : 1;
      ctx.strokeRect(6 + ctx.lineWidth / 2, 6 + ctx.lineWidth / 2, CW - 12 - ctx.lineWidth, CH - 12 - ctx.lineWidth);
    }
    const g = orn >= 3 ? 3 : 2;
    ctx.strokeStyle = css(color ? oscuro(color, 0.55) : t.borde_carta); ctx.lineWidth = g;
    ctx.strokeRect(g / 2, g / 2, CW - g, CH - g);
    if (orn >= 2 && !tapada) {   // esquinas con una tachuela dorada
      ctx.fillStyle = css(color ? oscuro(color, 0.2) : t.filete);
      for (const p of [[3, 3], [CW - 6, 3], [3, CH - 6], [CW - 6, CH - 6]]) ctx.fillRect(p[0], p[1], 3, 3);
    }
  }
  // Un canvas con la carta (se dibuja al doble de resolución y el CSS lo achica).
  function cartaCanvas(rango, palo, tapada, color) {
    const cv = document.createElement('canvas');
    cv.width = CW * 2; cv.height = CH * 2; cv.className = 'cv';
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    carta(ctx, rango, palo, tapada, color);
    return cv;
  }

  // ---------- el paño de la mesa (_Felt) ----------
  function paño(cv, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const s = 10, cols = Math.floor(w / s), filas = Math.floor(h / s);
    const ox = (w - cols * s) / 2, oy = (h - filas * s) / 2;
    ctx.fillStyle = css(TEMA.fieltro); ctx.fillRect(ox, oy, cols * s, filas * s);
    const corr = TEMA.corrupcion;
    for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {   // manchas y quemaduras apenas
      const n = ruido(i, j, 91);
      if (n < corr * 0.03) { ctx.fillStyle = css(oscuro(TEMA.fieltro, 0.35)); ctx.fillRect(ox + i * s, oy + j * s, s, s); }
      else if (n > 1 - corr * 0.0015) { ctx.fillStyle = css(corruptoColor(n)); ctx.fillRect(ox + i * s, oy + j * s, s, s); }
    }
    for (let i = 0; i < cols; i++) for (const j of [0, filas - 1]) cubo(ctx, ox + i * s, oy + j * s, s, TEMA.filete, true);
    for (let j = 1; j < filas - 1; j++) for (const i of [0, cols - 1]) cubo(ctx, ox + i * s, oy + j * s, s, TEMA.filete, true);
  }

  // La mesa hexagonal (como la de las referencias): paño verde del casino con un marco de cubitos dorados que sigue el borde.
  function mesaHex(cv, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const s = Math.max(6, Math.round(w / 85)), m = s / 2;
    const P = [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]].map(p => [m + p[0] * (w - s), m + p[1] * (h - s)]);
    const trazo = new Path2D();
    P.forEach((p, i) => (i ? trazo.lineTo(p[0], p[1]) : trazo.moveTo(p[0], p[1])));
    trazo.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.save(); ctx.translate(s * 0.7, s * 0.9); ctx.fill(trazo); ctx.restore();
    ctx.fillStyle = css(TEMA.fieltro); ctx.fill(trazo);
    const corr = TEMA.corrupcion;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {   // manchas apenas, solo dentro de la mesa
      const n = ruido(Math.floor(x / s), Math.floor(y / s), 91);
      if (n >= corr * 0.03 && !(n > 1 - corr * 0.0015)) continue;
      if (!ctx.isPointInPath(trazo, x + s / 2, y + s / 2)) continue;
      ctx.fillStyle = css(n < corr * 0.03 ? oscuro(TEMA.fieltro, 0.35) : corruptoColor(n)); ctx.fillRect(x, y, s, s);
    }
    for (let i = 0; i < P.length; i++) {   // el marco: cubitos dorados a lo largo de cada lado
      const a = P[i], b = P[(i + 1) % P.length];
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]), pasos = Math.ceil(largo / (s - 1));
      for (let k = 0; k < pasos; k++) {
        const t = k / pasos;
        cubo(ctx, Math.round(a[0] + (b[0] - a[0]) * t - s / 2), Math.round(a[1] + (b[1] - a[1]) * t - s / 2), s + 1, TEMA.filete, true);
      }
    }
  }

  // ---------- fichas y rótulos grandes ----------
  const MASCARA_FICHA = ['...#####...', '.#########.', '###########', '.#########.', '...#####...'];
  const COLOR_FICHA = { 1: [0.62, 0.40, 0.95], 2: [1.0, 0.30, 0.20], 5: [0.35, 0.60, 1.0], 10: [1.0, 0.85, 0.30] };
  // Una pila de fichas (vistas de costado, de cubitos): más alta cuanto mayor es el múltiplo de la apuesta (1, 2, 5 o 10 fichas).
  function ficha(mult) {
    const capas = { 1: 1, 2: 2, 5: 3, 10: 4 }[mult] || 1, c = 3, base = COLOR_FICHA[mult] || COLOR_FICHA[1];
    const W = 11 * c, H = 7 * c + (capas - 1) * 3;
    const cv = document.createElement('canvas');
    cv.width = W * 3; cv.height = H * 3; cv.className = 'fichaC';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    const blanco = [0.96, 0.95, 0.9];
    const LADO = ['###########', '.#########.'];
    for (let k = 0; k < capas; k++) {
      const y0 = H - 7 * c - k * 3;
      for (let j = 0; j < 7; j++) {
        const fila = j < 5 ? MASCARA_FICHA[j] : LADO[j - 5];
        for (let i = 0; i < 11; i++) {
          if (fila[i] !== '#') continue;
          let col = j >= 5 ? oscuro(base, 0.35) : base;
          if (j < 5) {
            const marca = (j === 2 && (i <= 1 || i >= 9)) || ((j === 0 || j === 4) && i >= 4 && i <= 6);
            if (marca) col = blanco; else if (j >= 1 && j <= 3 && i >= 3 && i <= 7) col = claro(base, 0.28);
          }
          cubo(ctx, i * c, y0 + j * c, c, col, true);
        }
      }
    }
    return cv;
  }

  // Un rótulo de letras de cubitos (con contorno y sombra, como el texto del juego) que entra en `anchoMax` px, con cubitos de hasta `sMax` px.
  // El medallón de probabilidad: una moneda de cubitos (borde oscuro, aro dorado y relleno del color del riesgo) con el número en la letra del juego.
  function medalla(txt, tono) {
    const base = { alta: [0.40, 0.86, 0.36], media: [0.97, 0.76, 0.24], baja: [0.95, 0.40, 0.33] }[tono] || [0.97, 0.76, 0.24];
    const l = celdas(txt), W = l.ancho + 5, H = l.alto + 5, s = 1.4;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
    cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; cv.className = 'medallaCv';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const px = (x, y, col) => { ctx.fillStyle = css(col); ctx.fillRect(x * s, y * s, s + 0.5, s + 0.5); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const borde = x === 0 || y === 0 || x === W - 1 || y === H - 1, marco = x === 1 || y === 1 || x === W - 2 || y === H - 2;
      if (borde && (x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      px(x, y, borde ? oscuro(ORO, 0.55) : (marco ? (y < H / 2 ? claro(ORO, 0.05) : oscuro(ORO, 0.12)) : PLACA));
    }
    // el número, plano y del color del riesgo, con un contorno oscuro
    ctx.fillStyle = 'rgba(8,4,16,0.95)';
    for (const c of l.celdas) ctx.fillRect((2 + c[0]) * s - s * 0.5, (2 + c[1]) * s - s * 0.5, s * 2, s * 2);
    ctx.fillStyle = css(base);
    for (const c of l.celdas) ctx.fillRect((2 + c[0]) * s, (2 + c[1]) * s, s + 0.5, s + 0.5);
    return cv;
  }
  function rotulo(textoRotulo, color, anchoMax, sMax) {
    const l = celdas(textoRotulo);
    const s = Math.max(2, Math.min(sMax, Math.floor(anchoMax / (l.ancho + 4))));
    const W = (l.ancho + 4) * s, H = (l.alto + 3) * s;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    texto(ctx, s * 2, s, l.celdas, s, color, true);
    return cv;
  }

  // ---------- íconos de habilidades y objetos ----------
  const COLOR_RAREZA = { comun: [0.84, 0.80, 0.90], raro: [0.55, 0.82, 1.0], epico: [1.0, 0.85, 0.40] };
  const MARCO = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]];
  // Un cuadradito de cubitos con el símbolo de la cosa: el borde dice la rareza (marfil común, celeste raro, dorado épico); una esquina roja marca los objetos contra otros jugadores.
  // `op.secreto`: el dorso (un objeto que no se ve).
  function tile(it, op = {}) {
    const S = 36, cv = document.createElement('canvas');
    cv.width = S * 3; cv.height = S * 3; cv.className = 'tile';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    const col = op.secreto ? [0.62, 0.40, 0.95] : COLOR_RAREZA[it.rareza];
    ctx.fillStyle = css([0.13, 0.07, 0.22]); ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 9; i++) for (const j of [0, 8]) cubo(ctx, i * 4, j * 4, 4, col, true);
    for (let j = 1; j < 8; j++) for (const i of [0, 8]) cubo(ctx, i * 4, j * 4, 4, col, true);
    if (it && it.hostil && !op.secreto) for (const p of [[7, 0], [8, 0], [8, 1]]) cubo(ctx, p[0] * 4, p[1] * 4, 4, [1.0, 0.30, 0.20], true);
    const l = celdas(op.secreto ? '?' + (op.n > 0 ? op.n : '') : it.glifo);
    const s = Math.min(2.4, 24 / Math.max(l.ancho, 1));
    texto(ctx, (S - l.ancho * s) / 2, S / 2 - 5.5 * s, l.celdas, s, op.secreto ? [0.82, 0.68, 1.0] : col, false);
    return cv;
  }
  function tileVacio() {
    const S = 36, cv = document.createElement('canvas');
    cv.width = S * 3; cv.height = S * 3; cv.className = 'tile vacio';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 9; i += 2) for (const j of [0, 8]) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(i * 4, j * 4, 4, 4); }
    for (let j = 2; j < 8; j += 2) for (const i of [0, 8]) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(i * 4, j * 4, 4, 4); }
    return cv;
  }

  // ---------- el ícono de sonido ----------
  // Un parlante de cubitos: con ondas cuando el sonido está encendido; con una cruz roja cuando está apagado.
  const PARLANTE = ['....S......', '...SS...w..', '..SSS....w.', 'SSSS.S..w.w', 'SSSS.S..w.w', 'SSSS.S..w.w', '..SSS....w.', '...SS...w..', '....S......'];
  const CRUZ = [[7, 2], [8, 3], [9, 4], [10, 5], [10, 2], [9, 3], [8, 4], [7, 5]];
  function parlante(encendido) {
    const c = 3, cv = document.createElement('canvas');
    cv.width = 11 * c * 3; cv.height = 9 * c * 3; cv.className = 'parlante';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    for (let j = 0; j < 9; j++) for (let i = 0; i < 11; i++) {
      const ch = PARLANTE[j][i];
      if (ch === 'S') cubo(ctx, i * c, j * c, c, MARMOL, true);
      else if (ch === 'w' && encendido) cubo(ctx, i * c, j * c, c, ORO, true);
    }
    if (!encendido) for (const p of CRUZ) cubo(ctx, p[0] * c, (p[1] + 1) * c, c, [1.0, 0.35, 0.28], true);
    return cv;
  }

  // ---------- el ícono del ranking ----------
  const PODIO = ['....ooo....', '....ooo....', '....ooo....', '....ooo....', 'ppp.ooo....', 'ppp.ooo.bbb', 'ppp.ooo.bbb', 'ppp.ooo.bbb', 'ppp.ooo.bbb'];
  const GLOBO = ['..ooooooo..', '.ooooooooo.', 'oo.......oo', 'oo.o.o.o.oo', 'oo.......oo', '.ooooooooo.', '..oooo.....', '...oo......', '....o......'];
  function globo() {
    const c = 3, cv = document.createElement('canvas');
    cv.width = 11 * c * 3; cv.height = 9 * c * 3; cv.className = 'parlante';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    for (let j = 0; j < 9; j++) for (let i = 0; i < 11; i++) { const ch = GLOBO[j][i]; if (ch !== '.') cubo(ctx, i * c, j * c, c, ORO, true); }
    return cv;
  }
  const INTERROGANTE = ['...ooooo...', '..ooo.ooo..', '..oo...oo..', '.......oo..', '......ooo..', '.....ooo...', '....ooo....', '...........', '....ooo....'];
  function interrogante() {
    const c = 3, cv = document.createElement('canvas');
    cv.width = 11 * c * 3; cv.height = 9 * c * 3; cv.className = 'parlante';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    for (let j = 0; j < 9; j++) for (let i = 0; i < 11; i++) { if (INTERROGANTE[j][i] !== '.') cubo(ctx, i * c, j * c, c, ORO, true); }
    return cv;
  }
  const INVITAR = ['...ooo.....', '..ooooo..o.', '..ooooo.ooo', '...ooo...o.', '..ooooo....', '.ooooooo...', '.ooooooo...', '.ooooooo...', '...........'];
  const PUERTA = ['ooooooo....', 'o.....oooo.', 'o.....o..o.', 'o.....o.oo.', 'o.....o..o.', 'o.....oo.o.', 'o.....o..o.', 'o.....oooo.', 'ooooooo....'];
  function iconoOro(filas, color = ORO) {
    const c = 3, cv = document.createElement('canvas');
    cv.width = 11 * c * 3; cv.height = 9 * c * 3; cv.className = 'parlante';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    for (let j = 0; j < 9; j++) for (let i = 0; i < 11; i++) { if (filas[j][i] !== '.') cubo(ctx, i * c, j * c, c, color, true); }
    return cv;
  }
  const invitar = () => iconoOro(INVITAR), puerta = () => iconoOro(PUERTA, [1.0, 0.36, 0.30]);
  function podio() {
    const c = 3, cv = document.createElement('canvas');
    cv.width = 11 * c * 3; cv.height = 9 * c * 3; cv.className = 'parlante';
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    const colores = { o: ORO, p: [0.82, 0.84, 0.9], b: [0.85, 0.52, 0.28] };
    for (let j = 0; j < 9; j++) for (let i = 0; i < 11; i++) { const ch = PODIO[j][i]; if (ch !== '.') cubo(ctx, i * c, j * c, c, colores[ch], true); }
    return cv;
  }

  // ---------- botones ----------
  // Un <button> de verdad (foco, teclado, desactivado) cuyo dibujo es la tarjeta de cubitos del juego.
  function boton(btn, op = {}) {
    const cubo_ = op.cubo || 2.5, fc = cubo_ * 2, pad = Math.ceil(fc * 0.7) + 6;
    let etiqueta = op.texto !== undefined ? op.texto : btn.textContent.trim();
    let oro = !!op.oro, estado = 0, hover = false, apretado = false, raf = 0, t0 = 0, tipo = 'mouse';   // (tipo: con qué se tocó por última vez; en el celular no hay "pasar por encima")
    const cv = document.createElement('canvas');
    btn.textContent = '';
    btn.classList.add('vb');
    btn.appendChild(cv);
    btn.setAttribute('aria-label', etiqueta);

    function medidas() {
      const l = celdas(etiqueta);
      const w = Math.max(Math.ceil(((l.ancho + 10) * cubo_ + fc * 2) / fc) * fc, op.minAncho ? Math.ceil(op.minAncho / fc) * fc : 0), h = Math.ceil(((l.alto + 4) * cubo_ + fc * 2) / fc) * fc;
      return { l, w, h, total: [w + pad * 2, h + fc * 2 + pad * 2] };
    }
    function dibujar(tiempo) {
      const m = medidas(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const [W, H] = m.total;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const dis = btn.disabled;
      const st = dis ? 3 : (apretado && hover ? 2 : (hover || document.activeElement === btn ? 1 : 0));
      const escala = st === 1 ? 1.06 : (st === 2 ? 0.97 : 1);
      const cx = W / 2, cy = pad + m.h / 2;
      ctx.translate(cx, cy); ctx.scale(escala, escala);
      const brillo = hover && !dis ? ((tiempo - t0) / 1000 * 0.35) % 1.6 : -1;
      const semilla = hashTexto(etiqueta) & 0xFFFF;
      tarjeta(ctx, -m.w / 2, -m.h / 2, m.w, m.h, fc, st, op.corrupcion !== undefined ? op.corrupcion : TEMA.corrupcion, semilla, oro, brillo <= 1 ? brillo : -1);
      let col = oro ? [1.0, 0.98, 0.9] : MARMOL;
      if (st === 3) col = oscuro(col, 0.5); else if (st === 1 && !oro) col = ORO;
      texto(ctx, -m.l.ancho * cubo_ / 2, -m.l.alto * cubo_ / 2, m.l.celdas, cubo_, col, true);
      if (hover && !dis && btn.isConnected) raf = requestAnimationFrame(dibujar); else { raf = 0; if (!btn.isConnected) hover = false; }   // (un botón quitado de la página deja de animarse: si no, cada botón tocado seguía redibujándose para siempre)
    }
    const pedir = () => { if (!raf) raf = requestAnimationFrame(dibujar); };
    btn.addEventListener('pointerenter', ev => { tipo = ev.pointerType || 'mouse'; });
    btn.addEventListener('pointerdown', ev => { tipo = ev.pointerType || 'mouse'; });
    btn.addEventListener('mouseenter', () => { if (tipo !== 'mouse') return; hover = true; t0 = performance.now(); pedir(); });
    btn.addEventListener('mouseleave', () => { hover = false; apretado = false; pedir(); });
    btn.addEventListener('pointerdown', () => { apretado = true; pedir(); });
    btn.addEventListener('pointerup', () => { apretado = false; if (tipo !== 'mouse') hover = false; pedir(); });
    btn.addEventListener('pointercancel', () => { apretado = false; hover = false; pedir(); });
    btn.addEventListener('focus', pedir); btn.addEventListener('blur', pedir);
    new MutationObserver(pedir).observe(btn, { attributes: true, attributeFilter: ['disabled'] });
    Object.defineProperty(btn, 'etiqueta', { get: () => etiqueta, set: v => { if (v !== etiqueta) { etiqueta = v; btn.setAttribute('aria-label', v); pedir(); } } });
    Object.defineProperty(btn, 'oro', { get: () => oro, set: v => { oro = !!v; pedir(); } });
    dibujar(performance.now());   // (se dibuja ya: si no, el canvas mide 300x150 hasta el cuadro siguiente y el botón aparece enorme un instante)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pedir);
    return btn;
  }
  function hashTexto(t) { let h = 0; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0; return Math.abs(h); }

  return { cubo, texto, celdas, tarjeta, icono, carta, cartaCanvas, paño, mesaHex, ficha, rotulo, medalla, tile, tileVacio, parlante, podio, globo, interrogante, invitar, puerta, boton, TEMA, css, MARMOL, ORO };
})();
