(function () {
  var nav = document.getElementById('site-nav');
  var input = document.getElementById('search-by');
  var empty = document.getElementById('empty-search');
  var items = Array.prototype.slice.call(nav.querySelectorAll('li'));

  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    nav.classList.toggle('searching', q !== '');
    var visible = 0;
    items.forEach(function (li) {
      var match = !q || li.dataset.search.indexOf(q) !== -1;
      var childMatch = Array.prototype.some.call(li.querySelectorAll('li'), function (c) {
        return c.dataset.search.indexOf(q) !== -1;
      });
      li.hidden = !!q && !match && !childMatch;
      if (!li.hidden && li.classList.contains('nav-top')) visible++;
    });
    empty.hidden = !q || visible > 0;
  });

  document.getElementById('search-clear').addEventListener('click', function () {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  });

  // Mark visited pages with a check (stored in the browser localStorage)
  try {
    var key = 'aws-report-visited';
    var seen = JSON.parse(localStorage.getItem(key) || '[]');
    if (seen.indexOf(location.pathname) === -1) seen.push(location.pathname);
    localStorage.setItem(key, JSON.stringify(seen));
    items.forEach(function (li) {
      var a = li.querySelector(':scope > a');
      if (a && seen.indexOf(a.pathname) !== -1) li.classList.add('visited');
    });
  } catch (e) {}

  var sidebar = document.getElementById('sidebar');
  var shade = document.getElementById('sidebar-shade');
  var toggle = document.getElementById('sidebar-toggle');
  function setOpen(open) {
    sidebar.classList.toggle('sidebar-open', open);
    shade.classList.toggle('shade-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function () { setOpen(!sidebar.classList.contains('sidebar-open')); });
  document.getElementById('sidebar-close').addEventListener('click', function () { setOpen(false); });
  shade.addEventListener('click', function () { setOpen(false); });
})();
