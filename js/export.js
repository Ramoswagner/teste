/**

- js/export.js — Redesign Nível McKinsey/BCG
- ─────────────────────────────────────────────
- Princípios de design aplicados:
- - Capa: flex layout 3 blocos, elimina ~150mm de espaço morto
- - Fatores: tabela com réguas finas, sem cards, linha compacta
- - Recomendações: mesma linguagem visual da tabela de fatores
- - Tipografia: escala precisa por peso e tamanho
- - Cor: navy primário, gold acento, semânticas para risco
- - Órfão corrigido: break-inside:avoid só na linha de cabeçalho,
- - break-before:avoid no pfooter
- 
- Depende de: state.js, data.js, calc.js, ui.js (showToast)
  */

‘use strict’;

let _pendingPDFHtml = null;

// ══════════════════════════════════════════════
// Banner de popup bloqueado
// ══════════════════════════════════════════════

function showPopupBanner() {
document.getElementById(‘popupBanner’).classList.add(‘show’);
}

// eslint-disable-next-line no-unused-vars
function dismissPopupBanner() {
document.getElementById(‘popupBanner’).classList.remove(‘show’);
_pendingPDFHtml = null;
}

document.getElementById(‘popupRetry’).addEventListener(‘click’, function () {
if (_pendingPDFHtml) _openPrintWindow(_pendingPDFHtml);
});

function _openPrintWindow(html) {
const win = window.open(’’, ‘_blank’);
if (!win) { showPopupBanner(); return; }
dismissPopupBanner();
win.document.open();
win.document.write(html);
win.document.close();
showToast(‘Abrindo relatório — aguarde o diálogo de impressão…’);
}

// ══════════════════════════════════════════════
// Exportar PNG
// ══════════════════════════════════════════════

