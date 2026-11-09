'use strict';
// Lo que comparten los bots del Diez mil y del 13 Jack: los nombres, cuántos puede haber y cuánto "piensan" antes de cada jugada.
// Un bot es un jugador más (ocupa un asiento, tiene apodo) marcado con `bot: true`; el servidor juega por él. Los asientos de los bots son los últimos de la mesa.

const NOMBRES = ['Juan', 'Gaby', 'Ama', 'Farolín', 'Dante', 'Catherine', 'Lucía', 'Bruno'];
const MAX_BOTS = 7;   // con al menos un humano en la sala, bots + humanos no pasan de 8

// Cuántos bots se piden: un entero de 0 a lo que deje libre la sala.
function cantidadValida(n, asientos) {
  n = Math.floor(Number(n));
  return n >= 1 ? Math.min(n, MAX_BOTS, Math.max(0, asientos - 1)) : 0;
}

// El primer nombre que no esté en uso en la sala.
function nombreLibre(jugadores) {
  const usados = new Set(jugadores.map(j => j.apodo.toLowerCase()));
  return NOMBRES.find(n => !usados.has(n.toLowerCase())) || 'Bot ' + (jugadores.length + 1);
}

// Un identificador que nadie puede adivinar (no pasa por la validación de tokens de los clientes).
const tokenBot = () => 'bot:' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

// Cuánto espera el bot antes de su próxima jugada (ms): lo justo para que se vea qué hace. `estado` es el del turno del Diez mil, si lo hay.
function demora(estado) {
  const [min, max] = { tirar: [1000, 1500], quemada: [1200, 1700], apartar: [900, 1300], decidir: [800, 1200] }[estado] || [900, 1400];
  return min + Math.floor(Math.random() * (max - min));
}

module.exports = { NOMBRES, MAX_BOTS, cantidadValida, nombreLibre, tokenBot, demora };
