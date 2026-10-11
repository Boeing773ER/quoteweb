/* QuoteWeb — bootstrap, events, quote preview/download */
(function () {
  'use strict';
  var QW = window.QW;

  /* ---------- helpers ---------- */
  function currentEpisodeLayout() { return document.querySelector('.episode-layout'); }

  function summary(found, epId) {
    var sel = QW.getSelection(epId);
    var lines = found.episode.lines.filter(function (l) {
      return l.type !== 'action' && sel[l.id];
    });
    var speakers = {};
    lines.forEach(function (l) { if (l.speaker) speakers[l.speaker] = true; });
    var names = Object.keys(speakers);
    return { lines: lines, speakers: names, single: names.length === 1 ? names[0] : null };
  }

  function updateEpisodeUI() {
    var layout = currentEpisodeLayout();
    if (!layout) return;
    var epId = layout.dataset.episodeId;
    var found = QW.findEpisode(epId);
    if (!found) return;
    var sum = summary(found, epId);

    var ctext = '已选 ' + sum.lines.length + ' 句';
    layout.querySelectorAll('[data-counter]').forEach(function (c) {
      c.textContent = ctext;
      c.hidden = sum.lines.length === 0;
    });

    var sw = layout.querySelector('[data-sw-speaker]');
    if (sw) {
      var input = sw.querySelector('input');
      var n = sum.speakers.length;
      var usable = n >= 1;
      input.disabled = !usable;
      sw.classList.toggle('disabled', !usable);
      var hint = sw.querySelector('[data-speaker-hint]');
      if (hint) {
        if (sum.lines.length === 0) hint.textContent = '选择台词后可标注讲话人';
        else if (n === 1) hint.textContent = '末行署名：' + sum.single;
        else if (n >= 2) hint.textContent = '在每行前标注讲话人（对话 ' + n + ' 人）';
        else hint.textContent = '所选台词没有讲话人';
      }
    }

    var gen = layout.querySelector('[data-generate]');
    var actHint = layout.querySelector('[data-action-hint]');
    if (gen) gen.disabled = sum.lines.length === 0;
    if (actHint) actHint.textContent = sum.lines.length === 0 ? '请勾选至少一句台词' : ('将生成 ' + sum.lines.length + ' 句台词的引用图');
  }

  function setLineState(lineEl, checked) {
    var cb = lineEl.querySelector('.check');
    if (cb) cb.checked = checked;
    lineEl.classList.toggle('picked', checked);
    lineEl.setAttribute('aria-checked', checked ? 'true' : 'false');
  }

  /* ---------- episode init ---------- */
  QW.initEpisodeView = function (params, root) {
    var layout = root.querySelector('.episode-layout');
    if (!layout) return;
    var epId = layout.dataset.episodeId;
    var sel = QW.getSelection(epId);
    layout.querySelectorAll('.line[data-line-id]').forEach(function (lineEl) {
      setLineState(lineEl, !!sel[lineEl.dataset.lineId]);
    });
    updateEpisodeUI();

    if (params.hl) {
      var target = layout.querySelector('.line[data-line-id="' + params.hl + '"], .scene-note[data-line-id="' + params.hl + '"]');
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.classList.add('flash');
        setTimeout(function () { target.classList.remove('flash'); }, 1800);
      }
    }
  };

  /* ---------- search form submit ---------- */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-search-form]');
    if (!form) return;
    e.preventDefault();
    var q = (form.querySelector('input[name="q"]').value || '').trim();
    var scope = form.dataset.scope || 'global';
    var id = form.dataset.scopeId;
    if (!q) {
      if (scope === 'global') location.hash = '#/';
      else if (scope === 'series') location.hash = '#/series/' + id;
      else if (scope === 'season') location.hash = '#/season/' + id;
      else if (scope === 'episode') location.hash = '#/episode/' + id;
      return;
    }
    location.hash = QW.buildHash(scope, id, q);
  });

  /* ---------- transcript interactions ---------- */
  document.addEventListener('click', function (e) {
    var editBtn = e.target.closest('[data-edit-line]');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      openTrimEditor(editBtn.dataset.editLine);
      return;
    }

    var line = e.target.closest('.line[data-line-id]');
    if (line) {
      if (e.target.closest('input.check')) return; /* native toggle -> change event */
      var cb = line.querySelector('.check');
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    var allBtn = e.target.closest('[data-select-all]');
    if (allBtn) {
      var layout = currentEpisodeLayout();
      if (!layout) return;
      var epId = layout.dataset.episodeId;
      layout.querySelectorAll('.line[data-line-id]').forEach(function (el) {
        if (!QW.getSelection(epId)[el.dataset.lineId]) {
          el.querySelector('.check').checked = true;
          QW.getSelection(epId)[el.dataset.lineId] = true;
          setLineState(el, true);
        }
      });
      updateEpisodeUI();
      return;
    }

    var noneBtn = e.target.closest('[data-select-none]');
    if (noneBtn) {
      var lay = currentEpisodeLayout();
      if (!lay) return;
      QW.clearSelection(lay.dataset.episodeId);
      lay.querySelectorAll('.line[data-line-id]').forEach(function (el) { setLineState(el, false); });
      updateEpisodeUI();
      return;
    }

    var swatch = e.target.closest('[data-theme]');
    if (swatch) {
      var layout2 = currentEpisodeLayout();
      if (!layout2) return;
      var cfg2 = QW.getConfig(layout2.dataset.episodeId);
      cfg2.theme = swatch.dataset.theme;
      layout2.querySelectorAll('[data-theme]').forEach(function (b) {
        b.setAttribute('aria-checked', String(b === swatch));
      });
      return;
    }

    var gen = e.target.closest('[data-generate]');
    if (gen) { generateQuote(); return; }
  });

  document.addEventListener('change', function (e) {
    var cb = e.target.closest('.check');
    if (cb) {
      var line = cb.closest('.line[data-line-id]');
      var epId = line.closest('.episode-layout').dataset.episodeId;
      var sel = QW.getSelection(epId);
      if (cb.checked) sel[line.dataset.lineId] = true; else delete sel[line.dataset.lineId];
      setLineState(line, cb.checked);
      updateEpisodeUI();
      return;
    }

    var cfgEl = e.target.closest('[data-cfg]');
    if (cfgEl) {
      var layout = currentEpisodeLayout();
      if (!layout) return;
      var cfg = QW.getConfig(layout.dataset.episodeId);
      cfg[cfgEl.dataset.cfg] = cfgEl.type === 'checkbox' ? cfgEl.checked : cfgEl.value;
      return;
    }
  });

  /* keyboard toggle for role=checkbox lines */
  document.addEventListener('keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    var line = e.target.closest && e.target.closest('.line[data-line-id]');
    if (!line || e.target.closest('input') || e.target.closest('button')) return;
    e.preventDefault();
    var cb = line.querySelector('.check');
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ---------- trim editor ---------- */
  function truncate(s, n) {
    s = String(s);
    return s.length > n ? s.slice(0, n - 1) + '\u2026' : s;
  }

  function refreshLine(epId, lineId) {
    var el = document.querySelector('.line[data-line-id="' + lineId + '"]');
    if (!el) return;
    var found = QW.findEpisode(epId);
    if (!found) return;
    var line = found.episode.lines.filter(function (l) { return l.id === lineId; })[0];
    if (!line) return;
    var ov = QW.getOverride(epId, lineId);
    var txt = el.querySelector('.txt');
    if (txt) {
      txt.innerHTML = QW.esc(ov != null ? ov : line.text);
      txt.classList.toggle('trimmed', ov != null);
    }
    var body = el.querySelector('.body');
    var tag = el.querySelector('.trim-tag');
    if (ov != null && !tag && body) {
      body.insertAdjacentHTML('beforeend', '<span class="trim-tag">已裁剪</span>');
    } else if (ov == null && tag) {
      tag.remove();
    }
  }

  function openTrimEditor(lineId) {
    var layout = currentEpisodeLayout();
    if (!layout) return;
    var epId = layout.dataset.episodeId;
    var found = QW.findEpisode(epId);
    if (!found) return;
    var line = found.episode.lines.filter(function (l) { return l.id === lineId; })[0];
    if (!line) return;

    /* trimming implies quoting: make sure the line is selected */
    if (!QW.getSelection(epId)[lineId]) {
      QW.getSelection(epId)[lineId] = true;
      var lineEl = document.querySelector('.line[data-line-id="' + lineId + '"]');
      if (lineEl) setLineState(lineEl, true);
      updateEpisodeUI();
    }

    var original = line.text;
    var current = QW.getOverride(epId, lineId);

    var wrap = document.createElement('div');
    wrap.className = 'trim-wrap';

    var hint = document.createElement('p');
    hint.className = 'trim-hint';
    hint.textContent = '点选下方句子可快速只引用其中一句，或直接在文本框中修改。保存后该台词将只引用你选定的部分。';
    wrap.appendChild(hint);

    var sentences = QW.splitSentences(original);
    var chipsWrap = document.createElement('div');
    chipsWrap.className = 'chips';
    if (sentences.length > 1) wrap.appendChild(chipsWrap);

    var ta = document.createElement('textarea');
    ta.className = 'trim-area';
    ta.rows = 4;
    ta.value = current != null ? current : original;
    ta.setAttribute('aria-label', '引用文本');
    wrap.appendChild(ta);

    var inline = document.createElement('div');
    inline.className = 'trim-actions-inline';
    var restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'btn sm';
    restore.textContent = '还原原文';
    var orig = document.createElement('span');
    orig.className = 'trim-orig';
    orig.innerHTML = '原文：<b>' + QW.esc(truncate(original, 90)) + '</b>';
    inline.appendChild(restore);
    inline.appendChild(orig);
    wrap.appendChild(inline);

    function syncChips() {
      var v = ta.value.trim();
      var children = chipsWrap.children;
      for (var i = 0; i < children.length; i++) {
        var b = children[i];
        var isWhole = b.dataset.whole === '1';
        b.classList.toggle('active', isWhole ? (v === original.trim()) : (b.dataset.sentence === v));
      }
      restore.disabled = v === original.trim();
    }

    sentences.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.sentence = s;
      b.textContent = truncate(s, 42);
      b.title = s;
      b.addEventListener('click', function () { ta.value = s; syncChips(); ta.focus(); });
      chipsWrap.appendChild(b);
    });
    if (sentences.length > 1) {
      var whole = document.createElement('button');
      whole.type = 'button';
      whole.className = 'chip';
      whole.dataset.whole = '1';
      whole.textContent = '整行';
      whole.title = original;
      whole.addEventListener('click', function () { ta.value = original; syncChips(); ta.focus(); });
      chipsWrap.appendChild(whole);
    }

    restore.addEventListener('click', function () { ta.value = original; syncChips(); ta.focus(); });
    ta.addEventListener('input', syncChips);
    syncChips();

    var save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn primary';
    save.textContent = '保存';
    save.addEventListener('click', function () {
      var res = QW.setOverride(epId, lineId, ta.value, original);
      refreshLine(epId, lineId);
      QW.closeModal();
      QW.toast(res ? '已裁剪引用文本' : '已还原原文');
    });

    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn';
    cancel.textContent = '取消';
    cancel.addEventListener('click', function () { QW.closeModal(); });

    QW.openModal('裁剪引用文本', wrap, [cancel, save]);
    ta.focus();
    ta.setSelectionRange(0, 0);
  }

  /* ---------- quote generation ---------- */
  function generateQuote() {
    var layout = currentEpisodeLayout();
    if (!layout) return;
    var epId = layout.dataset.episodeId;
    var found = QW.findEpisode(epId);
    var cfg = QW.getConfig(epId);
    var sum = summary(found, epId);
    if (!sum.lines.length) { QW.toast('请先勾选至少一句台词'); return; }

    var opts = {
      lines: sum.lines.map(function (l) { return { text: QW.effectiveText(epId, l), speaker: l.speaker }; }),
      speaker: sum.single,
      include: {
        speaker: cfg.speaker,
        episodeTitle: cfg.episodeTitle,
        episodeNumber: cfg.episodeNumber,
        seriesName: cfg.seriesName
      },
      meta: {
        seriesId: found.series.id,
        seriesName: found.series.titleZh + ' · ' + found.series.title,
        episodeId: found.episode.id,
        episodeTitle: found.episode.title,
        episodeLabel: QW.episodeLabel(found.season, found.episode)
      },
      theme: cfg.theme,
      font: cfg.font,
      size: QW.SIZES[cfg.size],
      format: cfg.format
    };

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', '引用图片预览');
    QW.renderQuote(canvas, opts);

    var info = document.createElement('p');
    info.style.cssText = 'text-align:center;color:var(--ink-faint);font-size:12.5px;margin:12px 0 0';
    info.textContent = QW.SIZES[cfg.size].name + ' · ' + QW.FORMATS[cfg.format].name + ' · ' + QW.THEMES[cfg.theme].name;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center';
    wrap.appendChild(canvas);
    wrap.appendChild(info);

    var dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn primary';
    dlBtn.textContent = '下载图片';
    dlBtn.addEventListener('click', function () { downloadCanvas(canvas, opts); });

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn';
    copyBtn.textContent = '复制到剪贴板';
    copyBtn.addEventListener('click', function () { copyCanvas(canvas, opts); });

    QW.openModal('引用预览', wrap, [copyBtn, dlBtn]);
  }

  function downloadCanvas(canvas, opts) {
    var fmt = QW.FORMATS[opts.format] || QW.FORMATS.png;
    if (!canvas.toBlob) {
      var a0 = document.createElement('a');
      a0.href = canvas.toDataURL(fmt.mime, fmt.quality);
      a0.download = QW.quoteFilename(opts);
      a0.click();
      return;
    }
    canvas.toBlob(function (blob) {
      if (!blob) { QW.toast('当前浏览器不支持该图片格式'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = QW.quoteFilename(opts);
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      QW.toast('已开始下载');
    }, fmt.mime, fmt.quality);
  }

  function copyCanvas(canvas, opts) {
    if (!navigator.clipboard || !window.ClipboardItem) { QW.toast('当前浏览器不支持复制'); return; }
    canvas.toBlob(function (blob) {
      if (!blob) return;
      navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
        .then(function () { QW.toast('已复制到剪贴板'); })
        .catch(function () { QW.toast('复制失败，请改用下载'); });
    }, (QW.FORMATS[opts.format] || QW.FORMATS.png).mime, 0.95);
  }

  /* ---------- boot ---------- */
  QW.render();
})();
