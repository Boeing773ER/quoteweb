/* QuoteWeb — indexing & fuzzy search */
(function () {
  'use strict';
  var QW = window.QW;

  /* Build a flat, searchable index of every line in the library. */
  QW.buildIndex = function (library) {
    var index = [];
    library.series.forEach(function (series) {
      series.seasons.forEach(function (season) {
        season.episodes.forEach(function (ep) {
          ep.lines.forEach(function (line) {
            index.push({
              id: line.id,
              speaker: line.speaker,
              text: line.text,
              type: line.type,
              episodeId: ep.id,
              episodeTitle: ep.title,
              episodeNumber: ep.number,
              seasonId: season.id,
              seasonTitle: season.title,
              seasonTitleEn: season.titleEn,
              seasonNumber: season.number,
              seasonSpecial: !!season.special,
              seriesId: series.id,
              seriesTitle: series.title,
              seriesTitleZh: series.titleZh
            });
          });
        });
      });
    });
    return index;
  };

  var BOUNDARY = /[\s.,;:!?"'()\[\]{}\-—–]/;

  function isWordStart(text, i) {
    return i === 0 || BOUNDARY.test(text[i - 1]);
  }

  /* Match a single token against text; returns {score, ranges} or null. */
  function matchToken(token, text) {
    var idx = text.indexOf(token);
    if (idx !== -1) {
      var ranges = [[idx, idx + token.length]];
      var score = 60 + token.length * 4;
      if (isWordStart(text, idx)) score += 25;
      score -= Math.min(idx, 60) * 0.15;
      return { score: score, ranges: ranges, exact: true };
    }
    /* subsequence match */
    var t = 0, i = 0, first = -1, last = -1, ranges2 = [], gaps = 0, prev = -1;
    while (i < text.length && t < token.length) {
      if (text[i] === token[t]) {
        if (first === -1) first = i;
        if (prev !== -1 && i - prev > 1) gaps += i - prev - 1;
        prev = i; last = i;
        ranges2.push([i, i + 1]);
        t++;
      }
      i++;
    }
    if (t < token.length) return null;
    var span = last - first + 1;
    var score = 32 - gaps * 0.6 - (span - token.length) * 0.4 + token.length * 1.5;
    if (first >= 0 && isWordStart(text, first)) score += 8;
    return { score: score, ranges: ranges2, exact: false };
  }

  function mergeRanges(ranges) {
    if (!ranges.length) return [];
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var out = [ranges[0].slice()];
    for (var i = 1; i < ranges.length; i++) {
      var lastR = out[out.length - 1], r = ranges[i];
      if (r[0] <= lastR[1]) lastR[1] = Math.max(lastR[1], r[1]);
      else out.push(r.slice());
    }
    return out;
  }

  /* Score a document against a query. */
  function scoreDoc(query, tokens, text, speaker) {
    var textL = text.toLowerCase();
    var speakerL = (speaker || '').toLowerCase();
    var hay = speakerL ? speakerL + ' \u0001 ' + textL : textL;
    var total = 0, exactCount = 0;
    var allRanges = [];

    /* whole-phrase bonus */
    if (query.length > 1) {
      var pIdx = textL.indexOf(query);
      if (pIdx !== -1) {
        allRanges.push([pIdx, pIdx + query.length]);
        total += 120 - Math.min(pIdx, 80);
      }
    }

    for (var i = 0; i < tokens.length; i++) {
      var m = matchToken(tokens[i], hay);
      if (!m) return null;
      total += m.score;
      if (m.exact) exactCount++;
      if (speakerL && m.ranges.length && m.ranges[0][0] < speakerL.length) {
        total += 10; /* matched inside speaker name */
      }
      allRanges = allRanges.concat(m.ranges);
    }

    if (exactCount === tokens.length) total += 20;

    /* normalize ranges back onto the plain text (strip speaker prefix offset) */
    var offset = speakerL ? speakerL.length + 2 : 0;
    var textRanges = [];
    allRanges.forEach(function (r) {
      var s = r[0] - offset;
      if (r[1] <= offset) return; /* inside speaker name */
      if (s < 0) s = 0;
      textRanges.push([s, r[1] - offset]);
    });

    return { score: total, ranges: mergeRanges(textRanges) };
  }

  /* Public: search over an index (optionally pre-filtered). */
  QW.search = function (query, index, limit) {
    var q = (query || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!q) return [];
    var tokens = q.split(' ').filter(Boolean);
    var results = [];
    for (var i = 0; i < index.length; i++) {
      var doc = index[i];
      var r = scoreDoc(q, tokens, doc.text, doc.speaker);
      if (r) results.push({ doc: doc, score: r.score, ranges: r.ranges });
    }
    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.doc.id < b.doc.id ? -1 : 1;
    });
    if (limit) return results.slice(0, limit);
    return results;
  };

  /* Build highlighted HTML for a text given ranges. */
  QW.highlight = function (text, ranges) {
    if (!ranges || !ranges.length) return QW.esc(text);
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    ranges.forEach(function (r) {
      var s = Math.max(0, r[0]), e = Math.min(text.length, r[1]);
      if (s < pos) s = pos;
      if (e <= s) return;
      out += QW.esc(text.slice(pos, s));
      out += '<mark class="hl">' + QW.esc(text.slice(s, e)) + '</mark>';
      pos = e;
    });
    out += QW.esc(text.slice(pos));
    return out;
  };
})();
