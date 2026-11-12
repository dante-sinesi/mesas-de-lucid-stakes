---
tipo: diagrama
titulo: Módulos y dependencias
resumen: Mapa de módulos y de qué módulo usa a cuál, inferido de las importaciones.
tags: [diagrama, inferido]
---
<!-- generado por documentar.py: provisorio, inferido del código. Se regenera con `documentar.py estructura --aplicar`; para editarlo a mano, borrar esta línea. -->

# Módulos y dependencias

Mapa inferido de las importaciones del código; no incluye las dependencias que el análisis no puede ver.

### Dependencias entre módulos

¿Qué módulo usa a qué otro módulo? Cada flecha va del módulo que importa al módulo importado y el número es la cantidad de importaciones. Entre paréntesis, la cantidad de archivos de cada módulo.

```mermaid
flowchart LR
    m0["(raíz) (1)"]
    m1["herramientas (2)"]
    m2["presentacion (31)"]
    m3["prototipos (8)"]
    m4["pruebas (2)"]
    m5["servidor (10)"]
    m6["simulador (6)"]
    m7["web (18)"]
    m0 -->|1| m5
    m2 -->|3| m5
```
