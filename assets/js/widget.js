/* ============================================================
   Repolysis — Repo card: customizable stats card rendered as SVG
   (the same SVG is shown on the page, downloaded, and rasterized to PNG)

   Pieces:
   - TEMPLATES   layouts (classic, compact, banner, minimal, badge)
   - BACKGROUNDS surface patterns (gradient, mesh, aurora, grid…)
   - LIGHTS      lighting (corner glow, spotlight, neon edge…)
   - ELEMENTS    toggleable content
   - parseStyle  turns a free-text description ("neon cyberpunk, wide")
                 into options
   ============================================================ */
'use strict';

const Widget = (() => {
  const DAY = 86400000;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const FONTS = {
    sans: { label: 'Sans', family: "'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" },
    mono: { label: 'Mono', family: "'JetBrains Mono', 'Cascadia Code', Consolas, 'SF Mono', Menlo, monospace" },
    serif: { label: 'Serif', family: "Georgia, Cambria, 'Times New Roman', serif" },
  };
  const MONO = FONTS.mono.family;

  const THEMES = {
    dark:     { label: 'Dark',     bg1: '#1e1f22', bg2: '#2b2d31', text: '#f2f3f5', muted: '#949ba4', tile: '#ffffff', tileOp: 0.035, tileStroke: '#ffffff', tileStrokeOp: 0.07, border: '#ffffff', borderOp: 0.1, track: '#ffffff', trackOp: 0.08, glowOp: 0.22, isLight: false },
    midnight: { label: 'Midnight', bg1: '#090b18', bg2: '#171b3a', text: '#e8eaff', muted: '#8b91bd', tile: '#8c96ff', tileOp: 0.06,  tileStroke: '#8c96ff', tileStrokeOp: 0.14, border: '#8c96ff', borderOp: 0.22, track: '#8c96ff', trackOp: 0.14, glowOp: 0.3, isLight: false },
    light:    { label: 'Light',    bg1: '#ffffff', bg2: '#f2f3f5', text: '#1e1f22', muted: '#5c5e66', tile: '#1e1f22', tileOp: 0.035, tileStroke: '#1e1f22', tileStrokeOp: 0.08, border: '#1e1f22', borderOp: 0.12, track: '#1e1f22', trackOp: 0.08, glowOp: 0.14, isLight: true },
  };

  const ACCENTS = [
    { name: 'Blurple', hex: '#5865F2' },
    { name: 'Green', hex: '#57F287' },
    { name: 'Fuchsia', hex: '#EB459E' },
    { name: 'Yellow', hex: '#FEE75C' },
    { name: 'Cyan', hex: '#00A8FC' },
    { name: 'Red', hex: '#ED4245' },
    { name: 'Orange', hex: '#F0B232' },
    { name: 'Violet', hex: '#9B84EE' },
  ];

  const TEMPLATES = [
    { key: 'classic', label: 'Classic', desc: 'Full card · 520 px' },
    { key: 'compact', label: 'Compact', desc: 'Smaller card · 380 px' },
    { key: 'wide',    label: 'Banner',  desc: 'Wide rectangle · 860 px' },
    { key: 'minimal', label: 'Minimal', desc: 'Text first, no boxes' },
    { key: 'badge',   label: 'Badge',   desc: 'Tiny pill for READMEs' },
  ];

  const BACKGROUNDS = [
    { key: 'gradient', label: 'Gradient' },
    { key: 'solid',    label: 'Solid' },
    { key: 'mesh',     label: 'Mesh' },
    { key: 'aurora',   label: 'Aurora' },
    { key: 'grid',     label: 'Grid' },
    { key: 'dots',     label: 'Dots' },
    { key: 'stripes',  label: 'Stripes' },
  ];

  const LIGHTS = [
    { key: 'corner',    label: 'Corner glow' },
    { key: 'top',       label: 'Top light' },
    { key: 'left',      label: 'Side light' },
    { key: 'spotlight', label: 'Spotlight' },
    { key: 'neon',      label: 'Neon edge' },
    { key: 'none',      label: 'None' },
  ];

  // Everything the person can toggle. Order = order on the card.
  const ELEMENTS = [
    { group: 'Header',   key: 'avatar',       label: 'Owner avatar',       def: true },
    { group: 'Header',   key: 'description',  label: 'Description',        def: true },
    { group: 'Header',   key: 'meta',         label: 'Language & license', def: true },
    { group: 'Header',   key: 'grade',        label: 'Repo grade',         def: false },
    { group: 'Stats',    key: 'stars',        label: 'Stars',              def: true },
    { group: 'Stats',    key: 'forks',        label: 'Forks',              def: true },
    { group: 'Stats',    key: 'commits',      label: 'Total commits',      def: true },
    { group: 'Stats',    key: 'contribCount', label: 'Contributors',       def: true },
    { group: 'Stats',    key: 'age',          label: 'Age',                def: true },
    { group: 'Stats',    key: 'velocity',     label: 'Stars per day',      def: true },
    { group: 'Stats',    key: 'watchers',     label: 'Watchers',           def: false },
    { group: 'Stats',    key: 'issues',       label: 'Open issues',        def: false },
    { group: 'Stats',    key: 'lastPush',     label: 'Last push',          def: false },
    { group: 'Stats',    key: 'release',      label: 'Latest release',     def: false },
    { group: 'Stats',    key: 'size',         label: 'Repo size',          def: false },
    { group: 'Stats',    key: 'busiestDay',   label: 'Busiest weekday',    def: false },
    { group: 'Stats',    key: 'forkRate',     label: 'Forks per 100 ★',    def: false },
    { group: 'Stats',    key: 'busFactor',    label: 'Bus factor',         def: false },
    { group: 'Sections', key: 'languages',    label: 'Language bar',       def: true },
    { group: 'Sections', key: 'activity',     label: 'Commit activity',    def: true },
    { group: 'Sections', key: 'milestone',    label: 'Next star milestone', def: false },
    { group: 'Sections', key: 'health',       label: 'Repo health',        def: false },
    { group: 'Sections', key: 'contributors', label: 'Top contributors',   def: true },
    { group: 'Sections', key: 'topics',       label: 'Topics',             def: false },
    { group: 'Sections', key: 'footer',       label: 'Footer',             def: true },
  ];

  // What each template can actually show (others are silently skipped).
  const TEMPLATE_SUPPORT = {
    classic: null, // everything
    compact: null,
    wide: null,
    minimal: new Set(['avatar', 'description', 'meta', 'grade', 'languages', 'activity', 'milestone', 'health', 'topics', 'footer', 'contributors']),
    badge: new Set(['avatar', 'grade']),
  };

  function defaultOptions() {
    return {
      show: new Set(ELEMENTS.filter(e => e.def).map(e => e.key)),
      template: 'classic',
      accent: ACCENTS[0].hex,
      accent2: '',          // '' = derived from accent
      theme: 'dark',
      bg: 'gradient',
      light: 'corner',
      glow: 60,             // 0–100
      bgColors: null,       // [c1, c2] overrides the theme background
      font: 'sans',
      rounded: true,
      border: true,
      title: '',
    };
  }

  /* ---------- options <-> URL ---------- */
  const hex6 = /^[0-9a-f]{6}$/i;
  function optionsToParams(o, params) {
    const def = defaultOptions();
    const show = ELEMENTS.filter(e => o.show.has(e.key)).map(e => e.key).join(',');
    const defShow = ELEMENTS.filter(e => def.show.has(e.key)).map(e => e.key).join(',');
    if (show !== defShow) params.set('show', show || 'none');
    if (o.template !== def.template) params.set('tpl', o.template);
    if (o.accent.toLowerCase() !== def.accent.toLowerCase()) params.set('accent', o.accent.replace('#', ''));
    if (o.accent2) params.set('accent2', o.accent2.replace('#', ''));
    if (o.theme !== def.theme) params.set('theme', o.theme);
    if (o.bg !== def.bg) params.set('bg', o.bg);
    if (o.light !== def.light) params.set('light', o.light);
    if (o.glow !== def.glow) params.set('glow', String(o.glow));
    if (o.bgColors) params.set('bgc', o.bgColors.map(c => c.replace('#', '')).join('-'));
    if (o.font !== def.font) params.set('font', o.font);
    if (!o.rounded) params.set('square', '1');
    if (!o.border) params.set('noborder', '1');
    if (o.title) params.set('title', o.title);
  }
  function optionsFromParams(params) {
    const o = defaultOptions();
    const show = params.get('show');
    if (show) o.show = new Set(show === 'none' ? [] : show.split(',').filter(k => ELEMENTS.some(e => e.key === k)));
    if (TEMPLATES.some(t => t.key === params.get('tpl'))) o.template = params.get('tpl');
    if (hex6.test(params.get('accent') || '')) o.accent = `#${params.get('accent')}`;
    if (hex6.test(params.get('accent2') || '')) o.accent2 = `#${params.get('accent2')}`;
    if (THEMES[params.get('theme')]) o.theme = params.get('theme');
    if (BACKGROUNDS.some(b => b.key === params.get('bg'))) o.bg = params.get('bg');
    if (LIGHTS.some(l => l.key === params.get('light'))) o.light = params.get('light');
    const glow = Number(params.get('glow'));
    if (params.has('glow') && glow >= 0 && glow <= 100) o.glow = glow;
    const bgc = (params.get('bgc') || '').split('-');
    if (bgc.length === 2 && bgc.every(c => hex6.test(c))) o.bgColors = bgc.map(c => `#${c}`);
    if (FONTS[params.get('font')]) o.font = params.get('font');
    if (params.get('square') === '1') o.rounded = false;
    if (params.get('noborder') === '1') o.border = false;
    if (params.get('title')) o.title = params.get('title').slice(0, 60);
    return o;
  }

  /* ---------- color helpers ---------- */
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const toHex = (r, g, b) => `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function luminance(hex) {
    const [r, g, b] = rgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function shiftHue(hex, deg) {
    let [r, g, b] = rgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    h = (h + deg / 360 + 1) % 1;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    if (!s) return toHex(l * 255, l * 255, l * 255);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return toHex(hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255);
  }

  function makeTheme(o) {
    const base = { ...(THEMES[o.theme] || THEMES.dark) };
    if (!o.bgColors) return base;
    const [c1, c2] = o.bgColors;
    const isLight = luminance(mix(c1, c2, 0.5)) > 0.4;
    const ink = isLight ? '#16171a' : '#f4f5f7';
    return {
      ...base, bg1: c1, bg2: c2, text: ink, muted: mix(ink, c1, 0.42), isLight,
      tile: ink, tileOp: 0.05, tileStroke: ink, tileStrokeOp: 0.1, border: ink, borderOp: 0.15,
      track: ink, trackOp: 0.1, glowOp: isLight ? 0.16 : 0.28,
    };
  }

  /* ---------- derived stats ---------- */
  const nf = new Intl.NumberFormat('en-US');
  const cf = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const num = v => (v >= 10000 ? cf.format(v) : nf.format(v));
  const short = v => (v >= 1000 ? cf.format(v) : nf.format(v));
  function ago(ts) {
    const d = (Date.now() - new Date(ts).getTime()) / DAY;
    if (d < 1) return 'today';
    if (d < 2) return 'yesterday';
    if (d < 60) return `${Math.floor(d)} days ago`;
    if (d < 730) return `${Math.floor(d / 30)} months ago`;
    return `${Math.floor(d / 365)} years ago`;
  }
  function age(ts) {
    const days = (Date.now() - new Date(ts).getTime()) / DAY;
    const y = Math.floor(days / 365.25);
    const m = Math.floor((days - y * 365.25) / 30.44);
    if (!y) return `${Math.max(1, m)} mo`;
    return m ? `${y}y ${m}mo` : `${y} yrs`;
  }
  function size(kb) {
    if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
  }
  function duration(days) {
    if (days < 1) return 'today';
    if (days < 45) return `~${Math.ceil(days)} days`;
    if (days < 540) return `~${Math.round(days / 30)} months`;
    return `~${(days / 365).toFixed(1)} years`;
  }

  const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

  function derive(card) {
    const r = card.repo;
    const ageDays = Math.max(1, (Date.now() - new Date(r.created).getTime()) / DAY);
    const pushedDays = (Date.now() - new Date(r.pushed).getTime()) / DAY;

    const langTotal = Object.values(card.languages).reduce((a, b) => a + b, 0);
    let langs = Object.entries(card.languages)
      .map(([name, bytes]) => ({ name, pct: langTotal ? (bytes / langTotal) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);
    if (langs.length > 6) {
      const other = langs.slice(5).reduce((a, l) => a + l.pct, 0);
      langs = [...langs.slice(0, 5), { name: 'Other', pct: other }];
    }

    let weeks = null, yearCommits = null, busiestDay = null;
    if (card.activity && card.activity.length) {
      weeks = card.activity.map(w => w.total);
      yearCommits = weeks.reduce((a, b) => a + b, 0);
      const perDay = [0, 0, 0, 0, 0, 0, 0];
      card.activity.forEach(w => (w.days || []).forEach((c, i) => { perDay[i] += c; }));
      if (perDay.some(Boolean)) busiestDay = WEEKDAYS[perDay.indexOf(Math.max(...perDay))];
    }

    const humans = card.contributors.filter(c => c.type !== 'Bot' && !/\[bot\]$/.test(c.login || ''));
    const contribTotal = humans.reduce((a, c) => a + c.contributions, 0);
    let busFactor = null;
    if (contribTotal) {
      let acc = 0, n = 0;
      for (const c of humans) { acc += c.contributions; n++; if (acc >= contribTotal / 2) break; }
      busFactor = { n, topShare: humans[0].contributions / contribTotal, top: humans[0].login };
    }

    const velocity = r.stars / ageDays;
    const next = MILESTONES.find(m => m > r.stars) || null;
    const prev = [...MILESTONES].reverse().find(m => m <= r.stars) || 0;
    const milestone = next ? {
      next, prev, ratio: r.stars / next,
      eta: velocity > 0.001 ? duration((next - r.stars) / velocity) : null,
    } : null;

    const health = [
      ['Description', !!r.desc],
      ['License', !!(r.license && r.license !== 'NOASSERTION')],
      ['Topics', r.topics.length > 0],
      ['Website', !!r.homepage],
      ['Releases', !!card.release],
      ['Active in 90 days', pushedDays <= 90],
    ];

    // Grade: a playful 0–100 score from popularity, community and upkeep.
    const L = v => Math.log10(1 + Math.max(0, v));
    const gScore = L(r.stars) * 16 + L(r.forks) * 4 + Math.min(card.contributors.length, 100) / 100 * 8
      + (pushedDays < 30 ? 6 : pushedDays < 180 ? 3 : 0) + health.filter(h => h[1]).length;
    const grade = gScore >= 90 ? 'S' : gScore >= 80 ? 'A+' : gScore >= 70 ? 'A' : gScore >= 60 ? 'B+' : gScore >= 50 ? 'B' : gScore >= 40 ? 'C+' : 'C';

    return {
      r, ageDays, pushedDays, langs, weeks, yearCommits, busiestDay, humans, busFactor, velocity, milestone, health, grade,
      contribCount: card.contributors.length ? `${card.contributors.length}${card.contributorsMore ? '+' : ''}` : null,
    };
  }

  function tileValue(key, card, d) {
    const r = d.r;
    switch (key) {
      case 'stars': return ['Stars', num(r.stars), '★'];
      case 'forks': return ['Forks', num(r.forks), '⑂'];
      case 'watchers': return ['Watchers', num(r.watchers || 0), '◉'];
      case 'issues': return ['Open issues', num(r.issues || 0), '◎'];
      case 'commits': return card.commits ? ['Commits', num(card.commits), '⟲'] : null;
      case 'contribCount': return d.contribCount ? ['Contributors', d.contribCount, '☺'] : null;
      case 'age': return ['Age', age(r.created), '⧗'];
      case 'velocity': return ['Stars / day', d.velocity >= 10 ? num(Math.round(d.velocity)) : d.velocity.toFixed(d.velocity >= 1 ? 1 : 2), '↗'];
      case 'lastPush': return ['Last push', ago(r.pushed), '↑'];
      case 'release': return card.release ? ['Latest release', card.release.tag, '⚑'] : null;
      case 'size': return ['Size', size(r.size || 0), '▣'];
      case 'busiestDay': return d.busiestDay ? ['Busiest day', d.busiestDay, '☼'] : null;
      case 'forkRate': return r.stars ? ['Forks / 100 ★', (r.forks / r.stars * 100).toFixed(1), '%'] : null;
      case 'busFactor': return d.busFactor ? ['Bus factor', String(d.busFactor.n), '⚇'] : null;
      default: return null;
    }
  }

  /* ---------- text helpers ---------- */
  const xml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  let measureCtx = null;
  function measure(text, sizePx, weight = 400, family = FONTS.sans.family) {
    if (measureCtx === null) {
      try { measureCtx = document.createElement('canvas').getContext('2d'); } catch { measureCtx = false; }
    }
    if (!measureCtx) return String(text).length * sizePx * (family === MONO ? 0.62 : 0.56);
    measureCtx.font = `${weight} ${sizePx}px ${family}`;
    return measureCtx.measureText(String(text)).width;
  }
  function fit(text, maxW, sizePx, weight, family) {
    text = String(text);
    if (measure(text, sizePx, weight, family) <= maxW) return text;
    let t = text;
    while (t.length > 1 && measure(`${t}…`, sizePx, weight, family) > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }
  function wrap(text, maxW, sizePx, maxLines, family) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (measure(test, sizePx, 400, family) <= maxW) { line = test; continue; }
      if (line) lines.push(line);
      line = words[i];
      if (lines.length === maxLines) { line = ''; break; }
    }
    if (line && lines.length < maxLines) lines.push(line);
    const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
    if (used < words.length && lines.length) lines[lines.length - 1] = fit(`${lines[lines.length - 1]} …`, maxW, sizePx, 400, family);
    return lines.map(l => fit(l, maxW, sizePx, 400, family));
  }

  function langColor(name, i) {
    if (name === 'Other') return '#80848e';
    return (typeof Charts !== 'undefined' && Charts.langColor) ? Charts.langColor(name, i) : ['#5865F2', '#57F287', '#EB459E', '#FEE75C', '#00A8FC'][i % 5];
  }

  /* =========================================================
     Painter: shared drawing primitives
     ========================================================= */
  function painter(card, o, images) {
    const t = makeTheme(o);
    const A = o.accent;
    const A2 = o.accent2 || shiftHue(A, 48);
    const F = (FONTS[o.font] || FONTS.sans).family;
    const P = {
      card, o, t, A, A2, F, d: derive(card), parts: [], defs: [], id: 0,
      accentText: t.isLight && luminance(A) > 0.45 ? mix(A, '#000000', 0.45) : A,
      img: url => xml(images.get(url) || url),
      show: k => o.show.has(k) && (!TEMPLATE_SUPPORT[o.template] || TEMPLATE_SUPPORT[o.template].has(k)),
      uid: p => `${P.pfx}-${p}${P.id++}`,
      pfx: `ga${Math.random().toString(36).slice(2, 8)}`,
      text(x, y, s, a = {}) {
        P.parts.push(`<text x="${x.toFixed ? x.toFixed(1) : x}" y="${y.toFixed ? y.toFixed(1) : y}"${a.anchor ? ` text-anchor="${a.anchor}"` : ''} font-family="${a.family || F}" font-size="${a.size || 12}"${a.weight ? ` font-weight="${a.weight}"` : ''}${a.ls ? ` letter-spacing="${a.ls}"` : ''} fill="${a.fill || t.text}"${a.opacity !== undefined ? ` fill-opacity="${a.opacity}"` : ''}>${a.raw ? s : xml(s)}</text>`);
      },
    };
    return P;
  }

  function drawAvatar(P, x, y, s, url, ring, square) {
    const id = P.uid('av');
    const rx = square ? s * 0.22 : s / 2;
    P.defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}"/></clipPath>`);
    if (ring) P.parts.push(`<rect x="${x - 2}" y="${y - 2}" width="${s + 4}" height="${s + 4}" rx="${rx + 2}" fill="${ring}"/>`);
    P.parts.push(`<image href="${P.img(url)}" xlink:href="${P.img(url)}" x="${x}" y="${y}" width="${s}" height="${s}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`);
  }

  function drawGrade(P, cx, cy, r) {
    const g = P.d.grade;
    const id = P.uid('gr');
    P.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.A}"/><stop offset="1" stop-color="${P.A2}"/></linearGradient>`);
    P.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.t.tile}" fill-opacity="${P.t.tileOp * 2}" stroke="url(#${id})" stroke-width="2.5"/>`);
    P.text(cx, cy + r * 0.36, g, { anchor: 'middle', size: r * (g.length > 1 ? 0.82 : 1.02), weight: 800, family: MONO, fill: P.t.text });
    P.text(cx, cy + r + 11, 'GRADE', { anchor: 'middle', size: 8, weight: 700, ls: 1, fill: P.t.muted });
  }

  /** Avatar + owner/name + meta line. Returns new y. */
  function drawHeader(P, x, y, w, s) {
    const { d, o, t } = P;
    const r = d.r;
    const hasAvatar = P.show('avatar') && r.avatar;
    const hasGrade = P.show('grade');
    const textX = x + (hasAvatar ? s.avatar + 14 : 0);
    const titleW = w - (textX - x) - (hasGrade ? s.grade * 2 + 14 : 0);
    if (hasAvatar) drawAvatar(P, x, y, s.avatar, r.avatar, P.A, r.ownerType === 'Organization');
    if (hasGrade) drawGrade(P, x + w - s.grade, y + s.grade - 2, s.grade);

    const midY = y + s.avatar / 2;
    if (o.title) {
      P.text(textX, midY - 2, fit(o.title, titleW, s.title, 700, P.F), { size: s.title, weight: 700 });
      P.text(textX, midY + s.meta + 4, fit(r.full, titleW, s.meta, 400, P.F), { size: s.meta, fill: t.muted });
    } else {
      const ownerTxt = `${r.owner} / `;
      const ownerW = measure(ownerTxt, s.owner, 400, P.F);
      const nameFit = fit(r.name, Math.max(60, titleW - ownerW), s.title, 700, P.F);
      const showMeta = P.show('meta');
      const ty = showMeta ? midY - 1 : midY + s.title * 0.35;
      P.parts.push(`<text x="${textX}" y="${ty}" font-family="${P.F}"><tspan font-size="${s.owner}" fill="${t.muted}">${xml(ownerTxt)}</tspan><tspan font-size="${s.title}" font-weight="700" fill="${t.text}">${xml(nameFit)}</tspan></text>`);
      if (showMeta) {
        const bits = [];
        if (r.lang) bits.push({ dot: langColor(r.lang, 0), text: r.lang });
        if (r.license && r.license !== 'NOASSERTION') bits.push({ text: r.license });
        bits.push({ text: `since ${new Date(r.created).getFullYear()}` });
        let mx = textX;
        const my = midY + s.meta + 5;
        for (const b of bits) {
          if (mx > textX + titleW - 30) break;
          if (b.dot) { P.parts.push(`<circle cx="${mx + 4}" cy="${my - 4}" r="4" fill="${b.dot}"/>`); mx += 12; }
          P.text(mx, my, b.text, { size: s.meta, fill: t.muted });
          mx += measure(b.text, s.meta, 400, P.F) + 14;
        }
      }
    }
    return y + Math.max(s.avatar, hasGrade ? s.grade * 2 + 12 : 0) + s.gap;
  }

  function drawDesc(P, x, y, w, sizePx, lines) {
    const r = P.d.r;
    if (!P.show('description') || !r.desc) return y;
    const ls = wrap(r.desc, w, sizePx, lines, P.F);
    ls.forEach((l, i) => P.text(x, y + sizePx + i * sizePx * 1.42, l, { size: sizePx, fill: P.t.muted }));
    return y + ls.length * sizePx * 1.42 + 12;
  }

  function selectedTiles(P, max) {
    return ELEMENTS.filter(e => e.group === 'Stats' && P.o.show.has(e.key))
      .map(e => tileValue(e.key, P.card, P.d)).filter(Boolean).slice(0, max || 99);
  }

  function drawTiles(P, x, y, w, tiles, s) {
    if (!tiles.length) return y;
    const { t } = P;
    const cols = s.cols || (tiles.length === 4 ? 2 : Math.min(3, tiles.length));
    const gap = s.gap || 10;
    const tw = (w - gap * (cols - 1)) / cols;
    tiles.forEach(([label, value], i) => {
      const cx = x + (i % cols) * (tw + gap);
      const cy = y + Math.floor(i / cols) * (s.h + gap);
      P.parts.push(`<rect x="${cx.toFixed(1)}" y="${cy}" width="${tw.toFixed(1)}" height="${s.h}" rx="${s.rx || 10}" fill="${t.tile}" fill-opacity="${t.tileOp}" stroke="${t.tileStroke}" stroke-opacity="${t.tileStrokeOp}"/>`);
      P.parts.push(`<rect x="${cx.toFixed(1)}" y="${cy + s.h * 0.27}" width="3" height="${s.h * 0.46}" rx="1.5" fill="${P.A}"/>`);
      P.text(cx + 14, cy + s.h * 0.4, label.toUpperCase(), { size: s.label, weight: 600, ls: 0.6, fill: t.muted });
      P.text(cx + 14, cy + s.h * 0.77, fit(value, tw - 22, s.value, 700, MONO), { size: s.value, weight: 700, family: MONO });
    });
    return y + Math.ceil(tiles.length / cols) * (s.h + gap) + 6;
  }

  /** Stats as an inline row of "value label" pairs (minimal template). */
  function drawInlineStats(P, x, y, w, tiles) {
    if (!tiles.length) return y;
    let cx = x, cy = y + 22;
    for (const [label, value, ico] of tiles) {
      const vw = measure(value, 20, 700, MONO);
      const lw = measure(label.toLowerCase(), 12, 400, P.F);
      const total = 14 + vw + 6 + lw + 22;
      if (cx + total > x + w && cx > x) { cx = x; cy += 32; }
      P.text(cx, cy, ico, { size: 13, fill: P.A, weight: 700 });
      P.text(cx + 16, cy, value, { size: 20, weight: 700, family: MONO });
      P.text(cx + 16 + vw + 6, cy, label.toLowerCase(), { size: 12, fill: P.t.muted });
      cx += total;
    }
    return cy + 18;
  }

  function sectionLabel(P, x, y, w, label, right, sizePx = 10.5) {
    P.text(x, y + 10, label, { size: sizePx, weight: 700, ls: 0.8, fill: P.t.muted });
    if (right) P.text(x + w, y + 10, fit(right, w - measure(label, sizePx, 700, P.F) - 16, sizePx + 1, 400, P.F), { anchor: 'end', size: sizePx + 1, fill: P.t.muted });
    return y + 20;
  }

  function drawLangs(P, x, y, w, s = {}) {
    const { d, t } = P;
    if (!P.show('languages') || !d.langs.length) return y;
    if (s.label !== false) y = sectionLabel(P, x, y, w, 'LANGUAGES');
    const h = s.barH || 8;
    const id = P.uid('lang');
    P.defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/></clipPath>`);
    P.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.track}" fill-opacity="${t.trackOp}"/>`);
    let bx = x;
    const segs = d.langs.map((l, i) => {
      const sw = (l.pct / 100) * w;
      const seg = `<rect x="${bx.toFixed(2)}" y="${y}" width="${Math.max(0, sw - 1).toFixed(2)}" height="${h}" fill="${langColor(l.name, i)}"/>`;
      bx += sw;
      return seg;
    });
    P.parts.push(`<g clip-path="url(#${id})">${segs.join('')}</g>`);
    y += h + 14;
    const max = s.legendMax || 6;
    let lx = x, ly = y;
    d.langs.slice(0, max).forEach((l, i) => {
      const pct = l.pct < 0.1 ? '<0.1' : l.pct.toFixed(1);
      const lw = measure(`${l.name} ${pct}%`, 12, 400, P.F) + 26;
      if (lx + lw > x + w && lx > x) { lx = x; ly += 19; }
      P.parts.push(`<circle cx="${lx + 5}" cy="${ly - 4}" r="4.5" fill="${langColor(l.name, i)}"/>`);
      P.parts.push(`<text x="${lx + 15}" y="${ly}" font-family="${P.F}" font-size="12" fill="${t.text}">${xml(l.name)} <tspan fill="${t.muted}">${xml(pct)}%</tspan></text>`);
      lx += lw;
    });
    return ly + 18;
  }

  function sparkPath(pts, floor) {
    let path = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(floor, p1[1] + (p2[1] - p0[1]) / 6)];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(floor, p2[1] - (p3[1] - p1[1]) / 6)];
      path += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return path;
  }

  function drawActivity(P, x, y, w, s = {}) {
    const { d, t } = P;
    if (!P.show('activity') || !d.weeks) return y;
    if (s.label !== false) {
      y = sectionLabel(P, x, y, w, s.short ? 'COMMITS · 12 MO' : 'COMMITS · LAST 12 MONTHS',
        s.short ? nf.format(d.yearCommits) : `${nf.format(d.yearCommits)} commits${d.busiestDay ? ` · busiest on ${d.busiestDay}s` : ''}`);
    }
    const h = s.h || 48;
    const max = Math.max(...d.weeks, 1);
    const step = w / (d.weeks.length - 1);
    const pts = d.weeks.map((v, i) => [x + i * step, y + h - (v / max) * (h - 4)]);
    const path = sparkPath(pts, y + h);
    const gid = P.uid('area');
    P.defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.A}" stop-opacity="0.4"/><stop offset="1" stop-color="${P.A}" stop-opacity="0"/></linearGradient>`);
    const lid = P.uid('line');
    P.defs.push(`<linearGradient id="${lid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.A}"/><stop offset="1" stop-color="${P.A2}"/></linearGradient>`);
    P.parts.push(`<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${t.track}" stroke-opacity="${t.trackOp * 1.5}"/>`);
    if (s.fill !== false) P.parts.push(`<path d="${path} L${x + w},${y + h} L${x},${y + h} Z" fill="url(#${gid})"/>`);
    P.parts.push(`<path d="${path}" fill="none" stroke="url(#${lid})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
    const peak = d.weeks.indexOf(max);
    P.parts.push(`<circle cx="${pts[peak][0].toFixed(1)}" cy="${pts[peak][1].toFixed(1)}" r="3.5" fill="${P.A}" stroke="${t.bg1}" stroke-width="2"/>`);
    return y + h + 16;
  }

  function drawMilestone(P, x, y, w) {
    const { d, t } = P;
    const m = d.milestone;
    if (!P.show('milestone') || !m) return y;
    y = sectionLabel(P, x, y, w, 'NEXT MILESTONE', m.eta ? `${m.eta} at the current pace` : '');
    const h = 10;
    const id = P.uid('ms');
    P.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.A}"/><stop offset="1" stop-color="${P.A2}"/></linearGradient>`);
    P.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.track}" fill-opacity="${t.trackOp}"/>`);
    P.parts.push(`<rect x="${x}" y="${y}" width="${Math.max(h, w * m.ratio).toFixed(1)}" height="${h}" rx="${h / 2}" fill="url(#${id})"/>`);
    // milestone ticks for 25/50/75%
    [0.25, 0.5, 0.75].forEach(f => P.parts.push(`<rect x="${(x + w * f).toFixed(1)}" y="${y + 2}" width="1" height="${h - 4}" fill="${t.bg1}" fill-opacity="0.5"/>`));
    y += h + 16;
    P.text(x, y, `${short(d.r.stars)} ★`, { size: 12, weight: 700, family: MONO });
    P.text(x + w, y, `${short(m.next)} ★`, { anchor: 'end', size: 12, weight: 700, family: MONO, fill: P.accentText });
    P.text(x + w / 2, y, `${Math.round(m.ratio * 100)}% there`, { anchor: 'middle', size: 11, fill: t.muted });
    return y + 16;
  }

  function drawHealth(P, x, y, w, cols = 3) {
    const { d, t } = P;
    if (!P.show('health')) return y;
    const passed = d.health.filter(h => h[1]).length;
    y = sectionLabel(P, x, y, w, 'REPO HEALTH', `${passed} of ${d.health.length} checks`);
    const cw = w / cols;
    d.health.forEach(([label, ok], i) => {
      const cx = x + (i % cols) * cw;
      const cy = y + Math.floor(i / cols) * 22 + 8;
      if (ok) {
        P.parts.push(`<circle cx="${cx + 7}" cy="${cy}" r="7" fill="${P.A}" fill-opacity="0.9"/>`);
        P.parts.push(`<path d="M${cx + 3.6},${cy + 0.2} l2.4,2.4 l4.4,-4.6" fill="none" stroke="${t.bg1}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
      } else {
        P.parts.push(`<circle cx="${cx + 7}" cy="${cy}" r="6.2" fill="none" stroke="${t.muted}" stroke-opacity="0.6" stroke-width="1.4"/>`);
      }
      P.text(cx + 20, cy + 4, fit(label, cw - 24, 12, 400, P.F), { size: 12, fill: ok ? t.text : t.muted });
    });
    return y + Math.ceil(d.health.length / cols) * 22 + 6;
  }

  function drawContributors(P, x, y, w, s = {}) {
    const { d, t, card } = P;
    if (!P.show('contributors') || !d.humans.length) return y;
    const bf = d.busFactor;
    if (s.label !== false) {
      y = sectionLabel(P, x, y, w, 'TOP CONTRIBUTORS', s.short ? '' : bf
        ? (bf.topShare >= 0.5 ? `${bf.top} wrote ${Math.round(bf.topShare * 100)}% of commits` : `${bf.n} people wrote half of all commits`)
        : '');
    }
    const sz = s.size || 30;
    const gap = s.gap ?? 7;
    const fitN = Math.max(1, Math.floor((w - 60) / (sz + gap)));
    const list = d.humans.slice(0, Math.min(s.max || 12, fitN));
    list.forEach((c, i) => {
      const cx = x + i * (sz + gap);
      const id = P.uid('c');
      P.defs.push(`<clipPath id="${id}"><circle cx="${cx + sz / 2}" cy="${y + sz / 2}" r="${sz / 2}"/></clipPath>`);
      P.parts.push(`<circle cx="${cx + sz / 2}" cy="${y + sz / 2}" r="${sz / 2 + 1.5}" fill="${i === 0 ? P.A : t.track}" fill-opacity="${i === 0 ? 1 : t.trackOp * 2}"/>`);
      P.parts.push(`<image href="${P.img(c.avatar)}" xlink:href="${P.img(c.avatar)}" x="${cx}" y="${y}" width="${sz}" height="${sz}" clip-path="url(#${id})"><title>${xml(c.login)}: ${c.contributions} commits</title></image>`);
    });
    if (card.contributors.length > list.length) {
      const more = card.contributorsMore ? `${card.contributors.length}+` : `+${card.contributors.length - list.length}`;
      P.text(x + list.length * (sz + gap) + 2, y + sz / 2 + 4, more, { size: 12, fill: t.muted });
    }
    return y + sz + 16;
  }

  function drawTopics(P, x, y, w, maxRows = 2) {
    const r = P.d.r;
    if (!P.show('topics') || !r.topics.length) return y;
    y = sectionLabel(P, x, y, w, 'TOPICS');
    let tx = x, ty = y, rows = 1;
    for (const topic of r.topics) {
      const tw = measure(topic, 11.5, 600, P.F) + 18;
      if (tx + tw > x + w) { if (rows === maxRows) break; rows++; tx = x; ty += 26; }
      P.parts.push(`<rect x="${tx}" y="${ty}" width="${tw}" height="20" rx="10" fill="${P.A}" fill-opacity="0.16"/>`);
      P.text(tx + 9, ty + 14, topic, { size: 11.5, weight: 600, fill: P.accentText });
      tx += tw + 6;
    }
    return ty + 34;
  }

  function drawFooter(P, x, y, w) {
    const { d, t, card } = P;
    if (!P.show('footer')) return y;
    P.parts.push(`<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${t.track}" stroke-opacity="${t.trackOp * 1.5}"/>`);
    y += 22;
    const left = card.release ? `Latest ${card.release.tag} · ${ago(card.release.date)}` : `Last push ${ago(d.r.pushed)}`;
    P.text(x, y, fit(left, w - 110, 11.5, 400, P.F), { size: 11.5, fill: t.muted });
    P.parts.push(`<circle cx="${x + w - 62}" cy="${y - 4}" r="3.5" fill="${P.A}"/>`);
    P.parts.push(`<text x="${x + w}" y="${y}" text-anchor="end" font-family="${P.F}" font-size="11.5" font-weight="700" fill="${t.text}">Repo<tspan fill="${P.accentText}">lysis</tspan></text>`);
    return y + 8;
  }

  /* =========================================================
     Background & lighting
     ========================================================= */
  function background(P, W, H, rx) {
    const { o, t, A, A2 } = P;
    const k = Math.max(0, Math.min(100, o.glow)) / 60; // 1 = default strength
    const defs = [];
    const layers = [];

    defs.push(`<linearGradient id="${P.pfx}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${o.bg === 'solid' ? t.bg1 : t.bg2}"/></linearGradient>`);
    layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-bg)"/>`);

    const ink = t.text;
    switch (o.bg) {
      case 'mesh': {
        const blobs = [[0.15, 0.1, A, 0.55], [0.9, 0.25, A2, 0.5], [0.55, 1.05, mix(A, A2, 0.5), 0.45]];
        blobs.forEach(([cx, cy, c, r], i) => {
          defs.push(`<radialGradient id="${P.pfx}-mesh${i}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${c}" stop-opacity="${t.isLight ? 0.22 : 0.3}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
          layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-mesh${i})"/>`);
        });
        break;
      }
      case 'aurora': {
        defs.push(`<filter id="${P.pfx}-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${Math.max(18, Math.min(W, H) * 0.09)}"/></filter>`);
        defs.push(`<linearGradient id="${P.pfx}-aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${A}"/><stop offset="0.5" stop-color="${A2}"/><stop offset="1" stop-color="${A}"/></linearGradient>`);
        const band = (yy, amp, op) => `<path d="M${-W * 0.1},${yy} C${W * 0.25},${yy - amp} ${W * 0.45},${yy + amp} ${W * 0.7},${yy - amp * 0.4} S${W * 1.05},${yy + amp * 0.6} ${W * 1.1},${yy} L${W * 1.1},${yy + H * 0.16} L${-W * 0.1},${yy + H * 0.16} Z" fill="url(#${P.pfx}-aur)" opacity="${op}"/>`;
        layers.push(`<g filter="url(#${P.pfx}-blur)">${band(H * 0.08, H * 0.12, t.isLight ? 0.3 : 0.45)}${band(H * 0.32, H * 0.08, t.isLight ? 0.14 : 0.2)}</g>`);
        break;
      }
      case 'grid':
        defs.push(`<pattern id="${P.pfx}-pat" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="${ink}" stroke-opacity="${t.isLight ? 0.07 : 0.06}"/></pattern>`);
        defs.push(`<linearGradient id="${P.pfx}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.15"/></linearGradient><mask id="${P.pfx}-mask"><rect width="${W}" height="${H}" fill="url(#${P.pfx}-fade)"/></mask>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-pat)" mask="url(#${P.pfx}-mask)"/>`);
        break;
      case 'dots':
        defs.push(`<pattern id="${P.pfx}-pat" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${ink}" fill-opacity="${t.isLight ? 0.13 : 0.1}"/></pattern>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-pat)"/>`);
        break;
      case 'stripes':
        defs.push(`<pattern id="${P.pfx}-pat" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="14" fill="${ink}" fill-opacity="${t.isLight ? 0.035 : 0.03}"/></pattern>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-pat)"/>`);
        break;
      default: break;
    }

    // Lighting
    const op = v => Math.min(1, v * k).toFixed(3);
    switch (o.light) {
      case 'corner':
        defs.push(`<radialGradient id="${P.pfx}-glow" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-glow)"/>`);
        break;
      case 'top':
        defs.push(`<radialGradient id="${P.pfx}-glow" cx="0.5" cy="-0.1" r="0.75" gradientTransform="translate(0.5 0) scale(1 ${Math.min(2, W / H * 0.7).toFixed(2)}) translate(-0.5 0)"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp * 1.2)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-glow)"/>`);
        break;
      case 'left':
        defs.push(`<radialGradient id="${P.pfx}-glow" cx="0" cy="0.5" r="0.8"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp * 1.1)}"/><stop offset="0.6" stop-color="${A2}" stop-opacity="${op(t.glowOp * 0.25)}"/><stop offset="1" stop-color="${A2}" stop-opacity="0"/></radialGradient>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-glow)"/>`);
        break;
      case 'spotlight':
        defs.push(`<radialGradient id="${P.pfx}-glow" cx="0.5" cy="0" r="0.85"><stop offset="0" stop-color="${t.isLight ? A : '#ffffff'}" stop-opacity="${op(t.isLight ? 0.14 : 0.13)}"/><stop offset="0.45" stop-color="${A}" stop-opacity="${op(t.glowOp * 0.45)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-glow)"/>`);
        defs.push(`<radialGradient id="${P.pfx}-vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${t.isLight ? 0.06 : 0.35}"/></radialGradient>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-vig)"/>`);
        break;
      case 'neon':
        defs.push(`<radialGradient id="${P.pfx}-glow" cx="0.5" cy="0.5" r="0.7"><stop offset="0.55" stop-color="${A}" stop-opacity="0"/><stop offset="1" stop-color="${A}" stop-opacity="${op(t.glowOp * 0.7)}"/></radialGradient>`);
        layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-glow)"/>`);
        break;
      default: break;
    }

    // Accent strip on top (not on the badge, which has its own)
    if (o.template !== 'badge' && o.light !== 'neon') {
      defs.push(`<linearGradient id="${P.pfx}-strip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${A2}"/></linearGradient>`);
      layers.push(`<rect width="${W}" height="3" fill="url(#${P.pfx}-strip)"/>`);
    }

    // Border / neon edge (drawn above content clip)
    let edge = '';
    if (o.light === 'neon') {
      defs.push(`<linearGradient id="${P.pfx}-neon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${A2}"/></linearGradient>`);
      defs.push(`<filter id="${P.pfx}-neonblur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${(3 + 3 * k).toFixed(1)}"/></filter>`);
      edge = `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="${Math.max(0, rx - 1)}" fill="none" stroke="url(#${P.pfx}-neon)" stroke-width="${(2 + k).toFixed(1)}" filter="url(#${P.pfx}-neonblur)" opacity="${Math.min(1, 0.9 * k).toFixed(2)}"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${Math.max(0, rx - 1)}" fill="none" stroke="url(#${P.pfx}-neon)" stroke-width="1.5"/>`;
    } else if (o.border) {
      edge = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${rx}" fill="none" stroke="${t.border}" stroke-opacity="${t.borderOp}"/>`;
    }
    return { defs, layers, edge };
  }

  /* =========================================================
     Templates
     ========================================================= */
  const STACK = {
    classic: {
      W: 520, PAD: 24,
      header: { avatar: 46, title: 20, owner: 13, meta: 12, grade: 22, gap: 16 },
      desc: [13.5, 2],
      tiles: { h: 60, value: 19, label: 10.5 },
      activity: { h: 48 }, contrib: { size: 30, max: 12 }, healthCols: 3, topicRows: 2,
    },
    compact: {
      W: 380, PAD: 18,
      header: { avatar: 36, title: 17, owner: 12, meta: 11, grade: 18, gap: 12 },
      desc: [12.5, 2],
      tiles: { h: 50, value: 15.5, label: 9, cols: 3, gap: 8, rx: 8 },
      maxTiles: 6,
      activity: { h: 34 }, contrib: { size: 24, max: 9, gap: 5 }, healthCols: 2, topicRows: 1,
    },
    minimal: {
      W: 480, PAD: 28,
      header: { avatar: 34, title: 22, owner: 13, meta: 12, grade: 20, gap: 12 },
      desc: [13.5, 3],
      inlineStats: true,
      langs: { barH: 4 }, activity: { h: 40, fill: false }, contrib: { size: 26, max: 10 }, healthCols: 3, topicRows: 2,
    },
  };

  function stackLayout(P, cfg) {
    const { W, PAD } = cfg;
    const inner = W - PAD * 2;
    let y = PAD + (P.o.light === 'neon' ? 2 : 0);
    y = drawHeader(P, PAD, y, inner, cfg.header);
    y = drawDesc(P, PAD, y - 4, inner, cfg.desc[0], cfg.desc[1]);
    const tiles = selectedTiles(P, cfg.maxTiles);
    y = cfg.inlineStats ? drawInlineStats(P, PAD, y - 8, inner, tiles) + 4 : drawTiles(P, PAD, y, inner, tiles, cfg.tiles);
    y = drawLangs(P, PAD, y, inner, cfg.langs);
    y = drawActivity(P, PAD, y, inner, cfg.activity);
    y = drawMilestone(P, PAD, y, inner);
    y = drawHealth(P, PAD, y, inner, cfg.healthCols);
    y = drawContributors(P, PAD, y, inner, cfg.contrib);
    y = drawTopics(P, PAD, y, inner, cfg.topicRows);
    y = drawFooter(P, PAD, y, inner);
    return { W, H: Math.round(y + PAD - 6) };
  }

  function wideLayout(P) {
    const W = 860, PAD = 26, top = PAD + 2;
    const c1 = { x: PAD, w: 268 };
    const c2 = { x: c1.x + c1.w + 28, w: 300 };
    const c3 = { x: c2.x + c2.w + 28, w: W - PAD - (c2.x + c2.w + 28) };

    let y1 = drawHeader(P, c1.x, top, c1.w, { avatar: 42, title: 19, owner: 12.5, meta: 11.5, grade: 19, gap: 14 });
    y1 = drawDesc(P, c1.x, y1 - 4, c1.w, 12.5, 3);
    y1 = drawTopics(P, c1.x, y1, c1.w, 1);

    const tiles = selectedTiles(P, 6);
    let y2 = drawTiles(P, c2.x, top, c2.w, tiles, { h: 54, value: 16.5, label: 9.5, cols: tiles.length <= 2 ? tiles.length || 1 : tiles.length === 4 ? 2 : 3, gap: 8, rx: 9 });
    y2 = drawMilestone(P, c2.x, y2, c2.w);
    y2 = drawHealth(P, c2.x, y2, c2.w, 2);

    let y3 = drawActivity(P, c3.x, top, c3.w, { h: 44, short: true });
    y3 = drawLangs(P, c3.x, y3, c3.w, { legendMax: 3 });
    y3 = drawContributors(P, c3.x, y3, c3.w, { size: 22, max: 8, gap: 4, short: true });

    // column dividers
    const bottom = Math.max(y1, y2, y3);
    [c2.x - 14, c3.x - 14].forEach(lx => P.parts.push(`<line x1="${lx}" y1="${top}" x2="${lx}" y2="${bottom - 10}" stroke="${P.t.track}" stroke-opacity="${P.t.trackOp * 1.6}"/>`));
    let y = bottom;
    if (P.show('footer')) y = drawFooter(P, PAD, y + 2, W - PAD * 2);
    return { W, H: Math.round(y + PAD - 8) };
  }

  function badgeLayout(P) {
    const { d, t, o } = P;
    const H = 40;
    const r = d.r;
    const hasAvatar = P.show('avatar') && r.avatar;
    const name = o.title || r.full;
    const nameW = Math.min(240, measure(name, 13.5, 700, P.F));
    const stats = selectedTiles(P, 3);
    let x = 8;
    if (hasAvatar) { drawAvatar(P, x + 2, 10, 20, r.avatar, null, r.ownerType === 'Organization'); x += 30; } else x += 6;
    P.text(x, 25, fit(name, nameW + 1, 13.5, 700, P.F), { size: 13.5, weight: 700 });
    x += nameW + 12;
    const segStart = x;
    stats.forEach(([label, value, ico], i) => {
      if (i === 0) P.parts.push(`<rect x="${x - 6}" y="8" width="1" height="24" fill="${t.text}" fill-opacity="0.15"/>`);
      P.text(x + 6, 25, ico, { size: 12, weight: 700, fill: P.A });
      P.text(x + 20, 25, value, { size: 13, weight: 700, family: MONO });
      x += 20 + measure(value, 13, 700, MONO) + 14;
    });
    if (P.show('grade')) {
      const gw = measure(d.grade, 12, 800, MONO) + 16;
      P.parts.push(`<rect x="${x}" y="10" width="${gw}" height="20" rx="10" fill="${P.A}"/>`);
      P.text(x + gw / 2, 24.5, d.grade, { anchor: 'middle', size: 12, weight: 800, family: MONO, fill: luminance(P.A) > 0.5 ? '#16171a' : '#ffffff' });
      x += gw + 6;
    }
    const W = Math.round(Math.max(x + 6, segStart + 40));
    // accent bar on the left edge
    P.parts.unshift(`<rect x="0" y="0" width="4" height="${H}" fill="${P.A}"/>`);
    return { W, H };
  }

  /* =========================================================
     Render
     ========================================================= */
  function render(card, opts, images = new Map()) {
    const o = { ...defaultOptions(), ...opts };
    const P = painter(card, o, images);
    let size;
    if (o.template === 'wide') size = wideLayout(P);
    else if (o.template === 'badge') size = badgeLayout(P);
    else size = stackLayout(P, STACK[o.template] || STACK.classic);
    const { W, H } = size;
    const rx = o.template === 'badge' ? (o.rounded ? H / 2 : 6) : (o.rounded ? 16 : 4);
    const bg = background(P, W, H, rx);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${xml(card.repo.full)} stats">
<title>${xml(card.repo.full)} · Repolysis repo card</title>
<defs>
<clipPath id="${P.pfx}-card"><rect width="${W}" height="${H}" rx="${rx}"/></clipPath>
${bg.defs.join('\n')}
${P.defs.join('\n')}
</defs>
<g clip-path="url(#${P.pfx}-card)">
${bg.layers.join('\n')}
${P.parts.join('\n')}
</g>
${bg.edge}
</svg>`;
    return { svg, width: W, height: H };
  }

  /* =========================================================
     "Describe your style" – free text -> options
     Works on a lowercase, accent-free copy of the text ("różowy" -> "rozowy"),
     fixes small typos, understands emoji, and always produces *something*:
     when no known word is found, the look is derived from the text itself.
     ========================================================= */
  const fold = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

  // English colour names (exact word, or with -ish / -y).
  const COLOR_WORDS = {
    red: '#ED4245', crimson: '#DC143C', ruby: '#E0115F', scarlet: '#FF2400', maroon: '#9F1239', burgundy: '#9F1239', wine: '#9F1239',
    orange: '#F0B232', amber: '#FFB000', gold: '#E9B949', golden: '#E9B949', bronze: '#CD7F32', copper: '#B87333',
    yellow: '#FEE75C', lemon: '#FDE047', banana: '#FDE047', lime: '#A3E635', olive: '#84823C', green: '#57F287', emerald: '#10B981',
    jade: '#00A86B', mint: '#5EEAD4', teal: '#14B8A6', turquoise: '#2DD4BF', cyan: '#00A8FC', aqua: '#22D3EE', sky: '#38BDF8',
    azure: '#3B9EFF', blue: '#3B82F6', cobalt: '#2563EB', sapphire: '#2563EB', indigo: '#6366F1', blurple: '#5865F2',
    purple: '#9B59B6', violet: '#9B84EE', lavender: '#B4A7F5', lilac: '#C8A2C8', plum: '#8E4585', grape: '#7C3AED', orchid: '#DA70D6',
    magenta: '#D946EF', pink: '#EC4899', fuchsia: '#EB459E', rose: '#F43F5E', strawberry: '#F43F5E', cherry: '#BE123C',
    coral: '#FF7F50', salmon: '#FA8072', peach: '#FFB38A', apricot: '#FBCEB1', brown: '#A0522D', beige: '#D6C3A5', cream: '#F3E5C0',
    sand: '#D8B98A', khaki: '#BDB76B', silver: '#C0C4CC', gray: '#949BA4', grey: '#949BA4', berry: '#A21CAF',
  };
  // Polish colour stems (match the start of a word, so every grammatical form works).
  const COLOR_STEMS = [
    ['czerwon', '#ED4245'], ['karmazyn', '#DC143C'], ['bordo', '#9F1239'], ['wisni', '#BE123C'], ['malin', '#E11D48'],
    ['pomarancz', '#F0B232'], ['zlot', '#E9B949'], ['zolt', '#FEE75C'], ['cytryn', '#FDE047'], ['limonk', '#A3E635'],
    ['seledyn', '#A7F3D0'], ['oliwk', '#84823C'], ['zielon', '#57F287'], ['szmaragd', '#10B981'], ['mietow', '#5EEAD4'],
    ['turkus', '#2DD4BF'], ['morsk', '#14B8A6'], ['blekit', '#38BDF8'], ['niebiesk', '#3B82F6'], ['granat', '#1E3A8A'],
    ['fiolet', '#9B84EE'], ['purpur', '#9B59B6'], ['liliow', '#C8A2C8'], ['lawend', '#B4A7F5'], ['rozow', '#EC4899'],
    ['truskaw', '#F43F5E'], ['koral', '#FF7F50'], ['lososi', '#FA8072'], ['brzoskwin', '#FFB38A'], ['braz', '#A0522D'],
    ['bezow', '#D6C3A5'], ['kremow', '#F3E5C0'], ['srebr', '#C0C4CC'], ['szar', '#949BA4'], ['miedzi', '#B87333'], ['jagod', '#A21CAF'],
  ];
  const DARKER = /^(dark|deep|ciemn\w*)$/;
  const LIGHTER = /^(light|pale|soft|jasn\w*|blad\w*)$/;

  // Emoji -> words the parser knows.
  const EMOJI = [
    ['🔥', 'fire'], ['🌊', 'ocean'], ['🌸', 'sakura'], ['🎃', 'halloween'], ['🎄', 'christmas'], ['❄', 'ice'], ['☃', 'winter'],
    ['🌙', 'space'], ['⭐', 'space'], ['🌟', 'space'], ['✨', 'glow'], ['🌌', 'galaxy'], ['🌅', 'sunset'], ['🌄', 'sunrise'],
    ['🌲', 'forest'], ['🌳', 'forest'], ['🌿', 'nature'], ['🍃', 'nature'], ['☕', 'coffee'], ['👑', 'royal'], ['💎', 'luxury'],
    ['💀', 'gothic'], ['🦇', 'gothic'], ['🤖', 'robot'], ['👽', 'alien'], ['🛸', 'alien'], ['🌈', 'rainbow'], ['⚡', 'storm'],
    ['☢', 'toxic'], ['☣', 'toxic'], ['❤', 'love'], ['💖', 'love'], ['💕', 'love'], ['🐉', 'dragon'], ['🏴', 'pirate'],
    ['🎮', 'gaming'], ['👾', 'pixel'], ['💻', 'terminal'], ['🍂', 'autumn'], ['🍁', 'autumn'], ['☀', 'summer'], ['🏖', 'tropical'],
    ['🌴', 'tropical'], ['🌷', 'spring'], ['🌹', 'love'], ['🚀', 'futuristic'], ['🧙', 'magic'], ['🔮', 'magic'], ['🍫', 'chocolate'],
    ['💜', 'purple'], ['💙', 'blue'], ['💚', 'green'], ['💛', 'yellow'], ['🧡', 'orange'], ['🖤', 'black'], ['🤍', 'white'],
  ];

  // Moods: complete looks. Applied in the order they appear, then specific words override them.
  const MOODS = {
    cyberpunk: { theme: 'midnight', bg: 'grid', light: 'neon', accent: '#EB459E', accent2: '#00E5FF', font: 'mono', glow: 75 },
    neon: { light: 'neon', glow: 80, theme: 'midnight' },
    synthwave: { theme: 'midnight', bg: 'aurora', light: 'top', accent: '#FF4FD8', accent2: '#FFB000', glow: 80 },
    vaporwave: { theme: 'midnight', bg: 'grid', light: 'top', accent: '#FF71CE', accent2: '#01CDFE', glow: 75 },
    retro: { theme: 'midnight', bg: 'stripes', light: 'top', accent: '#F0B232', accent2: '#EB459E', font: 'mono' },
    pixel: { theme: 'dark', bg: 'grid', light: 'none', accent: '#22C55E', accent2: '#FACC15', font: 'mono', rounded: false },
    terminal: { theme: 'dark', bg: 'solid', light: 'none', accent: '#57F287', accent2: '#2ECC71', font: 'mono', rounded: false },
    hacker: { theme: 'dark', bg: 'grid', light: 'none', accent: '#00FF7F', accent2: '#00C853', font: 'mono', rounded: false },
    matrix: { theme: 'dark', bg: 'dots', light: 'spotlight', accent: '#00FF7F', accent2: '#00C853', font: 'mono' },
    futuristic: { theme: 'midnight', bg: 'grid', light: 'neon', accent: '#22D3EE', accent2: '#A78BFA', font: 'mono', glow: 70 },
    modern: { theme: 'dark', bg: 'mesh', light: 'top', accent: '#6366F1', accent2: '#22D3EE' },
    ocean: { theme: 'midnight', bg: 'mesh', light: 'top', accent: '#00A8FC', accent2: '#14B8A6' },
    tropical: { theme: 'dark', bg: 'aurora', light: 'corner', accent: '#10B981', accent2: '#FBBF24' },
    sunset: { theme: 'dark', bg: 'aurora', light: 'corner', accent: '#FF7F50', accent2: '#EC4899', glow: 75 },
    sunrise: { theme: 'light', bg: 'aurora', light: 'top', accent: '#FB923C', accent2: '#F472B6' },
    dusk: { theme: 'midnight', bg: 'aurora', light: 'left', accent: '#A78BFA', accent2: '#FB923C' },
    forest: { theme: 'dark', bg: 'mesh', light: 'left', accent: '#57F287', accent2: '#14B8A6' },
    nature: { theme: 'dark', bg: 'mesh', light: 'left', accent: '#84CC16', accent2: '#CA8A04' },
    desert: { bgColors: ['#FBF3E4', '#F3E1C0'], bg: 'stripes', light: 'top', accent: '#D97706', accent2: '#B45309' },
    fire: { theme: 'dark', bg: 'aurora', light: 'spotlight', accent: '#ED4245', accent2: '#F0B232', glow: 80 },
    ice: { theme: 'light', bg: 'mesh', light: 'top', accent: '#38BDF8', accent2: '#A5B4FC' },
    winter: { theme: 'light', bg: 'dots', light: 'top', accent: '#38BDF8', accent2: '#6366F1' },
    spring: { theme: 'light', bg: 'mesh', light: 'corner', accent: '#F472B6', accent2: '#22C55E' },
    summer: { theme: 'light', bg: 'aurora', light: 'corner', accent: '#F59E0B', accent2: '#EC4899' },
    autumn: { theme: 'dark', bg: 'mesh', light: 'left', accent: '#D97706', accent2: '#B91C1C' },
    halloween: { theme: 'dark', bg: 'stripes', light: 'spotlight', accent: '#FF7518', accent2: '#9B59B6', glow: 75 },
    christmas: { theme: 'dark', bg: 'dots', light: 'corner', accent: '#ED4245', accent2: '#22C55E' },
    pastel: { theme: 'light', bg: 'mesh', light: 'none', accent: '#F9A8D4', accent2: '#A5B4FC' },
    candy: { theme: 'light', bg: 'dots', light: 'corner', accent: '#EC4899', accent2: '#A78BFA' },
    sakura: { theme: 'light', bg: 'mesh', light: 'corner', accent: '#F472B6', accent2: '#FDA4AF' },
    love: { theme: 'dark', bg: 'aurora', light: 'corner', accent: '#F43F5E', accent2: '#EC4899' },
    rainbow: { theme: 'midnight', bg: 'aurora', light: 'neon', accent: '#EC4899', accent2: '#22D3EE', glow: 85 },
    happy: { theme: 'light', bg: 'dots', light: 'corner', accent: '#FBBF24', accent2: '#F472B6' },
    energetic: { theme: 'midnight', bg: 'aurora', light: 'neon', accent: '#FACC15', accent2: '#EC4899', glow: 95 },
    calm: { theme: 'light', bg: 'mesh', light: 'none', accent: '#14B8A6', accent2: '#A5B4FC', glow: 30 },
    sad: { theme: 'dark', bg: 'solid', light: 'top', accent: '#64748B', accent2: '#94A3B8', glow: 30 },
    storm: { theme: 'midnight', bg: 'stripes', light: 'spotlight', accent: '#FACC15', accent2: '#60A5FA', glow: 90 },
    toxic: { theme: 'dark', bg: 'grid', light: 'neon', accent: '#A3E635', accent2: '#84CC16', glow: 85 },
    alien: { theme: 'midnight', bg: 'dots', light: 'spotlight', accent: '#4ADE80', accent2: '#22D3EE' },
    robot: { theme: 'dark', bg: 'stripes', light: 'top', accent: '#C0C4CC', accent2: '#60A5FA', font: 'mono', rounded: false },
    magic: { theme: 'midnight', bg: 'aurora', light: 'spotlight', accent: '#A78BFA', accent2: '#2DD4BF' },
    dragon: { theme: 'dark', bg: 'aurora', light: 'spotlight', accent: '#DC2626', accent2: '#F59E0B', glow: 80 },
    gothic: { bgColors: ['#0A0A0A', '#1A0B10'], bg: 'solid', light: 'spotlight', accent: '#9F1239', accent2: '#6B21A8', font: 'serif' },
    ninja: { bgColors: ['#0B0B0F', '#15151C'], bg: 'solid', light: 'none', accent: '#ED4245', accent2: '#949BA4', rounded: false },
    pirate: { theme: 'dark', bg: 'stripes', light: 'spotlight', accent: '#E9B949', accent2: '#A0522D', font: 'serif' },
    military: { bgColors: ['#1F2416', '#2D3420'], bg: 'stripes', light: 'none', accent: '#84CC16', accent2: '#A3A36B', font: 'mono', rounded: false },
    steampunk: { theme: 'dark', bg: 'stripes', light: 'spotlight', accent: '#B87333', accent2: '#E9B949', font: 'serif' },
    royal: { theme: 'midnight', bg: 'solid', light: 'spotlight', accent: '#E9B949', accent2: '#9B59B6', font: 'serif' },
    luxury: { theme: 'dark', bg: 'solid', light: 'spotlight', accent: '#E9B949', accent2: '#B8860B', font: 'serif' },
    elegant: { font: 'serif', light: 'spotlight', bg: 'solid' },
    coffee: { bgColors: ['#2A1C14', '#3B2A1E'], bg: 'solid', light: 'spotlight', accent: '#C08552', accent2: '#E6C9A8', font: 'serif' },
    chocolate: { bgColors: ['#2A1A12', '#3B2418'], bg: 'mesh', light: 'corner', accent: '#D2691E', accent2: '#F3E5C0' },
    vintage: { bgColors: ['#F5ECD7', '#E8DCC0'], bg: 'dots', light: 'none', accent: '#8B5E3C', accent2: '#A0522D', font: 'serif' },
    newspaper: { theme: 'light', bg: 'solid', light: 'none', accent: '#1E1F22', accent2: '#5C5E66', font: 'serif', rounded: false },
    monochrome: { theme: 'dark', bg: 'solid', light: 'none', accent: '#FFFFFF', accent2: '#949BA4' },
    brutalist: { theme: 'light', bg: 'solid', light: 'none', accent: '#1E1F22', accent2: '#ED4245', font: 'mono', rounded: false, border: true },
    minimal: { template: 'minimal', bg: 'solid', light: 'none', border: true },
    clean: { bg: 'solid', light: 'none' },
    corporate: { theme: 'light', bg: 'solid', light: 'none', accent: '#3B82F6', accent2: '#6366F1', font: 'sans' },
    gaming: { theme: 'dark', bg: 'grid', light: 'neon', accent: '#5865F2', accent2: '#EB459E', glow: 65 },
    discord: { theme: 'dark', bg: 'gradient', light: 'corner', accent: '#5865F2', accent2: '#EB459E' },
    github: { bgColors: ['#0D1117', '#161B22'], bg: 'solid', light: 'none', accent: '#2F81F7', accent2: '#3FB950' },
    space: { theme: 'midnight', bg: 'dots', light: 'spotlight', accent: '#9B84EE', accent2: '#00A8FC' },
    galaxy: { theme: 'midnight', bg: 'aurora', light: 'spotlight', accent: '#9B84EE', accent2: '#EB459E' },
    paper: { theme: 'light', bg: 'dots', light: 'none', font: 'serif', accent: '#1E1F22', accent2: '#5C5E66' },
    blueprint: { bgColors: ['#0B3D91', '#0A2A66'], bg: 'grid', light: 'none', accent: '#FFFFFF', accent2: '#9EC5FF', font: 'mono', rounded: false },
  };

  // Other words (English + Polish, accent-free) that mean one of the moods.
  const MOOD_ALIASES = [
    [/\bcyber\b/, 'cyberpunk'], [/\bneonow\w*/, 'neon'], [/\b(aesthetic|y2k)\b/, 'vaporwave'],
    [/\b(8 ?bit|16 ?bit|arcade|piksel\w*|pixel\w*|automat\w*)\b/, 'pixel'],
    [/\b(console|konsol\w*|bash|linux|cmd|shell)\b/, 'terminal'], [/\b(haker\w*|hakersk\w*)\b/, 'hacker'],
    [/\b(futur\w*|sci ?fi|hologra\w*|high ?tech|kosmiczn\w* technolog\w*)\b/, 'futuristic'],
    [/\b(sleek|startup|saas|nowoczesn\w*|glass\w*)\b/, 'modern'],
    [/\b(sea|morze|morz[ae]|morsk\w* motyw|water|wod[aey]|underwater|podwodn\w*|deep sea|glebin\w*|wave)\b/, 'ocean'],
    [/\b(tropic\w*|tropik\w*|beach|plaz\w*|palm\w*|island|wysp\w*|wakacj\w*|vacation)\b/, 'tropical'],
    [/\b(zachod\w*( slonca)?|golden hour)\b/, 'sunset'], [/\b(dawn|morning|wschod\w*|poran\w*|rano)\b/, 'sunrise'],
    [/\b(twilight|evening|zmierzch\w*|wieczor\w*|wieczorn\w*)\b/, 'dusk'],
    [/\b(las|lasu|lesn\w*|woods?|jungle|dzungl\w*)\b/, 'forest'],
    [/\b(natur\w*|earth|ziemi\w*|eco|ekolog\w*|organic|plant\w*|rosli\w*|wood|drewn\w*|leaf|lisc\w*)\b/, 'nature'],
    [/\b(pustyn\w*|sand|piase?k\w*|dunes?|wydm\w*)\b/, 'desert'],
    [/\b(flames?|ogien|ognist\w*|ognia|plomie\w*|hot|gorac\w*|inferno|piekl\w*|volcano|wulkan\w*|lava)\b/, 'fire'],
    [/\b(lod|lodu|lodow\w*|frost|frozen|zimn\w*|cold|mroz\w*|arctic|arktyczn\w*)\b/, 'ice'],
    [/\b(snow|snieg\w*|snieżn\w*|sniezn\w*|zim[aey]|zimow\w*)\b/, 'winter'],
    [/\b(wiosn\w*|bloom\w*|flower\w*|floral|kwiat\w*|kwiec\w*)\b/, 'spring'],
    [/\b(lato|letni\w*|sunny|slonecz\w*|slonce)\b/, 'summer'], [/\b(fall|jesien\w*|jesienn\w*)\b/, 'autumn'],
    [/\b(xmas|swiat\w*|swiateczn\w*|boze narodzenie|mikolaj\w*|santa)\b/, 'christmas'], [/\b(spooky|dynia|dyni\w*)\b/, 'halloween'],
    [/\b(pastelow\w*)\b/, 'pastel'], [/\b(cukier\w*|cukierk\w*|sweet|slodk\w*|lollipop|lizak\w*)\b/, 'candy'],
    [/\b(cute|kawaii|urocz\w*|anime|uwu|japan\w*|japon\w*|cherry blossom)\b/, 'sakura'],
    [/\b(milos\w*|romant\w*|valentin\w*|walentyn\w*|heart|serc\w*|zakochan\w*)\b/, 'love'],
    [/\b(tecz\w*|colorful|colourful|kolorow\w*|multicolou?r|psychedel\w*|psychodel\w*|vibrant)\b/, 'rainbow'],
    [/\b(wesol\w*|radosn\w*|cheerful|joy\w*|smile|usmiech\w*|fun|zabawn\w*)\b/, 'happy'],
    [/\b(energ\w*|dynami\w*|crazy|szalon\w*|party|impreza\w*|loud|glosn\w*|hype)\b/, 'energetic'],
    [/\b(zen|spokoj\w*|relax\w*|relaks\w*|peace\w*|cisz\w*|cozy|przytuln\w*|meditat\w*|medytac\w*|chill)\b/, 'calm'],
    [/\b(smutn\w*|melanchol\w*|rain|rainy|deszcz\w*|gloomy|ponur\w*)\b/, 'sad'],
    [/\b(burz\w*|thunder\w*|piorun\w*|lightning|blyskawic\w*|electric|elektry\w*)\b/, 'storm'],
    [/\b(toksy\w*|radioakty\w*|radioactiv\w*|poison\w*|truj\w*|acid|kwas\w*|slime|biohazard)\b/, 'toxic'],
    [/\b(ufo|kosmit\w*|extraterr\w*)\b/, 'alien'],
    [/\b(robo\w*|metal\w*|steel|stal\w*|chrom\w*|mech\w*|machine|maszyn\w*|cyborg)\b/, 'robot'],
    [/\b(myster\w*|tajemnic\w*|magi\w*|fantasy|fantas\w*|wizard|czarodziej\w*|witch|wiedzm\w*|mystic\w*|mistycz\w*|enchant\w*)\b/, 'magic'],
    [/\b(smok\w*)\b/, 'dragon'],
    [/\b(goth\w*|gotyc\w*|vampire|wampir\w*|mroczn\w*|mrok\w*|horror|creepy|straszn\w*|dark academia)\b/, 'gothic'],
    [/\b(stealth|shadow\w*|cien|ukryt\w*|assassin)\b/, 'ninja'], [/\b(pira\w*|treasure|skarb\w*)\b/, 'pirate'],
    [/\b(army|wojsk\w*|camo|moro|tactical|taktycz\w*|soldier|zolnier\w*)\b/, 'military'],
    [/\b(industrial|brass|mosiadz\w*)\b/, 'steampunk'],
    [/\b(krolew\w*|king|krol|queen|krolow\w*|regal|majest\w*|premium|vip)\b/, 'royal'],
    [/\b(luksus\w*|luxur\w*|rich|bogat\w*|expensive|drog[ia]\w*)\b/, 'luxury'], [/\b(elegan\w*|classy|szykown\w*)\b/, 'elegant'],
    [/\b(kaw[aey]|kawow\w*|latte|espresso|mocha|cafe)\b/, 'coffee'], [/\b(czekolad\w*|cocoa|kakao)\b/, 'chocolate'],
    [/\b(old ?school|sepia|antique|antyk\w*|stary|stare|nostalg\w*|klasyczn\w* papier)\b/, 'vintage'],
    [/\b(gazet\w*|news\w*|magazine|magazyn\w*|print)\b/, 'newspaper'],
    [/\b(monochrom\w*|black (and|&) white|czarno ?bial\w*|grayscale|greyscale|noir|b ?& ?w)\b/, 'monochrome'],
    [/\b(brutal\w*|raw|surow\w*)\b/, 'brutalist'],
    [/\b(czyst\w*|tidy|schludn\w*)\b/, 'clean'],
    [/\b(business|biznes\w*|firm\w*|office|biur\w*|serious|powazn\w*|formal\w*|linkedin)\b/, 'corporate'], [/\bprofessional\b|\bprofesjonaln\w*/, 'corporate'],
    [/\b(gamer\w*|gamingow\w*|esport\w*|gra|gry|gier|growy)\b/, 'gaming'],
    [/\b(octocat)\b/, 'github'],
    [/\b(kosmos\w*|kosmiczn\w*|cosmic|universe|wszechswiat\w*|planet\w*|astro\w*|rocket|rakiet\w*|starry|gwiezdn\w*)\b/, 'space'],
    [/\b(galakty\w*|milky way|droga mleczna)\b/, 'galaxy'],
    [/\b(papier\w*)\b/, 'paper'], [/\b(blueprint|rysunek techniczny|plan techniczny)\b/, 'blueprint'],
  ];

  const WORDS = [
    // templates
    [/\b(compact|small|smaller|mini|little|maly|mala|male|malej|malutk\w*|malenk\w*|mniejsz\w*)\b/, { template: 'compact' }, 'compact'],
    [/\b(badge|pill|shield|tiny|chip|odznak\w*|plakietk\w*)\b/, { template: 'badge' }, 'badge'],
    [/\b(wide|banner|rectangle|rectangular|horizontal|landscape|long|prostokat\w*|szerok\w*|pozio\w*|baner\w*)\b/, { template: 'wide' }, 'banner'],
    [/\b(minimal|minimalist\w*|simple|minimalistyczn\w*|prost[ayeo]|prostsz\w*)\b/, { template: 'minimal' }, 'minimal'],
    [/\b(classic|full|big|bigger|large|duz\w*|wiekszy|wieksza|pelny|pelna|klasyczn\w*)\b/, { template: 'classic' }, 'classic'],
    // themes
    [/\b(midnight|navy|deep|night|noc\w*|nocn\w*|polnoc\w*)\b/, { theme: 'midnight' }, 'midnight theme'],
    [/(?<!(no|top|side) )\b(light|white|bright|jasn\w*|bial\w*)\b(?! (glow|edge|light))/, { theme: 'light', bgColors: null }, 'light theme'],
    [/\b(dark|ciemn\w*)\b/, { theme: 'dark' }, 'dark theme'],
    [/\b(black|czarn\w*|pitch black|oled)\b/, { theme: 'dark', bgColors: ['#050505', '#121212'] }, 'black background'],
    // backgrounds
    [/\b(solid|flat|plain|jednolit\w*|plask\w*|gladk\w*)\b/, { bg: 'solid' }, 'solid background'],
    [/\b(gradient\w*|przejsci\w*|ombre)\b/, { bg: 'gradient' }, 'gradient'],
    [/\b(mesh|blobs?|soft colou?rs?|plam\w*)\b/, { bg: 'mesh' }, 'mesh'],
    [/\b(aurora|nebula|zorz\w*|mglawic\w*|fale|falami)\b/, { bg: 'aurora' }, 'aurora'],
    [/\b(grid|siatk\w*|kratk\w*|lines|linie|liniami|squares)\b/, { bg: 'grid' }, 'grid'],
    [/\b(dots|dotted|kropk\w*|polka|kropeczk\w*|groszk\w*)\b/, { bg: 'dots' }, 'dots'],
    [/\b(stripes|striped|diagonal|pask\w*|prazk\w*|ukosn\w*)\b/, { bg: 'stripes' }, 'stripes'],
    // lights
    [/\b(glow|glowing|swiec\w*|poswiat\w*|blask\w*|lsni\w*|shiny|shine|blyszcz\w*)\b/, { glow: 85 }, 'strong glow'],
    [/\b(spotlight|reflektor\w*)\b/, { light: 'spotlight' }, 'spotlight'],
    [/\btop light\b|\bz gory\b|\bod gory\b/, { light: 'top' }, 'top light'],
    [/\bside light\b|\bz boku\b|\bod boku\b|\bz lewej\b/, { light: 'left' }, 'side light'],
    [/\bcorner( glow| light)?\b|\bw rogu\b|\bz rogu\b/, { light: 'corner' }, 'corner glow'],
    [/\b(neon edge|edge glow|glowing border|swiecac\w* ramk\w*|neonow\w* ramk\w*)\b/, { light: 'neon' }, 'neon edge'],
    [/\b(no glow|no light|unlit|matte|matow\w*|bez swiatla|bez poswiaty|bez blasku)\b/, { light: 'none' }, 'no lighting'],
    [/\b(subtle|soft|delikatn\w*|subteln\w*|lekk\w*)\b/, { glow: 35 }, 'subtle light'],
    [/\b(bold|intense|vivid|strong|mocn\w*|intensywn\w*|jaskraw\w*|wyrazist\w*)\b/, { glow: 95 }, 'intense light'],
    // fonts & shape
    [/\b(mono|monospace|code|coder|coding|programmer|developer|dev|kod\w*|programist\w*|maszynow\w*)\b/, { font: 'mono' }, 'mono font'],
    [/\b(serif|book|ksiazk\w*|szeryf\w*)\b/, { font: 'serif' }, 'serif font'],
    [/\b(sans|bezszeryf\w*)\b/, { font: 'sans' }, 'sans font'],
    [/\b(sharp|square|boxy|angular|ostr\w*|kwadrat\w*|kancias\w*)\b/, { rounded: false }, 'sharp corners'],
    [/\b(rounded|round|zaokragl\w*|okragl\w*|oble|obly)\b/, { rounded: true }, 'rounded corners'],
    [/\b(borderless|no border|bez ramk\w*|bez obramowani\w*)\b/, { border: false }, 'no border'],
    [/\b(with border|z ramk\w*|obramowan\w*|outline)\b/, { border: true }, 'border'],
  ];

  // Element names (accent-free). Order matters a little: specific stats before generic ones.
  const ELEMENT_WORDS = {
    avatar: /\b(avatars?|awatar\w*|logo|profile pic\w*|zdjeci\w*)\b/,
    description: /\b(description|desc|opis\w*)\b/,
    meta: /\b(meta|license|licencj\w*)\b/,
    grade: /\b(grade|rank\w*|ocen\w*|score|wynik\w*)\b/,
    stars: /\b(stars?|gwiazd\w*)\b/,
    forks: /\b(forks?|fork\w*)\b/,
    commits: /\b(total commits|commit count|commits|commity|commitow|commitami)\b/,
    contribCount: /\b(contributor count|number of contributors|liczb\w* kontrybutor\w*)\b/,
    age: /\b(age|wiek\w*)\b/,
    velocity: /\b(stars per day|velocity|gwiazd\w* dzienn\w*|tempo)\b/,
    watchers: /\b(watchers?|obserwuj\w*)\b/,
    issues: /\b(issues?|zgloszen\w*|bled\w*|bug\w*)\b/,
    lastPush: /\b(last push|last commit|ostatni\w* (push|commit|aktualizacj)\w*|updated)\b/,
    release: /\b(releases?|wydani\w*|wersj\w*|version)\b/,
    size: /\b(size|rozmiar\w*|wielkosc\w*)\b/,
    busiestDay: /\b(busiest day|weekday|dzien tygodnia|najaktywniejsz\w* dzien)\b/,
    forkRate: /\b(fork rate|forks per)\b/,
    busFactor: /\b(bus factor)\b/,
    languages: /\b(languages?|langs?|jezyk\w*|technolog\w*)\b/,
    activity: /\b(activity|sparkline|chart|graph|aktywnos\w*|wykres\w*)\b/,
    milestone: /\b(milestones?|progress|prog|progu|cel|celu|postep\w*|kamien\w* milow\w*|milow\w*)\b/,
    health: /\b(health|checks?|zdrowi\w*|kondycj\w*)\b/,
    contributors: /\b(contributors?|people|team|kontrybutor\w*|autor\w*|ludzi\w*|zespol\w*)\b/,
    topics: /\b(topics?|tags?|tagi|tagami|temat\w*)\b/,
    footer: /\b(footer|stopk\w*)\b/,
  };
  const ELEMENT_LABEL = key => (ELEMENTS.find(e => e.key === key) || { label: key }).label.toLowerCase();

  // Words that are never typo-corrected (so "like" never becomes "lime").
  const STOP = new Set(('the and with without for from that this have want make more less very really please just only also some card look style '
    + 'like nice cool kind sort mode feel vibe color colour colors colours font theme background light lights border corner corners show hide '
    + 'chce chcialbym zrob zrobic niech bedzie jakis jakas taki taka troche bardzo karta karte karty styl stylu kolor kolory kolorze kolorami '
    + 'start there these where other about would could great thing think good fine call pick stuff tlo tlem tla czcionka czcionke ramka ramke dodaj pokaz ukryj usun bez oraz albo ladny ladna fajny fajna').split(' '));

  function levenshtein(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  }

  // Single words the typo fixer can snap to.
  const VOCAB = [...new Set([
    ...Object.keys(MOODS), ...Object.keys(COLOR_WORDS),
    'compact', 'banner', 'minimal', 'classic', 'midnight', 'light', 'dark', 'solid', 'gradient', 'aurora', 'stripes', 'spotlight',
    'glowing', 'monospace', 'serif', 'rounded', 'sharp', 'borderless', 'avatar', 'description', 'languages', 'activity',
    'contributors', 'topics', 'footer', 'milestone', 'health', 'stars', 'forks', 'commits', 'watchers', 'release',
    'kropki', 'paski', 'siatka', 'zorza', 'gwiazdki', 'jezyki', 'opis', 'awatar', 'kontrybutorzy', 'aktywnosc',
  ])].filter(w => w.length >= 4);

  const known = w => VOCAB.includes(w) || COLOR_STEMS.some(([st]) => w.startsWith(st))
    || MOOD_ALIASES.some(([re]) => re.test(` ${w} `)) || WORDS.some(([re]) => re.test(` ${w} `))
    || Object.values(ELEMENT_WORDS).some(re => re.test(` ${w} `));
  const swapped = (a, b) => a.length === b.length && [...a].some((_, i) => i < a.length - 1
    && a.slice(0, i) + a[i + 1] + a[i] + a.slice(i + 2) === b);

  function fixTypos(s, notes) {
    return s.replace(/[a-z]{4,}/g, w => {
      if (STOP.has(w) || known(w)) return w;
      if (w.length === 4) {
        const v = VOCAB.find(x => swapped(w, x));
        if (v) notes.push(`${w} → ${v}`);
        return v || w;
      }
      const max = w.length >= 8 ? 2 : 1;
      let best = null, bestD = max + 1;
      for (const v of VOCAB) {
        if (v[0] !== w[0]) continue;
        const d = levenshtein(w, v);
        if (d < bestD) { best = v; bestD = d; }
      }
      if (best) { notes.push(`${w} → ${best}`); return best; }
      return w;
    });
  }

  function hslHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  function hashText(t) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /** A complete, good-looking style generated from any text (same text → same look). */
  function styleFromSeed(seed) {
    const pick = (list, shift) => list[(seed >>> shift) % list.length];
    const hue = seed % 360;
    const theme = pick(['dark', 'midnight', 'dark', 'light'], 3);
    return {
      theme,
      accent: hslHex(hue, 80, theme === 'light' ? 50 : 62),
      accent2: hslHex((hue + pick([40, 60, 150, 200, 300], 7)) % 360, 78, theme === 'light' ? 52 : 64),
      bg: pick(['gradient', 'mesh', 'aurora', 'grid', 'dots', 'stripes'], 11),
      light: pick(['corner', 'top', 'left', 'spotlight', 'neon'], 15),
      glow: 45 + ((seed >>> 19) % 50),
      font: pick(['sans', 'sans', 'mono', 'serif'], 23),
      bgColors: null,
    };
  }

  /**
   * Parse a style description. Never fails: returns
   * { changes, show, hide, only, showAll, fewer, reset, understood, fixes, generated }.
   */
  function parseStyle(text) {
    const original = String(text || '').trim();
    let raw = original;
    for (const [emo, word] of EMOJI) raw = raw.split(emo).join(` ${word} `);
    const fixes = [];
    let s = ` ${fixTypos(fold(raw).replace(/[^a-z0-9#&%\s,.;:!?'"-]/g, ' ').replace(/\s+/g, ' '), fixes)} `;
    const changes = {};
    const understood = [];
    const show = [];
    const hide = [];
    let only = null, showAll = false, fewer = false, reset = false, m;

    // Title in quotes or after "title:" — taken from the original text so accents stay.
    const t = original.match(/["„“”«»]([^"„“”«»]{1,60})["„“”«»]/)
      || original.match(/(?:title|tytuł|tytul|napis|nazwa|name)\s*[:=-]\s*([^,;\n]{1,60})/i);
    if (t && t[1].trim()) {
      changes.title = t[1].trim();
      understood.push(`title “${changes.title}”`);
      s = s.replace(fold(t[0]).replace(/[^a-z0-9#&%\s,.;:!?'"-]/g, ' '), ' ');
    }

    if (/\b(reset|domysln\w*|od nowa|start over|default)\b/.test(s)) { reset = true; understood.push('start from default'); }
    if (/\b(random|losow\w*|surprise( me)?|zaskocz\w*|cokolwiek|anything|whatever)\b/.test(s)) {
      Object.assign(changes, styleFromSeed(Math.floor(Math.random() * 2 ** 32)));
      understood.push('random look');
    }

    // Moods (canonical names and aliases), applied in the order they appear.
    const moodHits = [];
    for (const mood of Object.keys(MOODS)) {
      const i = s.search(new RegExp(`\\b${mood}\\b`));
      if (i >= 0) moodHits.push([i, mood]);
    }
    for (const [re, mood] of MOOD_ALIASES) {
      const i = s.search(re);
      if (i >= 0 && !moodHits.some(h => h[1] === mood)) moodHits.push([i, mood]);
    }
    moodHits.sort((a, b) => a[0] - b[0]).forEach(([, mood]) => {
      Object.assign(changes, MOODS[mood]);
      understood.push(`${mood} mood`);
    });

    // Colours, with optional "dark"/"light" in front ("dark blue", "jasnoróżowy", "ciemno zielony").
    const colors = [];
    const tokens = s.trim().split(/[\s,.;:!?]+/);
    const shadeUsed = []; // [phrase, replacement]
    tokens.forEach((tok, i) => {
      let w = tok, shade = 0;
      const pre = w.match(/^(ciemno|jasno)-?(.+)$/);
      if (pre) { shade = pre[1] === 'ciemno' ? -1 : 1; w = pre[2]; shadeUsed.push([tok, w]); }
      let hex = null;
      if (/^#[0-9a-f]{6}$/.test(w)) hex = w.toUpperCase();
      else if (/^#[0-9a-f]{3}$/.test(w)) hex = `#${w.slice(1).split('').map(c => c + c).join('')}`.toUpperCase();
      else if (COLOR_WORDS[w]) hex = COLOR_WORDS[w];
      else if (COLOR_WORDS[w.replace(/(ish|y)$/, '')]) hex = COLOR_WORDS[w.replace(/(ish|y)$/, '')];
      else { const st = COLOR_STEMS.find(([stem]) => w.startsWith(stem)); if (st) hex = st[1]; }
      if (!hex) return;
      const prev = tokens[i - 1] || '';
      if (!shade && DARKER.test(prev)) { shade = -1; shadeUsed.push([`${prev} ${tok}`, tok]); }
      if (!shade && LIGHTER.test(prev)) { shade = 1; shadeUsed.push([`${prev} ${tok}`, tok]); }
      if (shade < 0) hex = mix(hex, '#000000', 0.35);
      if (shade > 0) hex = mix(hex, '#FFFFFF', 0.4);
      colors.push(hex.toUpperCase());
    });
    // "dark blue" is a colour, not a request for the dark theme.
    shadeUsed.forEach(([phrase, repl]) => { s = s.replace(phrase, repl); });

    for (const [re, change, label] of WORDS) {
      if (re.test(s)) {
        Object.assign(changes, change);
        if (!understood.includes(`${label} mood`)) understood.push(label);
      }
    }

    if (colors[0]) { changes.accent = colors[0]; understood.push(`accent ${colors[0]}`); }
    if (colors[1]) { changes.accent2 = colors[1]; understood.push(`second color ${colors[1]}`); }
    else if (colors[0] && !moodHits.length) changes.accent2 = '';

    // Glow strength as a number: "glow 40", "40% glow", "poświata 70".
    const g = s.match(/\b(\d{1,3}) ?%? ?(glow|light|swiatl\w*|poswiat\w*|blask\w*)\b/) || s.match(/\b(glow|swiatl\w*|poswiat\w*|blask\w*) ?(\d{1,3})\b/);
    if (g) {
      const v = Math.min(100, Number(g[1]) || Number(g[2]));
      if (!Number.isNaN(v)) {
        changes.glow = v;
        const i = understood.indexOf('strong glow');
        if (i >= 0) understood.splice(i, 1);
        understood.push(`glow ${v}%`);
      }
    }

    // Elements: "no avatar", "bez opisu", "only stars and forks", "show health", or just naming them.
    const matchEls = phrase => Object.entries(ELEMENT_WORDS).filter(([, re]) => re.test(` ${phrase} `)).map(([k]) => k);
    const neg = /\b(no|without|hide|remove|bez|ukryj\w*|usun\w*|schowaj\w*|wywal\w*)\s+([a-z ]{2,60}?)(?=,|\.|;|\b(?:but|with|show|add|ale|z|dodaj|pokaz)\b|$)/g;
    while ((m = neg.exec(s))) matchEls(m[2]).forEach(k => { if (!hide.includes(k)) { hide.push(k); understood.push(`hide ${ELEMENT_LABEL(k)}`); } });
    const onlyM = s.match(/\b(only|just|tylko|jedynie|wylacznie)\s+([a-z ]{2,80}?)(?=,|\.|;|$)/);
    if (onlyM) {
      const els = matchEls(onlyM[2]);
      if (els.length) { only = els; understood.push(`only ${els.map(ELEMENT_LABEL).join(', ')}`); }
    }
    if (!only) {
      Object.entries(ELEMENT_WORDS).forEach(([k, re]) => {
        if (re.test(s) && !hide.includes(k) && !show.includes(k)) { show.push(k); understood.push(`show ${ELEMENT_LABEL(k)}`); }
      });
    }
    if (/\b(everything|all (stats|elements|the things)|wszystk\w*|max\w*|more stats|wiecej)\b/.test(s)) { showAll = true; understood.push('show everything'); }
    if (/\b(less|fewer|mniej|less stuff|ograniczon\w*|essentials?|najwazniejsz\w*)\b/.test(s)) { fewer = true; understood.push('fewer elements'); }

    // Nothing recognised: build a unique look from the words themselves.
    let generated = false;
    if (!understood.length && original) {
      Object.assign(changes, styleFromSeed(hashText(fold(original))));
      generated = true;
      understood.push('unique look made from your words');
    }

    return { changes, show, hide, only, showAll, fewer, reset, understood: [...new Set(understood)], fixes, generated };
  }

  const FEWER = ['avatar', 'description', 'stars', 'forks', 'languages', 'footer'];

  function applyStyle(o, parsed) {
    const base = parsed.reset ? defaultOptions() : o;
    const next = { ...base, show: new Set(base.show) };
    const c = { ...parsed.changes };
    if (c.bgColors === undefined && (c.theme || c.bg)) next.bgColors = null;
    Object.assign(next, c);
    if (parsed.showAll) ELEMENTS.forEach(e => next.show.add(e.key));
    if (parsed.fewer) next.show = new Set(FEWER);
    if (parsed.only) next.show = new Set(parsed.only);
    parsed.show.forEach(k => next.show.add(k));
    parsed.hide.forEach(k => next.show.delete(k));
    return next;
  }

  const STYLE_PRESETS = ['Cyberpunk', 'Synthwave', 'Terminal', 'Ocean', 'Sunset', 'Forest', 'Luxury', 'Pastel', 'Paper', 'Blueprint', 'Minimal', 'Galaxy'];

  /* =========================================================
     Images & exports
     ========================================================= */
  const imageCache = new Map();
  async function toDataUri(url) {
    if (imageCache.has(url)) return imageCache.get(url);
    const p = fetch(url)
      .then(res => (res.ok ? res.blob() : Promise.reject(new Error('img'))))
      .then(blob => new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      }))
      .catch(() => null);
    imageCache.set(url, p);
    return p;
  }

  /** Inline the owner avatar and contributor avatars as data URIs. */
  async function inlineImages(card) {
    const sized = (u, s) => `${u}${u.includes('?') ? '&' : '?'}s=${s}`;
    const urls = [card.repo.avatar, ...card.contributors.slice(0, 12).map(c => c.avatar)].filter(Boolean);
    const map = new Map();
    await Promise.all(urls.map(async u => {
      const data = await toDataUri(sized(u, 96));
      if (data) map.set(u, data);
    }));
    return map;
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function downloadSvg(svg, name) {
    download(`${name}.svg`, new Blob([svg], { type: 'image/svg+xml' }));
  }

  function downloadPng(svg, width, height, name, scale = 2) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('PNG export failed'));
          download(`${name}.png`, blob);
          resolve();
        }, 'image/png');
      };
      image.onerror = () => reject(new Error('PNG export failed'));
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
  }

  return {
    ELEMENTS, THEMES, ACCENTS, TEMPLATES, BACKGROUNDS, LIGHTS, FONTS, TEMPLATE_SUPPORT, STYLE_PRESETS,
    defaultOptions, optionsToParams, optionsFromParams, parseStyle, applyStyle,
    render, inlineImages, downloadSvg, downloadPng, shiftHue,
  };
})();
