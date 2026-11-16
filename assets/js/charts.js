/* ============================================================
   Repolysis — charts for the repo analysis (Chart.js)
   ============================================================ */
'use strict';

const Charts = (() => {
  const instances = new Map();
  const available = typeof window.Chart !== 'undefined';

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // GitHub linguist colours, nudged lighter where they vanish on a dark background.
  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', C: '#a8b9cc',
    'C++': '#f34b7d', 'C#': '#2fa84f', Go: '#00ADD8', Rust: '#dea584', Ruby: '#cc342d', PHP: '#7a86b8',
    HTML: '#e34c26', CSS: '#7b5bbd', SCSS: '#c6538c', Shell: '#89e051', Swift: '#F05138', Kotlin: '#A97BFF',
    Vue: '#41b883', Svelte: '#ff3e00', 'Jupyter Notebook': '#DA5B0B', Dart: '#00B4AB', Lua: '#6c7cff',
    'Objective-C': '#438eff', Scala: '#c22d40', Haskell: '#a07fd6', Elixir: '#a77fc1', Clojure: '#db5855',
    'Emacs Lisp': '#c065db', 'Vim Script': '#199f4b', Perl: '#3a9ec4', R: '#198CE7', Julia: '#a270ba',
    Zig: '#ec915c', Nix: '#7e7eff', Dockerfile: '#5aa6d6', PowerShell: '#4a8fd6', MDX: '#fcb32c',
    Astro: '#ff5a03', Elm: '#60B5CC', OCaml: '#ef7a08', Makefile: '#5ea33e', TeX: '#5f9e5f', Solidity: '#9a9a9a',
    Batchfile: '#C1F12E', CMake: '#DA3434', Assembly: '#9b8cc4', Fortran: '#7b6bd6', 'Common Lisp': '#3fb68b',
  };
  const FALLBACK = ['#5865F2', '#57F287', '#EB459E', '#FEE75C', '#00A8FC', '#ED4245', '#9b84ee', '#3ba55c'];
  function langColor(name, i) {
    if (name === 'Other') return '#4e5058';
    return LANG_COLORS[name] || FALLBACK[i % FALLBACK.length];
  }

  function alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function setup() {
    if (!available) return;
    const C = window.Chart;
    C.defaults.color = '#b5bac1';
    C.defaults.font.family = '"Inter", system-ui, sans-serif';
    C.defaults.font.size = 12;
    C.defaults.borderColor = 'rgba(255,255,255,0.06)';
    C.defaults.maintainAspectRatio = false;
    C.defaults.plugins.legend.labels.usePointStyle = true;
    C.defaults.plugins.legend.labels.boxWidth = 8;
    C.defaults.plugins.legend.labels.boxHeight = 8;
    C.defaults.plugins.legend.labels.padding = 14;
    Object.assign(C.defaults.plugins.tooltip, {
      backgroundColor: '#111214', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#f2f3f5', bodyColor: '#dbdee1', padding: 10, cornerRadius: 8,
      titleFont: { weight: '600' }, boxPadding: 4,
    });
  }

  function destroy(key) {
    if (instances.has(key)) { instances.get(key).destroy(); instances.delete(key); }
  }

  function mountCanvas(key, canvas, config) {
    destroy(key);
    if (!available) return;
    instances.set(key, new window.Chart(canvas, config));
  }

  function mount(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const box = canvas.parentElement;
    box.querySelectorAll('.chart-empty').forEach(n => n.remove());
    canvas.hidden = false;
    if (!available) return empty(id, 'The chart library failed to load.');
    mountCanvas(id, canvas, config);
  }

  function empty(id, text) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    destroy(id);
    canvas.hidden = true;
    const box = canvas.parentElement;
    box.querySelectorAll('.chart-empty').forEach(n => n.remove());
    const div = document.createElement('div');
    div.className = 'chart-empty';
    div.textContent = text;
    box.appendChild(div);
  }

  const pctTick = v => `${Math.round(v)}%`;
  const pctLabel = ctx => ` ${ctx.dataset.label || ctx.label}: ${Number(ctx.raw).toFixed(1)}%`;

  /* ---------- small multiples: one doughnut per repo ---------- */
  const centerText = {
    id: 'centerText',
    afterDraw(chart, _args, opts) {
      if (!opts || !opts.text) return;
      const { ctx, chartArea: a } = chart;
      if (!a) return;
      const x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f2f3f5';
      ctx.font = '700 18px "JetBrains Mono", monospace';
      ctx.fillText(opts.text, x, y + 2);
      if (opts.sub) {
        ctx.fillStyle = '#949ba4';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillText(opts.sub.toUpperCase(), x, y + 18);
      }
      ctx.restore();
    },
  };

  function donuts(containerId, repos, build) {
    const box = document.getElementById(containerId);
    if (!box) return;
    [...instances.keys()].filter(k => k.startsWith(`${containerId}:`)).forEach(destroy);
    box.innerHTML = '';
    repos.forEach((p, i) => {
      const spec = build(p, i);
      const cell = document.createElement('div');
      cell.className = 'donut';
      cell.style.setProperty('--pc', p.color);
      cell.innerHTML = `<div class="donut-canvas"><canvas></canvas></div>${repos.length > 1 ? `<div class="donut-label"><i></i>${escapeHtml(p.s.full)}</div>` : ''}`;
      box.appendChild(cell);
      if (!spec) {
        cell.querySelector('.donut-canvas').innerHTML = '<div class="chart-empty">No data</div>';
        return;
      }
      mountCanvas(`${containerId}:${i}`, cell.querySelector('canvas'), {
        type: 'doughnut',
        data: {
          labels: spec.labels,
          datasets: [{
            data: spec.values, backgroundColor: spec.colors, borderColor: '#1e1f22', borderWidth: 2,
            hoverOffset: 8, spacing: 1,
          }],
        },
        options: {
          cutout: '68%',
          animation: { animateRotate: true, duration: 1100 },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${Number(ctx.raw).toFixed(1)}%` } },
            centerText: { text: spec.center, sub: spec.sub },
          },
        },
        plugins: [centerText],
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Shared legend for a set of donuts. */
  function legend(id, items) {
    const box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = items.map(([label, color]) => `<span><i style="background:${color}"></i>${escapeHtml(label)}</span>`).join('');
  }

  /* ---------- individual charts ---------- */
  function radar(repos) {
    const axes = [
      { label: 'Popularity', get: s => s.r.stars, fmt: v => Fmt.int(v) + ' stars' },
      { label: 'Reach', get: s => s.r.forks, fmt: v => Fmt.int(v) + ' forks' },
      { label: 'Community', get: s => s.contributorCount, fmt: v => Fmt.int(v) + ' contributors' },
      { label: 'Activity', get: s => s.yearCommits || 0, fmt: v => Fmt.int(v) + ' commits / yr' },
      { label: 'Maturity', get: s => s.ageYears, fmt: v => `${v.toFixed(1)} years` },
      { label: 'Upkeep', get: s => s.healthScore * 100, fmt: v => `${Math.round(v)}% healthy`, linear: true },
      { label: 'Growth', get: s => s.velocity, fmt: v => `${v.toFixed(1)} stars / day` },
    ];
    const val = (a, v) => (a.linear ? v : Math.log10(1 + v));
    // 100% = what a top-tier open source project reaches on that axis.
    const REF = { Popularity: 100000, Reach: 20000, Community: 100, Activity: 2500, Maturity: 12, Upkeep: 100, Growth: 50 };
    const maxes = axes.map(a => val(a, REF[a.label]));
    mount('chartRadar', {
      type: 'radar',
      data: {
        labels: axes.map(a => a.label),
        datasets: repos.map(p => ({
          label: p.s.full,
          data: axes.map((a, i) => Math.min(100, (val(a, a.get(p.s)) / maxes[i]) * 100)),
          raw: axes.map(a => a.fmt(a.get(p.s))),
          borderColor: p.color, backgroundColor: alpha(p.color, 0.15),
          pointBackgroundColor: p.color, pointRadius: 3, borderWidth: 2, fill: true,
        })),
      },
      options: {
        scales: {
          r: {
            min: 0, max: 100, ticks: { display: false, stepSize: 25 },
            grid: { color: 'rgba(255,255,255,0.07)' }, angleLines: { color: 'rgba(255,255,255,0.07)' },
            pointLabels: { color: '#dbdee1', font: { size: 12, weight: '500' } },
          },
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.dataset.raw[ctx.dataIndex]}` } },
        },
      },
    });
  }

  function languageDonuts(repos) {
    const seen = new Map();
    donuts('langDonuts', repos, p => {
      const langs = p.s.languages;
      if (!langs.length) return null;
      const top = langs.slice(0, 5);
      const rest = langs.slice(5).reduce((a, l) => a + l.pct, 0);
      const labels = top.map(l => l.name);
      const values = top.map(l => l.pct);
      if (rest > 0.05) { labels.push('Other'); values.push(rest); }
      const colors = labels.map((n, i) => langColor(n, i));
      labels.forEach((n, i) => { if (!seen.has(n)) seen.set(n, colors[i]); });
      return { labels, values, colors, center: `${Math.round(top[0].pct)}%`, sub: top[0].name.slice(0, 12) };
    });
    legend('langLegend', [...seen.entries()].slice(0, 12));
  }

  const SHARE_COLORS = ['#EB459E', '#5865F2', '#00A8FC', '#57F287'];
  function contributorDonuts(repos) {
    donuts('contribDonuts', repos, p => {
      const c = p.s.concentration;
      if (!c) return null;
      const values = [c.top1, c.top2to5, c.top6to20, c.rest].map(v => v * 100);
      return {
        labels: ['Top contributor', 'Next 4', 'Next 15', 'Everyone else'],
        values, colors: SHARE_COLORS,
        center: `${Math.round(values[0])}%`, sub: 'top dev',
      };
    });
    legend('contribLegend', [['Top contributor', SHARE_COLORS[0]], ['Next 4', SHARE_COLORS[1]], ['Next 15', SHARE_COLORS[2]], ['Everyone else', SHARE_COLORS[3]]]);
  }

  function ownerDonut(repos) {
    const colors = ['#FEE75C', '#5865F2'];
    donuts('ownerDonuts', repos, p => (p.s.ownerShare === null ? null : {
      labels: ['Owner', 'Everyone else'],
      values: [p.s.ownerShare * 100, (1 - p.s.ownerShare) * 100], colors,
      center: `${Math.round(p.s.ownerShare * 100)}%`, sub: 'owner',
    }));
    legend('ownerLegend', [['Owner', colors[0]], ['Everyone else', colors[1]]]);
  }

  function weekendDonut(repos) {
    const colors = ['#00A8FC', '#EB459E'];
    donuts('weekendDonuts', repos, p => (p.s.weekendShare === null ? null : {
      labels: ['Mon–Fri', 'Sat–Sun'],
      values: [(1 - p.s.weekendShare) * 100, p.s.weekendShare * 100], colors,
      center: `${Math.round(p.s.weekendShare * 100)}%`, sub: 'weekend',
    }));
    legend('weekendLegend', [['Mon–Fri', colors[0]], ['Sat–Sun', colors[1]]]);
  }

  function activity(repos, normalized) {
    const withData = repos.filter(p => p.s.weeks);
    if (!withData.length) return empty('chartActivity', 'GitHub is still computing commit activity. Try again in a few seconds.');
    const ref = withData[0].s.weeks;
    const fmtW = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    mount('chartActivity', {
      type: 'line',
      data: {
        labels: ref.map(w => fmtW.format(new Date(w.t))),
        datasets: repos.map(p => {
          const wk = p.s.weeks || [];
          const max = Math.max(1, ...wk.map(w => w.total));
          return {
            label: p.s.full,
            data: wk.map(w => (normalized ? (w.total / max) * 100 : w.total)),
            borderColor: p.color, backgroundColor: alpha(p.color, 0.12), fill: repos.length === 1,
            cubicInterpolationMode: 'monotone', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
          };
        }),
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { beginAtZero: true, ticks: normalized ? { callback: pctTick } : {}, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } },
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${normalized ? `${Math.round(ctx.raw)}% of peak` : `${ctx.raw} commits`}` } },
        },
      },
    });
  }

  function weekdays(repos) {
    if (repos.every(p => !p.s.weekdaysPctMon)) return empty('chartDays', 'No commit timing data yet.');
    mount('chartDays', {
      type: 'bar',
      data: {
        labels: DAYS,
        datasets: repos.map(p => ({ label: p.s.full, data: p.s.weekdaysPctMon || [], backgroundColor: p.color, borderRadius: 4, maxBarThickness: 22 })),
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { callback: pctTick }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: pctLabel } } },
      },
    });
  }

  function hours(repos) {
    if (repos.every(p => !p.s.hoursPct)) return empty('chartHours', 'GitHub is still computing the commit clock. Try again in a few seconds.');
    mount('chartHours', {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, h) => `${h}:00`),
        datasets: repos.map(p => ({
          label: p.s.full, data: p.s.hoursPct || [], borderColor: p.color, backgroundColor: alpha(p.color, 0.12),
          fill: repos.length === 1, cubicInterpolationMode: 'monotone', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
        })),
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { beginAtZero: true, ticks: { callback: pctTick }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
        },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: pctLabel } } },
      },
    });
  }

  let lastRepos = null;
  function renderAll(repos) {
    lastRepos = repos;
    radar(repos);
    languageDonuts(repos);
    contributorDonuts(repos);
    ownerDonut(repos);
    weekendDonut(repos);
    activity(repos, document.getElementById('activityNorm')?.getAttribute('aria-pressed') === 'true');
    weekdays(repos);
    hours(repos);
  }
  function rerenderActivity(normalized) { if (lastRepos) activity(lastRepos, normalized); }

  setup();
  return { renderAll, rerenderActivity, langColor, DAYS };
})();
