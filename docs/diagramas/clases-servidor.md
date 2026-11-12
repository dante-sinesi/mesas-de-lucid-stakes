---
tipo: diagrama
titulo: Clases del módulo servidor
resumen: Diagramas de clases inferidos del módulo servidor.
tags: [diagrama, inferido]
---
<!-- generado por documentar.py: provisorio, inferido del código. Se regenera con `documentar.py estructura --aplicar`; para editarlo a mano, borrar esta línea. -->

# Clases del módulo servidor

Clases inferidas del código del módulo `servidor` (5 en total). Evidencia: `servidor/trecejack/mesa_13.js:24`, `servidor/diezmil/mesa_dm.js:28`, `servidor/fundacion/mesa_fundacion.js:19`, `servidor/salas.js:28`, `servidor/diezmil/reglas.js:186`.

### Clases del módulo servidor

¿Qué clases tiene el módulo servidor y cómo se heredan? Se muestran hasta 8 métodos por clase.

```mermaid
classDiagram
    class Mesa13 {
        +_abrirTienda()
        +_anfitrionEnEspera()
        +_ausentes()
        +_cambio()
        +_cartasDe()
        +_comprarBot()
        +_crearBot()
        +_despuesDelResumen()
    }
    class MesaDM {
        +_abrirTienda()
        +_alcanzoLaMeta()
        +_anfitrionEnEspera()
        +_ausentes()
        +_automatico()
        +_aviso()
        +_cambio()
        +_cerrarTienda()
    }
    class MesaFundacion {
        +_actor()
        +_agotado()
        +_anfitrionEnEspera()
        +_anotarReserva()
        +_ausentes()
        +_calcularReserva()
        +_cambio()
        +_clave()
    }
    class Salas {
        +_accionSala()
        +_anotarFin()
        +_asientos()
        +_avisar()
        +_cargar()
        +_clave()
        +_crearDiezMil()
        +_crearFundacion()
    }
    class Turno {
        +_espejoSalva()
        +_evaluar()
        +_evaluarSinContar()
        +_hayJugadas()
        +_item()
        +_quemar()
        +_quemaria()
        +_sinQuemarse()
    }
```
