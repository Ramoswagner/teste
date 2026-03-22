/**
 * js/state.js
 * ─────────────────────────────────────────────
 * Estado global encapsulado via Proxy.
 * Qualquer atribuição (_state.D = x) é feita
 * pelo setter interno — garantindo que update()
 * seja sempre chamado automaticamente.
 *
 * Exporta também escapeHtml() para uso em todos
 * os módulos que montam HTML dinâmico.
 */

'use strict';

// ── Estado interno (não exposto diretamente) ──
const _state = { D: 1, I: 1, C1: 1, C2: 1, E: 1 };

// ── Proxy público: state.D = 2 chama update() ──
// eslint-disable-next-line no-unused-vars
const state = new Proxy(_state, {
  set(target, key, value) {
    if (!(key in target)) return false;
    target[key] = value;
    if (typeof update === 'function') update();
    return true;
  },
  get(target, key) {
    return target[key];
  }
});

/**
 * Lê o valor bruto de um fator sem passar pelo Proxy.
 * Usado internamente nos cálculos e na exportação.
 * @param {string} factor - 'D' | 'I' | 'C1' | 'C2' | 'E'
 * @returns {number}
 */
function getFactorValue(factor) {
  return _state[factor];
}

/**
 * Define o valor de um fator sem passar pelo Proxy
 * (usado pelo reset, que precisa modificar todos os
 * fatores antes de chamar update() uma única vez).
 * @param {string} factor
 * @param {number} value
 */
function setFactorRaw(factor, value) {
  _state[factor] = value;
}

/**
 * Sanitiza uma string para inserção segura em innerHTML.
 * Previne XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
