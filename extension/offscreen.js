// offscreen.js — Roda num documento offscreen (tem DOM + canvas + clipboard)

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type !== 'DRAW_WIDGET_IMAGE') return;
  drawAndCopy(msg.payload)
    .then(function () { sendResponse({ ok: true }); })
    .catch(function (err) { sendResponse({ ok: false, error: err.message }); });
  return true; // async
});

function drawAndCopy(data) {
  // data: { original, currency, rows:[{code,value,isSource}], fromCache }
  var C = {
    bg:         '#0F172A',
    surface:    '#1E293B',
    borderBlue: '#3B82F6',
    borderDim:  '#1E293B',
    accentText: '#93C5FD',
    text:       '#F1F5F9',
    muted:      '#64748B',
    green:      '#22C55E',
    amber:      '#F59E0B',
    credit:     '#334155',
    creditBg:   '#0B1120'
  };

  var DPR   = 2;
  var W     = 280;
  var PAD   = 16;
  var ROW_H = 32;
  var rows  = data.rows;

  // Calcular altura total
  var H = PAD            // topo
        + 12             // título
        + 6              // gap
        + 22             // valor original
        + 10             // gap + sep
        + rows.length * (ROW_H + 4)
        + 4              // gap antes do footer sep
        + 1 + 10         // sep footer + gap
        + 14             // status
        + 10             // gap
        + 1              // linha divisória crédito
        + 20             // linha de crédito
        + PAD / 2;       // fundo inferior

  var canvas = document.getElementById('cq-canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // ── helpers ──────────────────────────────────────────────────────────────
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function textRight(txt, rightX, y) {
    var tw = ctx.measureText(txt).width;
    ctx.fillText(txt, rightX - tw, y);
  }

  // ── Fundo principal ───────────────────────────────────────────────────────
  roundRect(0, 0, W, H, 14);
  ctx.fillStyle = C.bg;
  ctx.fill();
  ctx.strokeStyle = C.borderBlue;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  var y = PAD;

  // ── Título ─────────────────────────────────────────────────────────────
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillStyle = C.accentText;
  ctx.fillText('\u21C4 CURRENCY QUICK', PAD, y + 10);
  y += 18;

  // ── Valor original ──────────────────────────────────────────────────────
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = C.text;
  ctx.fillText(data.original, PAD, y + 16);
  y += 22;

  // ── Separador ────────────────────────────────────────────────────────────
  ctx.fillStyle = C.borderDim;
  ctx.fillRect(PAD, y, W - PAD * 2, 1);
  y += 9;

  // ── Linhas de moeda ───────────────────────────────────────────────────────
  rows.forEach(function (row) {
    roundRect(PAD, y, W - PAD * 2, ROW_H, 8);
    if (row.isSource) {
      ctx.fillStyle = 'rgba(59,130,246,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(59,130,246,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = C.surface;
      ctx.fill();
    }

    // Label
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = row.isSource ? C.accentText : C.muted;
    ctx.fillText(row.code, PAD + 10, y + ROW_H / 2 + 4);

    // Valor (alinhado à direita)
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = row.isSource ? C.accentText : C.text;
    textRight(row.value, W - PAD - 10, y + ROW_H / 2 + 4);

    y += ROW_H + 4;
  });

  y += 4;

  // ── Separador footer ──────────────────────────────────────────────────────
  ctx.fillStyle = C.borderDim;
  ctx.fillRect(PAD, y, W - PAD * 2, 1);
  y += 10;

  // ── Status ────────────────────────────────────────────────────────────────
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = data.fromCache ? C.amber : C.green;
  ctx.fillText(data.fromCache ? '\u26A1 cache' : '\u25CF ao vivo', PAD, y + 10);
  y += 20;

  // ── Faixa de crédito ──────────────────────────────────────────────────────
  ctx.fillStyle = C.credit;
  ctx.fillRect(0, y, W, 1);
  y += 1;

  // Fundo crédito (canto inferior arredondado)
  ctx.fillStyle = C.creditBg;
  ctx.fillRect(0, y, W, H - y);
  roundRect(0, H - 14, W, 14, 14);
  ctx.fillStyle = C.creditBg;
  ctx.fill();

  ctx.font = '9px system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  var creditText = 'Currency Quick  \u2022  vWeb Marketing';
  var ctw = ctx.measureText(creditText).width;
  ctx.fillText(creditText, (W - ctw) / 2, y + 13);

  // ── Escrever no clipboard ─────────────────────────────────────────────────
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (!blob) { reject(new Error('canvas.toBlob falhou')); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(resolve)
        .catch(reject);
    }, 'image/png');
  });
}
