// ============================================
// Braj Awadhi Kavyalok — Poem Image Download
// Canvas API — entirely client-side, no cost
//
// Generates a 1080×1080 PNG with:
//   • Dark warm gradient background
//   • Subtle decorative border
//   • Poem text (Tiro Devanagari Hindi)
//   • Poet attribution
//   • Site branding (corner)
// Only works for poems of 4 lines or fewer.
// ============================================

(function () {

  const CANVAS_SIZE  = 1080;
  const BRAND_NAME   = 'ब्रज अवधी काव्यलोक';
  const BRAND_URL    = 'braj-avadhi-kavyalok.netlify.app';

  // ── Palette (matches site dark-gold theme) ──────────────────────────────
  const COLOR = {
    bgTop:       '#150800',
    bgBottom:    '#2a0d04',
    bgAccent:    'rgba(192, 57, 43, 0.12)',
    border:      'rgba(232, 184, 122, 0.22)',
    borderInner: 'rgba(232, 184, 122, 0.08)',
    ornament:    'rgba(232, 184, 122, 0.18)',
    verse:       '#f0e0c8',
    poet:        '#c9906a',
    brand:       'rgba(201, 144, 106, 0.55)',
    divider:     'rgba(232, 184, 122, 0.25)',
  };

  // ── Extract poem lines from the rendered DOM ─────────────────────────────
  function extractLines() {
    const poemBody = document.getElementById('poem-text');
    if (!poemBody) return null;

    const raw = poemBody.innerText || poemBody.textContent || '';
    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    return lines;
  }

  // ── Word-wrap a single line to fit within maxWidth ───────────────────────
  function wrapLine(ctx, text, maxWidth) {
    const words  = text.split(' ');
    const result = [];
    let current  = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        result.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) result.push(current);
    return result;
  }

  // ── Draw rounded rectangle ───────────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
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

  // ── Draw decorative corner flourish ──────────────────────────────────────
  function drawCorner(ctx, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = COLOR.ornament;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);
    ctx.moveTo(size * 0.4, 0);
    ctx.quadraticCurveTo(0, 0, 0, size * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  // ── Main render function ─────────────────────────────────────────────────
  async function renderToCanvas(lines, poetName) {
    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width  = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    const S   = CANVAS_SIZE;
    const PAD = 90;

    // 1. Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, COLOR.bgTop);
    grad.addColorStop(1, COLOR.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Radial glow
    const radial = ctx.createRadialGradient(S/2, S * 0.3, 0, S/2, S * 0.3, S * 0.6);
    radial.addColorStop(0, COLOR.bgAccent);
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, S, S);

    // 2. Outer border
    ctx.strokeStyle = COLOR.border;
    ctx.lineWidth   = 1.5;
    roundRect(ctx, PAD * 0.55, PAD * 0.55, S - PAD * 1.1, S - PAD * 1.1, 8);
    ctx.stroke();

    // Inner border
    ctx.strokeStyle = COLOR.borderInner;
    ctx.lineWidth   = 1;
    roundRect(ctx, PAD * 0.55 + 8, PAD * 0.55 + 8, S - PAD * 1.1 - 16, S - PAD * 1.1 - 16, 4);
    ctx.stroke();

    // 3. Corner decorations
    const cSize = 36;
    const cOff  = PAD * 0.55 + 20;
    drawCorner(ctx, cOff,     cOff,     cSize,  0);
    drawCorner(ctx, S - cOff, cOff,     cSize,  Math.PI / 2);
    drawCorner(ctx, S - cOff, S - cOff, cSize,  Math.PI);
    drawCorner(ctx, cOff,     S - cOff, cSize, -Math.PI / 2);

    // 4. Top ornament
    ctx.font      = '72px "Tiro Devanagari Hindi", serif';
    ctx.fillStyle = COLOR.ornament;
    ctx.textAlign = 'center';
    ctx.fillText('॥', S / 2, PAD + 55);

    // 5. Verse text — auto-fit font size
    const maxTextWidth = S - PAD * 2.4;
    let fontSize = 52;
    let allWrapped;

    while (fontSize >= 30) {
      ctx.font = `${fontSize}px "Tiro Devanagari Hindi", serif`;
      allWrapped = lines.flatMap(l => wrapLine(ctx, l, maxTextWidth));
      if (allWrapped.length <= 6) break;
      fontSize -= 2;
    }

    const lineHeight  = fontSize * 1.75;
    const blockHeight = allWrapped.length * lineHeight;
    const startY      = (S - blockHeight) / 2 - 20;

    ctx.fillStyle    = COLOR.verse;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    allWrapped.forEach((line, i) => {
      ctx.font = `${fontSize}px "Tiro Devanagari Hindi", serif`;
      ctx.fillText(line, S / 2, startY + i * lineHeight);
    });

    // 6. Divider
    const dividerY = startY + blockHeight + 36;
    const divW     = 160;
    ctx.strokeStyle = COLOR.divider;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(S / 2 - divW / 2, dividerY);
    ctx.lineTo(S / 2 + divW / 2, dividerY);
    ctx.stroke();

    // Diamond on divider
    ctx.fillStyle = COLOR.divider;
    ctx.save();
    ctx.translate(S / 2, dividerY);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();

    // 7. Poet name
    if (poetName) {
      ctx.font         = '36px "Tiro Devanagari Hindi", serif';
      ctx.fillStyle    = COLOR.poet;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('— ' + poetName, S / 2, dividerY + 28);
    }

    // 8. Site branding
    const brandY = S - PAD * 0.55 - 52;
    ctx.font         = '24px "Tiro Devanagari Hindi", serif';
    ctx.fillStyle    = COLOR.brand;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(BRAND_NAME, S / 2, brandY);

    ctx.font      = '18px "Lora", Georgia, serif';
    ctx.fillStyle = 'rgba(201, 144, 106, 0.35)';
    ctx.fillText(BRAND_URL, S / 2, brandY + 30);

    return canvas;
  }

  // ── Trigger PNG download ──────────────────────────────────────────────────
  function downloadCanvas(canvas, filename) {
    canvas.toBlob(blob => {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }, 'image/png');
  }

  // ── Slugify poem title for filename ──────────────────────────────────────
  function makeFilename(title) {
    const safe = (title || 'poem').replace(/[/\\:*?"<>|]/g, '').trim();
    return safe + '.png';
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    const btn = document.getElementById('poem-download-btn');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      const lines = extractLines();

      if (!lines || lines.length > 4) {
        alert('यह सुविधा केवल चार पंक्तियों तक की कविताओं के लिए उपलब्ध है।\nThis feature is only available for poems of four lines or fewer.');
        return;
      }

      const originalHTML = btn.innerHTML;
      btn.disabled  = true;
      btn.innerHTML = '<span class="dl-icon">⏳</span><span class="lang-hi">बन रहा है…</span><span class="lang-en">Generating…</span>';

      try {
        const poetEl   = document.querySelector('.poem-poet a, .poem-poet');
        const poetName = poetEl ? poetEl.textContent.trim() : '';
        const titleEl  = document.querySelector('.poem-title');
        const title    = titleEl ? titleEl.textContent.trim() : 'poem';

        const canvas = await renderToCanvas(lines, poetName);
        downloadCanvas(canvas, makeFilename(title));
      } catch (err) {
        console.error('Poem download error:', err);
        alert('चित्र बनाने में त्रुटि हुई। / Error generating image.');
      } finally {
        btn.disabled  = false;
        btn.innerHTML = originalHTML;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();