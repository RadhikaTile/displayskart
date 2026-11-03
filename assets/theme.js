/* DisplaysKart theme – vanilla JS (no dependencies) */
(function () {
  'use strict';
  var T = window.theme || {};
  var root = T.root || '/';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var money = function (c) {
    try { return new Intl.NumberFormat(T.locale || undefined, { style: 'currency', currency: T.currency, minimumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100); }
    catch (e) { return (c / 100).toFixed(2); }
  };
  function toast(m) { var t = $('#toast'); if (!t) return; t.textContent = m; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, 2200); }
  function json(url, opts) { return fetch(url, opts).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); }); }
  function fmtImg(u, w) { return u ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w : ''; }

  /* ---------- cart drawer ---------- */
  function openDrawer() { if (!$('#dr')) return; $('#dr').classList.add('on'); $('#ov').classList.add('on'); document.body.classList.add('noscroll'); }
  function closeAll() { ['dr', 'ov', 'qm'].forEach(function (i) { var e = $('#' + i); if (e) e.classList.remove('on'); }); document.body.classList.remove('noscroll'); }
  function bump() { $$('#cc').forEach(function (e) { e.classList.remove('bp'); void e.offsetWidth; e.classList.add('bp'); }); }
  function refreshCart() {
    return Promise.all([json(root + 'cart.js'), json(root + '?sections=cart-drawer')]).then(function (res) {
      var cart = res[0].data;
      $$('#cc').forEach(function (e) { e.textContent = cart.item_count; });
      var html = res[1].data && res[1].data['cart-drawer'];
      if (html && $('#db')) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nb = $('#db', doc);
        if (nb) $('#db').innerHTML = nb.innerHTML;
      }
      return cart;
    });
  }
  function afterAdd() { return refreshCart().then(function () { bump(); if (T.drawer) openDrawer(); else location.href = root + 'cart'; }); }
  function addForm(fd) {
    return json(root + 'cart/add.js', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }, body: fd })
      .then(function (r) { if (!r.ok) { toast(r.data.description || r.data.message || 'Could not add to cart'); return false; } return afterAdd().then(function () { return true; }); });
  }
  function addVariant(id, qty) { var fd = new FormData(); fd.append('id', id); fd.append('quantity', qty || 1); return addForm(fd); }
  function changeLine(line, qty) {
    return json(root + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ line: +line, quantity: +qty }) })
      .then(function () { return refreshCart(); });
  }

  /* ---------- wishlist (localStorage; Shopify has no native wishlist) ---------- */
  var WK = 'dk_wl', WL = [];
  try { WL = JSON.parse(localStorage.getItem(WK) || '[]'); } catch (e) { WL = []; }
  function saveWL() { try { localStorage.setItem(WK, JSON.stringify(WL)); } catch (e) {} }
  function syncWL() {
    $$('#wc').forEach(function (e) { e.textContent = WL.length; });
    $$('[data-wishlist-count]').forEach(function (e) { e.textContent = WL.length; });
    $$('[data-wl]').forEach(function (b) {
      var on = WL.indexOf(b.getAttribute('data-wl')) > -1;
      b.classList.toggle('on', on);
      if (b.hasAttribute('data-wl-label')) b.textContent = on ? '♥ In wishlist' : '♡ Wishlist'; else b.textContent = on ? '♥' : '♡';
    });
  }
  function toggleWL(handle, btn) {
    var i = WL.indexOf(handle);
    if (i < 0) WL.push(handle); else WL.splice(i, 1);
    saveWL(); syncWL();
    if (btn && !btn.hasAttribute('data-wl-label')) { btn.classList.remove('hb'); void btn.offsetWidth; btn.classList.add('hb'); }
    toast(i < 0 ? 'Added to wishlist ♥' : 'Removed from wishlist');
    if ($('[data-wishlist-grid]')) renderWL();
  }

  /* ---------- product card (JS version, mirrors snippets/product-card.liquid) ---------- */
  function cardHTML(p) {
    var v = p.variants[0], pct = p.compare_at_price > p.price ? Math.round((p.compare_at_price - p.price) * 100 / p.compare_at_price) : 0;
    var img = p.featured_image ? '<img src="' + esc(fmtImg(p.featured_image, 500)) + '" alt="' + esc(p.title) + '" loading="lazy">' : '';
    var img2 = p.images && p.images[1] ? '<span class="h2"><div class="im" style="aspect-ratio:1/1"><img src="' + esc(fmtImg(p.images[1], 500)) + '" alt="" loading="lazy"></div></span>' : '';
    var buy = p.available && p.variants.length === 1 ? '<button type="button" class="qb" data-add="' + v.id + '">Quick Buy +</button>' : '<a class="qb" href="' + esc(p.url) + '">Select options</a>';
    return '<div class="p2"><div class="pi"><a href="' + esc(p.url) + '"><div class="im" style="aspect-ratio:1/1">' + img + '</div>' + img2 + '</a>' +
      (pct ? '<span class="badge">-' + pct + '%</span>' : '') +
      '<div class="ac"><button type="button" title="Save to wishlist" aria-label="Save to wishlist" data-wl="' + esc(p.handle) + '">♡</button><button type="button" title="Quick view" aria-label="Quick view" data-qv="' + esc(p.handle) + '">👁</button></div>' + buy + '</div>' +
      '<div class="pb"><span class="cl">' + esc(p.type || '') + '</span><h3><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></h3>' + (v.sku ? '<div class="sku">SKU: ' + esc(v.sku) + '</div>' : '') +
      '<div class="pr" style="margin:4px 0 0">' + (p.compare_at_price > p.price ? '<s>' + money(p.compare_at_price) + '</s>' : '') + money(p.price) + '</div></div></div>';
  }
  function fetchProducts(handles) {
    return Promise.all(handles.map(function (h) { return fetch(root + 'products/' + h + '.js').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }))
      .then(function (a) { return a.filter(Boolean); });
  }
  function renderWL() {
    var g = $('[data-wishlist-grid]'); if (!g) return;
    var empty = $('[data-wishlist-empty]'), acts = $('[data-wishlist-actions]');
    if (!WL.length) { g.innerHTML = ''; if (empty) empty.hidden = false; if (acts) acts.hidden = true; return; }
    if (empty) empty.hidden = true; if (acts) acts.hidden = false;
    fetchProducts(WL).then(function (ps) { g.innerHTML = ps.map(cardHTML).join(''); syncWL(); initImages(); });
  }

  /* ---------- quick view ---------- */
  function quickView(handle) {
    fetchProducts([handle]).then(function (a) {
      var p = a[0]; if (!p) return;
      var v = p.variants.filter(function (x) { return x.available; })[0] || p.variants[0];
      var single = p.variants.length === 1 && p.available;
      var desc = String(p.description || '').replace(/<[^>]*>/g, '').slice(0, 160);
      $('#qc').innerHTML = '<button type="button" class="xq" data-close aria-label="Close">✕</button>' +
        '<div class="im" style="aspect-ratio:1/1">' + (p.featured_image ? '<img class="ld" src="' + esc(fmtImg(p.featured_image, 700)) + '" alt="' + esc(p.title) + '">' : '') + '</div>' +
        '<div><span class="cl">' + esc(p.type || '') + '</span><h2 style="font-size:22px;margin:6px 0">' + esc(p.title) + '</h2>' +
        (v.sku ? '<div class="sku">SKU: ' + esc(v.sku) + '</div>' : '') +
        '<p class="big">' + (p.compare_at_price > p.price ? '<s>' + money(p.compare_at_price) + '</s>' : '') + money(p.price) + '</p><p class="muted">' + esc(desc) + '</p>' +
        (single ? '<button type="button" class="btn fill" data-add="' + v.id + '">Add to cart</button> ' : '') +
        '<a class="btn" href="' + esc(p.url) + '">' + (single ? 'Full details' : 'Select options') + '</a> ' +
        (T.wishlist ? '<button type="button" class="btn" data-wl="' + esc(p.handle) + '" data-wl-label>♡ Wishlist</button>' : '') + '</div>';
      $('#qm').classList.add('on'); $('#ov').classList.add('on'); syncWL();
    });
  }

  /* ---------- recently viewed ---------- */
  function recent() {
    var RK = 'dk_rv', list = []; try { list = JSON.parse(localStorage.getItem(RK) || '[]'); } catch (e) {}
    var cur = $('[data-product]'), h = cur && cur.getAttribute('data-handle');
    if (h) { list = [h].concat(list.filter(function (x) { return x !== h; })).slice(0, 8); try { localStorage.setItem(RK, JSON.stringify(list)); } catch (e) {} }
    var box = $('[data-recent]'); if (!box) return;
    var others = list.filter(function (x) { return x !== h; }).slice(0, 4);
    if (!others.length) return;
    fetchProducts(others).then(function (ps) { if (!ps.length) return; $('[data-recent-grid]', box).innerHTML = ps.map(cardHTML).join(''); box.hidden = false; syncWL(); initImages(); });
  }

  /* ---------- product page ---------- */
  function initProduct() {
    var wrap = $('[data-product]'); if (!wrap || wrap._init) return; wrap._init = true;
    var variants = []; try { variants = JSON.parse($('[data-variants]', wrap).textContent); } catch (e) {}
    var form = $('[data-product-form]', wrap), sel = $('[data-variant-select]', wrap);
    function applyVariant(v) {
      if (!v) return;
      var pct = v.compare_at_price > v.price ? Math.round((v.compare_at_price - v.price) * 100 / v.compare_at_price) : 0;
      $('[data-price-wrap]', wrap).innerHTML = (v.compare_at_price > v.price ? '<s>' + money(v.compare_at_price) + '</s>' : '') + money(v.price) +
        (pct ? ' <span class="badge" style="position:static;font-size:13px;vertical-align:middle">-' + pct + '%</span>' : '');
      var sku = $('[data-sku]', wrap); if (sku) sku.textContent = v.sku || '—';
      var sp = $('[data-sticky-price]', wrap); if (sp) sp.textContent = money(v.price);
      [$('[data-atc]', wrap), $('[data-buy]', wrap), $('[data-sticky-atc]', wrap)].forEach(function (b) { if (b) b.disabled = !v.available; });
      var atc = $('[data-atc]', wrap); if (atc) atc.textContent = v.available ? 'Add to cart' : 'Sold out';
      if (history.replaceState) history.replaceState({}, '', location.pathname + '?variant=' + v.id);
    }
    if (sel) sel.addEventListener('change', function () { applyVariant(variants.filter(function (v) { return String(v.id) === sel.value; })[0]); });
    if (form) form.addEventListener('submit', function (e) {
      var sub = e.submitter; if (sub && sub.name === 'checkout') return; // "Buy now" goes straight to checkout
      e.preventDefault(); var atc = $('[data-atc]', wrap); if (atc) atc.disabled = true;
      addForm(new FormData(form)).then(function () { if (atc) atc.disabled = false; });
    });
    $$('.th .im', wrap).forEach(function (t) {
      t.addEventListener('click', function () {
        var mi = $('[data-main] img', wrap); if (!mi) return;
        $$('.th .im', wrap).forEach(function (x) { x.classList.remove('act'); }); t.classList.add('act');
        mi.style.opacity = 0; mi.removeAttribute('srcset'); mi.onload = function () { mi.style.opacity = 1; }; mi.src = t.getAttribute('data-thumb');
      });
    });
    var main = $('[data-main]', wrap);
    if (main) main.addEventListener('mousemove', function (e) { var r = main.getBoundingClientRect(), i = $('img', main); if (i) i.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; });
    $$('[data-tab]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-tab]', wrap).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        $$('[data-panel]', wrap).forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
      });
    });
    var sticky = $('[data-sticky]', wrap), sb = $('[data-sticky-atc]', wrap);
    if (sb && form) sb.addEventListener('click', function () { form.requestSubmit($('[data-atc]', wrap)); });
    window._stickyEl = sticky;
  }

  /* ---------- recommendations ---------- */
  function initRecs() {
    $$('[data-recs]').forEach(function (el) {
      if (el._init) return; el._init = true;
      var url = el.getAttribute('data-url'); if (!url || el.children.length) return;
      fetch(url).then(function (r) { return r.text(); }).then(function (t) {
        var d = new DOMParser().parseFromString(t, 'text/html'), n = $('[data-recs]', d);
        if (n && n.children.length) { el.innerHTML = n.innerHTML; initImages(); syncWL(); } else { var s = el.closest('section'); if (s) s.hidden = true; }
      });
    });
  }

  /* ---------- home: tabs, countdown, announcement ---------- */
  function initHome() {
    $$('[data-tabs-home]').forEach(function (bar) {
      if (bar._init) return; bar._init = true;
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab-target]'); if (!b) return;
        $$('button', bar).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        var sec = bar.closest('section');
        $$('[data-tab-panel]', sec).forEach(function (p) { p.hidden = p.getAttribute('data-tab-panel') !== b.getAttribute('data-tab-target'); });
      });
    });
  }
  function tick() {
    $$('[data-countdown]').forEach(function (e) {
      var end = e.getAttribute('data-end') ? new Date(e.getAttribute('data-end')) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      if (isNaN(end)) end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      var d = Math.max(0, end - Date.now()), v = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
      e.innerHTML = ['Days', 'Hrs', 'Min', 'Sec'].map(function (l, i) { return '<div><b>' + String(v[i]).padStart(2, '0') + '</b>' + l + '</div>'; }).join('');
    });
  }
  var ai = 0;
  setInterval(function () {
    $$('[data-announce]').forEach(function (bar) {
      var m = $$('[data-msg]', bar); if (m.length < 2) return;
      ai = (ai + 1) % m.length; m.forEach(function (x, i) { x.hidden = i !== ai; });
    });
  }, 3500);

  /* ---------- images, reveal, counters ---------- */
  function initImages() { $$('.im img').forEach(function (i) { if (i.complete && i.naturalWidth) i.classList.add('ld'); }); }
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('ld'); }, true);
  setTimeout(function () { $$('.im img').forEach(function (i) { i.classList.add('ld'); }); }, 5000);
  function count(e) {
    var to = +e.getAttribute('data-to'), t0 = performance.now();
    (function s(t) { var k = Math.min(1, (t - t0) / 1500), v = Math.round(to * (1 - Math.pow(1 - k, 3))); e.textContent = (e.getAttribute('data-pre') || '') + v.toLocaleString('en-IN') + (e.getAttribute('data-sfx') || ''); if (k < 1) requestAnimationFrame(s); })(t0);
  }
  var IO = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return; var el = en.target; IO.unobserve(el);
      if (el.classList.contains('cnt')) count(el);
      if (el.classList.contains('rv')) { el.classList.add('in'); setTimeout(function () { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, 1300); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  var SEL = '.eyeh,.sh,.badges>div,.g3>*,.g4>*,.g2>*,.g5>*,.ig>*,.cdb,.lb,.steps>*,.stat2,.cta>*,.pd>*,.tabs,details,.crumb';
  function initReveal() {
    if (!IO || RM) return;
    $$(SEL).forEach(function (el) {
      if (el.classList.contains('rv') || el.closest('header,#qm,#dr') || el.hasAttribute('hidden') || el.closest('[hidden]')) return;
      el.classList.add('rv'); el.style.transitionDelay = (Array.prototype.indexOf.call(el.parentNode.children, el) % 6) * 90 + 'ms'; IO.observe(el);
    });
    $$('.cnt').forEach(function (e) { if (e._c) return; e._c = true; e.textContent = (e.getAttribute('data-pre') || '') + '0' + (e.getAttribute('data-sfx') || ''); IO.observe(e); });
  }

  /* ---------- global events ---------- */
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-close]'))) { closeAll(); return; }
    if (e.target.id === 'qm') { closeAll(); return; }
    if ((t = e.target.closest('[data-cart-open]')) && T.drawer && $('#dr')) { e.preventDefault(); refreshCart().then(openDrawer); return; }
    if ((t = e.target.closest('[data-add]'))) { e.preventDefault(); t.disabled = true; addVariant(t.getAttribute('data-add'), 1).then(function () { t.disabled = false; closeAll && 0; }); return; }
    if ((t = e.target.closest('[data-qv]'))) { e.preventDefault(); quickView(t.getAttribute('data-qv')); return; }
    if ((t = e.target.closest('[data-wl]'))) { e.preventDefault(); toggleWL(t.getAttribute('data-wl'), t); return; }
    if ((t = e.target.closest('[data-qty-change]'))) { changeLine(t.getAttribute('data-line'), t.getAttribute('data-qty-change')); return; }
    if ((t = e.target.closest('[data-qty]'))) {
      var inp = $('input', t.parentNode); if (inp) { var min = inp.hasAttribute('min') ? +inp.min : 1; inp.value = Math.max(min, (+inp.value || 0) + (+t.getAttribute('data-qty'))); inp.dispatchEvent(new Event('change', { bubbles: true })); }
      return;
    }
    if ((t = e.target.closest('[data-wishlist-addall]'))) {
      fetchProducts(WL).then(function (ps) {
        var items = ps.filter(function (p) { return p.available && p.variants.length === 1; }).map(function (p) { return { id: p.variants[0].id, quantity: 1 }; });
        if (!items.length) { toast('Choose options on each product page'); return; }
        json(root + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ items: items }) }).then(function (r) { if (r.ok) afterAdd(); else toast(r.data.description || 'Could not add items'); });
      });
      return;
    }
    if ((t = e.target.closest('#bt'))) { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-carrier]'); if (!b) return;
    var box = b.closest('[data-track]'), awb = $('[data-awb]', box).value.trim();
    if (!awb) { toast('Enter your tracking number first'); return; }
    var url = b.getAttribute('data-carrier');
    if (url.indexOf('{awb}') > -1) url = url.replace('{awb}', encodeURIComponent(awb));
    else { try { navigator.clipboard.writeText(awb); toast('Tracking number copied — paste it on the courier site'); } catch (err) {} }
    window.open(url, '_blank', 'noopener');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-autosubmit]') && t.form) t.form.submit();
    var f = t.closest && t.closest('[data-filter-form]'); if (f) f.submit();
  });
  var tk = 0;
  window.addEventListener('scroll', function () {
    if (tk) return;
    tk = requestAnimationFrame(function () {
      tk = 0; var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      var pb = $('#pb'); if (pb) pb.style.width = (h > 0 ? y / h * 100 : 0) + '%';
      var hd = $('header.sticky'); if (hd) hd.classList.toggle('sc', y > 60);
      var bt = $('#bt'); if (bt) bt.classList.toggle('on', y > 700);
      if (window._stickyEl) window._stickyEl.classList.toggle('on', y > 600);
      var c = $('.col2'); if (c && !RM) c.style.transform = 'translateY(' + (Math.min(y, 800) * -0.05) + 'px)';
    });
  }, { passive: true });

  /* ---------- search: predictive suggestions (Shopify Predictive Search API) ---------- */
  var RQ = 'dk_rq', sCtl, sTimer;
  function getRecent() { try { return JSON.parse(localStorage.getItem(RQ) || '[]'); } catch (e) { return []; } }
  function saveRecent(v) { v = (v || '').trim(); if (v.length < 2) return; try { localStorage.setItem(RQ, JSON.stringify([v].concat(getRecent().filter(function (x) { return x.toLowerCase() !== v.toLowerCase(); })).slice(0, 5))); } catch (e) {} }
  function sUrl(q) { return (T.search || root + 'search') + '?q=' + encodeURIComponent(q) + '&options%5Bprefix%5D=last'; }
  function hl(text, q) {
    var tk = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    if (!tk.length) return esc(text);
    return String(text).split(new RegExp('(' + tk.join('|') + ')', 'ig')).map(function (s, i) { return i % 2 ? '<mark>' + esc(s) + '</mark>' : esc(s); }).join('');
  }
  function sbox() { return $('[data-search]'); }
  function sInput() { return $('[data-search] input[name="q"]'); }
  function sOpen(html) {
    var d = $('#sd'); if (!d) return; d.innerHTML = html || ''; d.hidden = !html;
    $$('.sopt', d).forEach(function (o, i) { o.id = 'so' + i; o.setAttribute('role', 'option'); });
    var i = sInput(); if (i) { i.setAttribute('aria-expanded', String(!d.hidden)); i.removeAttribute('aria-activedescendant'); }
  }
  function sClose() { sOpen(''); }
  function chips(list) { return list.map(function (x) { return '<a class="schip" data-sq="' + esc(x) + '" role="button" tabindex="0">' + esc(x) + '</a>'; }).join(''); }
  function popular() { var b = sbox(); return b ? (b.getAttribute('data-popular') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []; }
  function sEmpty() {
    var rc = getRecent();
    return (rc.length ? '<div class="sgrp"><span>Recent searches</span><a data-sclear role="button" tabindex="0">Clear</a></div>' + rc.map(function (r) { return '<a class="sopt" href="' + esc(sUrl(r)) + '"><span>🕘</span><div class="stx"><span>' + esc(r) + '</span></div></a>'; }).join('') : '') +
      '<div class="sgrp"><span>Popular searches</span></div><div style="padding:0 10px 10px">' + chips(popular()) + '</div>';
  }
  function sRender(res, q) {
    var pr = res.products || [], cs = res.collections || [], ar = res.articles || [];
    if (!pr.length && !cs.length && !ar.length) return '<div class="sgrp"><span>No matches for “' + esc(q) + '”</span></div><div style="padding:4px 10px 10px"><p class="muted" style="margin:0 0 8px;font-size:13px">Try another word, or browse:</p>' + chips(popular().slice(0, 6)) + '</div>';
    var h = '';
    if (cs.length) h += '<div class="sgrp"><span>Collections</span></div>' + cs.map(function (c) { return '<a class="sopt" href="' + esc(c.url) + '"><span>📂</span><div class="stx"><span>' + hl(c.title, q) + '</span></div></a>'; }).join('');
    if (pr.length) h += '<div class="sgrp"><span>Products</span></div>' + pr.map(function (p) {
      var im = (p.featured_image && p.featured_image.url) || p.image || '', price = p.price ? money(Math.round(parseFloat(p.price) * 100)) : '';
      return '<a class="sopt" href="' + esc(p.url) + '"><div class="sth"><div class="im" style="aspect-ratio:1/1">' + (im ? '<img class="ld" src="' + esc(fmtImg(im, 120)) + '" alt="">' : '') + '</div></div><div class="stx"><span>' + hl(p.title, q) + '</span><small>' + esc(price) + '</small></div></a>';
    }).join('');
    if (ar.length) h += '<div class="sgrp"><span>Blog</span></div>' + ar.map(function (a) { return '<a class="sopt" href="' + esc(a.url) + '"><span>📝</span><div class="stx"><span>' + hl(a.title, q) + '</span></div></a>'; }).join('');
    return h + '<a class="sopt sall" href="' + esc(sUrl(q)) + '">See all results for “' + esc(q) + '” →</a>';
  }
  function sUpdate() {
    var i = sInput(); if (!i) return; var q = i.value.trim(); sbox().classList.toggle('has', !!i.value);
    if (sCtl) sCtl.abort();
    if (!q) { sOpen(sEmpty()); return; }
    sCtl = new AbortController();
    var u = (T.suggest || root + 'search/suggest') + '.json?q=' + encodeURIComponent(q) + '&resources[type]=product,collection,article&resources[limit]=5&resources[options][unavailable_products]=last&resources[options][fields]=title,product_type,variants.sku,variants.title,vendor,tag';
    fetch(u, { signal: sCtl.signal }).then(function (r) { return r.json(); }).then(function (d) {
      var cur = sInput(); if (cur && cur.value.trim() === q) sOpen(sRender((d.resources && d.resources.results) || {}, q));
    }).catch(function () {});
  }
  document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('[data-search] input[name="q"]')) { clearTimeout(sTimer); sTimer = setTimeout(sUpdate, 150); } });
  document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('[data-search] input[name="q"]')) sUpdate(); });
  document.addEventListener('submit', function (e) { if (e.target.matches && e.target.matches('[data-search]')) { var i = sInput(); saveRecent(i && i.value); } });
  document.addEventListener('keydown', function (e) {
    var i = e.target; if (!i.matches || !i.matches('[data-search] input[name="q"]')) return;
    var d = $('#sd'), o = $$('.sopt', d), a = $('.sopt.act', d), k = o.indexOf(a);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (d.hidden) sUpdate(); if (!o.length) return; e.preventDefault();
      var n = e.key === 'ArrowDown' ? (k + 1) % o.length : (k <= 0 ? o.length - 1 : k - 1);
      o.forEach(function (x) { x.classList.remove('act'); }); o[n].classList.add('act'); i.setAttribute('aria-activedescendant', o[n].id); o[n].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && a) { e.preventDefault(); saveRecent(i.value); location.href = a.getAttribute('href'); }
    else if (e.key === 'Escape' || e.key === 'Tab') sClose();
  });
  document.addEventListener('click', function (e) {
    var bg = e.target.closest && e.target.closest('[data-burger]');
    if (bg) { var nav = $('.mn'), open = nav.classList.toggle('open'); bg.setAttribute('aria-expanded', String(open)); bg.textContent = open ? '✕' : '☰'; bg.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); return; }
    var box = e.target.closest && e.target.closest('[data-search]'); if (!box) { sClose(); return; }
    var i = sInput();
    if (e.target.closest('.sclr')) { i.value = ''; i.focus(); sUpdate(); return; }
    var c = e.target.closest('[data-sq]'); if (c) { saveRecent(c.getAttribute('data-sq')); location.href = sUrl(c.getAttribute('data-sq')); return; }
    if (e.target.closest('[data-sclear]')) { try { localStorage.removeItem(RQ); } catch (x) {} sUpdate(); return; }
    if (e.target.closest('.sopt')) saveRecent(i.value);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var txt = (a.textContent || '').trim().toLowerCase();
    var href = (a.getAttribute('href') || '').trim();
    if (txt === 'bulk enquiry' || href === '/pages/bulk-enquiry' || href === '/bulk-enquiry' || href === 'pages/bulk-enquiry') {
      if (!href || href === '#' || href === '/' || href.indexOf('bulk') > -1) {
        e.preventDefault();
        window.location.href = root === '/' ? '/pages/contact' : root + 'pages/contact';
      }
    }
  });

  function init() { syncWL(); initImages(); initProduct(); initRecs(); initHome(); initReveal(); renderWL(); recent(); tick(); }
  setInterval(tick, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', init); // theme editor re-render
})();
