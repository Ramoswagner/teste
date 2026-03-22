/**
 * js/export.js
 * ─────────────────────────────────────────────
 * Exportações do DICE:
 * - exportPDF(): gera relatório A4 de 3 páginas via window.print()
 * - savePNG(): exporta o canvas como imagem PNG
 * - Banner persistente quando popup está bloqueado
 *
 * Depende de: state.js, data.js, calc.js, ui.js (showToast)
 */

'use strict';

// HTML do último PDF montado — guardado para retry de popup
let _pendingPDFHtml = null;

// ══════════════════════════════════════════════
// Banner de popup bloqueado
// ══════════════════════════════════════════════

/**
 * Exibe o banner persistente quando window.open() é bloqueado.
 */
function showPopupBanner() {
  document.getElementById('popupBanner').classList.add('show');
}

/**
 * Descarta o banner e limpa o HTML pendente.
 */
// eslint-disable-next-line no-unused-vars
function dismissPopupBanner() {
  document.getElementById('popupBanner').classList.remove('show');
  _pendingPDFHtml = null;
}

// Retry: tenta abrir a janela de impressão novamente
document.getElementById('popupRetry').addEventListener('click', function () {
  if (_pendingPDFHtml) _openPrintWindow(_pendingPDFHtml);
});

/**
 * Tenta abrir uma nova janela com o HTML fornecido.
 * Se bloqueado pelo navegador, exibe o banner persistente.
 * @param {string} html
 */
function _openPrintWindow(html) {
  const win = window.open('', '_blank');
  if (!win) {
    showPopupBanner();
    return;
  }
  dismissPopupBanner();
  win.document.open();
  win.document.write(html);
  win.document.close();
  showToast('Abrindo relatório — aguarde o diálogo de impressão...');
}

// ══════════════════════════════════════════════
// Exportar PNG
// ══════════════════════════════════════════════

/**
 * Exporta o canvas do gráfico DICE como PNG.
 * Respeita a opção de fundo transparente.
 */
// eslint-disable-next-line no-unused-vars
function savePNG() {
  const canvas = document.getElementById('diceChart');
  if (!canvas) return;

  const transparent = document.getElementById('transparentToggle')?.checked ?? false;
  const off = document.createElement('canvas');
  off.width  = canvas.width;
  off.height = canvas.height;
  const oc = off.getContext('2d');

  if (!transparent) {
    oc.fillStyle = '#0B1E33';
    oc.fillRect(0, 0, off.width, off.height);
  }
  oc.drawImage(canvas, 0, 0);

  const sc   = calcScore();
  const link = document.createElement('a');
  link.download = `dice-${zoneLabel(sc).toLowerCase()}-${sc}.png`;
  link.href     = off.toDataURL('image/png');
  link.click();

  showToast('PNG exportado com sucesso!');
}

// ══════════════════════════════════════════════
// Exportar PDF (window.print nativo, 3 páginas A4)
// ══════════════════════════════════════════════

/**
 * Monta o HTML completo do relatório A4 e abre
 * a janela de impressão do navegador.
 */
// eslint-disable-next-line no-unused-vars
function exportPDF() {
  const sc       = calcScore();
  const z        = zone(sc);
  const zl       = zoneLabel(sc);
  const now      = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long',   year: 'numeric' });
  const nowShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const ts       = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const reportId = 'DICE-' + sc + '-' + nowShort.replace(/[^a-zA-Z0-9]/g, '');

  // Nome do projeto — sanitizado para HTML
  const projectName = escapeHtml(
    document.getElementById('projectName')?.value?.trim() || 'Projeto sem nome'
  );

  // Justificativas — truncadas e sanitizadas
  const truncate = (str, n = 280) => str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
  const J = {
    D:  escapeHtml(truncate(document.getElementById('justD')?.value?.trim()  || '')),
    I:  escapeHtml(truncate(document.getElementById('justI')?.value?.trim()  || '')),
    C1: escapeHtml(truncate(document.getElementById('justC1')?.value?.trim() || '')),
    C2: escapeHtml(truncate(document.getElementById('justC2')?.value?.trim() || '')),
    E:  escapeHtml(truncate(document.getElementById('justE')?.value?.trim()  || ''))
  };

  const zc  = ZONE_COLORS[z];
  const zbg = ZONE_BG[z];
  const zbd = ZONE_BORDER[z];

  const factors = getFactorsForPDF();

  // Monta as três seções do relatório
  const coverBarsHtml  = _buildCoverBars(factors);
  const factorRowsHtml = _buildFactorRows(factors, J);
  const recRowsHtml    = _buildRecRows(z, zc);

  const html = _assemblePDFDocument({
    projectName, sc, z, zl, now, nowShort, ts, reportId,
    zc, zbg, zbd,
    coverBarsHtml, factorRowsHtml, recRowsHtml
  });

  _pendingPDFHtml = html;
  _openPrintWindow(html);
}

