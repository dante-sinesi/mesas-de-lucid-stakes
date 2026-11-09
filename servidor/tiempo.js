'use strict';
// El tiempo de una sala: 'normal', 'extendido' (el doble en lo que corre el reloj) o 'libre' (plazos de una hora y sin relojes a la vista).
const TIEMPO_VALIDO = t => (['normal', 'extendido', 'libre'].includes(t) ? t : 'normal');
// Los plazos que cambian según el tiempo de la sala (los que no se nombran en `claves` quedan como están).
function escalarTiempos(base, claves, tiempo) {
  const out = {};
  if (tiempo === 'normal') return out;
  for (const c of claves) out[c] = tiempo === 'libre' ? 3600000 : base[c] * 2;
  return out;
}
module.exports = { TIEMPO_VALIDO, escalarTiempos };
