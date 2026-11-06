/* Property Maintenance Assistant: front-end only, no backend.
   Flow: describe issue -> choose category/urgency -> submit -> confirmation. */
(function () {
  'use strict';

  var STORE_KEY = 'pma.requests.v1';
  var COUNTER_KEY = 'pma.counter.v1';
  var MAX_DESC = 500;

  var RESPONSE_TIME = {
    Low: 'Expected response: within 5 business days.',
    Medium: 'Expected response: within 2 business days.',
    Urgent: 'Expected response: same day. For immediate danger, call 911.'
  };

  var views = {
    report: document.getElementById('view-report'),
    confirm: document.getElementById('view-confirm'),
    requests: document.getElementById('view-requests')
  };
  var titles = {
    report: 'Report a Maintenance Issue',
    confirm: 'Report Submitted',
    requests: 'My Reports'
  };

  var form = document.getElementById('report-form');
  var fields = {
    unit: document.getElementById('unit'),
    category: document.getElementById('category'),
    description: document.getElementById('description')
  };
  var errorSummary = document.getElementById('error-summary');
  var errorList = document.getElementById('error-list');
  var statusEl = document.getElementById('status');
  var counter = document.getElementById('desc-count');
  var emergencyNote = document.getElementById('emergency-note');

  /* ---------- storage (safe if blocked) ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return memory; }
  }
  var memory = [];
  function save(list) {
    memory = list;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* in-memory fallback */ }
  }
  function nextRef() {
    var n = 1000;
    try { n = parseInt(localStorage.getItem(COUNTER_KEY), 10) || 1000; } catch (e) { n = 1000 + memory.length; }
    n += 1;
    try { localStorage.setItem(COUNTER_KEY, String(n)); } catch (e) { /* ignore */ }
    return 'MR-' + n;
  }

  /* ---------- helpers ---------- */
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) { return iso; }
  }
  function announce(msg) {
    statusEl.textContent = '';
    setTimeout(function () { statusEl.textContent = msg; }, 50);
  }

  /* ---------- view switching ---------- */
  function show(name, opts) {
    opts = opts || {};
    if (!views[name]) name = 'report';
    Object.keys(views).forEach(function (k) { views[k].hidden = (k !== name); });
    document.title = titles[name] + ' | Property Maintenance Assistant';

    var links = document.querySelectorAll('.nav-list a');
    Array.prototype.forEach.call(links, function (a) {
      if (a.getAttribute('data-nav') === name || (name === 'confirm' && a.getAttribute('data-nav') === 'report' && false)) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    if (name === 'requests') renderList();
    if (!opts.noFocus) {
      var h1 = views[name].querySelector('h1');
      if (h1) { h1.focus(); }
      window.scrollTo(0, 0);
    }
  }

  function routeFromHash(noFocus) {
    var h = (location.hash || '#report').slice(1);
    // The confirmation state needs fresh data, so it is only reached by submitting.
    if (h === 'confirm') h = 'report';
    show(h, { noFocus: noFocus });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-nav]');
    if (!el) return;
    e.preventDefault();
    var target = el.getAttribute('data-nav');
    if (target === 'report') resetForm();
    if (location.hash === '#' + target) show(target); else location.hash = target;
  });
  window.addEventListener('hashchange', function () { routeFromHash(false); });

  /* ---------- validation ---------- */
  function clearErrors() {
    errorSummary.hidden = true;
    errorList.innerHTML = '';
    Array.prototype.forEach.call(form.querySelectorAll('.field'), function (f) { f.classList.remove('has-error'); });
    Array.prototype.forEach.call(form.querySelectorAll('.error'), function (p) { p.hidden = true; p.textContent = ''; });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (i) { i.removeAttribute('aria-invalid'); });
  }

  function setError(id, fieldWrapperEl, message, focusId, errors) {
    var p = document.getElementById(id);
    p.textContent = message;
    p.hidden = false;
    fieldWrapperEl.classList.add('has-error');
    errors.push({ message: message, focusId: focusId });
  }

  function validate() {
    clearErrors();
    var errors = [];
    var unit = fields.unit.value.trim();
    var desc = fields.description.value.trim();
    var urgency = form.querySelector('input[name="urgency"]:checked');

    if (!unit) {
      setError('unit-error', fields.unit.closest('.field'), 'Enter your unit or apartment number.', 'unit', errors);
      fields.unit.setAttribute('aria-invalid', 'true');
    }
    if (!fields.category.value) {
      setError('category-error', fields.category.closest('.field'), 'Choose a category.', 'category', errors);
      fields.category.setAttribute('aria-invalid', 'true');
    }
    if (!urgency) {
      setError('urgency-error', form.querySelector('fieldset'), 'Choose how urgent the problem is.', 'urg-low', errors);
    }
    if (desc.length < 10) {
      setError('desc-error', fields.description.closest('.field'),
        desc.length === 0 ? 'Describe the problem.' : 'Add a little more detail (at least 10 characters).', 'description', errors);
      fields.description.setAttribute('aria-invalid', 'true');
    }

    if (errors.length) {
      errors.forEach(function (er) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + er.focusId;
        a.textContent = er.message;
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          document.getElementById(er.focusId).focus();
        });
        li.appendChild(a);
        errorList.appendChild(li);
      });
      errorSummary.hidden = false;
      errorSummary.focus();
      return false;
    }
    return true;
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var record = {
      ref: nextRef(),
      unit: fields.unit.value.trim(),
      name: document.getElementById('name').value.trim(),
      category: fields.category.value,
      urgency: form.querySelector('input[name="urgency"]:checked').value,
      description: fields.description.value.trim(),
      submittedAt: new Date().toISOString()
    };

    var list = load();
    list.unshift(record);
    save(list);
    updateNavCount();
    fillConfirmation(record);

    // Show confirmation state; leave the hash on #report so Back returns to a fresh form.
    show('confirm');
    announce('Report submitted. Reference number ' + record.ref + '.');
  });

  function fillConfirmation(r) {
    document.getElementById('c-ref').textContent = r.ref;
    document.getElementById('c-unit').textContent = r.unit;
    document.getElementById('c-category').textContent = r.category;
    document.getElementById('c-urgency').textContent = r.urgency;
    document.getElementById('c-time').textContent = formatDate(r.submittedAt);
    document.getElementById('c-desc').textContent = r.description;
    document.getElementById('c-expect').textContent = RESPONSE_TIME[r.urgency];
  }

  function resetForm() {
    form.reset();
    clearErrors();
    updateCounter();
    updateEmergency();
  }

  /* ---------- my reports ---------- */
  function renderList() {
    var list = load();
    var ul = document.getElementById('request-list');
    ul.innerHTML = '';
    document.getElementById('empty-state').hidden = list.length > 0;
    document.getElementById('clear-all').hidden = list.length === 0;

    list.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'request-item';

      var top = document.createElement('div');
      top.className = 'request-top';
      var ref = document.createElement('span');
      ref.className = 'request-ref';
      ref.textContent = r.ref;
      var badge = document.createElement('span');
      badge.className = 'badge badge-' + String(r.urgency).toLowerCase();
      badge.textContent = 'Urgency: ' + r.urgency;
      top.appendChild(ref);
      top.appendChild(badge);

      var meta = document.createElement('p');
      meta.className = 'request-meta';
      meta.textContent = r.category + ' · Unit ' + r.unit + ' · ' + formatDate(r.submittedAt);

      var desc = document.createElement('p');
      desc.className = 'request-desc';
      desc.textContent = r.description;

      li.appendChild(top);
      li.appendChild(meta);
      li.appendChild(desc);
      ul.appendChild(li);
    });
  }

  document.getElementById('clear-all').addEventListener('click', function () {
    if (window.confirm('Remove all saved reports from this browser?')) {
      save([]);
      try { localStorage.removeItem(COUNTER_KEY); } catch (e) { /* ignore */ }
      updateNavCount();
      renderList();
      announce('All reports cleared.');
      views.requests.querySelector('h1').focus();
    }
  });

  function updateNavCount() {
    var n = load().length;
    var el = document.getElementById('nav-count');
    el.textContent = n ? String(n) : '';
    var link = el.closest('a');
    link.setAttribute('aria-label', n ? 'My reports, ' + n + ' saved' : 'My reports');
  }

  /* ---------- small form behaviours ---------- */
  function updateCounter() {
    var len = fields.description.value.length;
    counter.textContent = len + ' of ' + MAX_DESC + ' characters';
    counter.classList.toggle('near-limit', len >= MAX_DESC - 50);
  }
  fields.description.addEventListener('input', updateCounter);

  function updateEmergency() {
    var u = form.querySelector('input[name="urgency"]:checked');
    emergencyNote.hidden = !(u && u.value === 'Urgent');
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name="urgency"]'), function (r) {
    r.addEventListener('change', updateEmergency);
  });

  document.getElementById('fill-example').addEventListener('click', function () {
    fields.unit.value = '4B';
    document.getElementById('name').value = 'Sam Rivera';
    fields.category.value = 'Plumbing';
    document.getElementById('urg-medium').checked = true;
    fields.description.value = 'The kitchen sink drains very slowly and there is a gurgling sound from the pipe under the sink. It started about three days ago and is getting worse.';
    updateCounter();
    updateEmergency();
    announce('Example report filled in. Review it, then submit.');
  });

  /* ---------- init ---------- */
  updateCounter();
  updateNavCount();
  routeFromHash(true);
})();
