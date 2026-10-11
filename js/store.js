/* QuoteWeb — app state & data access */
(function () {
  'use strict';
  var QW = window.QW;

  QW.library = window.QUOTE_LIBRARY || { series: [] };
  QW.manifest = window.QUOTE_MANIFEST || { series: [] };

  /* selection: episodeId -> Set(lineId) */
  var selections = {};

  QW.getSelection = function (epId) {
    return selections[epId] || (selections[epId] = {});
  };
  QW.toggleLine = function (epId, lineId) {
    var sel = QW.getSelection(epId);
    if (sel[lineId]) delete sel[lineId]; else sel[lineId] = true;
    return !!sel[lineId];
  };
  QW.clearSelection = function (epId) { selections[epId] = {}; };
  QW.selectedIds = function (epId) { return Object.keys(QW.getSelection(epId)); };
  QW.selectedCount = function (epId) { return Object.keys(QW.getSelection(epId)).length; };

  /* ---- lookups ---- */
  QW.findSeries = function (id) {
    return QW.library.series.filter(function (s) { return s.id === id; })[0] || null;
  };
  QW.findSeason = function (id) {
    var found = null;
    QW.library.series.forEach(function (s) {
      s.seasons.forEach(function (se) { if (se.id === id) found = { series: s, season: se }; });
    });
    return found;
  };
  QW.findEpisode = function (id) {
    var found = null;
    QW.library.series.forEach(function (s) {
      s.seasons.forEach(function (se) {
        se.episodes.forEach(function (ep) { if (ep.id === id) found = { series: s, season: se, episode: ep }; });
      });
    });
    return found;
  };

  /* trimmed-text overrides: episodeId -> { lineId: text } */
  var overrides = {};
  QW.getOverrides = function (epId) {
    return overrides[epId] || (overrides[epId] = {});
  };
  QW.getOverride = function (epId, lineId) {
    var o = overrides[epId];
    return o && Object.prototype.hasOwnProperty.call(o, lineId) ? o[lineId] : null;
  };
  /* set override; empty text or identical to original clears it */
  QW.setOverride = function (epId, lineId, text, original) {
    var o = QW.getOverrides(epId);
    var t = (text == null ? '' : String(text)).replace(/\s+/g, ' ').trim();
    if (!t || t === original) delete o[lineId];
    else o[lineId] = t;
    return QW.getOverride(epId, lineId);
  };
  QW.clearOverride = function (epId, lineId) {
    var o = overrides[epId];
    if (o) delete o[lineId];
  };
  QW.effectiveText = function (epId, line) {
    var ov = QW.getOverride(epId, line.id);
    return ov != null ? ov : line.text;
  };

  /* split a line into sentences (keeps trailing punctuation/quotes) */
  QW.splitSentences = function (text) {
    var m = String(text).match(/[^.!?\u2026\u3002\uFF01\uFF1F]+[.!?\u2026\u3002\uFF01\uFF1F]+\s*["'\u201D\u2019)\]]*|[^.!?\u2026\u3002\uFF01\uFF1F]+$/g);
    var out = (m || [text]).map(function (s) { return s.trim(); }).filter(Boolean);
    return out.length ? out : [String(text).trim()];
  };

  /* index built lazily, cached */
  var _index = null;
  QW.getIndex = function () {
    if (!_index) _index = QW.buildIndex(QW.library);
    return _index;
  };

  /* ---- quote config defaults (persisted in-memory per episode) ---- */
  var configs = {};
  QW.getConfig = function (epId) {
    if (!configs[epId]) {
      configs[epId] = {
        speaker: true,
        episodeTitle: true,
        episodeNumber: true,
        seriesName: true,
        theme: 'navy',
        font: 'serif',
        size: 'square',
        format: 'png'
      };
    }
    return configs[epId];
  };
})();