// eslint-disable-next-line no-unused-vars
function savePNG() {
const canvas = document.getElementById(‘diceChart’);
if (!canvas) return;
const transparent = document.getElementById(‘transparentToggle’)?.checked ?? false;
const off = document.createElement(‘canvas’);
off.width = canvas.width; off.height = canvas.height;
const oc = off.getContext(‘2d’);
if (!transparent) { oc.fillStyle = ‘#0B1E33’; oc.fillRect(0, 0, off.width, off.height); }
oc.drawImage(canvas, 0, 0);
const sc = calcScore();
const link = document.createElement(‘a’);
link.download = `dice-${zoneLabel(sc).toLowerCase()}-${sc}.png`;
link.href = off.toDataURL(‘image/png’);
link.click();
showToast(‘PNG exportado com sucesso!’);
}

// ══════════════════════════════════════════════
// Exportar PDF
// ══════════════════════════════════════════════

// eslint-disable-next-line no-unused-vars
function exportPDF() {
// PASSO 1: abre a janela IMEDIATAMENTE, antes de qualquer processamento.
// Isso é obrigatório em mobile (Safari iOS, Chrome Android): window.open()
// deve ser chamado na mesma microtask do gesto do usuário. Se houver
// qualquer operação entre o clique e a chamada, o popup é bloqueado.
const win = window.open(’’, ‘_blank’);
if (!win) { showPopupBanner(); return; }

const sc       = calcScore();
const z        = zone(sc);
const zl       = zoneLabel(sc);
const now      = new Date().toLocaleDateString(‘pt-BR’, { day:‘2-digit’, month:‘long’,    year:‘numeric’ });
const nowShort = new Date().toLocaleDateString(‘pt-BR’, { day:‘2-digit’, month:‘2-digit’, year:‘numeric’ });
const ts       = new Date().toLocaleTimeString(‘pt-BR’, { hour:‘2-digit’, minute:‘2-digit’ });
const reportId = ‘DICE-’ + sc + ‘-’ + nowShort.replace(/[^a-zA-Z0-9]/g, ‘’);

const projectName = escapeHtml(
document.getElementById(‘projectName’)?.value?.trim() || ‘Projeto sem nome’
);

const J = {
D:  escapeHtml(document.getElementById(‘justD’)?.value?.trim()  || ‘’),
I:  escapeHtml(document.getElementById(‘justI’)?.value?.trim()  || ‘’),
C1: escapeHtml(document.getElementById(‘justC1’)?.value?.trim() || ‘’),
C2: escapeHtml(document.getElementById(‘justC2’)?.value?.trim() || ‘’),
E:  escapeHtml(document.getElementById(‘justE’)?.value?.trim()  || ‘’)
};

const zc  = ZONE_COLORS[z];
const zbg = ZONE_BG[z];
const zbd = ZONE_BORDER[z];

const factors = getFactorsForPDF();

const html = _assemblePDFDocument({
projectName, sc, z, zl, now, nowShort, ts, reportId, zc, zbg, zbd,
coverBarsHtml:   _buildCoverBars(factors),
factorTableHtml: _buildFactorTable(factors, J),
recTableHtml:    _buildRecTable(z, zc)
});

// PASSO 2: escreve o HTML na janela já aberta no início da função.
// Não chamamos mais _openPrintWindow() aqui para evitar abrir 2ª janela.
dismissPopupBanner();
win.document.open();
win.document.write(html);
win.document.close();
showToast(‘Abrindo relatório — aguarde o diálogo de impressão…’);
// Guarda para retry de popup (caso o usuário tente novamente via banner)
_pendingPDFHtml = html;
}

// ══════════════════════════════════════════════
// Builders de HTML (privados)
// ══════════════════════════════════════════════

function _buildCoverBars(factors) {
const NAMES  = { D:‘Duração’, I:‘Integridade’, C1:‘Alta Gestão’, C2:‘Impactados’, E:‘Esforço’ };
const WEIGHT = { D:’’, I:’ ×2’, C1:’ ×2’, C2:’’, E:’’ };
return factors.map(f => {
const pct = Math.round(f.comp / f.max * 100);
const col = RISK_COLOR[f.val];
return `<tr> <td class="cb-key">${f.key}</td> <td class="cb-track"> <div class="cb-track-inner"> <div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div> </div> </td> <td class="cb-val" style="color:${col}">${f.comp}/${f.max}</td> <td class="cb-name">${NAMES[f.key]}${WEIGHT[f.key]}</td> </tr>`;
}).join(’’);
}

/**

- Tabela de fatores — design McKinsey:
- réguas finas, sem cards com background.
- break-inside:avoid protege APENAS a linha de nome/score —
- descrição e justificativa quebram livremente (resolve o órfão).
  */
  function _buildFactorTable(factors, J) {
  const rows = factors.map(f => {
  const col  = RISK_COLOR[f.val];
  const pct  = Math.round(f.comp / f.max * 100);
  const just = J[f.key];
  return `<tr class="frow">
  
     <td class="ftag-cell"><div class="ftag">${f.key}</div></td>
     <td class="fcontent">
       <div class="fname-line">
         <span class="fname">${f.long}</span>
         <div class="fbar-wrap">
           <div class="fbar-track">
             <div class="fbar-fill" style="width:${pct}%;background:${col}"></div>
           </div>
         </div>
         <span class="frisk" style="background:${col}12;color:${col};border:1px solid ${col}40">${RISK_LABEL[f.val]}</span>
         <span class="fscore" style="color:${col}">${f.comp}<span class="fscore-den">/${f.max}</span></span>
       </div>
       <div class="fdesc">${DETAIL[f.key][f.val - 1]}</div>
       ${just ? `<div class="fjust"><span class="fjust-lbl">Justificativa do gestor</span>${just}</div>` : ''}
     </td>
   </tr>`;

}).join(’’);
return `<table class="factor-table"><tbody>${rows}</tbody></table>`;
}

function _buildRecTable(z, zc) {
const rows = RECS_PDF[z].map(r => ` <tr class="rrow"> <td class="rnum-cell"> <div class="rnum" style="border-color:${zc}50;background:${zc}0d;color:${zc}">${r.n}</div> </td> <td class="rcontent"> <div class="rtitle">${r.t}</div> <div class="rtext">${r.d}</div> </td> </tr>`).join(’’);
return `<table class="rec-table"><tbody>${rows}</tbody></table>`;
}

// ══════════════════════════════════════════════
// Montagem do documento
// ══════════════════════════════════════════════

function _assemblePDFDocument(p) {
const { projectName, sc, z, zl, now, nowShort, ts, reportId,
zc, zbg, zbd, coverBarsHtml, factorTableHtml, recTableHtml } = p;
const D  = getFactorValue(‘D’);
const I  = getFactorValue(‘I’);
const C1 = getFactorValue(‘C1’);
const C2 = getFactorValue(‘C2’);
const E  = getFactorValue(‘E’);

return `<!DOCTYPE html>

<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DICE — ${projectName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${_buildPDFCSS(zc, zbg, zbd)}</style>
</head>
<body>

<!-- ═══ CAPA ═══ -->

<div class="cover">
  <div class="cover-bg"></div>
  <div class="cover-inner">

```
<!-- Bloco 1: identidade -->
<div>
  <div class="c-eyebrow">DICE Framework · Boston Consulting Group · HBR 2005</div>
  <div class="c-wordmark">DICE</div>
  <div class="c-tagline">The Hard Side of Change Management</div>
  <div class="c-rule"></div>
  <div class="c-proj-label">Projeto Avaliado</div>
  <div class="c-proj-name">${projectName}</div>
</div>

<!-- Bloco 2: score + barras -->
<div>
  <div class="c-score-row">
    <div class="c-score-num">${sc}</div>
    <div class="c-score-right">
      <div class="c-score-eyebrow">DICE Score</div>
      <div class="c-zone-pill">${ZONE_LABEL[z]}</div>
    </div>
  </div>
  <table class="cover-bars">${coverBarsHtml}</table>
</div>

<!-- Bloco 3: rodapé da capa -->
<div>
  <div class="c-foot-rule"></div>
  <div class="c-foot-row">
    <div class="c-meta">
      Wagner Ramos · PMO &amp; BI<br>
      Gerado em ${now} · ${ts}<br>
      Sirkin, Keenan &amp; Jackson · HBR 2005 · ID: ${reportId}
    </div>
    <div class="c-mono">WR</div>
  </div>
</div>
```

  </div>
</div>

<!-- ═══ PÁG 2: Resumo Executivo + Fatores ═══ -->

<div class="page" style="page-break-before:always">
  <div class="pheader">
    <div>
      <div class="ph-title">${projectName}</div>
      <div class="ph-sub">Relatório de Análise DICE · ${now}</div>
    </div>
    <div class="ph-badge">${ZONE_LABEL[z]} · ${sc}/28</div>
  </div>

  <div class="sec">Resumo Executivo</div>

  <div class="exec-block">
    <div class="exec-score-wrap">
      <span class="exec-score">${sc}</span>
      <span class="exec-score-max">/28</span>
    </div>
    <div class="exec-right">
      <div class="exec-zone">${ZONE_LABEL[z]}</div>
      <div class="exec-interp">${INTERP[z]}</div>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-v" style="color:${zc}">${successProb(z)}</div><div class="kpi-l">Probabilidade de sucesso</div></div>
    <div class="kpi"><div class="kpi-v">${sc}</div><div class="kpi-l">DICE Score</div></div>
    <div class="kpi"><div class="kpi-v">${riskLevel(z)}</div><div class="kpi-l">Nível de risco</div></div>
    <div class="kpi"><div class="kpi-v">225</div><div class="kpi-l">Base BCG (casos)</div></div>
  </div>

  <div class="fbox">
    <div class="fexp">DICE = D(${D}) + 2·I(${2*I}) + 2·C1(${2*C1}) + C2(${C2}) + E(${E}) = <strong style="color:${zc}">${sc}</strong></div>
    <div class="fcite">I e C1 com peso duplo validado por regressão logística multivariada · Sirkin et al. (2005)</div>
  </div>

  <div class="sec">Análise por Fator — com justificativa do gestor</div>
  ${factorTableHtml}

</div>

<!-- ═══ PÁG 3: Recomendações ═══ -->

<div class="page" style="page-break-before:always">
  <div class="pheader">
    <div>
      <div class="ph-title">Plano de Ação Recomendado</div>
      <div class="ph-sub">${projectName} · Baseado na Zona ${zl}</div>
    </div>
    <div class="ph-badge">${ZONE_LABEL[z]} · ${sc}/28</div>
  </div>

  <div class="sec">Recomendações baseadas em evidências — Zona ${zl}</div>
  ${recTableHtml}

  <div class="sec" style="margin-top:5mm">Referência Acadêmica</div>
  <div class="refbox">
    <div class="refbox-text">
      <strong>Sirkin, H. L., Keenan, P., &amp; Jackson, A. (2005).</strong>
      "The Hard Side of Change Management."
      <em>Harvard Business Review, 83(10), 108–118.</em><br><br>
      O estudo analisou 225 iniciativas de mudança em múltiplos setores e países,
      identificando os quatro fatores DICE como preditores estatisticamente
      significativos do sucesso de programas de transformação organizacional.
      A fórmula foi validada por regressão logística multivariada e confirmada
      em mais de 1.000 programas conduzidos pelo BCG desde 1994.<br><br>
      <a href="https://hbr.org/2005/10/the-hard-side-of-change-management"
         style="color:#C4A35A;font-size:7.5px;text-decoration:none">
        hbr.org/2005/10/the-hard-side-of-change-management
      </a>
    </div>
  </div>

</div>

<!-- Rodapé running — position:fixed em @media print repete em todas as páginas.
     A capa tem z-index:2 e background navy, enterrando visualmente o rodapé na
     página 1. Páginas 2 e 3 têm fundo branco → rodapé sempre visível nelas. -->

<div class="doc-footer">
  <div class="doc-footer-l">DICE Framework &nbsp;·&nbsp; ${projectName} &nbsp;·&nbsp; ${nowShort} &nbsp;·&nbsp; Wagner Ramos — PMO &amp; BI &nbsp;·&nbsp; ID: ${reportId}</div>
  <div class="doc-footer-r">WR</div>
</div>

<script>
window.addEventListener('load', function() {
  setTimeout(function() { window.print(); }, 1200);
});
<\/script>
</body></html>`;
}

// ══════════════════════════════════════════════
// CSS completo — sistema de design McKinsey/BCG
// ══════════════════════════════════════════════

function _buildPDFCSS(zc, zbg, zbd) {
  return `
*{margin:0;padding:0;box-sizing:border-box}
html,body{
  font-family:'Inter',sans-serif;font-size:10px;line-height:1.5;
  background:#fff;color:#111827;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
  word-break:break-word;overflow-wrap:break-word;
}
@page{size:A4 portrait;margin:0}

/* ─────────────────────────────────────────
   CAPA — flex 3 blocos elimina espaço morto
   A versão anterior usava position:absolute
   e deixava ~150mm vazios entre o score e
   o rodapé. O flex space-between distribui
   os 3 blocos pelos 269mm úteis da página.
   ───────────────────────────────────────── */
.cover{
  width:210mm;height:297mm;background:#0B1E33;
  position:relative;overflow:hidden;
  z-index:2; /* sits above the fixed footer — navy bg hides it on page 1 */
  page-break-after:always;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.cover-bg{
  position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(ellipse 85% 65% at 105% -5%,rgba(21,52,80,0.95) 0%,transparent 52%),
    radial-gradient(ellipse 60% 50% at -5% 105%,rgba(196,163,90,0.05) 0%,transparent 55%),
    radial-gradient(ellipse 40% 30% at 50% 50%,rgba(15,42,64,0.4) 0%,transparent 70%);
}
.cover-inner{
  position:relative;z-index:1;
  height:100%;box-sizing:border-box;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:16mm 14mm 12mm;
}

/* Bloco 1 — identidade */
.c-eyebrow{font-size:6.5px;letter-spacing:.32em;text-transform:uppercase;color:#3E5568;margin-bottom:5mm}
.c-wordmark{font-family:'Cormorant Garamond',serif;font-size:72pt;font-weight:300;line-height:.85;letter-spacing:-.02em;color:#F0F4FA;margin-bottom:2.5mm}
.c-tagline{font-family:'Cormorant Garamond',serif;font-size:12pt;font-weight:300;font-style:italic;color:#6A8898;margin-bottom:6mm}
.c-rule{height:1px;background:rgba(196,163,90,0.38);margin-bottom:5.5mm}
.c-proj-label{font-size:6.5px;letter-spacing:.24em;text-transform:uppercase;color:#3E5568;margin-bottom:2mm}
.c-proj-name{font-family:'Cormorant Garamond',serif;font-size:20pt;font-weight:600;color:#D8B87A;line-height:1.2}

/* Bloco 2 — score + barras */
.c-score-row{display:flex;align-items:flex-end;gap:6mm;margin-bottom:4.5mm}
.c-score-num{font-family:'Cormorant Garamond',serif;font-size:80pt;font-weight:700;line-height:1;color:#F0F4FA}
.c-score-right{padding-bottom:5mm}
.c-score-eyebrow{font-size:6.5px;letter-spacing:.22em;text-transform:uppercase;color:#3E5568;margin-bottom:2mm}
.c-zone-pill{display:inline-block;padding:2mm 5.5mm;border-radius:30px;font-size:10.5pt;font-weight:700;border:1.5px solid ${zc};color:${zc};background:${zc}18;font-family:'Inter',sans-serif}

.cover-bars{border-collapse:collapse;width:120mm}
.cover-bars td{padding:1.4mm 0}
.cb-key{font-size:7.5px;font-weight:700;letter-spacing:.06em;color:#6A8898;text-align:right;padding-right:3mm;width:11mm;white-space:nowrap}
.cb-track{width:58mm;padding-right:3mm}
.cb-track-inner{height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden}
.cb-val{font-size:8px;font-weight:700;white-space:nowrap;padding-right:3mm}
.cb-name{font-size:7px;color:#3E5568;white-space:nowrap}

/* Bloco 3 — rodapé da capa */
.c-foot-rule{height:1px;background:rgba(196,163,90,0.18);margin-bottom:3.5mm}
.c-foot-row{display:flex;justify-content:space-between;align-items:flex-end}
.c-meta{font-size:7px;color:#3E5568;line-height:1.9;letter-spacing:.04em}
.c-mono{font-family:'Cormorant Garamond',serif;font-size:22pt;font-weight:700;color:rgba(196,163,90,0.16);letter-spacing:.18em}

/* ─────────────────────────────────────────
   PÁGINAS DE CONTEÚDO
   ───────────────────────────────────────── */
.page{
  width:210mm;padding:12mm 13mm 16mm;position:relative;
  /* Clona padding/border em cada fragmento de página. */
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
  /* padding-bottom:16mm reserva espaço para o rodapé running */
}

.pheader{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:3.5mm;margin-bottom:5mm;border-bottom:2px solid #0B1E33}
.ph-title{font-family:'Cormorant Garamond',serif;font-size:18pt;font-weight:600;color:#0B1E33;letter-spacing:.01em;line-height:1}
.ph-sub{font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;margin-top:1mm}
.ph-badge{padding:1.5mm 4mm;border-radius:20px;font-size:7.5px;font-weight:700;letter-spacing:.07em;background:${zc}10;color:${zc};border:1px solid ${zc}38;white-space:nowrap;margin-top:1mm}

.sec{font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#9CA3AF;display:flex;align-items:center;gap:3mm;margin-bottom:2.5mm}
.sec::after{content:'';flex:1;height:1px;background:#E5E7EB}

/* Resumo executivo */
.exec-block{display:flex;align-items:flex-start;gap:5mm;margin-bottom:2.5mm;padding:4mm 5mm;background:${zbg};border:1px solid ${zbd};border-left:4px solid ${zc};border-radius:0 8px 8px 0}
.exec-score-wrap{display:flex;align-items:baseline;flex-shrink:0}
.exec-score{font-family:'Cormorant Garamond',serif;font-size:40pt;font-weight:700;line-height:1;color:#111827}
.exec-score-max{font-family:'Cormorant Garamond',serif;font-size:14pt;font-weight:300;color:#9CA3AF;margin-left:1mm}
.exec-right{flex:1}
.exec-zone{display:inline-block;padding:.8mm 3mm;border-radius:20px;font-size:7.5px;font-weight:700;letter-spacing:.06em;border:1px solid ${zc};color:${zc};background:${zc}10;margin-bottom:2mm}
.exec-interp{font-size:8.5px;color:#374151;line-height:1.65}

/* KPIs */
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-bottom:3mm}
.kpi{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:5px;padding:2mm 2.5mm;text-align:center}
.kpi-v{font-family:'Cormorant Garamond',serif;font-size:13.5pt;font-weight:600;color:#111827;line-height:1}
.kpi-l{font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;color:#9CA3AF;margin-top:.5mm}

/* Fórmula */
.fbox{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:2.5mm 5mm;margin-bottom:4mm;text-align:center}
.fexp{font-family:'Cormorant Garamond',serif;font-size:13pt;color:#111827;margin-bottom:1mm}
.fcite{font-size:7px;color:#9CA3AF;font-style:italic}

/* ─────────────────────────────────────────
   TABELA DE FATORES — McKinsey style
   Sem fundo cinza nos cards. Réguas finas.
   break-inside:avoid APENAS na .fname-line
   (cabeçalho). Descrição e justificativa
   quebram livremente → sem órfão de rodapé.
   ───────────────────────────────────────── */
.factor-table{width:100%;border-collapse:collapse;margin-bottom:2mm}
.frow{border-top:1px solid #E5E7EB}
.frow:last-child{border-bottom:1px solid #E5E7EB}
.ftag-cell{width:10mm;padding:3mm 2mm 3mm 0;vertical-align:top}
.ftag{display:inline-flex;align-items:center;justify-content:center;width:8mm;min-height:5.5mm;padding:1mm 0;background:#0B1E33;color:white;border-radius:3px;font-size:6.5px;font-weight:700;letter-spacing:.04em;text-align:center}
.fcontent{padding:3mm 0}
.fname-line{display:flex;align-items:center;gap:2mm;margin-bottom:1.5mm;break-inside:avoid;page-break-inside:avoid}
.fname{font-size:8.5px;font-weight:600;color:#111827;flex:1;line-height:1.3}
.fbar-wrap{width:27mm;flex-shrink:0}
.fbar-track{height:2.5px;background:#E5E7EB;border-radius:2px;overflow:hidden}
.fbar-fill{height:100%;border-radius:2px}
.frisk{font-size:5.5px;font-weight:700;letter-spacing:.06em;padding:.8mm 2mm;border-radius:3px;white-space:nowrap;flex-shrink:0}
.fscore{font-family:'Cormorant Garamond',serif;font-size:13pt;font-weight:700;line-height:1;flex-shrink:0;min-width:8.5mm;text-align:right}
.fscore-den{font-size:8pt;color:#9CA3AF;font-family:'Inter',sans-serif;font-weight:400}
.fdesc{font-size:7.5px;color:#6B7280;line-height:1.55;margin-bottom:1.5mm}
.fjust{border-left:2px solid #C4A35A;padding:1.5mm 2.5mm;background:#FFFBF5;font-size:7.5px;color:#374151;line-height:1.55}
.fjust-lbl{font-size:6px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#C4A35A;display:block;margin-bottom:.5mm}

/* ─────────────────────────────────────────
   TABELA DE RECOMENDAÇÕES
   Mesma linguagem da tabela de fatores
   ───────────────────────────────────────── */
.rec-table{width:100%;border-collapse:collapse;margin-bottom:3mm}
.rrow{border-top:1px solid #E5E7EB}
.rrow:last-child{border-bottom:1px solid #E5E7EB}
.rnum-cell{width:13mm;padding:3.5mm 2mm 3.5mm 0;vertical-align:top}
.rnum{display:inline-flex;align-items:center;justify-content:center;width:9mm;height:9mm;border-radius:50%;font-family:'Cormorant Garamond',serif;font-size:11pt;font-weight:700;line-height:1;border-width:1.5px;border-style:solid}
.rcontent{padding:3.5mm 0 3.5mm 1mm;vertical-align:top}
.rtitle{font-size:9px;font-weight:700;color:#111827;margin-bottom:1mm;line-height:1.3;break-inside:avoid;page-break-inside:avoid}
.rtext{font-size:8px;color:#6B7280;line-height:1.65}

/* Referência acadêmica */
.refbox{background:#FFFBF5;border:1px solid #FDE68A;border-left:3px solid #C4A35A;border-radius:0 6px 6px 0;padding:3.5mm 5mm}
.refbox-text{font-size:8.5px;color:#374151;line-height:1.75}

/* ─────────────────────────────────────────
   RODAPÉ DE PÁGINA
   break-before:avoid: impede que fique
   sozinho como 1ª linha de nova página.
   Corrige o bug do órfão relatado.
   ───────────────────────────────────────── */
/* ─────────────────────────────────────────
   RODAPÉ RUNNING — position:fixed em print
   repete em todas as páginas automaticamente.
   z-index:1 fica abaixo da capa (z-index:2):
   o background navy enterra o rodapé na pág 1.
   background:white garante que o rodapé cobre
   o conteúdo da página abaixo dele (sem sobreposição).
   ───────────────────────────────────────── */
@media print{
  .doc-footer{
    position:fixed;
    bottom:0;left:0;right:0;
    z-index:1;
    height:10mm;
    display:flex;align-items:center;justify-content:space-between;
    padding:0 13mm;
    background:#fff;
    border-top:1px solid #E5E7EB;
    box-sizing:border-box;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
}
/* Também visível no preview de tela */
.doc-footer{
  display:flex;align-items:center;justify-content:space-between;
  padding:2mm 13mm;border-top:1px solid #E5E7EB;margin-top:4mm;
}
.doc-footer-l{font-size:6.5px;color:#9CA3AF;letter-spacing:.04em}
.doc-footer-r{font-family:'Cormorant Garamond',serif;font-size:9pt;font-weight:700;color:#C4A35A;letter-spacing:.14em}

@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .cover{page-break-after:always}
}`;
}