'use strict';
// El dibujo de cubitos de las pantallas de entrada: las figuras de las puertas, la corona del anfitrión, el icono de cada juego y las mesas del mapa (vistas desde arriba).
// Usa el dibujo de voxel.js y de dados3d.js; no habla con el servidor.

const Mesas = (() => {
  // Un color por asiento (el de cada jugador en el mapa) y el de los bots.
  const COLORES = [[0.95, 0.65, 0.20], [0.90, 0.55, 0.95], [0.45, 0.88, 0.60], [0.45, 0.70, 1.0], [1.0, 0.45, 0.45], [0.95, 0.90, 0.40], [0.75, 0.60, 1.0], [0.40, 0.90, 0.90]];
  const BOT = [0.62, 0.89, 1.0];

  // Un dibujo de cubitos a partir de filas de texto ('#' = cubo, '.' = vacío).
  function pixeles(filas, color, c) {
    const cv = document.createElement('canvas'), dpr = 2, w = filas[0].length, h = filas.length;
    cv.width = w * c * dpr; cv.height = h * c * dpr; cv.style.width = w * c + 'px'; cv.style.height = h * c + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    filas.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== '.') V.cubo(g, x * c, y * c, c, color, true); }));
    return cv;
  }
  const persona = (color, c = 5) => pixeles(['..###..', '..###..', '...#...', '#######', '#.###.#', '..###..', '..#.#..', '..#.#..'], color, c);
  const corona = (c = 2.5) => pixeles(['#.#.#', '#####', '#####'], V.ORO, c);

  // El icono de un juego: dos cartas (13 Jack) o un dado normal y uno dorado (Diez mil). Es el mismo en "crear sala" y en el centro de cada mesa.
  function iconoJuego(juego, tam = 1) {
    const d = document.createElement('div'); d.className = 'iconoJuego'; d.style.setProperty('--ic', tam);
    if (juego === 'trecejack') { const a = V.cartaCanvas(1, 0, false), b = V.cartaCanvas(13, 1, false); a.className = 'cv a'; b.className = 'cv b'; d.append(a, b); }
    else { const a = D3.sprite('normal', 5, 48 * tam), b = D3.sprite('oro', 6, 42 * tam); a.classList.add('a'); b.classList.add('b'); d.append(a, b); }
    return d;
  }

  // Una mesa vista desde arriba: borde dorado, paño verde, el icono del juego al centro y tantas sillas como asientos tiene la sala.
  // `sillas`: por asiento 'h' (persona), 'b' (bot) o null (libre). `fantasma`: una mesa libre, con sillas vacías y borde punteado.
  function mesa(juego, sillas, op = {}) {
    const c = op.c || 5, N = 33, M = 16, R = 10, dpr = 2, cv = document.createElement('canvas');
    cv.width = N * c * dpr; cv.height = N * c * dpr;   // (el tamaño en pantalla lo da el CSS: la mesa se achica sola si no entra)
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    // La mesa: una sombra, el borde de madera (con vetas), un filete dorado y el fieltro verde. Una mesa libre se ve igual pero apagada.
    const FIELTRO = [0.08, 0.42, 0.28];   // (más claro que el paño del mapa, para que la mesa se despegue del fondo)
    const MADERA = [[0.30, 0.17, 0.08], [0.36, 0.21, 0.10], [0.42, 0.25, 0.12]];
    const veta = (x, y) => MADERA[(Math.imul(x * 73856093 ^ y * 19349663, 2654435761) >>> 28) % 3];
    g.globalAlpha = op.fantasma ? 0.4 : 1;
    if (!op.fantasma) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {   // la sombra, corrida hacia abajo (una mesa libre no lleva)
      if (Math.hypot(x - M - 0.7, y - M - 0.9) <= R + 0.4) V.cubo(g, x * c, y * c, c, [0.03, 0.02, 0.05], true);
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = Math.hypot(x - M, y - M);
      if (r > R + 0.4) continue;
      const col = r > R - 1.3 ? veta(x, y) : (r > R - 2.3 ? V.TEMA.filete : FIELTRO);
      V.cubo(g, x * c, y * c, c, col, true);
    }
    const n = sillas.length;
    sillas.forEach((s, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, cx = Math.round(M + Math.cos(a) * 13.4 - 1), cy = Math.round(M + Math.sin(a) * 13.4 - 1);
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
        if (s) V.cubo(g, (cx + xx) * c, (cy + yy) * c, c, s === 'b' ? BOT : COLORES[i % COLORES.length], true);
        else if (xx !== 1 || yy !== 1) V.cubo(g, (cx + xx) * c, (cy + yy) * c, c, [0.30, 0.24, 0.45], true);
      }
    });
    g.imageSmoothingEnabled = false; g.globalAlpha = op.fantasma ? 0.55 : 1;
    const pon = (img, cx, cy, w, h, rot) => { g.save(); g.translate(cx * c, cy * c); g.rotate(rot * Math.PI / 180); g.drawImage(img, -w * c / 2, -h * c / 2, w * c, h * c); g.restore(); };
    if (juego === 'trecejack') { pon(V.cartaCanvas(1, 0, false), M + 0.5 - 2.4, M + 0.5, 4.6, 6.4, -9); pon(V.cartaCanvas(13, 1, false), M + 0.5 + 2.4, M + 0.5, 4.6, 6.4, 8); }
    else { pon(D3.sprite('normal', 5, 64), M + 0.5 - 2.2, M + 0.5, 4.8, 4.8, -8); pon(D3.sprite('oro', 6, 64), M + 0.5 + 2.2, M + 0.5, 4.2, 4.2, 7); }
    const d = document.createElement('div'); d.className = 'mesa' + (op.sel ? ' sel' : '');
    d.append(cv);
    return d;
  }

  return { COLORES, pixeles, persona, corona, iconoJuego, mesa };
})();
