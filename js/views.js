/* QuoteWeb — page views */
(function () {
  'use strict';
  var QW = window.QW;
  var esc = QW.esc;
  var V = (QW.views = {});

  var ICON_SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>';

  function searchFormHTML(o) {
    return '<form class="search-form' + (o.compact ? ' compact' : '') + '" data-search-form role="search"' +
      ' data-scope="' + o.scope + '"' + (o.scopeId ? ' data-scope-id="' + esc(o.scopeId) + '"' : '') + '>' +
      '<span class="search-icon" aria-hidden="true">' + ICON_SEARCH + '</span>' +
      '<input type="search" name="q" value="' + esc(o.value || '') + '" placeholder="' + esc(o.placeholder || '搜索台词…') + '"' +
      ' autocomplete="off" spellcheck="false" aria-label="搜索台词">' +
      '<button class="btn primary" type="submit">搜索</button>' +
      '</form>';
  }
  V.searchFormHTML = searchFormHTML;

  function crumb(items) {
    var parts = items.map(function (it, i) {
      var last = i === items.length - 1;
      var node = it.href
        ? '<a href="' + esc(it.href) + '">' + esc(it.label) + '</a>'
        : '<span class="current">' + esc(it.label) + '</span>';
      return node + (last ? '' : '<span class="sep">/</span>');
    });
    return '<nav class="breadcrumb" aria-label="面包屑">' + parts.join('') + '</nav>';
  }

  function resultItems(results) {
    return results.map(function (r) {
      var d = r.doc;
      var isAction = d.type === 'action';
      var quote = r.doc.speaker
        ? '<span class="spk">' + esc(d.speaker) + '</span> ' + QW.highlight(d.text, r.ranges)
        : QW.highlight(d.text, r.ranges);
      var epLabel = d.seasonSpecial
        ? (d.seasonTitle + ' · ' + d.episodeTitle)
        : (d.seasonTitle + ' 第' + d.episodeNumber + '集 · ' + d.episodeTitle);
      return '<a class="result-item" href="#/episode/' + esc(d.episodeId) + '?hl=' + esc(d.id) + '">' +
        '<div class="quote' + (isAction ? ' action' : '') + '">' + quote + '</div>' +
        '<div class="crumb">' +
          '<span class="badge">' + esc(d.seriesTitleZh || d.seriesTitle) + '</span>' +
          '<span class="ep">' + esc(epLabel) + '</span>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  function resultsHTML(results, query, opts) {
    if (!results.length) {
      return '<div class="empty"><div class="big">🔍</div><p>没有找到与“' + esc(query) + '”匹配的台词</p>' +
        '<p style="font-size:13px">试试更短的关键词，或检查拼写</p></div>';
    }
    var head = '<div class="section-head"><h2>搜索结果</h2><span class="count">共 ' + results.length + ' 条</span></div>';
    return head + '<div class="result-list">' + resultItems(results) + '</div>';
  }
  V.resultsHTML = resultsHTML;

  /* compact in-scope result block with a "clear" affordance */
  function scopedResultsBlock(results, query, clearHref) {
    if (!results.length) {
      return '<div class="scope-banner">在“' + esc(query) + '”范围内没有找到匹配台词 <span class="grow"></span>' +
        '<a class="btn sm" href="' + esc(clearHref) + '">清除</a></div>';
    }
    return '<div class="scope-banner">搜索“' + esc(query) + '”，找到 ' + results.length + ' 条 <span class="grow"></span>' +
      '<a class="btn sm" href="' + esc(clearHref) + '">清除</a></div>' +
      '<div class="result-list">' + resultItems(results) + '</div>';
  }

  /* ============ HOME ============ */
  V.home = function () {
    var cards = QW.manifest.series.map(function (s) {
      return '<a class="series-card" href="#/series/' + esc(s.id) + '">' +
        '<span class="poster"><img src="assets/' + esc(s.id) + '.svg" alt="' + esc(s.title) + ' 海报" loading="lazy"></span>' +
        '<span class="body">' +
          '<span class="t-en">' + esc(s.title) + '</span>' +
          '<span class="t-zh">' + esc(s.titleZh) + '</span>' +
          '<span class="meta">' +
            '<span class="tag gold">' + esc(s.years) + '</span>' +
            '<span class="tag">' + s.episodeCount + ' 集</span>' +
            '<span class="tag">' + s.lineCount + ' 条台词</span>' +
          '</span>' +
          '<span class="go">查看剧集索引 →</span>' +
        '</span>' +
      '</a>';
    }).join('');

    return '<div>' +
      '<section class="hero">' +
        '<span class="eyebrow">英剧台词 · 引用生成</span>' +
        '<h1>搜索台词，生成引用图</h1>' +
        '<p class="sub">输入任意台词、人物或场景关键词，在所有 <strong>Yes Minister</strong> 与 <strong>Yes, Prime Minister</strong> 的剧集中模糊查找，并一键生成精美引用图片。</p>' +
        searchFormHTML({ scope: 'global', placeholder: '例如：open government、Humphrey、nuclear deterrent…' }) +
        '<p class="search-note">支持模糊匹配与拼写容错 · 数据整理自 Wikiquote</p>' +
      '</section>' +
      '<section class="section">' +
        '<div class="section-head"><h2>剧集索引</h2><span class="count">' + QW.manifest.series.length + ' 个系列</span></div>' +
        '<div class="series-grid">' + cards + '</div>' +
      '</section>' +
    '</div>';
  };

  /* ============ SEARCH RESULTS PAGE ============ */
  V.search = function (params) {
    var q = params.q || '';
    var results = QW.search(q, QW.getIndex());
    return '<div>' +
      crumb([{ label: '首页', href: '#/' }, { label: '搜索' }]) +
      '<div class="page-head">' +
        '<div class="titles"><h1>“' + esc(q) + '” 的搜索结果</h1>' +
        '<p class="sub">在所有系列中模糊查找<span class="dot">·</span>' + results.length + ' 条结果</p></div>' +
      '</div>' +
      '<div style="margin-bottom:22px">' + searchFormHTML({ scope: 'global', value: q, placeholder: '搜索台词…' }) + '</div>' +
      resultsHTML(results, q) +
    '</div>';
  };

  /* ============ SERIES (season index) ============ */
  V.series = function (params) {
    var s = QW.findSeries(params.id);
    if (!s) return V.notFound();
    var q = params.q || '';

    var seasonCards = s.seasons.map(function (se) {
      var lines = se.episodes.reduce(function (a, e) { return a + e.lines.length; }, 0);
      var num = se.special ? '<span class="num sp">★</span>'
        : '<span class="num">' + se.number + '</span>';
      return '<a class="season-card" href="#/season/' + esc(se.id) + '">' +
        num +
        '<span class="info">' +
          '<span class="t">' + esc(se.title) + (se.titleEn ? '<span class="zh">' + esc(se.titleEn) + '</span>' : '') + '</span>' +
          '<span class="m">' + se.episodes.length + ' 集 · ' + lines + ' 条台词' + (se.year ? ' · ' + esc(se.year) : '') + '</span>' +
        '</span>' +
        '<span class="arrow">›</span>' +
      '</a>';
    }).join('');

    var scoped = '';
    if (q) {
      var filtered = QW.getIndex().filter(function (d) { return d.seriesId === s.id; });
      var results = QW.search(q, filtered);
      scoped = '<div style="margin:22px 0 34px">' + scopedResultsBlock(results, q, '#/series/' + s.id) + '</div>';
    }

    return '<div>' +
      crumb([{ label: '首页', href: '#/' }, { label: s.titleZh }]) +
      '<div class="page-head">' +
        '<div class="titles"><h1>' + esc(s.titleZh) + ' <span style="color:var(--ink-soft);font-size:.6em">' + esc(s.title) + '</span></h1>' +
        '<p class="sub">' + esc(s.years) + '<span class="dot">·</span>' + s.seasons.length + ' 季 / 特辑<span class="dot">·</span>' + s.seasons.reduce(function (a, se) { return a + se.episodes.length; }, 0) + ' 集</p></div>' +
        '<div class="scope-search">' + searchFormHTML({ scope: 'series', scopeId: s.id, compact: true, value: q, placeholder: '在本系列中搜索…' }) + '</div>' +
      '</div>' +
      scoped +
      '<div class="section-head"><h2>季索引</h2></div>' +
      '<div class="season-list">' + seasonCards + '</div>' +
    '</div>';
  };

  /* ============ SEASON (episode index) ============ */
  V.season = function (params) {
    var found = QW.findSeason(params.id);
    if (!found) return V.notFound();
    var s = found.series, se = found.season;
    var q = params.q || '';

    var rows = se.episodes.map(function (ep) {
      var label = se.special ? (ep.title) : ('第 ' + ep.number + ' 集');
      var full = se.special ? '' : ep.title;
      return '<a class="episode-row" href="#/episode/' + esc(ep.id) + '">' +
        '<span class="no">' + (se.special ? '★' : ep.number) + '</span>' +
        '<span class="et">' + esc(label) + (full ? '<span class="full">' + esc(full) + '</span>' : '') + '</span>' +
        '<span class="lc">' + ep.lines.length + ' 句</span>' +
      '</a>';
    }).join('');

    var scoped = '';
    if (q) {
      var filtered = QW.getIndex().filter(function (d) { return d.seasonId === se.id; });
      var results = QW.search(q, filtered);
      scoped = '<div style="margin:22px 0 34px">' + scopedResultsBlock(results, q, '#/season/' + se.id) + '</div>';
    }

    return '<div>' +
      crumb([{ label: '首页', href: '#/' }, { label: s.titleZh, href: '#/series/' + s.id }, { label: se.title }]) +
      '<div class="page-head">' +
        '<div class="titles"><h1>' + esc(s.titleZh) + ' · ' + esc(se.title) + '</h1>' +
        '<p class="sub">' + esc(se.titleEn || '') + (se.year ? '<span class="dot">·</span>' + esc(se.year) : '') + '<span class="dot">·</span>' + se.episodes.length + ' 集</p></div>' +
        '<div class="scope-search">' + searchFormHTML({ scope: 'season', scopeId: se.id, compact: true, value: q, placeholder: '在本季中搜索…' }) + '</div>' +
      '</div>' +
      scoped +
      '<div class="section-head"><h2>集索引</h2></div>' +
      '<div class="episode-list">' + rows + '</div>' +
    '</div>';
  };

  /* ============ EPISODE DETAIL ============ */
  var ICON_EDIT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';

  function lineHTML(line, qmap, epId) {
    if (line.type === 'action') {
      return '<div class="scene-note" data-type="action" data-line-id="' + esc(line.id) + '">' + esc(line.text) + '</div>';
    }
    var trimmed = QW.getOverride(epId, line.id);
    var text = trimmed != null ? trimmed : line.text;
    var body = (qmap && trimmed == null) ? QW.highlight(text, qmap[line.id]) : esc(text);
    var spk = line.speaker ? '<span class="spk">' + esc(line.speaker) + '</span>' : '';
    var tag = trimmed != null ? '<span class="trim-tag">已裁剪</span>' : '';
    return '<div class="line' + (line.speaker ? '' : ' narrative') + '" data-line-id="' + esc(line.id) + '" data-type="' + esc(line.type) + '" role="checkbox" aria-checked="false" tabindex="0">' +
      '<input class="check" type="checkbox" aria-label="选择此台词">' +
      '<div class="body">' + spk + '<span class="txt' + (trimmed != null ? ' trimmed' : '') + '">' + body + '</span>' + tag + '</div>' +
      '<button class="line-edit" type="button" data-edit-line="' + esc(line.id) + '" title="裁剪引用文本" aria-label="裁剪引用文本">' + ICON_EDIT + '</button>' +
    '</div>';
  }

  V.episode = function (params) {
    var found = QW.findEpisode(params.id);
    if (!found) return V.notFound();
    var s = found.series, se = found.season, ep = found.episode;
    var q = params.q || '';
    var hl = params.hl || '';

    /* scoped search within this episode */
    var qmap = null, shown = ep.lines, scopeBanner = '';
    if (q) {
      var sub = QW.getIndex().filter(function (d) { return d.episodeId === ep.id; });
      var results = QW.search(q, sub);
      qmap = {};
      shown = results.map(function (r) { qmap[r.doc.id] = r.ranges; return r.doc; });
      scopeBanner = '<div class="scope-banner">在本集中搜索“' + esc(q) + '”，找到 ' + results.length + ' 条 <span class="grow"></span>' +
        '<a class="btn sm" href="#/episode/' + ep.id + '">清除</a></div>';
    }

    var transcript = shown.length
      ? shown.map(function (l) { return lineHTML(l, qmap, ep.id); }).join('')
      : '<div class="transcript-empty">没有匹配的台词。</div>';

    var epNumLabel = QW.episodeLabel(se, ep);
    var cfg = QW.getConfig(ep.id);

    var themeSwatches = Object.keys(QW.THEMES).map(function (k) {
      var t = QW.THEMES[k];
      return '<button type="button" class="swatch" data-theme="' + k + '" title="' + esc(t.name) + '" aria-label="' + esc(t.name) + '"' +
        ' aria-checked="' + (k === cfg.theme) + '" style="background:linear-gradient(135deg,' + t.bg2 + ',' + t.bg + ');box-shadow:inset 0 0 0 3px ' + t.accent + '">' +
        '</button>';
    }).join('');

    var fontOpts = Object.keys(QW.FONTS).map(function (k) {
      return '<option value="' + k + '"' + (k === cfg.font ? ' selected' : '') + '>' + esc(QW.FONTS[k].name) + '</option>';
    }).join('');
    var sizeOpts = Object.keys(QW.SIZES).map(function (k) {
      return '<option value="' + k + '"' + (k === cfg.size ? ' selected' : '') + '>' + esc(QW.SIZES[k].name) + '</option>';
    }).join('');
    var fmtOpts = Object.keys(QW.FORMATS).map(function (k) {
      return '<option value="' + k + '"' + (k === cfg.format ? ' selected' : '') + '>' + esc(QW.FORMATS[k].name) + '</option>';
    }).join('');

    return '<div>' +
      crumb([
        { label: '首页', href: '#/' },
        { label: s.titleZh, href: '#/series/' + s.id },
        { label: se.title, href: '#/season/' + se.id },
        { label: se.special ? ep.title : '第' + ep.number + '集' }
      ]) +
      '<div class="page-head">' +
        '<div class="titles"><h1>' + esc(ep.title) + '</h1>' +
        '<p class="sub">' + esc(s.titleZh) + '<span class="dot">·</span>' + esc(epNumLabel) + '<span class="dot">·</span>' + ep.lines.length + ' 句</p></div>' +
        '<div class="scope-search">' + searchFormHTML({ scope: 'episode', scopeId: ep.id, compact: true, value: q, placeholder: '在本集中搜索…' }) + '</div>' +
      '</div>' +
      scopeBanner +
      '<div class="episode-layout" data-episode-id="' + esc(ep.id) + '">' +
        '<div class="transcript-wrap">' +
          '<div class="transcript-toolbar">' +
            '<span class="selected-count" data-counter hidden>已选 0 句</span>' +
            '<span class="toolbar-hint">勾选台词生成引用；点行尾 ✎ 可只引用其中一句</span>' +
            '<span class="spacer"></span>' +
            '<button class="btn sm" type="button" data-select-all>全选</button>' +
            '<button class="btn sm" type="button" data-select-none>清空</button>' +
          '</div>' +
          '<div class="transcript">' + transcript + '</div>' +
        '</div>' +
        '<aside class="config-panel">' +
          '<header>引用生成配置 <span class="cfg-count" data-counter hidden>已选 0 句</span></header>' +
          '<div class="config-body">' +
            '<div class="config-group">' +
              '<h4>图片内容</h4>' +
              '<label class="switch" data-sw-speaker>' +
                '<input type="checkbox" data-cfg="speaker"' + (cfg.speaker ? ' checked' : '') + '>' +
                '<span class="lbl">讲话人<span class="hint" data-speaker-hint>选择台词后可标注讲话人</span></span>' +
              '</label>' +
              '<label class="switch">' +
                '<input type="checkbox" data-cfg="episodeTitle"' + (cfg.episodeTitle ? ' checked' : '') + '>' +
                '<span class="lbl">集名称</span>' +
              '</label>' +
              '<label class="switch">' +
                '<input type="checkbox" data-cfg="episodeNumber"' + (cfg.episodeNumber ? ' checked' : '') + '>' +
                '<span class="lbl">集编号</span>' +
              '</label>' +
              '<label class="switch">' +
                '<input type="checkbox" data-cfg="seriesName"' + (cfg.seriesName ? ' checked' : '') + '>' +
                '<span class="lbl">系列名称</span>' +
              '</label>' +
            '</div>' +
            '<div class="config-group">' +
              '<h4>外观</h4>' +
              '<div class="field"><label>配色主题</label><div class="swatch-row" data-themes>' + themeSwatches + '</div></div>' +
              '<div class="field"><label>字体</label><select class="select" data-cfg="font">' + fontOpts + '</select></div>' +
              '<div class="field"><label>图片尺寸</label><select class="select" data-cfg="size">' + sizeOpts + '</select></div>' +
              '<div class="field"><label>图片格式</label><select class="select" data-cfg="format">' + fmtOpts + '</select></div>' +
            '</div>' +
          '</div>' +
          '<div class="config-actions">' +
            '<button class="btn primary" type="button" data-generate disabled>生成引用</button>' +
            '<span class="hint" data-action-hint>请勾选至少一句台词</span>' +
          '</div>' +
        '</aside>' +
      '</div>' +
    '</div>';
  };

  /* ============ ABOUT ============ */
  V.about = function () {
    return '<div class="prose">' +
      crumb([{ label: '首页', href: '#/' }, { label: '关于' }]) +
      '<h1>关于 QuoteWeb</h1>' +
      '<p>QuoteWeb 是一个纯前端的英剧台词检索与“引用图”生成工具，示例数据来自英国政治喜剧《Yes Minister》(是，大臣) 与《Yes, Prime Minister》(是，首相)。</p>' +
      '<ul>' +
        '<li><strong>模糊搜索</strong>：在所有剧集的台词中检索，支持子串与子序列匹配，命中处高亮。</li>' +
        '<li><strong>逐级索引</strong>：系列 → 季/特辑 → 集 → 台词，每一层都可限定范围搜索。</li>' +
        '<li><strong>引用生成</strong>：勾选台词后，选择要包含的信息（讲话人、集名、集编号、系列名）、配色、字体与格式，预览并下载 PNG / JPEG / WebP。</li>' +
      '</ul>' +
      '<p>台词文本整理自 <a href="https://en.wikiquote.org/wiki/Yes,_Minister" target="_blank" rel="noopener noreferrer">Wikiquote</a>（CC BY-SA 4.0）。剧集版权归 BBC 及 Antony Jay、Jonathan Lynn 所有，本站仅用于学习与个人用途。</p>' +
      '<h2>本地运行</h2>' +
      '<p>本站在浏览器中直接运行，无需构建。由于使用了本地 JSON 数据，建议通过本地服务器打开：</p>' +
      '<p><code>python3 -m http.server 8000</code> 然后访问 <code>http://localhost:8000</code></p>' +
      '<p>（已提供 <code>data/*.js</code> 包装，直接双击 <code>index.html</code> 亦可离线使用。）</p>' +
    '</div>';
  };

  V.notFound = function () {
    return '<div class="empty" style="margin-top:40px"><div class="big">🧭</div>' +
      '<h2>页面不存在</h2><p>链接可能已失效。</p>' +
      '<p style="margin-top:16px"><a class="btn primary" href="#/">返回首页</a></p></div>';
  };
})();
