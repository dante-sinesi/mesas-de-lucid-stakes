'use strict';
// La ayuda: láminas con dibujos (dados, fichas, botones e íconos del juego) y muy poco texto, repartidas en secciones (pestañas): cada sección tiene sus propias páginas.
// Se abre con `Ayuda.abrir(contexto)`, donde el contexto trae el catálogo de dados (`dm`), el creador de botones (`nuevoBoton`) y la ventana (`modal`).

const Ayuda = (() => {
  let ctx = null, pagina = 0, seccion = 0;

  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; };
  const ORO = [1.0, 0.85, 0.4], CLARO = [0.92, 0.9, 0.98], VERDE = [0.55, 0.9, 0.45], ROJO = [1.0, 0.54, 0.48];
  const rot = (texto, color, ancho, s) => { const c = V.rotulo(texto, color, ancho, s); c.className = 'ayRot'; return c; };

  const caja = (...hijos) => { const d = el('div', 'ayFila'); hijos.forEach(h => d.appendChild(h)); return d; };
  const flecha = (t = '→') => el('div', 'ayFlecha', t);
  const pie = texto => el('p', 'ayPie', texto);
  // ---------- las láminas ----------
  const dado = (tipo, valor, px = 38, marca = false) => { const d = el('div', 'ayDado' + (marca ? ' marca' : '')); d.appendChild(D3.sprite(tipo, valor, px)); return d; };
  const fila = (...hijos) => { const f = el('div', 'ayFila ayDef'); hijos.forEach(h => f.appendChild(h)); return f; };
  const TODAS = [
    { titulo: 'OBJETIVO', hacer: () => {
        const w = el('div', 'ayApila');
        const f = el('div', 'ayFila'); [[1, true], [5, true], [2, false], [3, false], [6, false]].forEach(([v, m]) => f.appendChild(dado('normal', v, 46, m)));
        w.append(f, el('div', 'ayAyuda', 'El 1 y el 5 puntúan: los apartas'), caja(rot('+150', [0.55, 0.9, 0.45], 100, 5), flecha('→'), el('div', 'ayAyuda', 'tiras los 3 que quedan, o te plantas')));
        return w;
      }, pie: 'Aparta lo que puntúa y tira el resto, o plántate. Si ninguno puntúa, te quemas.' },
    { titulo: 'PUNTOS', hacer: () => {
        const w = el('div', 'ayApila ayPuntaje');
        const lin = (dados, texto) => { const f = el('div', 'ayFila ayDef ayPuntos2'); const ds = el('div', 'ayDados'); dados.forEach(v => ds.appendChild(dado('normal', v, 20))); f.append(ds, rot(texto, [1.0, 0.85, 0.4], 64, 2)); return f; };
        w.append(lin([1], '100'), lin([5], '50'), lin([1, 1, 1], '1000'), lin([4, 4, 4], '400'), lin([3, 3, 3, 3], '600'), lin([2, 2, 2, 2, 2], '5000'), lin([1, 2, 3, 4, 5], '500'), lin([2, 3, 4, 5, 6], '750'));
        w.classList.add('ayPuntaje');
        return w;
      }, pie: 'Todos los dados que apartas tienen que puntuar.' },
    { titulo: 'ENTRAR Y LLEGAR', hacer: () => {
        const w = el('div', 'ayApila');
        w.append(caja(rot('500', ORO, 80, 6), el('div', 'ayAyuda', 'en un turno, para entrar')),
                 el('div', 'ayVs', '↓'),
                 caja(rot('9.950 + 50', CLARO, 150, 4), flecha('='), rot('10.000', [0.55, 0.9, 0.45], 110, 5)));
        return w;
      }, pie: 'Entras con 500 en un turno. Gana quien llega justo a la meta.' },
    { titulo: 'DADOS ESPECIALES', hacer: () => {
        const w = el('div', 'ayGaleria'), grid = el('div', 'ayGrid'), info = el('div', 'ayInfo');
        info.appendChild(el('span', 'ayHint', 'Toca un dado para ver qué hace'));
        const cat = ctx.dm || { dados: {}, orden: ['cargado', 'oro', 'comodin', 'salvavidas', 'espejo', 'pegajoso', 'explosivo', 'multiplicador', 'iman', 'banco', 'poker', 'suerte', 'vampiro', 'doble', 'fantasma', 'escalera', 'apostador'] };
        const orden = cat.orden || Object.keys(cat.dados).filter(k => k !== 'normal');
        orden.forEach(id => {
          const d = cat.dados[id]; if (!d) return;
          const b = el('button', 'tileBtn ayTile'); b.type = 'button'; b.setAttribute('aria-label', d.nombre); b.appendChild(D3.sprite(id, 5, 44));
          b.onclick = () => { grid.querySelectorAll('.ayTile').forEach(x => x.classList.remove('on')); b.classList.add('on'); info.textContent = ''; info.appendChild(el('b', '', d.nombre)); info.appendChild(el('span', '', d.desc)); };
          grid.appendChild(b);
        });
        w.append(grid, info);
        return w;
      }, pie: 'Se compran en la tienda.' },
    { titulo: 'FICHAS Y TIENDA', hacer: () => {
        const w = el('div', 'ayApila');
        w.append(fila(rot('+4', [0.55, 0.9, 0.45], 50, 5), el('div', 'ayAyuda', 'por tirada superada')),
                 fila(rot('+20', [1.0, 0.54, 0.48], 60, 5), el('div', 'ayAyuda', 'si te quemas')),
                 fila(rot('3 %', ORO, 60, 5), el('div', 'ayAyuda', 'de lo que anotas')),
                 fila(dado('oro', 5, 38), dado('comodin', 5, 38), dado('salvavidas', 5, 38), el('div', 'ayAyuda', 'tienda cada 5 turnos')));
        return w;
      }, pie: 'Las fichas sirven en la tienda.' },
    { titulo: 'MODOS', hacer: () => {
        const w = el('div', 'ayApila');
        w.append(fila(rot('AMIGOS', ORO, 100, 4), el('div', 'ayAyuda', 'hasta 8, por turnos')),
                 fila(rot('CARRERA', ORO, 110, 4), el('div', 'ayAyuda', 'solo: en menos turnos')),
                 fila(rot('ESCALERA', ORO, 120, 4), el('div', 'ayAyuda', 'solo: metas crecientes')));
        return w;
      }, pie: 'Con amigos o solo, con metas cada vez más altas.' },
  ];
  const SECCIONES = [
    { rotulo: 'JUEGO', nombre: 'Cómo se juega', laminas: ['OBJETIVO', 'PUNTOS', 'ENTRAR Y LLEGAR'] },
    { rotulo: 'DADOS', nombre: 'Dados y tienda', laminas: ['DADOS ESPECIALES', 'FICHAS Y TIENDA'] },
    { rotulo: 'MODOS', nombre: 'Modos de juego', laminas: ['MODOS'] },
  ];
  const LAMINAS = SECCIONES.map(s => s.laminas.map(t => TODAS.find(l => l.titulo === t)));


  // ---------- las láminas del 13 Jack ----------
  const cartaAy = (r, e, px = 44, p) => cartaTJ(r, e, px, false, false, p);
  // Las filas de la tabla de patrones (nombre y puntos salen del servidor): [desde, hasta).
  function patronesLamina(desde, hasta) {
    const w = el('div', 'ayApila ayPuntaje');
    ((ctx.tj && ctx.tj.patrones) || []).slice(desde, hasta).forEach(x => {
      const f = el('div', 'ayFila ayDef ayPuntos2'), cs = el('div', 'tjFilaCartas');
      x.ejemplo.forEach(c => cs.appendChild(cartaTJ(c.r, null, 24, false, false, c.p)));
      const t = el('div', 'ayPatTxt'); t.append(el('b', '', x.nombre), el('span', '', '+' + x.puntos));
      f.append(cs, t); w.appendChild(f);
    });
    return w;
  }
  const TODAS_TJ = [
    { titulo: 'OBJETIVO', hacer: () => {
        const w = el('div', 'ayApila');
        const f = el('div', 'ayFila'); [[10, null], [6, null], [5, null]].forEach(([r, e]) => f.appendChild(cartaAy(r, e, 60)));
        w.append(f, caja(rot('21', [0.55, 0.9, 0.45], 70, 6), flecha('='), rot('30 PUNTOS', ORO, 150, 4)));
        return w;
      }, pie: 'Llega a 21 sin pasarte. Un 21 exacto vale 30.' },
    { titulo: 'TU MAZO', hacer: () => {
        const g = el('div', 'tjGridMazo'); g.style.maxWidth = '300px';
        for (let r = 1; r <= 13; r++) g.appendChild(cartaTJ(r, null, 36, [2, 5, 9, 12].includes(r)));
        return g;
      }, pie: 'Las cartas que usas no vuelven. Las apagadas ya salieron.' },
    { titulo: 'MANOS Y MAZOS', hacer: () => {
        const w = el('div', 'ayApila');
        w.append(fila(rot('4 MANOS', ORO, 120, 5), el('div', 'ayAyuda', 'un mazo')),
                 fila(rot('3 · 5 · 8', ORO, 110, 5), el('div', 'ayAyuda', 'mazos por partida')),
                 fila(rot('0', [1.0, 0.54, 0.48], 40, 5), el('div', 'ayAyuda', 'si te pasas')));
        return w;
      }, pie: 'Sin cartas sobrantes, +25.' },
    { titulo: 'PATRONES', hacer: () => patronesLamina(0, 4), pie: 'Suman extra a la mano. Se ven mientras pides.' },
    { titulo: 'MÁS PATRONES', hacer: () => patronesLamina(4, 9), pie: '' },
    { titulo: 'CARTAS ESPECIALES', hacer: () => {
        const w = el('div', 'ayGaleria'), grid = el('div', 'ayGrid'), info = el('div', 'ayInfo');
        info.appendChild(el('span', 'ayHint', 'Toca una carta para ver qué hace'));
        const cat = ctx.tj || { especiales: {}, orden: [] };
        cat.orden.forEach((id, i) => {
          const d = cat.especiales[id]; if (!d) return;
          const b = el('button', 'tileBtn ayTile'); b.type = 'button'; b.setAttribute('aria-label', d.nombre); b.appendChild(cartaAy(1 + (i + 2) % 13, id, 32, i % 4));
          b.onclick = () => { grid.querySelectorAll('.ayTile').forEach(x => x.classList.remove('on')); b.classList.add('on'); info.textContent = ''; info.appendChild(el('b', '', d.nombre)); info.appendChild(el('span', '', d.desc)); };
          grid.appendChild(b);
        });
        w.append(grid, info);
        return w;
      }, pie: 'Se compran en la tienda.' },
    { titulo: 'FICHAS Y TIENDA', hacer: () => {
        const w = el('div', 'ayApila');
        w.append(fila(rot('+1', [0.55, 0.9, 0.45], 50, 5), el('div', 'ayAyuda', 'cada 5 puntos del mazo')),
                 fila(rot('+5', ORO, 50, 5), el('div', 'ayAyuda', 'por cada 21 exacto')),
                 fila(rot('+3', [1.0, 0.54, 0.48], 50, 5), el('div', 'ayAyuda', 'por mano pasada')));
        return w;
      }, pie: 'La tienda abre cada 2 mazos.' },
  ];
  const SECCIONES_TJ = [
    { rotulo: 'JUEGO', nombre: 'Cómo se juega', laminas: ['OBJETIVO', 'TU MAZO', 'PATRONES', 'MÁS PATRONES', 'MANOS Y MAZOS'] },
    { rotulo: 'CARTAS', nombre: 'Cartas especiales y tienda', laminas: ['CARTAS ESPECIALES', 'FICHAS Y TIENDA'] },
  ];
  const LAMINAS_TJ = SECCIONES_TJ.map(s => s.laminas.map(t => TODAS_TJ.find(l => l.titulo === t)));


  function pintar() {
    const tj = ctx.juego === 'trecejack', SEC = tj ? SECCIONES_TJ : SECCIONES, LAM = tj ? LAMINAS_TJ : LAMINAS;
    const c = ctx.cuerpo, paginas = LAM[seccion];
    c.textContent = '';
    ctx.tabs.textContent = '';
    SEC.forEach((s, i) => {
      const b = el('button', 'ayTab' + (i === seccion ? ' on' : '')); b.type = 'button'; b.setAttribute('aria-label', s.nombre); b.setAttribute('aria-pressed', i === seccion ? 'true' : 'false');
      b.appendChild(rot(s.rotulo, i === seccion ? ORO : CLARO, 84, 2));
      b.onclick = () => { if (i === seccion) return; seccion = i; pagina = 0; pintar(); };
      ctx.tabs.appendChild(b);
    });
    const lam = paginas[pagina];
    const cab = el('div', 'ayTitulo'); cab.appendChild(rot(lam.titulo, ORO, 300, 5));
    const escena = el('div', 'ayEscena'); escena.appendChild(lam.hacer());
    c.append(cab, escena, pie(lam.pie));
    ctx.puntos.textContent = '';
    paginas.forEach((_, i) => { const p = el('button', 'ayPunto' + (i === pagina ? ' on' : '')); p.type = 'button'; p.setAttribute('aria-label', 'Lámina ' + (i + 1)); p.onclick = () => { pagina = i; pintar(); }; ctx.puntos.appendChild(p); });
    ctx.ant.style.visibility = pagina > 0 ? 'visible' : 'hidden';
    ctx.sig.style.visibility = pagina < paginas.length - 1 ? 'visible' : 'hidden';
    ctx.nav.style.display = paginas.length > 1 ? '' : 'none';   // (una sección de una sola página no necesita flechas ni puntos)
  }
  const ir = d => { const LAM = ctx.juego === 'trecejack' ? LAMINAS_TJ : LAMINAS; pagina = Math.max(0, Math.min(LAM[seccion].length - 1, pagina + d)); pintar(); };

  // Arma la ventana (una sola vez) y la abre en la primera lámina (o donde se quedó).
  function abrir(contexto, desde) {
    if (!ctx) {
      ctx = contexto;
      const cajaAyuda = ctx.modal.querySelector('.cajaAyuda');
      cajaAyuda.textContent = '';
      ctx.tabs = el('div', 'ayTabs');
      ctx.cuerpo = el('div', 'ayCuerpo');
      ctx.puntos = el('div', 'ayPuntos');
      ctx.ant = ctx.nuevoBoton('←', () => ir(-1)); ctx.sig = ctx.nuevoBoton('→', () => ir(1));
      const nav = el('div', 'ayNav'); nav.append(ctx.ant, ctx.puntos, ctx.sig); ctx.nav = nav;
      const cerrar = ctx.nuevoBoton('Cerrar', () => { ctx.modal.hidden = true; });
      const bot = el('div', 'botonesFin'); bot.appendChild(cerrar);
      cajaAyuda.append(ctx.tabs, ctx.cuerpo, nav, bot);
      let x0 = null;
      ctx.cuerpo.addEventListener('touchstart', ev => { x0 = ev.touches[0].clientX; }, { passive: true });
      ctx.cuerpo.addEventListener('touchend', ev => { if (x0 === null) return; const dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1); }, { passive: true });
      document.addEventListener('keydown', ev => { if (ctx.modal.hidden) return; if (ev.key === 'ArrowRight') ir(1); else if (ev.key === 'ArrowLeft') ir(-1); else if (ev.key === 'Escape') ctx.modal.hidden = true; });
    } else { ctx.dm = contexto.dm; ctx.tj = contexto.tj; ctx.juego = contexto.juego; }
    seccion = 0; pagina = 0;   // (siempre se abre en la primera página de la primera sección)
    pintar();
    ctx.modal.hidden = false;
  }

  return { abrir, SECCIONES, TODAS };
})();