// ══════════════════════════════════════════════
// Builders de HTML do PDF (privados)
// ══════════════════════════════════════════════

function _buildCoverBars(factors) {
  return factors.map(f => {
    const pct = Math.round(f.comp / f.max * 100);
    const col = RISK_COLOR[f.val];
    return `<tr>
      <td style="font-size:8px;font-weight:700;letter-spacing:.08em;color:#A0B3CC;padding-right:3mm;white-space:nowrap;text-align:right;width:12mm">${f.key}</td>
      <td style="width:60mm;padding-right:3mm">
        <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div>
        </div>
      </td>
      <td style="font-size:9px;font-weight:700;color:${col};white-space:nowrap">${f.comp}/${f.max}</td>
    </tr>`;
  }).join('');
}

function _buildFactorRows(factors, J) {
  return factors.map(f => {
    const col  = RISK_COLOR[f.val];
    const pct  = Math.round(f.comp / f.max * 100);
    const just = J[f.key];
    return `
    <div style="margin-bottom:3mm;padding:3mm 4mm;background:#fafafa;border-radius:7px;border:1px solid #f1f5f9;page-break-inside:avoid">
      <div style="display:flex;align-items:center;gap:2.5mm;margin-bottom:1.5mm">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:9mm;height:5.5mm;border-radius:4px;font-size:7.5px;font-weight:700;background:${col}15;border:1px solid ${col}40;color:${col};flex-shrink:0">${f.key}</span>
        <span style="flex:1;font-size:9.5px;font-weight:600;color:#111827">${f.long}</span>
        <span style="font-size:6.5px;font-weight:700;letter-spacing:.07em;padding:.8mm 2.5mm;border-radius:20px;border:1px solid ${col}40;background:${col}12;color:${col};flex-shrink:0">${RISK_LABEL[f.val]}</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:700;line-height:1;color:${col};flex-shrink:0;min-width:11mm;text-align:right">${f.comp}<span style="font-size:9pt;color:#9ca3af">/${f.max}</span></span>
      </div>
      <div style="height:2.5px;background:#e9ecef;border-radius:2px;margin-bottom:1.5mm;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div>
      </div>
      <div style="font-size:8.5px;color:#4b5563;line-height:1.55;margin-bottom:${just ? '1.5mm' : '0'};word-break:break-word;overflow-wrap:break-word">${DETAIL[f.key][f.val - 1]}</div>
      ${just ? `<div style="background:#fff;border:1px solid #e9ecef;border-left:3px solid #C4A35A;border-radius:0 5px 5px 0;padding:1.5mm 2.5mm;font-size:8.5px;color:#374151;line-height:1.55;word-break:break-word;overflow-wrap:break-word;overflow:hidden;max-height:20mm"><span style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#C4A35A;margin-right:1.5mm">Justificativa do gestor:</span>${just}</div>` : ''}
    </div>`;
  }).join('');
}

function _buildRecRows(z, zc) {
  return RECS_PDF[z].map(r => `
    <div style="display:flex;gap:3.5mm;margin-bottom:3mm;padding:3.5mm 4mm;background:#fafafa;border-radius:7px;border:1px solid #f1f5f9;page-break-inside:avoid">
      <div style="display:flex;align-items:center;justify-content:center;width:10mm;height:10mm;border-radius:50%;font-family:'Cormorant Garamond',serif;font-size:13pt;font-weight:700;border:1.5px solid ${zc}40;background:${zc}10;color:${zc};flex-shrink:0;line-height:1">${r.n}</div>
      <div style="flex:1">
        <div style="font-size:10px;font-weight:700;color:#111827;margin-bottom:1mm">${r.t}</div>
        <div style="font-size:9px;color:#4b5563;line-height:1.65">${r.d}</div>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════
// Montagem do documento PDF completo
// ══════════════════════════════════════════════

function _assemblePDFDocument(p) {
  const {
    projectName, sc, z, zl, now, nowShort, ts, reportId,
    zc, zbg, zbd,
    coverBarsHtml, factorRowsHtml, recRowsHtml
  } = p;

  const PDF_CSS = _buildPDFCSS(zc, zbg, zbd);

  const D  = getFactorValue('D');
  const I  = getFactorValue('I');
  const C1 = getFactorValue('C1');
  const C2 = getFactorValue('C2');
  const E  = getFactorValue('E');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DICE — ${projectName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${PDF_CSS}</style>
</head>
<body>

<!-- ═══ CAPA ═══ -->
<div class="cover">
  <div class="cover-bg"></div>
  <div style="position:absolute;top:15mm;left:14mm;right:14mm;z-index:1">
    <div style="font-size:8px;letter-spacing:.25em;text-transform:uppercase;color:#62748C;margin-bottom:4mm">DICE Framework · Análise de Mudança Organizacional</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:52pt;font-weight:300;line-height:.95;letter-spacing:-.02em;color:#F0F4FA;margin-bottom:1.5mm">DICE</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:14pt;font-weight:300;font-style:italic;color:#A0B3CC;margin-bottom:6mm">The Hard Side of Change Management</div>
    <div style="background:rgba(196,163,90,.1);border:1px solid rgba(196,163,90,.3);border-radius:8px;padding:3.5mm 5mm">
      <div style="font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#62748C;margin-bottom:1mm">Projeto avaliado</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:600;color:#D8B87A;letter-spacing:.02em;line-height:1.2">${projectName}</div>
    </div>
  </div>
  <div style="position:absolute;top:90mm;left:14mm;right:14mm;z-index:1">
    <div style="display:flex;align-items:flex-end;gap:7mm;margin-bottom:6mm">
      <div style="font-family:'Cormorant Garamond',serif;font-size:80pt;font-weight:700;line-height:1;color:#F0F4FA">${sc}</div>
      <div style="padding-bottom:3mm">
        <div style="font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#62748C;margin-bottom:2mm">DICE Score</div>
        <div style="display:inline-block;padding:2mm 5mm;border-radius:30px;font-size:11pt;font-weight:700;border:1.5px solid ${zc};color:${zc};background:${zc}18">${ZONE_LABEL[z]}</div>
      </div>
    </div>
    <table style="border-collapse:collapse;width:110mm">${coverBarsHtml}</table>
  </div>
  <div style="position:absolute;bottom:12mm;left:14mm;right:14mm;z-index:1">
    <div style="height:1px;background:rgba(196,163,90,.2);margin-bottom:4mm"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div style="font-size:7.5px;color:#62748C;line-height:1.9;letter-spacing:.05em">
        Wagner Ramos · PMO &amp; BI<br>
        Gerado em ${now} · ${ts}<br>
        Sirkin, Keenan &amp; Jackson · HBR 2005 · ID: ${reportId}
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:24pt;font-weight:700;color:rgba(196,163,90,.15);letter-spacing:.12em">WR</div>
    </div>
  </div>
</div>

<!-- ═══ PÁG 2 — RESUMO + FATORES ═══ -->
<div class="page" style="page-break-before:always">
  <div class="pheader">
    <div><div class="ph-title">${projectName}</div><div class="ph-sub">Relatório de Análise DICE · ${now}</div></div>
    <div class="ph-badge">${ZONE_LABEL[z]} · ${sc}/28</div>
  </div>
  <div class="sec">Resumo Executivo</div>
  <div class="score-block">
    <div class="snum">${sc}<span class="snum-max">/28</span></div>
    <div class="sdetails">
      <div class="spill">${ZONE_LABEL[z]}</div>
      <div class="sinterp">${INTERP[z]}</div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-v" style="color:${zc}">${successProb(z)}</div><div class="kpi-l">Prob. de sucesso</div></div>
    <div class="kpi"><div class="kpi-v">${sc}</div><div class="kpi-l">DICE Score</div></div>
    <div class="kpi"><div class="kpi-v">${riskLevel(z)}</div><div class="kpi-l">Nível de risco</div></div>
    <div class="kpi"><div class="kpi-v">225</div><div class="kpi-l">Base BCG (casos)</div></div>
  </div>
  <div class="fbox">
    <div class="fexp">DICE = D(${D}) + 2·I(${2*I}) + 2·C1(${2*C1}) + C2(${C2}) + E(${E}) = <strong style="color:${zc}">${sc}</strong></div>
    <div class="fcite">I e C1 com peso duplo validado por regressão logística multivariada · Sirkin et al. (2005)</div>
  </div>
  <div class="sec">Análise por Fator — com justificativa do gestor</div>
  ${factorRowsHtml}
  <div class="pfooter">
    <div class="pfooter-l">DICE Framework · ${projectName} · ${nowShort} · ID: ${reportId}</div>
    <div class="pfooter-r">WR</div>
  </div>
</div>

<!-- ═══ PÁG 3 — RECOMENDAÇÕES ═══ -->
<div class="page" style="page-break-before:always">
  <div class="pheader">
    <div><div class="ph-title">Plano de Ação Recomendado</div><div class="ph-sub">${projectName} · Baseado na Zona ${zl}</div></div>
    <div class="ph-badge">${ZONE_LABEL[z]} · ${sc}/28</div>
  </div>
  <div class="sec">Recomendações baseadas em evidências — Zona ${zl}</div>
  ${recRowsHtml}
  <div class="sec" style="margin-top:5mm">Referência Acadêmica</div>
  <div class="refbox">
    <div style="font-size:9.5px;color:#374151;line-height:1.75">
      <strong>Sirkin, H. L., Keenan, P., &amp; Jackson, A. (2005).</strong> "The Hard Side of Change Management."
      <em>Harvard Business Review, 83(10), 108–118.</em><br><br>
      O estudo analisou 225 iniciativas de mudança em múltiplos setores e países, identificando os quatro fatores DICE como preditores estatisticamente significativos do sucesso de programas de transformação organizacional.<br><br>
      <span style="color:#C4A35A;font-size:8.5px">hbr.org/2005/10/the-hard-side-of-change-management</span>
    </div>
  </div>
  <div class="pfooter">
    <div class="pfooter-l">DICE Framework · ${projectName} · ${nowShort} · Wagner Ramos — PMO &amp; BI</div>
    <div class="pfooter-r">WR</div>
  </div>
</div>

<script>
window.addEventListener('load', function() {
  setTimeout(function() { window.print(); }, 1200);
});
<\/script>
</body></html>`;
}

/**
 * Retorna o bloco CSS completo para o documento PDF.
 * Usa as cores da zona como variáveis interpoladas.
 */
function _buildPDFCSS(zc, zbg, zbd) {
  return `
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Inter',sans-serif;font-size:13px;line-height:1.6;background:#fff;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact;word-break:break-word;overflow-wrap:break-word}
@page{size:A4 portrait;margin:0}
.cover{width:210mm;height:297mm;background:#0B1E33;position:relative;overflow:hidden;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover-bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 90% 5%,rgba(21,52,80,.9) 0%,transparent 60%),radial-gradient(ellipse 40% 30% at 5% 90%,rgba(196,163,90,.06) 0%,transparent 65%)}
.page{width:210mm;padding:12mm 13mm 16mm;position:relative;display:block}
.pfooter{margin-top:6mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e9ecef;padding-top:2mm}
.pfooter-l{font-size:7px;color:#9ca3af;letter-spacing:.05em}
.pfooter-r{font-family:'Cormorant Garamond',serif;font-size:9pt;font-weight:700;color:#C4A35A;letter-spacing:.12em}
.pheader{display:flex;justify-content:space-between;align-items:center;padding-bottom:3.5mm;margin-bottom:5mm;border-bottom:1px solid #e9ecef}
.ph-title{font-family:'Cormorant Garamond',serif;font-size:15pt;font-weight:600;color:#0B1E33;letter-spacing:.02em}
.ph-sub{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;margin-top:.5mm}
.ph-badge{padding:1.5mm 4mm;border-radius:20px;font-size:8px;font-weight:700;letter-spacing:.1em;background:${zc}15;color:${zc};border:1px solid ${zc}40}
.sec{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#9ca3af;margin-bottom:2.5mm;display:flex;align-items:center;gap:3mm}
.sec::after{content:'';flex:1;height:1px;background:#e9ecef}
.score-block{background:${zbg};border:1px solid ${zbd};border-left:4px solid ${zc};border-radius:0 10px 10px 0;padding:4mm 5mm;margin-bottom:4mm;display:flex;align-items:flex-start;gap:5mm}
.snum{font-family:'Cormorant Garamond',serif;font-size:52pt;font-weight:700;line-height:1;color:#111827;flex-shrink:0}
.snum-max{font-size:18pt;color:#9ca3af;margin-left:1mm}
.sdetails{flex:1;padding-top:1mm}
.spill{display:inline-block;padding:1mm 4mm;border-radius:20px;font-size:8.5px;font-weight:700;letter-spacing:.1em;color:${zc};border:1.5px solid ${zc};background:${zc}18;margin-bottom:2mm}
.sinterp{font-size:9.5px;color:#374151;line-height:1.7}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-bottom:4mm}
.kpi{background:#f9fafb;border:1px solid #e9ecef;border-radius:7px;padding:2.5mm 3mm;text-align:center}
.kpi-v{font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:600;color:#111827;line-height:1}
.kpi-l{font-size:7px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-top:1mm}
.fbox{background:#f9fafb;border:1px solid #e9ecef;border-radius:8px;padding:3mm 5mm;margin-bottom:4mm;text-align:center}
.fexp{font-family:'Cormorant Garamond',serif;font-size:14pt;color:#111827;margin-bottom:1.5mm}
.fcite{font-size:8px;color:#9ca3af;font-style:italic}
.refbox{background:#fffbf5;border:1px solid #fde68a;border-left:3px solid #C4A35A;border-radius:0 8px 8px 0;padding:4mm 5mm;margin-top:5mm}
@media print{.cover,.page{page-break-inside:avoid}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`;
}
