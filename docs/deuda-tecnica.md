# Deuda técnica

Decisiones pospuestas a propósito. Cada entrada debe incluir su **motivo** (el verificador lo exige), para distinguir una decisión consciente de un descuido.

- Ejemplo: no se paginó el listado de pedidos. motivo: hoy hay menos de 200 registros; revisar al superar 1.000. fecha: AAAA-MM-DD

- 2026-11-14 · `web/fundacion.js` mezcla lógica y dibujo (~700 líneas) y solo se prueba la parte pura. motivo: separar el módulo de reglas del cliente exige una refactorización aparte (`senior-refactor`), que no se mezcló con la función nueva.
- 2026-11-14 · El cliente repite los costos y los textos de las misiones del servidor. motivo: el servidor no los manda; `test_fundacion_cliente.js` falla si se desincronizan.
