'use strict';
// Un generador de códigos QR sin dependencias (modo bytes, corrección M, versiones 1 a 10: alcanza para un enlace de invitación).
// QR.matriz(texto) devuelve una grilla de true/false (true = módulo oscuro). Se comprobó contra la biblioteca `qrcode` de Python (pruebas/test_qr.js).

const QR = (() => {
  // por versión (corrección M): palabras de corrección por bloque, y los bloques [cantidad, palabras de datos]
  const M = {
    1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]],
    6: [16, [[4, 27]]], 7: [18, [[4, 31]]], 8: [22, [[2, 38], [2, 39]]], 9: [22, [[3, 36], [2, 37]]], 10: [26, [[4, 43], [1, 44]]],
  };
  const ALINEAR = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

  // aritmética de Galois (x^8 + x^4 + x^3 + x^2 + 1)
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  function corrección(datos, n) {
    let gen = [1];
    for (let i = 0; i < n; i++) {
      const sig = new Array(gen.length + 1).fill(0);
      for (let j = 0; j < gen.length; j++) { sig[j] ^= gen[j]; sig[j + 1] ^= mul(gen[j], EXP[i]); }
      gen = sig;
    }
    const r = new Array(n).fill(0);
    for (const d of datos) {
      const f = d ^ r[0];
      r.shift(); r.push(0);
      for (let i = 0; i < n; i++) r[i] ^= mul(gen[i + 1], f);
    }
    return r;
  }

  const bchFormato = v => { let d = v << 10; for (let i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= 0x537 << (i - 10); return ((v << 10) | d) ^ 0x5412; };
  const bchVersion = v => { let d = v << 12; for (let i = 17; i >= 12; i--) if ((d >> i) & 1) d ^= 0x1f25 << (i - 12); return (v << 12) | d; };

  const MASCARAS = [
    (r, c) => (r + c) % 2 === 0, (r, c) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function bytes(texto) { return Array.from(new TextEncoder().encode(texto)); }

  function palabras(datos, version) {
    const [nEc, bloques] = M[version];
    const total = bloques.reduce((t, [n, d]) => t + n * d, 0);
    const bits = [];
    const poner = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    poner(0b0100, 4); poner(datos.length, version < 10 ? 8 : 16);
    datos.forEach(b => poner(b, 8));
    poner(0, Math.min(4, total * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let p = 0; cw.length < total; p++) cw.push(p % 2 ? 0x11 : 0xec);
    // partir en bloques, calcular la corrección e intercalar
    const bl = []; let k = 0;
    for (const [n, d] of bloques) for (let i = 0; i < n; i++) { const dat = cw.slice(k, k + d); k += d; bl.push({ dat, ec: corrección(dat, nEc) }); }
    const out = [];
    const maxD = Math.max(...bl.map(b => b.dat.length));
    for (let i = 0; i < maxD; i++) for (const b of bl) if (i < b.dat.length) out.push(b.dat[i]);
    for (let i = 0; i < nEc; i++) for (const b of bl) out.push(b.ec[i]);
    return out;
  }

  function construir(version, cw, mascara) {
    const n = 17 + 4 * version;
    const mod = Array.from({ length: n }, () => new Array(n).fill(false)), fn = Array.from({ length: n }, () => new Array(n).fill(false));
    const poner = (r, c, v) => { if (r >= 0 && c >= 0 && r < n && c < n) { mod[r][c] = v; fn[r][c] = true; } };
    // buscadores con su separador
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const d = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      poner(r0 + dr, c0 + dc, d !== 2 && d !== 4);
    }
    // sincronía
    for (let i = 8; i < n - 8; i++) { poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
    // alineación
    const al = ALINEAR[version];
    for (const r of al) for (const c of al) {
      if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) poner(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
    // reservar formato y versión
    const reservar = (r, c) => { if (!fn[r][c]) poner(r, c, false); };   // (sin pisar la línea de sincronía)
    for (let i = 0; i < 9; i++) { reservar(8, i); reservar(i, 8); }
    for (let i = 0; i < 8; i++) { reservar(8, n - 1 - i); reservar(n - 1 - i, 8); }
    if (version >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { poner(i, n - 11 + j, false); poner(n - 11 + j, i, false); }
    poner(n - 8, 8, true);   // el módulo oscuro fijo
    // datos en zigzag
    const bits = []; cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
    let k = 0, arriba = true;
    for (let c = n - 1; c > 0; c -= 2) {
      if (c === 6) c = 5;
      for (let i = 0; i < n; i++) {
        const r = arriba ? n - 1 - i : i;
        for (const cc of [c, c - 1]) if (!fn[r][cc]) { mod[r][cc] = (k < bits.length ? bits[k] === 1 : false) !== MASCARAS[mascara](r, cc); k++; }
      }
      arriba = !arriba;
    }
    // formato (corrección M = 0b00)
    const f = bchFormato((0b00 << 3) | mascara);
    const bit = (v, i) => ((v >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) mod[i][8] = bit(f, i);
    mod[7][8] = bit(f, 6); mod[8][8] = bit(f, 7); mod[8][7] = bit(f, 8);
    for (let i = 9; i < 15; i++) mod[8][14 - i] = bit(f, i);
    for (let i = 0; i < 8; i++) mod[8][n - 1 - i] = bit(f, i);
    for (let i = 8; i < 15; i++) mod[n - 15 + i][8] = bit(f, i);
    mod[n - 8][8] = true;
    if (version >= 7) { const v = bchVersion(version); for (let i = 0; i < 18; i++) { const b = bit(v, i), a = n - 11 + (i % 3), q = Math.floor(i / 3); mod[q][a] = b; mod[a][q] = b; } }
    return mod;
  }

  function penalidad(m) {
    const n = m.length; let p = 0;
    for (let pasada = 0; pasada < 2; pasada++) {
      const g = (a, b) => (pasada === 0 ? m[a][b] : m[b][a]);
      for (let a = 0; a < n; a++) {
        let corrida = 1;
        for (let b = 1; b < n; b++) {
          if (g(a, b) === g(a, b - 1)) { corrida++; if (corrida === 5) p += 3; else if (corrida > 5) p++; } else corrida = 1;
        }
        for (let b = 0; b + 10 < n; b++) {
          const w = []; for (let i = 0; i < 11; i++) w.push(g(a, b + i) ? 1 : 0);
          const s = w.join('');
          if (s === '10111010000' || s === '00001011101') p += 40;
        }
      }
    }
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
    let oscuros = 0; for (const fila of m) for (const v of fila) if (v) oscuros++;
    p += Math.floor(Math.abs(oscuros * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  }

  // `mascara` (0 a 7) fuerza una máscara; sin ella se elige la de menor penalidad.
  function matriz(texto, opciones = {}) {
    const datos = bytes(texto);
    let version = 0;
    for (let v = 1; v <= 10; v++) { const [, bl] = M[v]; const cap = bl.reduce((t, [n, d]) => t + n * d, 0) - (v < 10 ? 2 : 3); if (datos.length <= cap) { version = v; break; } }
    if (!version) throw new Error('El texto es demasiado largo para el código QR');
    const cw = palabras(datos, version);
    if (opciones.mascara !== undefined) return construir(version, cw, opciones.mascara);
    let mejor = null, pm = Infinity;
    for (let k = 0; k < 8; k++) { const m = construir(version, cw, k), p = penalidad(m); if (p < pm) { pm = p; mejor = m; } }
    return mejor;
  }

  // Un canvas con el código (cada módulo es un cuadradito de `px` píxeles, con borde de 4 módulos).
  function canvas(texto, px = 5) {
    const m = matriz(texto), n = m.length, tam = (n + 8) * px;
    const cv = document.createElement('canvas'); cv.width = tam; cv.height = tam;
    const g = cv.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, tam, tam); g.fillStyle = '#120a22';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) g.fillRect((c + 4) * px, (r + 4) * px, px, px);
    return cv;
  }

  return { matriz, canvas };
})();

if (typeof module !== 'undefined') module.exports = QR;
