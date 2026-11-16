/* ============================================================
   Repolysis — UI
   ============================================================ */
'use strict';

/* ---------- formatting ---------- */
const Fmt = (() => {
  const intF = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const decF = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cmpF = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const dateF = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const monthF = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' });
  const timeF = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

  const plural = (n, one, many) => (Math.floor(Math.abs(n)) === 1 ? one : many);
  return {
    int: v => intF.format(v || 0),
    dec: v => decF.format(v || 0),
    compact: v => (v >= 10000 ? cmpF.format(v) : intF.format(v || 0)),
    pct: v => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`),
    mb: v => (v >= 1024 ? `${decF.format(v / 1024)} GB` : v >= 1 ? `${decF.format(v)} MB` : `${intF.format(v * 1024)} KB`),
    date: v => dateF.format(new Date(v)),
    month: v => monthF.format(new Date(v)),
    time: v => timeF.format(new Date(v)),
    age: years => {
      const y = Math.floor(years);
      const m = Math.floor((years - y) * 12);
      if (!y) return `${m} mo`;
      return `${y} ${plural(y, 'yr', 'yrs')}${m ? ` ${m} mo` : ''}`;
    },
    ago: days => {
      if (days === null || days === undefined) return '—';
      if (days < 1) return 'today';
      const d = Math.floor(days);
      if (d < 60) return `${d} ${plural(d, 'day', 'days')} ago`;
      if (d < 730) return `${Math.floor(d / 30)} months ago`;
      return `${Math.floor(d / 365)} years ago`;
    },
    plural,
  };
})();

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function safeUrl(url) {
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '#';
  } catch { return '#'; }
}

/* ---------- app ---------- */
(() => {
  const ACCENT = '#5865F2'; // main colour of the analysis report

  const $ = sel => document.querySelector(sel);
  const el = {
    tabs: document.querySelectorAll('.tab'),
    panelAnalyze: $('#panel-analyze'), panelDiscover: $('#panel-discover'), panelWidget: $('#panel-widget'),
    tabIndicator: $('.tab-indicator'), introWidget: $('#introWidget'),
    wForm: $('#widgetForm'), wInput: $('#widgetInput'), wBtn: $('#widgetBtn'), wResults: $('#widgetResults'), wLayout: $('#widgetLayout'),
    wPreview: $('#widgetPreview'), wControls: $('#widgetControls'), stage: $('#stage'), snipMd: $('#snipMd'), snipEmbed: $('#snipEmbed'),
    dlSvg: $('#dlSvg'), dlPng: $('#dlPng'),
    form: $('#searchForm'), field: $('#searchField'), input: $('#userInput'), btn: $('#analyzeBtn'),
    status: $('#status'), intro: $('#intro'), introDiscover: $('#introDiscover'),
    results: $('#results'), summary: $('#summary'), repoCard: $('#repoCard'),
    glance: $('#glance'), allStats: $('#allStats'), facts: $('#facts'), contributors: $('#contributors'),
    hoursSource: $('#hoursSource'), rate: $('#rate'),
    dForm: $('#discoverForm'), dInput: $('#discoverInput'), dBtn: $('#discoverBtn'), detected: $('#detected'),
    dResults: $('#discoverResults'), basedOn: $('#basedOn'), picks: $('#picks'), morePicks: $('#morePicks'), dMeta: $('#discoverMeta'),
    settings: $('#settings'), settingsBtn: $('#settingsBtn'), settingsClose: $('#settingsClose'),
    tokenInput: $('#tokenInput'), tokenClear: $('#tokenClear'), tokenState: $('#tokenState'),
    repoLink: $('#repoLink'),
  };

  /* =========================================================
     Motion: scroll to results, reveal on scroll, count-up numbers
     ========================================================= */
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hasIO = 'IntersectionObserver' in window;
  const COUNT_FMT = { compact: v => Fmt.compact(v), int: v => Fmt.int(v) };
  let revealObserver = null;
  let chartsObserver = null;

  function countUp(root) {
    root.querySelectorAll('[data-count]').forEach(n => {
      const target = Number(n.dataset.count) || 0;
      const fmt = COUNT_FMT[n.dataset.fmt] || COUNT_FMT.compact;
      const suffix = n.dataset.suffix || '';
      if (reduceMotion || target < 2) { n.textContent = fmt(target) + suffix; return; }
      const delay = Number(n.dataset.delay) || 250;
      const dur = 1200;
      const start = performance.now() + delay;
      n.textContent = fmt(0) + suffix;
      const step = now => {
        const p = Math.max(0, Math.min(1, (now - start) / dur));
        const eased = 1 - Math.pow(1 - p, 4);
        n.textContent = fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function showNode(node) {
    if (node.classList.contains('in')) return;
    node.classList.add('in');
    countUp(node);
  }

  /** Animate every [data-reveal] inside root as it scrolls into view. */
  function reveal(root) {
    const items = root.querySelectorAll('[data-reveal]');
    items.forEach(n => n.classList.remove('in'));
    if (reduceMotion || !hasIO) { items.forEach(showNode); return; }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          showNode(e.target);
          revealObserver.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    // Restart animations cleanly on re-render.
    void root.offsetWidth;
    items.forEach(n => revealObserver.observe(n));
  }

  /** Run fn once node is on screen (charts animate when you actually see them). */
  function whenVisible(node, fn) {
    if (chartsObserver) { chartsObserver.disconnect(); chartsObserver = null; }
    if (reduceMotion || !hasIO) { fn(); return; }
    chartsObserver = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      chartsObserver.disconnect();
      chartsObserver = null;
      fn();
    }, { threshold: 0.1 });
    chartsObserver.observe(node);
  }

  function scrollToNode(node) {
    requestAnimationFrame(() => node.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
  }

  let mode = 'analyze';
  let repoName = '';
  let running = false;
  let analysisRendered = false;
  let discover = null; // { pool, shown:Set, text }
  let widget = null;   // { card, images, opts, repo }

  /* =========================================================
     Modes
     ========================================================= */
  function moveIndicator() {
    const active = [...el.tabs].find(t => t.dataset.mode === mode);
    if (!active || !el.tabIndicator) return;
    el.tabIndicator.style.width = `${active.offsetWidth}px`;
    el.tabIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
    el.tabIndicator.style.setProperty('--tab-c', getComputedStyle(active).getPropertyValue('--c'));
  }
  window.addEventListener('resize', moveIndicator);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

  function setMode(next, { updateUrl: upd = true } = {}) {
    const changed = mode !== next;
    mode = next;
    document.body.dataset.mode = mode;
    el.tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.mode === mode)));
    el.panelAnalyze.hidden = mode !== 'analyze';
    el.panelDiscover.hidden = mode !== 'discover';
    el.panelWidget.hidden = mode !== 'widget';
    el.results.hidden = !(mode === 'analyze' && analysisRendered);
    el.dResults.hidden = !(mode === 'discover' && discover);
    el.wResults.hidden = !(mode === 'widget' && widget);
    el.intro.hidden = !(mode === 'analyze' && !analysisRendered);
    el.introDiscover.hidden = !(mode === 'discover' && !discover);
    el.introWidget.hidden = !(mode === 'widget' && !widget);
    moveIndicator();
    if (changed && !running) el.status.innerHTML = '';
    if (upd) updateUrl();
  }
  el.tabs.forEach(t => t.addEventListener('click', () => {
    setMode(t.dataset.mode);
    ({ analyze: el.input, discover: el.dInput, widget: el.wInput })[mode].focus({ preventScroll: true });
  }));

  function updateUrl() {
    const url = new URL(location.href);
    url.search = '';
    if (mode === 'analyze' && repoName) url.searchParams.set('r', repoName);
    if (mode === 'discover') {
      url.searchParams.set('mode', 'discover');
      if (discover && discover.text) url.searchParams.set('q', discover.text);
    }
    if (mode === 'widget') {
      url.searchParams.set('mode', 'widget');
      if (widget) {
        url.searchParams.set('repo', widget.card.repo.full);
        Widget.optionsToParams(widget.opts, url.searchParams);
      }
    }
    history.replaceState(null, '', url);
  }

  /* =========================================================
     Analyze a repo: input
     ========================================================= */
  const REPO_RE = /^([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/([\w.-]{1,100})$/i;

  function normalise(raw) {
    let v = String(raw).trim();
    const m = v.match(/github\.com\/([^/?#\s]+)\/([^/?#\s]+)/i);
    if (m) v = `${m[1]}/${m[2]}`;
    return v.replace(/\.git$/i, '').replace(/\/+$/, '');
  }

  /** Set the repo to analyze from free text. Returns true when it looks like owner/repo. */
  function setRepo(text) {
    const full = normalise(text);
    if (!REPO_RE.test(full)) return false;
    repoName = full;
    el.input.value = full;
    return true;
  }

  el.form.addEventListener('submit', e => {
    e.preventDefault();
    if (!setRepo(el.input.value)) {
      toast('Paste a link like github.com/owner/repo');
      el.input.focus();
      return;
    }
    runAnalysis();
  });

  document.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => {
    setRepo(b.dataset.example);
    runAnalysis();
  }));

  /* ---------- rate limit badge ---------- */
  GH.onRate(r => {
    el.rate.textContent = r.proxied ? `API ${Fmt.int(r.remaining)} · shared` : `API ${r.remaining}/${r.limit}`;
    el.rate.classList.toggle('shared', r.proxied);
    el.rate.classList.toggle('low', !r.proxied && r.remaining > 0 && r.remaining < 15);
    el.rate.classList.toggle('empty', r.remaining === 0);
    el.rate.title = r.proxied
      ? `Requests go through the Repolysis proxy: a shared, cached budget (${Fmt.int(r.remaining)} of ${Fmt.int(r.limit)} left, resets at ${Fmt.time(r.reset)}).`
      : `Remaining GitHub API requests. Resets at ${Fmt.time(r.reset)}.`;
  });
  if (GH.usingProxy()) {
    el.rate.textContent = 'API · shared';
    el.rate.classList.add('shared');
  }

  function setBusy(btn, busy, idleText) {
    running = busy;
    btn.disabled = busy;
    btn.textContent = busy ? 'Working…' : idleText;
  }

  function rateNotice(err, kind) {
    const when = err.reset ? ` It resets at <b>${Fmt.time(err.reset)}</b>.` : kind === 'search' ? ' Wait about a minute.' : '';
    const tokenHint = GH.getToken() ? '' : ' Add a free token in <a href="#" data-open-settings>settings</a> to raise the limit.';
    const what = kind === 'search'
      ? 'GitHub allows only 10 searches per minute without a token.'
      : 'GitHub is limiting requests.';
    return `<div class="notice warn"><div><b>${what}</b>${when}${tokenHint}</div></div>`;
  }

  /* =========================================================
     Analyze a repo: running
     ========================================================= */
  async function runAnalysis() {
    if (running || !repoName) return;
    setBusy(el.btn, true, 'Analyze');
    const full = repoName;
    updateUrl();

    el.status.innerHTML = `<div class="loading-list"><span class="loading-item"><span class="spinner"></span>Reading ${esc(full)}…</span></div>`;

    let report = null;
    let error = null;
    try {
      report = RepoStats.compute(await GH.fetchRepoAnalysis(full));
    } catch (err) {
      if (!(err instanceof GH.ApiError)) console.error(err);
      error = err instanceof GH.ApiError ? err : new Error("Couldn't process the data.");
    }

    setBusy(el.btn, false, 'Analyze');

    if (!report) {
      el.status.innerHTML = renderError(full, error);
      return;
    }

    repoName = report.full; // GitHub's spelling of the name
    el.input.value = repoName;
    updateUrl();
    analysisRendered = true;
    if (mode === 'analyze') setMode('analyze', { updateUrl: false });
    const pending = !report.weeks || !report.hoursPct;
    el.status.innerHTML = pending
      ? '<div class="notice warn"><div><b>GitHub is still computing some statistics</b> (commit activity or the commit clock). Click Analyze again in a few seconds to fill in the missing charts.</div></div>'
      : '';
    renderAnalysis(report);
  }

  function renderError(full, err) {
    if (err && err.rateLimited) return rateNotice(err, 'core');
    return `<div class="notice error"><div><b>${esc(full)}:</b> ${esc(err && err.message || 'Unknown error')}</div></div>`;
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-settings]')) { e.preventDefault(); openSettings(); }
  });

  /* =========================================================
     Analyze a repo: rendering
     ========================================================= */
  function avatar(url, size = 64) {
    const sep = url.includes('?') ? '&' : '?';
    return `${esc(url)}${sep}s=${size * 2}`;
  }
  const repoAvatar = (s, size) => avatar(s.r.avatar, size);
  const signedPct = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;

  const STATS = [
    { label: 'Repolysis score', hint: 'Log-scaled mix of popularity, community, activity, health and age', get: s => s.score, fmt: Fmt.int, sub: s => `grade ${s.grade}` },
    { label: 'Stars', get: s => s.r.stars, fmt: Fmt.int },
    { label: 'Forks', get: s => s.r.forks, fmt: Fmt.int },
    { label: 'Watchers', get: s => s.r.watchers, fmt: Fmt.int },
    { label: 'Contributors', get: s => s.contributorCount, fmt: v => (v >= 100 ? '100+' : Fmt.int(v)), sub: s => (s.a.contributorsMore ? 'GitHub lists the first 100' : '') },
    { label: 'Total commits', get: s => s.a.commits, fmt: Fmt.int },
    { label: 'Commits, last 12 months', get: s => s.yearCommits, fmt: Fmt.int },
    { label: 'Weeks with commits', hint: 'Share of the last 52 weeks with at least one commit', get: s => s.activeWeeks, fmt: Fmt.pct },
    { label: 'Momentum', hint: 'Last quarter vs the quarter before', get: s => s.momentum, fmt: signedPct },
    { label: 'Stars per day', hint: 'Average since creation', get: s => s.velocity, fmt: Fmt.dec },
    { label: 'Health', hint: '8 upkeep checks: description, license, topics, website, releases, recent push, not archived, discussions/wiki', get: s => s.healthScore, fmt: Fmt.pct },
    { label: 'Bus factor', hint: 'People who together wrote half of all commits', get: s => s.busFactor, fmt: Fmt.int },
    { label: 'Last push', get: s => s.pushedDays, fmt: Fmt.ago },
    { label: 'Latest release', get: s => s.releaseDays, fmt: Fmt.ago, sub: s => (s.a.release ? s.a.release.tag : '') },
    { label: 'Open issues per 1k stars', hint: 'Lower usually means a tidier tracker', get: s => s.issuesPer1k, fmt: Fmt.dec },
    { label: 'Age', get: s => s.ageYears, fmt: Fmt.age, sub: s => `since ${Fmt.month(s.r.created)}` },
    { label: 'Forks per 100 stars', get: s => s.forkRate * 100, fmt: Fmt.dec },
    { label: 'Owner share of commits', hint: 'Last 52 weeks', get: s => s.ownerShare, fmt: Fmt.pct },
    { label: 'Repo size', get: s => s.r.size / 1024, fmt: Fmt.mb },
  ];

  function renderAnalysis(s) {
    renderSummary(s);
    renderRepoCard(s);
    renderGlance(s);
    renderHealth(s);
    renderAllStats(s);
    renderFacts(s);
    renderContributors(s);

    reveal(el.results);
    whenVisible(document.getElementById('charts'), () => Charts.renderAll([{ s, color: ACCENT }]));
    scrollToNode(el.results);
  }

  document.getElementById('activityAbs').addEventListener('click', () => setActivityScale(false));
  document.getElementById('activityNorm').addEventListener('click', () => setActivityScale(true));
  function setActivityScale(norm) {
    document.getElementById('activityAbs').setAttribute('aria-pressed', String(!norm));
    document.getElementById('activityNorm').setAttribute('aria-pressed', String(norm));
    Charts.rerenderActivity(norm);
  }

  function renderSummary(s) {
    el.summary.setAttribute('data-reveal', '');
    el.summary.style.setProperty('--c', ACCENT);
    el.summary.innerHTML = `
      <img src="${repoAvatar(s, 52)}" alt="">
      <div class="s-text">
        <div class="s-title">${esc(s.full)}: ${esc(s.personality.name)}</div>
        <div class="s-sub">Grade ${s.grade} · ${esc(s.personality.desc)} ${s.traits.length} ${Fmt.plural(s.traits.length, 'trait', 'traits')} found · Repolysis score ${Fmt.int(s.score)} pts</div>
      </div>`;
  }

  function renderRepoCard(s) {
    const r = s.r;
    const meta = [
      r.lang && `<span><i class="lang-dot" style="background:${Charts.langColor(r.lang, 0)}"></i>${esc(r.lang)}</span>`,
      r.license && r.license !== 'NOASSERTION' && `<span>⚖ ${esc(r.license)}</span>`,
      `<span>📅 ${Fmt.month(r.created)}</span>`,
    ].filter(Boolean).join('');
    const shown = s.traits.slice(0, 6);
    const extra = s.traits.length - shown.length;
    el.repoCard.innerHTML = `
      <article class="repo-hero fx lift" data-reveal style="--c:${ACCENT}">
        <div class="p-head">
          <div class="p-avatar">
            <img src="${repoAvatar(s)}" alt="" loading="lazy" class="${r.ownerType === 'Organization' ? 'org' : ''}">
            <span class="p-grade" title="Grade">${s.grade}</span>
          </div>
          <div class="p-names">
            <div class="p-name" title="${esc(r.full)}">${esc(r.name)}</div>
            <a class="p-login" href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.owner)}</a>
            <div><span class="p-persona" title="${esc(s.personality.desc)}">${esc(s.personality.name)}</span></div>
          </div>
        </div>
        <p class="p-bio">${r.desc ? esc(r.desc) : '<span class="muted">No description.</span>'}</p>
        <div class="p-meta">${meta}</div>
        <div class="p-health">
          <div class="p-health-row"><span>Health ${Math.round(s.healthScore * 8)}/8</span><b data-count="${s.score}" data-fmt="int" data-suffix=" pts">${Fmt.int(s.score)} pts</b></div>
          <div class="bar"><span style="width:${Math.max(3, Math.round(s.healthScore * 100))}%"></span></div>
        </div>
        <div class="p-stats">
          <div class="p-stat"><b data-count="${r.stars}">${Fmt.compact(r.stars)}</b><span>stars</span></div>
          <div class="p-stat"><b data-count="${r.forks}">${Fmt.compact(r.forks)}</b><span>forks</span></div>
          <div class="p-stat"><b data-count="${s.contributorCount}"${s.a.contributorsMore ? ' data-suffix="+"' : ''}>${Fmt.compact(s.contributorCount)}${s.a.contributorsMore ? '+' : ''}</b><span>people</span></div>
          <div class="p-stat"><b data-count="${s.a.commits || 0}">${Fmt.compact(s.a.commits || 0)}</b><span>commits</span></div>
        </div>
        ${s.traits.length ? `<div class="badges">${shown.map((b, t) =>
          `<span class="badge" style="--t:${t}" title="${esc(b.desc)}"><span class="ico">${b.ico}</span>${esc(b.name)}</span>`).join('')}
          ${extra > 0 ? `<span class="badge" title="${esc(s.traits.slice(6).map(b => b.name).join(', '))}">+${extra}</span>` : ''}</div>` : ''}
      </article>`;
  }

  /** "At a glance" tiles. */
  function renderGlance(s) {
    const more = s.a.contributorsMore;
    const tiles = [
      { label: 'Stars', value: s.r.stars, c: '#FEE75C', sub: `${Fmt.dec(s.velocity)} per day on average` },
      { label: 'Forks', value: s.r.forks, c: '#5865F2', sub: `${Fmt.dec(s.forkRate * 100)} per 100 stars` },
      { label: 'Contributors', value: s.contributorCount, suffix: more ? '+' : '', c: '#57F287', sub: s.busFactor ? `${s.busFactor} wrote half the code` : '' },
      { label: 'Total commits', value: s.a.commits, c: '#EB459E', sub: s.commitsPerContributor ? `${Fmt.int(Math.round(s.commitsPerContributor))} per contributor` : '' },
      { label: 'Commits, last 12 months', value: s.yearCommits, c: '#00A8FC', sub: s.momentum !== null ? `${signedPct(s.momentum)} momentum last quarter` : 'still being computed by GitHub' },
      { label: 'Watchers', value: s.r.watchers, c: '#9B84EE', sub: 'get notified about everything' },
      { label: 'Open issues', value: s.r.issues, c: '#ED4245', sub: `${Fmt.dec(s.issuesPer1k)} per 1k stars` },
      { label: 'Age', text: Fmt.age(s.ageYears), c: '#F0B232', sub: `last push ${Fmt.ago(s.pushedDays)}` },
    ];
    el.glance.innerHTML = tiles.map((t, i) => {
      const known = t.text !== undefined || (t.value !== null && t.value !== undefined);
      const val = t.text !== undefined ? esc(t.text)
        : known ? `<span data-count="${t.value}"${t.suffix ? ` data-suffix="${t.suffix}"` : ''}>${Fmt.compact(t.value)}${t.suffix || ''}</span>` : '—';
      return `
      <article class="glance-tile fx lift" data-reveal style="--c:${t.c};--i:${i}">
        <span class="g-label">${esc(t.label)}</span>
        <b class="g-value">${val}</b>
        ${t.sub ? `<span class="g-sub">${esc(t.sub)}</span>` : ''}
      </article>`;
    }).join('');
  }

  /** Health checklist: lives with the charts but needs no chart library. */
  function renderHealth(s) {
    const passed = s.health.filter(h => h[1]).length;
    document.getElementById('healthScore').textContent = `${passed} of ${s.health.length} passed`;
    document.getElementById('healthList').innerHTML = s.health.map(([label, ok], i) => `
      <li class="${ok ? 'ok' : 'no'}" style="--t:${i}"><span class="mark" aria-hidden="true">${ok ? '✓' : '✕'}</span>${esc(label)}</li>`).join('')
      + `<li class="score" style="--t:${s.health.length}"><div class="bar"><span style="width:${Math.round(s.healthScore * 100)}%"></span></div><b>${Math.round(s.healthScore * 100)}%</b></li>`;
  }

  function tableHead(s, first) {
    return `<thead><tr><th>${first}</th><th style="--pc:${ACCENT}"><span class="th-user"><img src="${repoAvatar(s, 22)}" alt="">${esc(s.full)}</span></th></tr></thead>`;
  }

  function renderAllStats(s) {
    const rows = STATS.map((m, ri) => {
      const v = m.get(s);
      const subText = m.sub ? m.sub(s) : '';
      const cell = v === null || v === undefined || Number.isNaN(v)
        ? '<td class="na">—</td>'
        : `<td class="num">${esc(m.fmt(v))}${subText ? `<span class="sub">${esc(subText)}</span>` : ''}</td>`;
      return `<tr style="--r:${ri}"><th scope="row">${esc(m.label)}${m.hint ? `<small>${esc(m.hint)}</small>` : ''}</th>${cell}</tr>`;
    }).join('');
    el.allStats.innerHTML = `<table class="grid">${tableHead(s, 'Stat')}<tbody>${rows}</tbody></table>`;
  }

  const fmtDate = t => Fmt.date(t);
  // Fun facts: render(s) returns [main, sub] or a falsy value.
  const FACTS = [
    { label: 'Personality', render: s => [s.personality.name, s.personality.desc] },
    { label: 'Peak commit hour', hint: 'UTC', render: s => s.peakHour !== null && [`${s.peakHour}:00–${(s.peakHour + 1) % 24}:00`, 'UTC'] },
    { label: 'Busiest weekday', render: s => s.peakDay && [s.peakDay, `quietest: ${s.quietDay}`] },
    { label: 'Weekend commits', render: s => s.weekendShare !== null && [Fmt.pct(s.weekendShare), s.weekendShare >= 0.3 ? 'a weekend project' : s.weekendShare >= 0.15 ? 'some weekend work' : 'strictly weekdays'] },
    { label: 'Night commits', hint: '00:00–06:00 UTC', render: s => s.nightShare !== null && [Fmt.pct(s.nightShare), 'depends on where the team lives'] },
    { label: 'Busiest week (last year)', render: s => s.busiestWeek && s.busiestWeek.total && [`${Fmt.int(s.busiestWeek.total)} commits`, `week of ${fmtDate(s.busiestWeek.t)}`] },
    { label: 'Longest quiet streak', hint: 'Weeks in a row without commits, last year', render: s => s.quietStreak !== null && [`${s.quietStreak} ${Fmt.plural(s.quietStreak, 'week', 'weeks')}`, s.quietStreak === 0 ? 'never took a break' : ''] },
    { label: 'Momentum', render: s => s.momentum !== null && [signedPct(s.momentum), s.momentum > 0.2 ? 'heating up' : s.momentum < -0.2 ? 'cooling down' : 'steady'] },
    { label: 'Top contributor', render: s => s.topContributor && s.concentration && [s.topContributor.login, `${Fmt.pct(s.concentration.top1)} of commits`] },
    { label: 'Bus factor', render: s => s.busFactor && [`${s.busFactor} ${Fmt.plural(s.busFactor, 'person', 'people')}`, 'wrote half of all commits'] },
    { label: 'Bots in the team', render: s => [Fmt.int(s.bots.length), s.bots.slice(0, 2).map(b => b.login.replace('[bot]', '')).join(', ') || 'humans only'] },
    { label: "Owner's share", hint: 'Commits by the owner, last 52 weeks', render: s => s.ownerShare !== null && [Fmt.pct(s.ownerShare), s.ownerShare < 0.2 ? 'the community runs it' : s.ownerShare > 0.8 ? 'owner does most of it' : 'shared effort'] },
    { label: 'Main language', render: s => s.languages[0] && [s.languages[0].name, `${s.languages[0].pct.toFixed(1)}% of the code`] },
    { label: 'Languages above 1%', render: s => [Fmt.int(s.meaningfulLangs), `${s.languages.length} in total`] },
    { label: 'Stars per contributor', render: s => s.contributorCount && [Fmt.int(Math.round(s.starsPerContributor)), 'stars earned per person'] },
    { label: 'Commits per contributor', render: s => s.commitsPerContributor && [Fmt.int(Math.round(s.commitsPerContributor)), 'average'] },
    { label: 'Kilobytes per star', hint: 'Repo size divided by stars. Completely useless, very fun', render: s => s.r.stars && [Fmt.dec(s.kbPerStar), 'KB of repo per star'] },
    { label: 'Default branch', render: s => s.r.defaultBranch && [s.r.defaultBranch, s.r.defaultBranch === 'master' ? 'old school' : s.r.defaultBranch === 'main' ? 'modern default' : 'custom name'] },
    { label: 'Topics', render: s => [Fmt.int(s.r.topics.length), s.r.topics.slice(0, 3).join(', ') || 'none'] },
    { label: 'Latest release', render: s => s.a.release && [s.a.release.tag, Fmt.ago(s.releaseDays)] },
    { label: 'Extras', render: s => {
      const x = [s.r.homepage && 'website', s.r.hasDiscussions && 'discussions', s.r.hasWiki && 'wiki', s.r.hasPages && 'pages', s.r.isTemplate && 'template'].filter(Boolean);
      return [x.length ? x.join(', ') : 'none', `${x.length} enabled`];
    } },
    { label: 'Name length', render: s => [`${s.r.name.length} characters`, s.r.name.length <= 4 ? 'short and sweet' : s.r.name.length >= 20 ? 'a mouthful' : ''] },
    { label: 'Emoji in description', render: s => [Fmt.int(s.emojiInDesc), s.emojiInDesc ? 'expressive' : 'all business'] },
  ];

  function renderFacts(s) {
    const rows = FACTS.map((f, ri) => {
      let v = null;
      try { v = f.render(s) || null; } catch { v = null; }
      if (!v) return '';
      return `<tr style="--r:${ri}"><th scope="row">${esc(f.label)}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</th><td>${esc(v[0])}${v[1] ? `<span class="sub">${esc(v[1])}</span>` : ''}</td></tr>`;
    }).join('');
    el.facts.innerHTML = `<table class="grid">${tableHead(s, 'Fun fact')}<tbody>${rows}</tbody></table>`;
  }

  /** Top 10 contributors with their share of commits. */
  function renderContributors(s) {
    const total = s.humans.reduce((a, c) => a + c.contributions, 0) || 1;
    el.contributors.innerHTML = `
      <article class="repo-col fx" data-reveal style="--c:${ACCENT}">
        <h3><img src="${repoAvatar(s, 22)}" alt="">${esc(s.full)}</h3>
        ${s.humans.length ? s.humans.slice(0, 10).map(c => `
          <a class="repo contrib-row" href="https://github.com/${encodeURIComponent(c.login)}" target="_blank" rel="noopener">
            <img src="${avatar(c.avatar, 28)}" alt="" loading="lazy">
            <div>
              <div class="repo-name">${esc(c.login)}</div>
              <div class="bar"><span style="width:${Math.max(2, (c.contributions / total) * 100)}%"></span></div>
            </div>
            <span class="repo-meta">${Fmt.pct(c.contributions / total)}</span>
          </a>`).join('') : '<p class="muted">No contributor data.</p>'}
      </article>`;
  }

  /* =========================================================
     Discover
     ========================================================= */
  function detectedTags(parsed) {
    const tags = [];
    parsed.interests.forEach(i => {
      if (i.words.length) tags.push(`<span class="tag t-interest">${esc(i.words.join(' '))}</span>`);
      i.langs.forEach(l => tags.push(`<span class="tag t-lang">${esc(l)}</span>`));
    });
    parsed.repos.forEach(r => tags.push(`<span class="tag t-repo">${esc(r)}</span>`));
    return tags;
  }

  let detectTimer;
  el.dInput.addEventListener('input', () => {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(() => {
      const text = el.dInput.value.trim();
      if (!text) { el.detected.innerHTML = ''; return; }
      const parsed = Discover.parse(text);
      const tags = detectedTags(parsed);
      el.detected.innerHTML = tags.length
        ? `<span>Detected:</span>${tags.join('')}${parsed.extraRepos ? `<span>(+${parsed.extraRepos} repos over the limit of 5)</span>` : ''}`
        : '';
    }, 200);
  });
  el.dInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); el.dForm.requestSubmit(); }
  });

  el.dForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = el.dInput.value.trim();
    if (!text) { toast('Type a few interests or paste repos you like.'); el.dInput.focus(); return; }
    runDiscover(text);
  });

  document.querySelectorAll('[data-discover]').forEach(b => b.addEventListener('click', () => {
    el.dInput.value = b.dataset.discover;
    el.dInput.dispatchEvent(new Event('input'));
    runDiscover(b.dataset.discover);
  }));

  async function runDiscover(text) {
    if (running) return;
    setBusy(el.dBtn, true, 'Find repos');
    el.status.innerHTML = '<div class="loading-list"><span class="loading-item"><span class="spinner"></span>Reading your taste and searching GitHub…</span></div>';
    try {
      const res = await Discover.run(text);
      setBusy(el.dBtn, false, 'Find repos');
      if (!res.pool.length) {
        el.status.innerHTML = '<div class="notice warn"><div><b>No good matches found.</b> Try broader interests, e.g. "cli, productivity", or add a repo you like.</div></div>';
        return;
      }
      discover = { ...res, shown: new Set(), text };
      setMode('discover');
      el.status.innerHTML = res.missing.length
        ? `<div class="notice warn"><div><b>Couldn't find ${res.missing.map(esc).join(', ')}</b> on GitHub, so ${res.missing.length > 1 ? 'they were' : 'it was'} treated as ${res.missing.length > 1 ? 'interests' : 'an interest'}.</div></div>`
        : '';
      renderBasedOn(res);
      showPicks(true);
    } catch (err) {
      setBusy(el.dBtn, false, 'Find repos');
      el.status.innerHTML = err && err.rateLimited
        ? rateNotice(err, 'search')
        : `<div class="notice error"><div>${esc(err && err.message || 'Something went wrong.')}</div></div>`;
    }
  }

  function renderBasedOn(res) {
    const tags = [];
    res.liked.forEach(r => tags.push(`<a class="tag t-repo" href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.full)}</a>`));
    res.interests.forEach(i => { if (i.words.length) tags.push(`<span class="tag t-interest">${esc(i.words.join(' '))}</span>`); });
    [...res.profile.langs.keys()].slice(0, 4).forEach(l => tags.push(`<span class="tag t-lang">${esc(l)}</span>`));
    el.basedOn.setAttribute('data-reveal', '');
    el.basedOn.innerHTML = `<span class="lbl">Based on</span>${tags.map((t, i) => t.replace(/^<(a|span) /, `<$1 style="--t:${i}" `)).join('')}`;
  }

  const SLOTS = {
    best: { label: 'Best match', ico: '◎' },
    gem: { label: 'Hidden gem', ico: '◆' },
    wildcard: { label: 'Wildcard', ico: '✦' },
  };

  function showPicks(first = false) {
    let picks = Discover.pickThree(discover.pool, discover.shown);
    if (!picks.length) {
      discover.shown.clear();
      picks = Discover.pickThree(discover.pool, discover.shown);
      toast("That's everything for this search. Starting over.");
    }
    picks.forEach(p => discover.shown.add(p.full));
    const left = discover.pool.filter(c => !discover.shown.has(c.full)).length;
    el.morePicks.textContent = left ? 'Show 3 more' : 'Start over';

    el.picks.innerHTML = picks.map((c, i) => {
      const slot = SLOTS[c.slot] || SLOTS.wildcard;
      const topics = c.topics.slice(0, 6).map(t => `<span class="topic ${c.matchedTopics.includes(t) ? 'hit' : ''}">${esc(t)}</span>`).join('');
      return `
      <article class="pick fx lift s-${c.slot}" data-reveal style="--i:${i}">
        <span class="slot">${slot.ico} ${slot.label}</span>
        <div class="pick-head">
          <img src="${avatar(c.avatar, 44)}" alt="" loading="lazy">
          <div class="pick-title">
            <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>
            <span>by ${esc(c.owner)}</span>
          </div>
        </div>
        <p class="pick-desc">${c.desc ? esc(c.desc) : '<span class="muted">No description.</span>'}</p>
        <div class="pick-meta">
          <span>★ <b data-count="${c.stars}" data-delay="${400 + i * 160}">${Fmt.compact(c.stars)}</b></span>
          <span>⑂ ${Fmt.compact(c.forks)}</span>
          ${c.lang ? `<span><i class="lang-dot" style="background:${Charts.langColor(c.lang, 0)}"></i>${esc(c.lang)}</span>` : ''}
          <span>updated ${Fmt.ago(c.days)}</span>
        </div>
        ${topics ? `<div class="pick-topics">${topics}</div>` : ''}
        <div class="why">
          <h4>Why you might like it</h4>
          <ul>${Discover.reasons(c).map((r, t) => `<li style="--t:${t}">${esc(r)}</li>`).join('')}</ul>
        </div>
        <div class="pick-actions">
          <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">Open on GitHub</a>
        </div>
      </article>`;
    }).join('');

    el.dMeta.textContent = `Picked from ${discover.pool.length} candidates across ${discover.queries.length} GitHub searches.`;
    reveal(first ? el.dResults : el.picks);
    scrollToNode(first ? el.dResults : el.picks);
  }

  el.morePicks.addEventListener('click', () => { if (discover) showPicks(false); });

  /* =========================================================
     Repo card
     ========================================================= */
  const embedMode = new URLSearchParams(location.search).get('embed') === '1';
  const REPO_INPUT_RE = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/([\w.-]{1,100}?)(?:\.git)?(?:[/#?].*)?$/i;

  function parseRepoInput(text) {
    const m = String(text).trim().match(REPO_INPUT_RE);
    return m ? `${m[1]}/${m[2]}` : null;
  }

  el.wForm.addEventListener('submit', e => {
    e.preventDefault();
    const full = parseRepoInput(el.wInput.value);
    if (!full) { toast('Paste a link like github.com/owner/repo'); el.wInput.focus(); return; }
    runWidget(full);
  });
  document.querySelectorAll('[data-widget]').forEach(b => b.addEventListener('click', () => {
    el.wInput.value = b.dataset.widget;
    runWidget(b.dataset.widget);
  }));

  async function runWidget(full, opts) {
    if (running) return;
    setBusy(el.wBtn, true, 'Generate card');
    if (!embedMode) {
      el.status.innerHTML = `<div class="loading-list"><span class="loading-item"><span class="spinner"></span>Collecting stats for ${esc(full)}…</span></div>`;
    }
    try {
      const card = await GH.fetchRepoCard(full);
      const images = await Widget.inlineImages(card);
      widget = { card, images, opts: opts || (widget ? widget.opts : Widget.defaultOptions()) };
      setBusy(el.wBtn, false, 'Generate card');
      el.wInput.value = card.repo.full;
      setMode('widget');
      el.status.innerHTML = card.activity || embedMode ? ''
        : '<div class="notice warn"><div><b>GitHub is still computing commit activity for this repo.</b> Click "Generate card" again in a few seconds to add the activity chart.</div></div>';
      renderControls();
      renderWidget(false);
      if (embedMode) {
        el.wResults.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('in'));
      } else {
        reveal(el.wResults);
        scrollToNode(el.wLayout);
      }
    } catch (err) {
      setBusy(el.wBtn, false, 'Generate card');
      el.status.innerHTML = err && err.rateLimited
        ? rateNotice(err, 'core')
        : `<div class="notice error"><div>${esc(err && err.message || 'Something went wrong.')}</div></div>`;
    }
  }

  function renderWidget(animate = true) {
    const { svg, width, height } = Widget.render(widget.card, widget.opts, widget.images);
    widget.svg = svg;
    widget.size = { width, height };
    el.wPreview.innerHTML = svg;
    if (animate) {
      el.wPreview.classList.remove('swap');
      void el.wPreview.offsetWidth;
      el.wPreview.classList.add('swap');
    }
    el.wResults.style.setProperty('--accent', widget.opts.accent);

    const r = widget.card.repo;
    el.snipMd.textContent = `[![${r.full} stats](./.github/repolysis-card.svg)](https://github.com/${r.full})`;
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('mode', 'widget');
    url.searchParams.set('repo', r.full);
    Widget.optionsToParams(widget.opts, url.searchParams);
    url.searchParams.set('embed', '1');
    el.snipEmbed.textContent = `<iframe src="${url.href}" width="${width}" height="${height}" style="border:0;max-width:100%" title="${r.full} stats" loading="lazy"></iframe>`;
    if (!embedMode) updateUrl();
  }

  // Tiny schematic icons for the template picker
  const TPL_ICONS = {
    classic: '<rect x="4" y="3" width="32" height="34" rx="4"/><rect x="8" y="8" width="8" height="8" rx="4" class="a"/><rect x="18" y="9" width="14" height="3" rx="1.5"/><rect x="8" y="20" width="7" height="6" rx="1.5" class="a"/><rect x="16.5" y="20" width="7" height="6" rx="1.5" class="a"/><rect x="25" y="20" width="7" height="6" rx="1.5" class="a"/><rect x="8" y="30" width="24" height="2.5" rx="1.2"/>',
    compact: '<rect x="9" y="8" width="22" height="24" rx="3.5"/><rect x="12" y="12" width="6" height="6" rx="3" class="a"/><rect x="20" y="13" width="8" height="2.5" rx="1.2"/><rect x="12" y="21" width="16" height="4" rx="1.5" class="a"/><rect x="12" y="27.5" width="16" height="2" rx="1"/>',
    wide: '<rect x="1" y="11" width="38" height="18" rx="3"/><rect x="4" y="15" width="6" height="6" rx="3" class="a"/><rect x="4" y="23" width="9" height="2" rx="1"/><rect x="15" y="15" width="5" height="4" rx="1" class="a"/><rect x="21" y="15" width="5" height="4" rx="1" class="a"/><rect x="15" y="21" width="11" height="4" rx="1" class="a"/><path d="M29 24 l3 -5 l3 3 l2 -6" fill="none" class="s"/>',
    minimal: '<rect x="5" y="6" width="30" height="28" rx="3"/><rect x="9" y="11" width="16" height="3.5" rx="1.5"/><rect x="9" y="17" width="20" height="2" rx="1"/><rect x="9" y="23" width="6" height="3" rx="1" class="a"/><rect x="17" y="23" width="6" height="3" rx="1" class="a"/><rect x="9" y="29" width="22" height="1.5" rx=".75" class="a"/>',
    badge: '<rect x="2" y="15" width="36" height="10" rx="5"/><circle cx="8" cy="20" r="3" class="a"/><rect x="13" y="18.5" width="10" height="3" rx="1.5"/><rect x="26" y="18.5" width="9" height="3" rx="1.5" class="a"/>',
  };
  const STAT_KEYS = new Set(Widget.ELEMENTS.filter(e => e.group === 'Stats').map(e => e.key));

  function renderControls() {
    const o = widget.opts;
    let t = 0;
    const toggles = group => Widget.ELEMENTS.filter(e => e.group === group).map(e => `
      <label class="toggle" style="--t:${t++}"><input type="checkbox" data-el="${e.key}">${esc(e.label)}</label>`).join('');
    const chips = (list, attr) => list.map(x => `<button type="button" class="chip-btn" data-${attr}="${x.key}">${esc(x.label)}</button>`).join('');
    el.wControls.innerHTML = `
      <h3>Customize</h3>

      <div class="style-box">
        <label for="wStyle">Describe your style</label>
        <div class="style-input">
          <textarea id="wStyle" rows="2" maxlength="200" placeholder="Anything goes: neon cyberpunk banner in pink and cyan, no avatar · cozy coffee vibe · 🔥 · only stars and forks, title &quot;My Tool&quot;"></textarea>
          <button type="button" class="btn btn-warm btn-sm" id="wStyleApply">Apply</button>
        </div>
        <div class="style-understood" id="wUnderstood"><span class="muted">Moods, colors and shades, emoji, typos and Polish all work. Words it does not know still give you a unique look.</span></div>
        <div class="presets">${Widget.STYLE_PRESETS.map(p => `<button type="button" class="preset" data-mood="${p.toLowerCase()}">${p}</button>`).join('')}</div>
      </div>

      <details class="ctl-section" open>
        <summary>Template</summary>
        <div class="tpl-grid">${Widget.TEMPLATES.map(tp => `
          <button type="button" class="tpl" data-template="${tp.key}" title="${esc(tp.desc)}">
            <svg viewBox="0 0 40 40" aria-hidden="true">${TPL_ICONS[tp.key]}</svg>
            <b>${esc(tp.label)}</b><small>${esc(tp.desc.split(' · ')[1] || tp.desc)}</small>
          </button>`).join('')}
        </div>
        <p class="ctl-note" id="wTplNote"></p>
      </details>

      <details class="ctl-section" open>
        <summary>Look</summary>
        <div class="ctl-group"><span>Background</span><div class="chip-row">${chips(Widget.BACKGROUNDS, 'bg')}</div></div>
        <div class="ctl-group">
          <span>Light <output id="wGlowOut"></output></span>
          <div class="chip-row">${chips(Widget.LIGHTS, 'light')}</div>
          <input type="range" class="range" id="wGlow" min="0" max="100" step="5" aria-label="Light strength">
        </div>
        <div class="ctl-group">
          <span>Accent</span>
          <div class="swatches">
            ${Widget.ACCENTS.map(a => `<button type="button" class="swatch" style="--sw:${a.hex}" data-accent="${a.hex}" aria-label="${a.name}" title="${a.name}"></button>`).join('')}
            <label class="swatch swatch-custom" title="Custom color" id="wCustomSwatch"><input type="color" id="wColor" aria-label="Custom accent color"></label>
          </div>
        </div>
        <div class="ctl-group">
          <span>Second color <button type="button" id="wAccent2Auto">back to auto</button></span>
          <label class="color-pick"><input type="color" id="wAccent2" aria-label="Second color"><span id="wAccent2Label"></span></label>
        </div>
        <div class="ctl-group">
          <span>Theme</span>
          <div class="segmented">${Object.entries(Widget.THEMES).map(([k, th]) => `<button type="button" data-theme="${k}">${th.label}</button>`).join('')}<button type="button" data-theme="custom">Custom</button></div>
          <div class="color-row" id="wBgRow">
            <label class="color-pick"><input type="color" id="wBg1" aria-label="Background color 1"><span>Background 1</span></label>
            <label class="color-pick"><input type="color" id="wBg2" aria-label="Background color 2"><span>Background 2</span></label>
          </div>
        </div>
        <div class="ctl-group">
          <span>Font</span>
          <div class="segmented">${Object.entries(Widget.FONTS).map(([k, f]) => `<button type="button" data-font="${k}">${f.label}</button>`).join('')}</div>
        </div>
        <div class="ctl-group">
          <span>Shape</span>
          <div class="toggles">
            <label class="toggle"><input type="checkbox" data-opt="rounded">Rounded corners</label>
            <label class="toggle"><input type="checkbox" data-opt="border">Border</label>
          </div>
        </div>
        <div class="ctl-group">
          <span>Title <span class="muted">optional</span></span>
          <input class="text-input" id="wTitle" maxlength="60" placeholder="${esc(widget.card.repo.name)}" value="${esc(o.title)}">
        </div>
      </details>

      <details class="ctl-section" open>
        <summary>Elements</summary>
        <div class="ctl-group"><span>Header</span><div class="toggles">${toggles('Header')}</div></div>
        <div class="ctl-group">
          <span>Stats <span><button type="button" data-preset="all">all</button> · <button type="button" data-preset="none">none</button></span></span>
          <div class="toggles">${toggles('Stats')}</div>
        </div>
        <div class="ctl-group"><span>Sections</span><div class="toggles">${toggles('Sections')}</div></div>
      </details>

      <div class="ctl-group"><button type="button" class="btn btn-ghost btn-sm" id="wReset" style="width:100%">Reset to defaults</button></div>`;
    syncControls();
  }

  /** Reflect widget.opts in the control panel without rebuilding it. */
  function syncControls() {
    const o = widget.opts;
    const q = s => el.wControls.querySelector(s);
    const qa = s => el.wControls.querySelectorAll(s);
    const support = Widget.TEMPLATE_SUPPORT[o.template];
    qa('[data-el]').forEach(i => {
      const key = i.dataset.el;
      i.checked = o.show.has(key);
      i.parentElement.classList.toggle('on', i.checked);
      const unsupported = support && !support.has(key) && !(o.template === 'badge' && STAT_KEYS.has(key))
        && !(o.template === 'minimal' && STAT_KEYS.has(key));
      i.parentElement.classList.toggle('dim', !!unsupported);
      i.parentElement.title = unsupported ? `Not shown in the ${o.template} template` : '';
    });
    qa('[data-opt]').forEach(i => {
      i.checked = !!o[i.dataset.opt];
      i.parentElement.classList.toggle('on', i.checked);
    });
    qa('[data-template]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.template === o.template)));
    q('#wTplNote').textContent = {
      badge: 'Badge shows the name, the first 3 selected stats and the grade.',
      minimal: 'Minimal shows stats as text instead of boxes.',
      wide: 'Banner fits up to 6 stats, with activity and languages on the right.',
      compact: 'Compact fits up to 6 stats.',
    }[o.template] || '';
    qa('[data-bg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bg === o.bg)));
    qa('[data-light]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.light === o.light)));
    q('#wGlow').value = o.glow;
    q('#wGlow').disabled = o.light === 'none';
    q('#wGlowOut').textContent = o.light === 'none' ? '' : `${o.glow}%`;
    let preset = false;
    qa('[data-accent]').forEach(b => {
      const on = b.dataset.accent.toLowerCase() === o.accent.toLowerCase();
      if (on) preset = true;
      b.setAttribute('aria-pressed', String(on));
    });
    const custom = q('#wCustomSwatch');
    custom.setAttribute('aria-pressed', String(!preset));
    custom.style.setProperty('--sw', o.accent);
    custom.style.background = preset ? '' : o.accent;
    q('#wColor').value = o.accent.toLowerCase();
    const a2 = o.accent2 || Widget.shiftHue(o.accent, 48);
    q('#wAccent2').value = a2.toLowerCase();
    q('#wAccent2Label').textContent = o.accent2 ? a2.toUpperCase() : `Auto · ${a2.toUpperCase()}`;
    q('#wAccent2Auto').hidden = !o.accent2;
    const themeKey = o.bgColors ? 'custom' : o.theme;
    qa('[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === themeKey)));
    q('#wBgRow').hidden = !o.bgColors;
    if (o.bgColors) { q('#wBg1').value = o.bgColors[0]; q('#wBg2').value = o.bgColors[1]; }
    qa('[data-font]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.font === o.font)));
    el.wResults.style.setProperty('--accent', o.accent);
  }

  function applyStyleText(text, label) {
    const out = el.wControls.querySelector('#wUnderstood');
    if (!String(text || '').trim()) {
      out.innerHTML = '<span class="muted">Type anything: a mood, colors, a vibe, emoji, or what to show and hide.</span>';
      return;
    }
    const parsed = Widget.parseStyle(text);
    widget.opts = Widget.applyStyle(widget.opts, parsed);
    const head = label ? esc(label) : parsed.generated ? 'No known style words, so I built a look from your text' : 'Applied';
    out.innerHTML = `<span class="muted">${head}:</span> ${parsed.understood.map(u => `<span class="tag t-interest">${esc(u)}</span>`).join(' ')}`
      + (parsed.fixes.length ? ` <span class="muted">· read as ${parsed.fixes.map(f => esc(f)).join(', ')}</span>` : '');
    syncControls();
    renderWidget();
  }

  el.wControls.addEventListener('change', e => {
    if (!widget) return;
    const i = e.target;
    if (i.dataset.el) {
      if (i.checked) widget.opts.show.add(i.dataset.el); else widget.opts.show.delete(i.dataset.el);
    } else if (i.dataset.opt) {
      widget.opts[i.dataset.opt] = i.checked;
    } else return;
    syncControls();
    renderWidget();
  });

  let liveRaf = 0;
  let titleTimer = 0;
  const liveRender = () => {
    if (liveRaf) return;
    liveRaf = requestAnimationFrame(() => { liveRaf = 0; syncControls(); renderWidget(false); });
  };
  el.wControls.addEventListener('input', e => {
    if (!widget) return;
    const id = e.target.id;
    const o = widget.opts;
    if (id === 'wColor') { o.accent = e.target.value; liveRender(); }
    else if (id === 'wAccent2') { o.accent2 = e.target.value; liveRender(); }
    else if (id === 'wGlow') { o.glow = Number(e.target.value); liveRender(); }
    else if (id === 'wBg1' || id === 'wBg2') {
      const cur = o.bgColors || ['#1e1f22', '#2b2d31'];
      o.bgColors = id === 'wBg1' ? [e.target.value, cur[1]] : [cur[0], e.target.value];
      liveRender();
    } else if (id === 'wTitle') {
      o.title = e.target.value.trim();
      clearTimeout(titleTimer);
      titleTimer = setTimeout(() => renderWidget(false), 150);
    }
  });

  el.wControls.addEventListener('keydown', e => {
    if (e.target.id === 'wStyle' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      applyStyleText(e.target.value);
    }
  });

  el.wControls.addEventListener('click', e => {
    if (!widget) return;
    const b = e.target.closest('button');
    if (!b) return;
    const o = widget.opts;
    const ds = b.dataset;
    if (b.id === 'wStyleApply') { applyStyleText(el.wControls.querySelector('#wStyle').value); return; }
    if (ds.mood) { applyStyleText(ds.mood, `${b.textContent} preset`); return; }
    if (ds.accent) o.accent = ds.accent;
    else if (ds.template) o.template = ds.template;
    else if (ds.bg) o.bg = ds.bg;
    else if (ds.light) o.light = ds.light;
    else if (ds.font) o.font = ds.font;
    else if (ds.theme === 'custom') o.bgColors = o.bgColors || [Widget.THEMES[o.theme].bg1, Widget.THEMES[o.theme].bg2];
    else if (ds.theme) { o.theme = ds.theme; o.bgColors = null; }
    else if (b.id === 'wAccent2Auto') o.accent2 = '';
    else if (ds.preset) {
      Widget.ELEMENTS.filter(x => x.group === 'Stats').forEach(x => {
        if (ds.preset === 'all') o.show.add(x.key); else o.show.delete(x.key);
      });
    } else if (b.id === 'wReset') {
      widget.opts = Widget.defaultOptions();
      el.wControls.querySelector('#wTitle').value = '';
      el.wControls.querySelector('#wUnderstood').innerHTML = '';
    } else return;
    syncControls();
    renderWidget();
  });

  document.querySelectorAll('[data-stage]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-stage]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    el.stage.classList.toggle('light-bg', b.dataset.stage === 'light');
  }));

  const cardFileName = () => `${widget.card.repo.name}-repolysis-card`;
  el.dlSvg.addEventListener('click', () => {
    if (!widget) return;
    Widget.downloadSvg(widget.svg, cardFileName());
    toast('SVG downloaded.');
  });
  el.dlPng.addEventListener('click', () => {
    if (!widget) return;
    Widget.downloadPng(widget.svg, widget.size.width, widget.size.height, cardFileName())
      .then(() => toast('PNG downloaded.'))
      .catch(() => toast("PNG export failed in this browser. Try the SVG."));
  });
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const text = document.getElementById(b.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(text);
      const old = b.textContent;
      b.textContent = 'Copied ✓';
      setTimeout(() => { b.textContent = old; }, 1400);
    } catch {
      prompt('Copy this:', text);
    }
  }));

  /* =========================================================
     Card spotlight that follows the cursor
     ========================================================= */
  let spotRaf = 0;
  let spotEvt = null;
  let spotCard = null;
  if (!reduceMotion && !embedMode) {
    document.addEventListener('pointermove', e => {
      spotEvt = e;
      if (spotRaf) return;
      spotRaf = requestAnimationFrame(() => {
        spotRaf = 0;
        const card = spotEvt.target instanceof Element ? spotEvt.target.closest('.fx') : null;
        if (spotCard && spotCard !== card) {
          spotCard.style.removeProperty('--mx');
          spotCard.style.removeProperty('--my');
        }
        spotCard = card;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${spotEvt.clientX - r.left}px`);
        card.style.setProperty('--my', `${spotEvt.clientY - r.top}px`);
      });
    }, { passive: true });
  }

  /* =========================================================
     Shared bits
     ========================================================= */
  document.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', async () => {
    updateUrl();
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard.');
    } catch {
      prompt('Copy this link:', url);
    }
  }));

  /* ---------- settings ---------- */
  function refreshTokenState() {
    const proxy = GH.hasProxy();
    el.tokenState.textContent = GH.getToken()
      ? 'A token is saved in this browser. Requests go straight to GitHub with your own limit.'
      : proxy ? 'No token needed: this site uses a shared proxy.' : 'No token. Limited to 60 requests per hour.';
    const info = GH.cacheInfo();
    $('#cacheState').textContent = info.entries
      ? `${info.entries} cached ${Fmt.plural(info.entries, 'lookup', 'lookups')} (${Fmt.mb(info.bytes / 1024 / 1024)}). Kept for up to a few hours so repeat visits don't use your limit.`
      : "Nothing cached yet. Results are kept for up to a few hours so repeat visits don't use your limit.";
    $('#proxyState').textContent = proxy
      ? (GH.usingProxy() ? 'Shared proxy: active.' : GH.getToken() ? 'Shared proxy: skipped because you use your own token.' : 'Shared proxy: unreachable, using direct requests for now.')
      : '';
  }
  $('#cacheClear').addEventListener('click', () => {
    GH.clearCache();
    refreshTokenState();
    toast('Saved data cleared. Next lookups will fetch fresh numbers.');
  });
  function openSettings() {
    el.tokenInput.value = GH.getToken();
    refreshTokenState();
    if (typeof el.settings.showModal === 'function') el.settings.showModal();
    else el.settings.setAttribute('open', '');
  }
  el.settingsBtn.addEventListener('click', openSettings);
  el.settingsClose.addEventListener('click', () => el.settings.close());
  el.tokenClear.addEventListener('click', () => {
    GH.setToken('');
    el.tokenInput.value = '';
    refreshTokenState();
    toast('Token removed.');
  });
  el.settings.addEventListener('close', () => {
    if (el.settings.returnValue !== 'save') return;
    el.settings.returnValue = '';
    const t = el.tokenInput.value.trim();
    GH.setToken(t);
    toast(t ? 'Token saved.' : 'Token removed.');
    if (mode === 'analyze' && repoName) runAnalysis();
  });

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(text) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- repo link (auto-detect GitHub Pages) ---------- */
  (function detectRepo() {
    const m = location.hostname.match(/^([a-z\d-]+)\.github\.io$/i);
    if (!m) return;
    const seg = location.pathname.split('/').filter(Boolean)[0];
    el.repoLink.href = `https://github.com/${m[1]}/${seg && !seg.includes('.') ? seg : `${m[1]}.github.io`}`;
  })();

  /* ---------- boot ---------- */
  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'widget' || params.has('repo')) {
    if (embedMode) {
      document.body.classList.add('embed');
      // A dark color-scheme makes iframes opaque on light host pages – keep it transparent.
      document.documentElement.style.colorScheme = 'normal';
      document.documentElement.style.background = 'transparent';
    }
    setMode('widget', { updateUrl: false });
    const full = parseRepoInput(params.get('repo') || '');
    if (full) {
      el.wInput.value = full;
      runWidget(full, Widget.optionsFromParams(params));
    }
  } else if (params.get('mode') === 'discover' || params.has('q')) {
    setMode('discover', { updateUrl: false });
    const q = params.get('q');
    if (q) {
      el.dInput.value = q;
      el.dInput.dispatchEvent(new Event('input'));
      runDiscover(q);
    }
  } else {
    setMode('analyze', { updateUrl: false });
    const u = params.get('r');
    if (u && setRepo(u.split(',')[0])) runAnalysis();
  }
})();
