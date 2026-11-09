"""Convierte el volcado de glifos del juego (herramientas/exportar_glifos.gd del juego) en web/glifos.js.
Uso: python herramientas/generar_glifos.py herramientas/_glifos.json"""
import json, sys, os
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
datos = json.load(open(sys.argv[1], encoding='utf-8'))
glifos = {ch: cells for ch, cells in datos['glifos'].items()}
salida = os.path.join(raiz, 'web', 'glifos.js')
with open(salida, 'w', encoding='utf-8', newline='\n') as f:
    f.write("'use strict';\n// Las celdas de cada carácter de la fuente de cubitos del juego (generado por herramientas/generar_glifos.py; no se edita a mano).\n")
    f.write('const GLIFOS = ' + json.dumps(glifos, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('const FUENTE = ' + json.dumps({'ancho': datos['ancho'], 'avance': datos['avance'], 'alto': datos['filas_acento'] + datos['filas_cuerpo'] + datos['filas_cola']}) + ';\n')
print('glifos:', len(glifos))
