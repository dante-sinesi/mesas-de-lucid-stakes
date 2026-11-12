---
tipo: consulta
ronda: 1
tema: Reglas de negocio candidatas (inferidas del código)
estado: abierta
generado: documentar:reglas
---

# Consulta 1: Reglas de negocio candidatas (inferidas del código)

> **Cómo responder.** Escribir debajo de cada pregunta, en **Respuesta:**. Si estás de acuerdo con la **Propuesta**, alcanza con `ok`. Lo que quede sin responder no bloquea nada: queda como regla provisoria.

## Lo que entendí hasta ahora

El código parece aplicar reglas de negocio en estos lugares. **Lo que el código hace hoy no es necesariamente lo que debería hacer:** esta consulta sirve para confirmarlo o corregirlo.

- 2 de tipo «constante»
- 4 de tipo «estados»
- 4 de tipo «umbral»
- 4 de tipo «validación»

## Supuestos que usaré salvo que se diga lo contrario

- Cada regla se toma tal como está en el código, como provisoria, hasta que la confirmes.

## Preguntas

### Reglas candidatas

#### P1. Constante con significado de negocio en `presentacion/montar.py`

**Lo que hace el código:** `presentacion/montar.py:119` — `'T4': START['m1'], 'dur': round(TOTAL, 2), 'whoosh': [START['lobby'] - 0.35, START['dm'] - 0.3, START['dmr'] - 0.2, START['tj'] - 0.3, START`
**Por qué importa:** un valor de negocio escrito en el código se cambia sin avisar y nadie lo revisa.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P2. Constante con significado de negocio en `prototipos/dados/dados.js`

**Lo que hace el código:** `prototipos/dados/dados.js:194` — `this.estado = this.caras.map((c, i) => ({ pos: [(i - 2) * SPACING, HALF, 0], R: orient(c, YAWS[i]), squash: 0 }));`
**Por qué importa:** un valor de negocio escrito en el código se cambia sin avisar y nadie lo revisa.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P3. Estados o tipos posibles en `servidor/diezmil/reglas.js`

**Lo que hace el código:** `servidor/diezmil/reglas.js:17` — `const TIPOS = {`
**Por qué importa:** fija los estados que puede tener algo y, con ellos, qué transiciones tienen sentido.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P4. Estados o tipos posibles en `servidor/diezmil/reglas.js`

**Lo que hace el código:** `servidor/diezmil/reglas.js:37` — `const ORDEN_TIPOS = ['cargado', 'oro', 'comodin', 'salvavidas', 'espejo', 'pegajoso', 'explosivo', 'multiplicador', 'iman', 'banco', 'poker'`
**Por qué importa:** fija los estados que puede tener algo y, con ellos, qué transiciones tienen sentido.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P5. Estados o tipos posibles en `servidor/fundacion/reglas.js`

**Lo que hace el código:** `servidor/fundacion/reglas.js:22` — `const TIPOS_19 = { bosque: 4, colinas: 3, pastos: 4, campos: 4, montana: 3, desierto: 1 };`
**Por qué importa:** fija los estados que puede tener algo y, con ellos, qué transiciones tienen sentido.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P6. Estados o tipos posibles en `servidor/fundacion/reglas.js`

**Lo que hace el código:** `servidor/fundacion/reglas.js:23` — `const TIPOS_37 = { bosque: 7, colinas: 7, pastos: 8, campos: 8, montana: 6, desierto: 1 };`
**Por qué importa:** fija los estados que puede tener algo y, con ellos, qué transiciones tienen sentido.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P7. Umbral o condición con un valor fijo en `prototipos/caballeros_fundacion/caballeros.js`

**Lo que hace el código:** `prototipos/caballeros_fundacion/caballeros.js:38` — `if (opcion === 'A' && n >= 3) { const o = OPA_MINI[n][i], img = mini(COLORES[i]); figuras.push({ y: cy + o[1] + img.height, f: () => g.drawI`
**Por qué importa:** si el valor o la condición está mal, el cálculo o la decisión sale incorrecto en producción.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P8. Umbral o condición con un valor fijo en `prototipos/etapas_isla/arte.js`

**Lo que hace el código:** `prototipos/etapas_isla/arte.js:288` — `else if (et === 4) { oscurecer(g, 0.6); cand.forEach((v, i) => punto(g, v, i === 0 ? 5.2 : 3.4)); const img = casa(JUG[0]); g.drawImage(img,`
**Por qué importa:** si el valor o la condición está mal, el cálculo o la decisión sale incorrecto en producción.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P9. Umbral o condición con un valor fijo en `servidor/diezmil/mesa_dm.js`

**Lo que hace el código:** `servidor/diezmil/mesa_dm.js:23` — `const PRECIO_GRABADO = valor => (valor === 1 ? 100 : (valor === 5 ? 60 : 30));`
**Por qué importa:** si el valor o la condición está mal, el cálculo o la decisión sale incorrecto en producción.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P10. Umbral o condición con un valor fijo en `servidor/diezmil/mesa_dm.js`

**Lo que hace el código:** `servidor/diezmil/mesa_dm.js:229` — `this.t = new R.Turno(j.dados, j.total, j.entrado, { meta: this.meta, trabados, entrada: this._entradaDe(j), piedad: !this.tutorial && (j.que`
**Por qué importa:** si el valor o la condición está mal, el cálculo o la decisión sale incorrecto en producción.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P11. Regla de validación de datos en `presentacion/ver_v1.js`

**Lo que hace el código:** `presentacion/ver_v1.js:4` — `const alto = Math.min(5000, await e.js('document.body.scrollHeight')); await e.enviar('Emulation.setDeviceMetricsOverride', { width: 1500, h`
**Por qué importa:** define qué datos acepta el sistema; una regla de más o de menos rechaza o deja pasar datos indebidos.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P12. Regla de validación de datos en `servidor/diezmil/mesa_dm.js`

**Lo que hace el código:** `servidor/diezmil/mesa_dm.js:320` — `const robo = Math.min(50, lider.total);`
**Por qué importa:** define qué datos acepta el sistema; una regla de más o de menos rechaza o deja pasar datos indebidos.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P13. Regla de validación de datos en `web/diezmil.js`

**Lo que hace el código:** `web/diezmil.js:645` — `b.style.width = total ? Math.max(0, Math.min(100, quedan / total * 100)) + '%' : '0%';`
**Por qué importa:** define qué datos acepta el sistema; una regla de más o de menos rechaza o deja pasar datos indebidos.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

#### P14. Regla de validación de datos en `web/diezmil.js`

**Lo que hace el código:** `web/diezmil.js:654` — `const q = $('dmBarraQ'); if (q && e.limite) q.style.width = Math.max(0, Math.min(100, (e.limite - ahora()) / 5000 * 100)) + '%';`
**Por qué importa:** define qué datos acepta el sistema; una regla de más o de menos rechaza o deja pasar datos indebidos.
**Opciones:** a) es la regla correcta; b) es incorrecta (indicar cuál es); c) ya no aplica.
**Propuesta:** a. Queda como regla provisoria y sin test hasta que se confirme.
**Respuesta:**

## Espacio libre

(Reglas que el código no muestra, o que están en otro lado.)

**Respuesta:**
