/* QuoteWeb — canvas quote image renderer */
(function () {
  'use strict';
  var QW = window.QW;

  QW.THEMES = {
    navy:    { name: '午夜蓝', bg: '#0d1b2a', bg2: '#16283f', text: '#f5f2ea', accent: '#e0b44a', muted: '#8fa6c0' },
    wine:    { name: '议会红', bg: '#1e0a0a', bg2: '#3a1212', text: '#f7efe4', accent: '#e3b96a', muted: '#c99a9a' },
    paper:   { name: '纸白',   bg: '#f7f3e9', bg2: '#efe8d8', text: '#1b2a41', accent: '#b8802a', muted: '#7a6f5d' },
    slate:   { name: '石板灰', bg: '#222a35', bg2: '#2f3a48', text: '#eef2f7', accent: '#7fb3d5', muted: '#9aa7b4' },
    ink:     { name: '墨黑',   bg: '#101010', bg2: '#1c1c1c', text: '#f2f2f2', accent: '#d9b96a', muted: '#9a9a9a' }
  };

  QW.FONTS = {
    serif: { name: '衬线 Serif', css: 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif' },
    sans:  { name: '无衬线 Sans', css: '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif' },
    mono:  { name: '等宽 Mono', css: '"SFMono-Regular", Consolas, "Courier New", monospace' },
    song:  { name: '宋体 Songti', css: '"Songti SC", "SimSun", "Noto Serif SC", Georgia, serif' },
    hei:   { name: '黑体 Heiti', css: '"Heiti SC", "SimHei", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif' }
  };

  QW.SIZES = {
    square:   { name: '方形 1080×1080', w: 1080, h: 1080 },
    portrait: { name: '竖版 1080×1350', w: 1080, h: 1350 },
    story:    { name: '长竖 1080×1920', w: 1080, h: 1920 },
    landscape:{ name: '横版 1200×630',  w: 1200, h: 630 }
  };

  QW.FORMATS = {
    png:  { name: 'PNG',  mime: 'image/png',  ext: 'png' },
    jpeg: { name: 'JPEG', mime: 'image/jpeg', ext: 'jpg', quality: 0.92 },
    webp: { name: 'WebP', mime: 'image/webp', ext: 'webp', quality: 0.92 }
  };

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    String(text).split('\n').forEach(function (paragraph) {
      if (paragraph === '') { lines.push(''); return; }
      var words = paragraph.split(' ');
      var cur = '';
      for (var wi = 0; wi < words.length; wi++) {
        var word = words[wi];
        var test = cur ? cur + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidth) { cur = test; continue; }
        if (cur) { lines.push(cur); cur = ''; }
        if (ctx.measureText(word).width <= maxWidth) { cur = word; continue; }
        var chunk = '';
        for (var ci = 0; ci < word.length; ci++) {
          var t2 = chunk + word[ci];
          if (ctx.measureText(t2).width <= maxWidth) chunk = t2;
          else { lines.push(chunk); chunk = word[ci]; }
        }
        cur = chunk;
      }
      if (cur) lines.push(cur);
    });
    return lines;
  }

  /* Lay out a multi-speaker dialogue: each turn = optional speaker label + wrapped text. */
  function layoutDialogue(ctx, lines, fs, scale, lineFactor, maxWidth, includeSpeaker, fontCss) {
    var nameFont = Math.round(fs * 0.78);
    var nameLineH = Math.round(fs * 1.18);
    var lineH = Math.round(fs * lineFactor);
    var gap = Math.round(fs * 0.72);
    var height = 0;
    var turns = lines.map(function (l, idx) {
      var name = (includeSpeaker && l.speaker) ? l.speaker : '';
      ctx.font = '400 ' + Math.round(fs) + 'px ' + fontCss;
      var wrapped = wrapText(ctx, l.text, maxWidth);
      height += wrapped.length * lineH + (name ? nameLineH : 0);
      if (idx < lines.length - 1) height += gap;
      return { name: name, lines: wrapped };
    });
    return { turns: turns, height: height, nameFont: nameFont, nameLineH: nameLineH, lineH: lineH, gap: gap };
  }

  /* Render a quote onto a canvas. Returns nothing; canvas is resized + drawn. */
  QW.renderQuote = function (canvas, opts) {
    var theme = QW.THEMES[opts.theme] || QW.THEMES.navy;
    var fontCss = (QW.FONTS[opts.font] || QW.FONTS.serif).css;
    var size = opts.size;
    var W = size.w, H = size.h;
    var scale = W / 1080;
    var pad = Math.round(W * 0.085);
    var ctx = canvas.getContext('2d');

    canvas.width = W;
    canvas.height = H;

    /* background */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.bg2);
    g.addColorStop(1, theme.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* top accent bar */
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, 0, W, Math.max(6, 8 * scale));

    /* ---- attribution block measurements ---- */
    var attrFont = Math.round(34 * scale);
    var attrSmall = Math.round(28 * scale);
    var attrLines = [];

    /* distinct non-empty speakers among the selected lines */
    var speakerSet = [];
    opts.lines.forEach(function (l) {
      if (l.speaker && speakerSet.indexOf(l.speaker) === -1) speakerSet.push(l.speaker);
    });
    var isDialogue = speakerSet.length >= 2;
    var singleSpeaker = (!isDialogue && opts.include.speaker && opts.speaker) ? opts.speaker : null;

    if (singleSpeaker) attrLines.push({ text: '\u2014 ' + singleSpeaker, size: attrFont, color: theme.accent, weight: 700 });
    if (opts.include.episodeTitle && opts.meta.episodeTitle) {
      attrLines.push({ text: opts.meta.episodeTitle, size: attrSmall, color: theme.text, weight: 600 });
    }
    var numLine = [];
    if (opts.include.episodeNumber && opts.meta.episodeLabel) numLine.push(opts.meta.episodeLabel);
    if (opts.include.seriesName && opts.meta.seriesName) numLine.push(opts.meta.seriesName);
    if (numLine.length) attrLines.push({ text: numLine.join('  \u00B7  '), size: attrSmall, color: theme.muted, weight: 400 });

    var attrLineH = Math.round(attrSmall * 1.55);
    var attrBlockH = attrLines.length * attrLineH + Math.round(28 * scale);
    var bodyBottom = H - pad - attrBlockH;

    var maxFont = Math.round(W / 17);
    var minFont = Math.max(18, Math.round(24 * scale));
    var lineFactor = 1.4;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    /* keep all body drawing inside the content region (never over the attribution) */
    ctx.save();
    ctx.beginPath();
    if (ctx.rect) ctx.rect(0, 0, W, bodyBottom + Math.round(4 * scale));
    if (ctx.clip) ctx.clip();

    if (isDialogue) {
      /* ---------- dialogue layout: each turn labelled ---------- */
      var qm = Math.round(120 * scale);
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.2;
      ctx.font = '700 ' + qm + 'px ' + fontCss;
      ctx.fillText('\u201C', pad - Math.round(10 * scale), pad + qm * 0.7);
      ctx.globalAlpha = 1;

      var contentX = pad + Math.round(22 * scale);
      var textWidth = W - contentX - pad;
      var barColor = theme.accent;

      var layout = null;
      var dMin = Math.max(11, Math.round(16 * scale));
      var fs;
      for (fs = maxFont; fs >= dMin; fs -= 2) {
        layout = layoutDialogue(ctx, opts.lines, fs, scale, lineFactor, textWidth, opts.include.speaker, fontCss);
        if (layout.height <= bodyBottom - (pad + Math.round(qm * 0.55))) break;
      }
      if (!layout || fs < dMin) {
        fs = dMin;
        layout = layoutDialogue(ctx, opts.lines, fs, scale, lineFactor, textWidth, opts.include.speaker, fontCss);
      }

      var top = pad + Math.round(qm * 0.55);
      var avail = bodyBottom - top;
      var y = top + Math.max(0, (avail - layout.height) / 2);

      layout.turns.forEach(function (turn) {
        var turnTop = y;
        if (turn.name) {
          ctx.font = '700 ' + Math.round(layout.nameFont) + 'px ' + fontCss;
          ctx.fillStyle = theme.accent;
          ctx.fillText(turn.name, contentX, y + layout.nameFont * 0.82);
          y += layout.nameLineH;
        }
        ctx.font = '400 ' + Math.round(fs) + 'px ' + fontCss;
        ctx.fillStyle = theme.text;
        turn.lines.forEach(function (ln) {
          ctx.fillText(ln, contentX, y + fs * 0.82);
          y += layout.lineH;
        });
        /* speaker bar */
        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(pad, turnTop + Math.round(4 * scale), Math.max(3, Math.round(4 * scale)), Math.max(0, y - turnTop - layout.gap - Math.round(4 * scale)));
        ctx.globalAlpha = 1;
        y += layout.gap;
      });
    } else {
      /* ---------- single-quote layout ---------- */
      var qmSize = Math.round(240 * scale);
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.22;
      ctx.font = '700 ' + qmSize + 'px ' + fontCss;
      ctx.fillText('\u201C', pad - Math.round(18 * scale), pad + qmSize * 0.62);
      ctx.globalAlpha = 1;

      var maxWidth = W - pad * 2;
      var bodyTop = pad + Math.round(qmSize * 0.72);
      var availH = bodyBottom - bodyTop;
      var bodyText = opts.lines.map(function (l) { return l.text; }).join('\n');

      var fontSize = maxFont;
      var wrapped, lineH;
      for (; fontSize >= minFont; fontSize -= 2) {
        ctx.font = '600 ' + fontSize + 'px ' + fontCss;
        wrapped = wrapText(ctx, bodyText, maxWidth);
        lineH = Math.round(fontSize * lineFactor);
        if (wrapped.length * lineH <= availH) break;
      }
      if (fontSize < minFont) {
        fontSize = minFont;
        ctx.font = '600 ' + fontSize + 'px ' + fontCss;
        wrapped = wrapText(ctx, bodyText, maxWidth);
        lineH = Math.round(fontSize * lineFactor);
      }

      var blockH = wrapped.length * lineH;
      var yy = bodyTop + Math.max(0, (availH - blockH) / 2) + fontSize * 0.82;
      ctx.fillStyle = theme.text;
      for (var i = 0; i < wrapped.length; i++) {
        ctx.fillText(wrapped[i], pad, yy);
        yy += lineH;
      }
    }

    ctx.restore(); /* end body clip */

    /* ---- attribution ---- */
    var ruleY = H - pad - attrBlockH + Math.round(6 * scale);
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.beginPath();
    ctx.moveTo(pad, ruleY);
    ctx.lineTo(pad + Math.round(70 * scale), ruleY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    var ay = ruleY + Math.round(40 * scale);
    attrLines.forEach(function (ln) {
      ctx.font = ln.weight + ' ' + ln.size + 'px ' + fontCss;
      ctx.fillStyle = ln.color;
      ctx.fillText(ln.text, pad, ay);
      ay += attrLineH;
    });

    /* watermark */
    ctx.font = Math.round(22 * scale) + 'px ' + fontCss;
    ctx.fillStyle = theme.muted;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'right';
    ctx.fillText('QuoteWeb', W - pad, H - Math.round(pad * 0.42));
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  };

  QW.quoteFilename = function (opts) {
    var base = opts.meta.episodeId || 'quote';
    var fmt = QW.FORMATS[opts.format] || QW.FORMATS.png;
    return 'quote-' + base + '.' + fmt.ext;
  };
})();
