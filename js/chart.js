/**
 * js/chart.js
 * ─────────────────────────────────────────────
 * Renderização do gráfico DICE via Canvas 2D.
 * Suporte completo a HiDPI / Retina.
 * Null guard: seguro mesmo se o canvas não existir.
 *
 * Depende de: (nenhuma — recebe score como argumento)
 */

'use strict';

/**
 * Retorna o elemento canvas, ou null se não existir.
 * @returns {HTMLCanvasElement|null}
 */
function getCanvas() {
  return document.getElementById('diceChart');
}

/**
 * Configura as dimensões do canvas respeitando o
 * devicePixelRatio para evitar borrão em telas Retina.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number }}
 */
function setupCanvas(canvas) {
  const dpr      = window.devicePixelRatio || 1;
  const displayW = canvas.offsetWidth  || 900;
  const displayH = Math.round(displayW * 380 / 900);
  const physW    = Math.round(displayW * dpr);
  const physH    = Math.round(displayH * dpr);

  if (canvas.width !== physW || canvas.height !== physH) {
    canvas.width        = physW;
    canvas.height       = physH;
    canvas.style.width  = displayW + 'px';
    canvas.style.height = displayH + 'px';
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // escala pelo DPR
  return { ctx, W: displayW, H: displayH, dpr };
}

/**
 * Desenha o gráfico DICE completo no canvas.
 * @param {number} score - score atual (7–28)
 */
// eslint-disable-next-line no-unused-vars
function drawChart(score) {
  const canvas = getCanvas();
  if (!canvas) return; // null guard

  const { ctx, W, H } = setupCanvas(canvas);
  ctx.clearRect(0, 0, W, H);

  const transparent = document.getElementById('transparentToggle')?.checked ?? false;
  const ML = 120, MR = 20, MT = 50, MB = 50;
  const PW = W - ML - MR;
  const PH = H - MT - MB;

  // Conversores de coordenadas do modelo → pixels
  const px = x => ML + (x - 7) / 21 * PW;
  const py = y => MT + (1 - y / 5) * PH;

  // ── Fundo ──
  if (!transparent) {
    ctx.fillStyle = '#0B1E33';
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(ML, MT, ML + PW, MT + PH);
    bg.addColorStop(0, 'rgba(196,163,90,0.12)');
    bg.addColorStop(1, 'rgba(11,30,51,0.8)');
    ctx.fillStyle = bg;
    ctx.fillRect(ML, MT, PW, PH);
  }

  // ── Polígonos de zona ──
  _drawZonePolygons(ctx, px, py, transparent);

  // ── Barra de labels inferior ──
  const bh = PH * (0.6 / 5);
  const by = py(0) - bh;
  _drawZoneBar(ctx, px, by, bh, transparent);

  // ── Separadores verticais de zona ──
  _drawZoneDividers(ctx, px, py, transparent);

  // ── Grid de eixos ──
  _drawGrid(ctx, px, py, ML, PW, transparent);

  // ── Marcador do score (elevado para não colidir com barra) ──
  _drawScoreMarker(ctx, px, py, score, by);
}

// ─────────────────── Funções auxiliares de desenho ───────────────────

function _drawZonePolygons(ctx, px, py, transparent) {
  ctx.globalAlpha = 0.65;

  // WIN
  ctx.beginPath();
  ctx.moveTo(px(7),  py(5));
  ctx.lineTo(px(14), py(5));
  ctx.lineTo(px(14), py(4));
  ctx.lineTo(px(9),  py(4));
  ctx.closePath();
  ctx.fillStyle = '#03A63C';
  ctx.fill();

  // WORRY
  ctx.beginPath();
  ctx.moveTo(px(14), py(5));
  ctx.lineTo(px(17), py(5));
  ctx.lineTo(px(17), py(1.75));
  ctx.lineTo(px(14), py(4));
  ctx.closePath();
  ctx.fillStyle = '#F2B705';
  ctx.fill();

  ctx.globalAlpha = 0.55;

  // WOE
  ctx.beginPath();
  ctx.moveTo(px(17), py(5));
  ctx.lineTo(px(18), py(5));
  ctx.lineTo(px(21), py(3));
  ctx.lineTo(px(25), py(3));
  ctx.lineTo(px(28), py(1));
  ctx.lineTo(px(18), py(1));
  ctx.lineTo(px(17), py(1.75));
  ctx.closePath();
  ctx.fillStyle = '#F25C5C';
  ctx.fill();

  ctx.globalAlpha = 1;
}

function _drawZoneBar(ctx, px, by, bh, transparent) {
  ctx.fillStyle = '#03A63C';
  ctx.fillRect(px(7),  by, px(14) - px(7),  bh);
  ctx.fillStyle = '#F2B705';
  ctx.fillRect(px(14), by, px(17) - px(14), bh);
  ctx.fillStyle = '#F25C5C';
  ctx.fillRect(px(17), by, px(28) - px(17), bh);

  ctx.font = 'bold 11px "Cormorant Garamond",serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = transparent ? 'rgba(255,255,255,0.9)' : '#fff';
  ctx.fillText('WIN',   px(10.5), by + bh / 2);
  ctx.fillText('WORRY', px(15.5), by + bh / 2);
  ctx.fillText('WOE',   px(22.5), by + bh / 2);
}

function _drawZoneDividers(ctx, px, py, transparent) {
  ctx.save();
  ctx.strokeStyle = transparent ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(px(14), py(5)); ctx.lineTo(px(14), py(0)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = transparent ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.moveTo(px(17), py(5)); ctx.lineTo(px(17), py(0)); ctx.stroke();
  ctx.restore();
}

function _drawGrid(ctx, px, py, ML, PW, transparent) {
  const tc = transparent ? 'rgba(200,210,230,0.85)' : '#8A9BB5';
  const gc = transparent ? 'rgba(255,255,255,0.1)'  : 'rgba(255,255,255,0.05)';

  // Eixo Y
  ctx.font          = '11px "Inter",sans-serif';
  ctx.textAlign     = 'right';
  ctx.textBaseline  = 'middle';
  ctx.fillStyle     = tc;
  for (let y = 0; y <= 5; y++) {
    const yy = py(y);
    ctx.fillText(y, ML - 10, yy);
    ctx.save();
    ctx.strokeStyle = gc; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ML, yy); ctx.lineTo(ML + PW, yy); ctx.stroke();
    ctx.restore();
  }

  // Eixo X
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = tc;
  for (let x = 7; x <= 28; x++) {
    const xx = px(x);
    ctx.fillText(x, xx, py(0) + 6);
    ctx.save();
    ctx.strokeStyle = transparent ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(xx, py(0)); ctx.lineTo(xx, py(0) + 4); ctx.stroke();
    ctx.restore();
  }
}

function _drawScoreMarker(ctx, px, py, score, by) {
  const xm = px(score);
  const yd = py(1.5); // elevado para não colidir com a barra de labels

  // Linha vertical tracejada
  ctx.save();
  ctx.shadowColor  = 'rgba(196,163,90,0.9)';
  ctx.shadowBlur   = 15;
  ctx.strokeStyle  = 'rgba(255,255,255,0.9)';
  ctx.lineWidth    = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(xm, py(5)); ctx.lineTo(xm, by); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Círculo dourado
  ctx.beginPath();
  ctx.arc(xm, yd, 7, 0, Math.PI * 2);
  ctx.fillStyle    = '#D8B87A';
  ctx.shadowColor  = '#D8B87A';
  ctx.shadowBlur   = 15;
  ctx.fill();
  ctx.shadowBlur   = 0;

  // Label de score dentro do círculo
  ctx.font          = 'bold 12px "Inter",sans-serif';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillStyle     = '#0B1E33';
  ctx.fillText(score, xm, yd);
}
