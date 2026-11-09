'use strict';
// Farolín de crupier: la cara del farol del juego (scripts/personajes/farolin.gd, 12 x 13 cubitos, el diseño "Sereno") con varias expresiones.
// Cada expresión cambia solo el vidrio (las filas 4 a 9): los ojos y la boca. Las letras: k hierro, Y vidrio, O mejilla naranja, E oscuro (ojos y boca), w brillo blanco, a y b hierro claro.

const Farolin = (() => {
  const BASE = ['....kkkk....', '...k....k...', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kOYYYYYYOk.', '.kYEwYYEwYk.', '.kYEEYYEEYk.', 'aakEEYYEEkaa', '.kYYYYYYYYk.', '.kOYYYYYYOk.', '.kkkkkkkkkk.', '..kkkkkkkk..', '..bb....bb..'];
  // Una expresión es la base con otras filas del vidrio (los números son las filas que se cambian).
  const con = (cambios) => BASE.map((f, i) => (cambios[i] !== undefined ? cambios[i] : f));
  const EXPRESIONES = {
    normal: BASE,
    parpadeo: con({ 5: '.kYYYYYYYYk.', 6: '.kYEEYYEEYk.', 7: 'aakYYYYYYkaa' }),                                                    // ojos cerrados: dos rayitas
    susto: con({ 4: '.kOYYYYYYOk.', 5: '.kYwwYYwwYk.', 6: '.kYwEYYwEYk.', 7: 'aakwwYYwwkaa', 8: '.kYYYEEYYYk.', 9: '.kOYYEEYYOk.' }), // ojos grandes y blancos, una boca en "o"
    risa: con({ 5: '.kYYYYYYYYk.', 6: '.kYEEYYEEYk.', 7: 'aakYYYYYYkaa', 8: '.kYEEEEEEYk.', 9: '.kOYEEEEYOk.' }),                      // ojos cerrados de gusto y la boca abierta
    triste: con({ 5: '.kYEEYYEEYk.', 6: '.kYEwYYEwYk.', 7: 'aakYEYYEYkaa', 8: '.kYYEEEEYYk.', 9: '.kOEYYYYEOk.' }),                 // ojos caídos y la boca para abajo
    guino: con({ 5: '.kYYYYYYYYk.', 6: '.kYEEYYEwYk.', 7: 'aakYYYYYEkaa', 8: '.kYEYYYYYEk.', 9: '.kOYEEEEYOk.' }),                    // un ojo cerrado y una sonrisa de costado
  };
  // lo que se agrega afuera de la cara: la gota de sudor del susto
  const EXTRAS = { susto: [[12, 3, [0.5, 0.82, 1.0]], [12, 4, [0.5, 0.82, 1.0]], [12, 5, [0.7, 0.9, 1.0]]] };
  const PALETA = { k: [0.16, 0.14, 0.18], Y: [1.0, 0.86, 0.35], E: [0.18, 0.1, 0.05], O: [1.0, 0.55, 0.15], a: [0.3, 0.27, 0.32], b: [0.3, 0.27, 0.32], w: [1.0, 0.98, 0.85] };
  const AN = 14, AL = 13;   // el lienzo: 12 de cara + 2 de margen para la gota

  const css = (c, a = 1) => 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')';
  const claro = (c, a) => [c[0] + (1 - c[0]) * a, c[1] + (1 - c[1]) * a, c[2] + (1 - c[2]) * a];
  const oscuro = (c, a) => [c[0] * (1 - a), c[1] * (1 - a), c[2] * (1 - a)];

  // Dibuja la cara en un contexto 2D: `s` es el lado de un cubito en píxeles (igual que el juego: el hierro en cubitos con luz y sombra, el vidrio liso y más claro hacia el centro).
  function dibujar(ctx, expresion, s) {
    const filas = EXPRESIONES[expresion] || BASE;
    for (let y = 0; y < filas.length; y++) for (let x = 0; x < filas[y].length; x++) {
      const ch = filas[y][x];
      if (ch === '.') continue;
      let col = PALETA[ch];
      if (ch === 'Y' || ch === 'O' || ch === 'E' || ch === 'w') {
        if (ch === 'Y') { const t = (1 - Math.abs(x - 5.5) / 5.5) * 0.4; col = [col[0] + (1 - col[0]) * t, col[1] + (0.97 - col[1]) * t, col[2] + (0.72 - col[2]) * t]; }
        ctx.fillStyle = css(col); ctx.fillRect(x * s, y * s, s + 0.6, s + 0.6);
      } else {
        ctx.fillStyle = css(col); ctx.fillRect(x * s, y * s, s, s);
        ctx.fillStyle = css(claro(col, 0.3)); ctx.fillRect(x * s, y * s, s, Math.max(s * 0.18, 1));
        ctx.fillStyle = css(oscuro(col, 0.35)); ctx.fillRect(x * s, y * s + s * 0.82, s, Math.max(s * 0.18, 1));
      }
    }
    for (const [x, y, c] of (EXTRAS[expresion] || [])) { ctx.fillStyle = css(c); ctx.fillRect(x * s, y * s, s, s); }
  }

  // Un canvas con Farolín (el CSS decide el tamaño) y su control: `poner(expresion, ms)` lo hace reaccionar un rato y vuelve a la normal; parpadea solo de vez en cuando.
  function montar(contenedor) {
    const cv = document.createElement('canvas');
    const S = 4;
    cv.width = AN * S * 3; cv.height = AL * S * 3;
    const ctx = cv.getContext('2d');
    ctx.scale(3, 3);
    contenedor.textContent = '';
    contenedor.appendChild(cv);
    let actual = null, temporizador = 0, parpadeoT = 0;
    function mostrar(expresion) {
      if (expresion === actual) return;
      actual = expresion;
      ctx.clearRect(0, 0, AN * S, AL * S);
      dibujar(ctx, expresion, S);
      contenedor.dataset.expresion = expresion;
    }
    function poner(expresion, ms) {
      clearTimeout(temporizador);
      mostrar(expresion);
      if (ms) temporizador = setTimeout(() => mostrar('normal'), ms);
    }
    function parpadear() {
      parpadeoT = setTimeout(() => {
        if (actual === 'normal') { mostrar('parpadeo'); setTimeout(() => { if (actual === 'parpadeo') mostrar('normal'); }, 140); }
        parpadear();
      }, 2500 + Math.random() * 3500);
    }
    mostrar('normal');
    parpadear();
    return { poner, mostrar, get expresion() { return actual; }, parar() { clearTimeout(temporizador); clearTimeout(parpadeoT); } };
  }

  return { montar, dibujar, EXPRESIONES, AN, AL };
})();

if (typeof module !== 'undefined') module.exports = Farolin;
