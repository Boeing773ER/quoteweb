/* QuoteWeb — shared utilities */
(function () {
  'use strict';
  var QW = (window.QW = window.QW || {});

  QW.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  QW.debounce = function (fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  };

  QW.el = function (sel) { return document.querySelector(sel); };

  QW.frag = function (htmlStr) {
    var t = document.createElement('template');
    t.innerHTML = htmlStr.trim();
    return t.content;
  };

  QW.param = function (params, key) {
    return params && params.has ? params.get(key) : null;
  };

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  QW.toast = function (msg) {
    toastEl = toastEl || document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
      setTimeout(function () { toastEl.hidden = true; }, 220);
    }, 2200);
  };

  /* ---------- modal ---------- */
  QW.openModal = function (title, bodyNode, footNodes) {
    var modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    var body = document.getElementById('modal-body');
    body.innerHTML = '';
    body.appendChild(bodyNode);
    var foot = document.getElementById('modal-foot');
    foot.innerHTML = '';
    (footNodes || []).forEach(function (n) {
      if (typeof n === 'string') {
        var b = document.createElement('button');
        b.className = 'btn'; b.type = 'button'; b.textContent = n;
        foot.appendChild(b);
      } else foot.appendChild(n);
    });
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('.modal-head .icon-btn');
    if (closeBtn) closeBtn.focus();
  };

  QW.closeModal = function () {
    var modal = document.getElementById('modal');
    if (!modal) return;
    modal.hidden = true;
    document.getElementById('modal-body').innerHTML = '';
    document.getElementById('modal-foot').innerHTML = '';
    document.documentElement.style.overflow = '';
  };

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) QW.closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') QW.closeModal();
  });

  /* ---------- labels ---------- */
  QW.episodeLabel = function (season, episode) {
    if (season && season.special) {
      return (season.title || '特辑') + (episode.title ? ' · ' + episode.title : '');
    }
    var s = season && season.number ? '第' + season.number + '季' : (season ? season.title : '');
    var e = episode && episode.number ? '第' + episode.number + '集' : '';
    return (s + ' ' + e).trim();
  };

  QW.episodeLabelEn = function (season, episode) {
    if (season && season.special) return season.titleEn || season.title || 'Special';
    var s = season && season.number ? 'Series ' + season.number : '';
    var e = episode && episode.number ? ', Episode ' + episode.number : '';
    return (s + e);
  };

  /* ordinal helpers for query strings */
  QW.parseQuery = function (search) {
    var p = new URLSearchParams(search || '');
    var o = {};
    p.forEach(function (v, k) { o[k] = v; });
    return o;
  };
})();
