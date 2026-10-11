/* QuoteWeb — hash router */
(function () {
  'use strict';
  var QW = window.QW;

  QW.parseHash = function () {
    var raw = location.hash.replace(/^#/, '');
    if (raw === '' || raw === '/') return { name: 'home', params: {} };
    var qi = raw.indexOf('?');
    var path = qi === -1 ? raw : raw.slice(0, qi);
    var query = qi === -1 ? '' : raw.slice(qi + 1);
    var segs = path.split('/').filter(Boolean);
    var params = QW.parseQuery(query);
    var head = segs[0] || 'home';
    if (segs[1]) params.id = decodeURIComponent(segs[1]);
    return { name: head, params: params };
  };

  QW.buildHash = function (scope, scopeId, q) {
    var qs = q ? '?q=' + encodeURIComponent(q) : '';
    if (scope === 'global') return '#/search' + qs;
    if (scope === 'series') return '#/series/' + scopeId + qs;
    if (scope === 'season') return '#/season/' + scopeId + qs;
    if (scope === 'episode') return '#/episode/' + scopeId + qs;
    return '#/' + qs;
  };

  QW.render = function () {
    var route = QW.parseHash();
    var view = QW.views[route.name] || QW.views.notFound;
    var app = document.getElementById('app');
    app.innerHTML = view(route.params);
    window.scrollTo(0, 0);
    if (route.name === 'episode') {
      QW.initEpisodeView(route.params, app);
    }
  };

  window.addEventListener('hashchange', QW.render);
})();
