/* ============================================================
   Repolysis — Repo card: customizable stats card rendered as SVG
   (the same SVG is shown on the page, downloaded, and rasterized to PNG)

   Pieces:
   - TEMPLATES   layouts (classic, compact, banner, minimal, badge)
   - BACKGROUNDS surface patterns (gradient, mesh, aurora, grid…)
   - LIGHTS      lighting (corner glow, spotlight, neon edge…)
   - ELEMENTS    toggleable content
   - PRESETS     one-click looks
   - CHOICES     small style switches (tiles, chart, borders, animation…)
   ============================================================ */
'use strict';

const Widget = (() => {
  const DAY = 86400000;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const FONTS = {
    sans: { label: 'Sans', family: "'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" },
    mono: { label: 'Mono', family: "'JetBrains Mono', 'Cascadia Code', Consolas, 'SF Mono', Menlo, monospace" },
    serif: { label: 'Serif', family: "Georgia, Cambria, 'Times New Roman', serif" },
    rounded: { label: 'Rounded', family: "'Nunito', 'Varela Round', ui-rounded, 'Arial Rounded MT Bold', 'Segoe UI', sans-serif" },
    condensed: { label: 'Condensed', family: "'Roboto Condensed', 'Arial Narrow', 'Segoe UI', Arial, sans-serif" },
  };
  const MONO = FONTS.mono.family;

  const THEMES = {
    dark:     { label: 'Dark',     bg1: '#1e1f22', bg2: '#2b2d31', text: '#f2f3f5', muted: '#949ba4', tile: '#ffffff', tileOp: 0.035, tileStroke: '#ffffff', tileStrokeOp: 0.07, border: '#ffffff', borderOp: 0.1, track: '#ffffff', trackOp: 0.08, glowOp: 0.22, isLight: false },
    midnight: { label: 'Midnight', bg1: '#090b18', bg2: '#171b3a', text: '#e8eaff', muted: '#8b91bd', tile: '#8c96ff', tileOp: 0.06,  tileStroke: '#8c96ff', tileStrokeOp: 0.14, border: '#8c96ff', borderOp: 0.22, track: '#8c96ff', trackOp: 0.14, glowOp: 0.3, isLight: false },
    oled:     { label: 'OLED',     bg1: '#000000', bg2: '#0b0b0d', text: '#f5f5f5', muted: '#8a8a8f', tile: '#ffffff', tileOp: 0.04,  tileStroke: '#ffffff', tileStrokeOp: 0.09, border: '#ffffff', borderOp: 0.12, track: '#ffffff', trackOp: 0.09, glowOp: 0.26, isLight: false },
    slate:    { label: 'Slate',    bg1: '#0f172a', bg2: '#1e293b', text: '#e2e8f0', muted: '#94a3b8', tile: '#94a3b8', tileOp: 0.07,  tileStroke: '#94a3b8', tileStrokeOp: 0.14, border: '#94a3b8', borderOp: 0.2,  track: '#94a3b8', trackOp: 0.14, glowOp: 0.26, isLight: false },
    plum:     { label: 'Plum',     bg1: '#1a0f1f', bg2: '#2d1736', text: '#f6e9ff', muted: '#b39bc2', tile: '#e0b3ff', tileOp: 0.06,  tileStroke: '#e0b3ff', tileStrokeOp: 0.14, border: '#e0b3ff', borderOp: 0.22, track: '#e0b3ff', trackOp: 0.14, glowOp: 0.3, isLight: false },
    light:    { label: 'Light',    bg1: '#ffffff', bg2: '#f2f3f5', text: '#1e1f22', muted: '#5c5e66', tile: '#1e1f22', tileOp: 0.035, tileStroke: '#1e1f22', tileStrokeOp: 0.08, border: '#1e1f22', borderOp: 0.12, track: '#1e1f22', trackOp: 0.08, glowOp: 0.14, isLight: true },
    cream:    { label: 'Cream',    bg1: '#fbf7ef', bg2: '#f1e8d6', text: '#2b2118', muted: '#7a6a58', tile: '#2b2118', tileOp: 0.04,  tileStroke: '#2b2118', tileStrokeOp: 0.1,  border: '#2b2118', borderOp: 0.14, track: '#2b2118', trackOp: 0.08, glowOp: 0.14, isLight: true },
  };

  const ACCENTS = [
    { name: 'Blurple', hex: '#5865F2' },
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Violet', hex: '#9B84EE' },
    { name: 'Fuchsia', hex: '#EB459E' },
    { name: 'Rose', hex: '#F43F5E' },
    { name: 'Red', hex: '#ED4245' },
    { name: 'Orange', hex: '#F0B232' },
    { name: 'Gold', hex: '#E9B949' },
    { name: 'Yellow', hex: '#FEE75C' },
    { name: 'Lime', hex: '#A3E635' },
    { name: 'Green', hex: '#57F287' },
    { name: 'Teal', hex: '#14B8A6' },
    { name: 'Cyan', hex: '#00A8FC' },
    { name: 'Sky', hex: '#38BDF8' },
    { name: 'White', hex: '#F2F3F5' },
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
    { key: 'waves',    label: 'Waves' },
    { key: 'hex',      label: 'Hexagons' },
    { key: 'stars',    label: 'Stars' },
    { key: 'rings',    label: 'Rings' },
    { key: 'noise',    label: 'Grain' },
  ];

  const LIGHTS = [
    { key: 'corner',    label: 'Corner glow' },
    { key: 'top',       label: 'Top light' },
    { key: 'bottom',    label: 'Bottom light' },
    { key: 'left',      label: 'Side light' },
    { key: 'dual',      label: 'Two corners' },
    { key: 'center',    label: 'Center glow' },
    { key: 'spotlight', label: 'Spotlight' },
    { key: 'neon',      label: 'Neon edge' },
    { key: 'none',      label: 'None' },
  ];

  // Small style switches. The first value of each is the default.
  const CHOICES = {
    bgDir:       [['diagonal', 'Diagonal'], ['vertical', 'Vertical'], ['horizontal', 'Horizontal'], ['radial', 'Radial']],
    border:      [['subtle', 'Subtle'], ['accent', 'Accent'], ['gradient', 'Gradient'], ['none', 'None']],
    tiles:       [['filled', 'Filled'], ['outline', 'Outline'], ['accent', 'Tinted'], ['plain', 'Plain']],
    cols:        [['auto', 'Auto'], ['2', '2'], ['3', '3'], ['4', '4']],
    chart:       [['area', 'Area'], ['line', 'Line'], ['bars', 'Bars'], ['dots', 'Dots']],
    langStyle:   [['bar', 'Bar'], ['thick', 'Thick bar'], ['pills', 'Pills']],
    avatarShape: [['auto', 'Auto'], ['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']],
    descLines:   [['auto', 'Auto'], ['1', '1 line'], ['2', '2 lines'], ['3', '3 lines']],
    numbers:     [['compact', '12.3k'], ['full', '12,345']],
    anim:        [['none', 'None'], ['shimmer', 'Shimmer'], ['pulse', 'Pulse'], ['draw', 'Draw chart']],
  };
  // URL parameter name for each choice.
  const CHOICE_PARAM = { bgDir: 'dir', border: 'border', tiles: 'tiles', cols: 'cols', chart: 'chart', langStyle: 'langs', avatarShape: 'avatar', descLines: 'desc', numbers: 'numbers', anim: 'anim' };

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
    const o = {
      show: new Set(ELEMENTS.filter(e => e.def).map(e => e.key)),
      template: 'classic',
      accent: ACCENTS[0].hex,
      accent2: '',          // '' = derived from accent
      theme: 'dark',
      bg: 'gradient',
      pattern: 50,          // background pattern strength 0–100
      light: 'corner',
      glow: 60,             // 0–100
      bgColors: null,       // [c1, c2] overrides the theme background
      font: 'sans',
      radius: 16,           // corner radius in px
      strip: true,          // accent strip along the top edge
      icons: false,         // icons inside stat tiles
      brand: true,          // "Repolysis" credit in the footer
      title: '',
    };
    for (const [k, list] of Object.entries(CHOICES)) o[k] = list[0][0];
    return o;
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
    if (o.pattern !== def.pattern) params.set('pat', String(o.pattern));
    if (o.light !== def.light) params.set('light', o.light);
    if (o.glow !== def.glow) params.set('glow', String(o.glow));
    if (o.bgColors) params.set('bgc', o.bgColors.map(c => c.replace('#', '')).join('-'));
    if (o.font !== def.font) params.set('font', o.font);
    if (o.radius !== def.radius) params.set('radius', String(o.radius));
    if (!o.strip) params.set('nostrip', '1');
    if (o.icons) params.set('icons', '1');
    if (!o.brand) params.set('nobrand', '1');
    for (const k of Object.keys(CHOICES)) if (o[k] !== def[k]) params.set(CHOICE_PARAM[k], o[k]);
    if (o.title) params.set('title', o.title);
  }
  function optionsFromParams(params) {
    const o = defaultOptions();
    const num = (name, min, max) => {
      const v = Number(params.get(name));
      return params.has(name) && Number.isFinite(v) && v >= min && v <= max ? v : null;
    };
    const show = params.get('show');
    if (show) o.show = new Set(show === 'none' ? [] : show.split(',').filter(k => ELEMENTS.some(e => e.key === k)));
    if (TEMPLATES.some(t => t.key === params.get('tpl'))) o.template = params.get('tpl');
    if (hex6.test(params.get('accent') || '')) o.accent = `#${params.get('accent')}`;
    if (hex6.test(params.get('accent2') || '')) o.accent2 = `#${params.get('accent2')}`;
    if (THEMES[params.get('theme')]) o.theme = params.get('theme');
    if (BACKGROUNDS.some(b => b.key === params.get('bg'))) o.bg = params.get('bg');
    if (num('pat', 0, 100) !== null) o.pattern = num('pat', 0, 100);
    if (LIGHTS.some(l => l.key === params.get('light'))) o.light = params.get('light');
    if (num('glow', 0, 100) !== null) o.glow = num('glow', 0, 100);
    const bgc = (params.get('bgc') || '').split('-');
    if (bgc.length === 2 && bgc.every(c => hex6.test(c))) o.bgColors = bgc.map(c => `#${c}`);
    if (FONTS[params.get('font')]) o.font = params.get('font');
    if (params.get('square') === '1') o.radius = 4;          // older links
    if (num('radius', 0, 28) !== null) o.radius = num('radius', 0, 28);
    if (params.get('noborder') === '1') o.border = 'none';  // older links
    if (params.get('nostrip') === '1') o.strip = false;
    if (params.get('icons') === '1') o.icons = true;
    if (params.get('nobrand') === '1') o.brand = false;
    for (const [k, list] of Object.entries(CHOICES)) {
      const v = params.get(CHOICE_PARAM[k]);
      if (list.some(([key]) => key === v)) o[k] = v;
    }
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
  let fullNumbers = false; // set by render() from options.numbers
  const num = v => (!fullNumbers && v >= 10000 ? cf.format(v) : nf.format(v));
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

  /** Corner radius for an avatar of size s, following the avatar shape option. */
  function avatarRx(P, s, square) {
    switch (P.o.avatarShape) {
      case 'circle': return s / 2;
      case 'rounded': return s * 0.24;
      case 'square': return s * 0.06;
      default: return square ? s * 0.22 : s / 2;
    }
  }

  function drawAvatar(P, x, y, s, url, ring, square) {
    const id = P.uid('av');
    const rx = avatarRx(P, s, square);
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
    if (P.o.descLines !== 'auto') lines = Number(P.o.descLines) || lines;
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
    const { t, o } = P;
    const want = o.cols !== 'auto' ? Number(o.cols) : 0;
    const cols = Math.min(tiles.length, want || s.cols || (tiles.length === 4 ? 2 : Math.min(3, tiles.length)));
    const gap = s.gap || 10;
    const tw = (w - gap * (cols - 1)) / cols;
    const rx = Math.round((s.rx || 10) * Math.min(o.radius, 24) / 16);
    const style = o.tiles;
    const bar = style !== 'plain';
    tiles.forEach(([label, value, ico], i) => {
      const cx = x + (i % cols) * (tw + gap);
      const cy = y + Math.floor(i / cols) * (s.h + gap);
      const box = `x="${cx.toFixed(1)}" y="${cy}" width="${tw.toFixed(1)}" height="${s.h}" rx="${rx}"`;
      if (style === 'filled') P.parts.push(`<rect ${box} fill="${t.tile}" fill-opacity="${t.tileOp}" stroke="${t.tileStroke}" stroke-opacity="${t.tileStrokeOp}"/>`);
      else if (style === 'outline') P.parts.push(`<rect ${box} fill="none" stroke="${P.A}" stroke-opacity="0.45"/>`);
      else if (style === 'accent') P.parts.push(`<rect ${box} fill="${P.A}" fill-opacity="${t.isLight ? 0.09 : 0.12}" stroke="${P.A}" stroke-opacity="0.25"/>`);
      else if (i % cols) P.parts.push(`<rect x="${(cx - gap / 2).toFixed(1)}" y="${cy + s.h * 0.2}" width="1" height="${s.h * 0.6}" fill="${t.track}" fill-opacity="${t.trackOp * 2}"/>`);
      const tx = bar ? cx + 14 : cx + (i % cols ? 6 : 0);
      if (bar) P.parts.push(`<rect x="${cx.toFixed(1)}" y="${cy + s.h * 0.27}" width="3" height="${s.h * 0.46}" rx="1.5" fill="${P.A}"/>`);
      P.text(tx, cy + s.h * 0.4, label.toUpperCase(), { size: s.label, weight: 600, ls: 0.6, fill: t.muted });
      P.text(tx, cy + s.h * 0.77, fit(value, tw - (tx - cx) - 8 - (o.icons ? 18 : 0), s.value, 700, MONO), { size: s.value, weight: 700, family: MONO });
      if (o.icons && ico) P.text(cx + tw - 10, cy + s.h * 0.77, ico, { anchor: 'end', size: s.value * 0.95, weight: 700, fill: P.accentText, opacity: 0.85 });
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
    const pills = P.o.langStyle === 'pills';
    if (!pills) {
      const h = P.o.langStyle === 'thick' ? Math.max(14, (s.barH || 8) * 1.75) : (s.barH || 8);
      const id = P.uid('lang');
      P.defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, P.o.radius / 2 + 2)}"/></clipPath>`);
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
    } else {
      y += 14;
    }
    const max = s.legendMax || 6;
    const rowH = pills ? 28 : 19;
    let lx = x, ly = y;
    d.langs.slice(0, max).forEach((l, i) => {
      const pct = l.pct < 0.1 ? '<0.1' : l.pct.toFixed(1);
      const lw = measure(`${l.name} ${pct}%`, 12, 400, P.F) + (pills ? 34 : 26);
      if (lx + lw > x + w && lx > x) { lx = x; ly += rowH; }
      const c = langColor(l.name, i);
      if (pills) P.parts.push(`<rect x="${lx}" y="${ly - 15}" width="${lw - 8}" height="22" rx="${Math.min(11, P.o.radius / 2 + 3)}" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-opacity="0.35"/>`);
      const ox = pills ? 9 : 0;
      P.parts.push(`<circle cx="${lx + 5 + ox}" cy="${ly - 4}" r="4.5" fill="${c}"/>`);
      P.parts.push(`<text x="${lx + 15 + ox}" y="${ly}" font-family="${P.F}" font-size="12" fill="${t.text}">${xml(l.name)} <tspan fill="${t.muted}">${xml(pct)}%</tspan></text>`);
      lx += lw;
    });
    return ly + (pills ? 22 : 18);
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
    P.defs.push(`<linearGradient id="${lid}" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${x + w}" y2="0"><stop offset="0" stop-color="${P.A}"/><stop offset="1" stop-color="${P.A2}"/></linearGradient>`);
    P.parts.push(`<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${t.track}" stroke-opacity="${t.trackOp * 1.5}"/>`);
    const animate = P.o.anim === 'draw';
    let style = P.o.chart;
    if (style === 'area' && s.fill === false) style = 'line';
    const peak = d.weeks.indexOf(max);

    if (style === 'bars' || style === 'dots') {
      const slot = w / d.weeks.length;
      const items = d.weeks.map((v, i) => {
        const cx = x + i * slot + slot / 2;
        const f = v / max;
        if (style === 'bars') {
          const bh = Math.max(v ? 2 : 1, f * (h - 2));
          const grow = animate ? `<animate attributeName="height" from="0" to="${bh.toFixed(1)}" dur="1.2s" begin="${(i * 0.015).toFixed(3)}s" fill="freeze"/><animate attributeName="y" from="${y + h}" to="${(y + h - bh).toFixed(1)}" dur="1.2s" begin="${(i * 0.015).toFixed(3)}s" fill="freeze"/>` : '';
          return `<rect x="${(cx - slot * 0.32).toFixed(1)}" y="${(y + h - bh).toFixed(1)}" width="${(slot * 0.64).toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(1.5, slot * 0.3).toFixed(1)}" fill="url(#${lid})" fill-opacity="${v ? 0.55 + f * 0.45 : 0.25}">${grow}</rect>`;
        }
        const r = 1.3 + f * 2.6;
        const fade = animate ? `<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${(i * 0.02).toFixed(3)}s" fill="freeze"/>` : '';
        return `<circle cx="${cx.toFixed(1)}" cy="${(y + h - f * (h - 6) - 3).toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${lid})" fill-opacity="${v ? 0.45 + f * 0.55 : 0.2}"${animate ? ' opacity="0"' : ''}>${fade}</circle>`;
      });
      P.parts.push(`<g>${items.join('')}</g>`);
      return y + h + 16;
    }

    const draw = animate ? ' pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"' : '';
    const drawAnim = animate ? '<animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.8s" fill="freeze"/>' : '';
    if (style === 'area') {
      P.parts.push(`<path d="${path} L${x + w},${y + h} L${x},${y + h} Z" fill="url(#${gid})"${animate ? ' opacity="0"' : ''}>${animate ? '<animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="1.2s" fill="freeze"/>' : ''}</path>`);
    }
    P.parts.push(`<path d="${path}" fill="none" stroke="url(#${lid})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${draw}>${drawAnim}</path>`);
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
      const crx = avatarRx(P, sz, false);
      P.defs.push(`<clipPath id="${id}"><rect x="${cx}" y="${y}" width="${sz}" height="${sz}" rx="${crx}"/></clipPath>`);
      P.parts.push(`<rect x="${cx - 1.5}" y="${y - 1.5}" width="${sz + 3}" height="${sz + 3}" rx="${crx + 1.5}" fill="${i === 0 ? P.A : t.track}" fill-opacity="${i === 0 ? 1 : t.trackOp * 2}"/>`);
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
    P.text(x, y, fit(left, w - (P.o.brand ? 110 : 0), 11.5, 400, P.F), { size: 11.5, fill: t.muted });
    if (P.o.brand) {
      P.parts.push(`<circle cx="${(x + w - measure('Repolysis', 11.5, 700, P.F) - 9).toFixed(1)}" cy="${y - 4}" r="3.5" fill="${P.A}"/>`);
      P.parts.push(`<text x="${x + w}" y="${y}" text-anchor="end" font-family="${P.F}" font-size="11.5" font-weight="700" fill="${t.text}">Repo<tspan fill="${P.accentText}">lysis</tspan></text>`);
    }
    return y + 8;
  }

  /* =========================================================
     Background & lighting
     ========================================================= */
  /** Small deterministic random generator, so a repo's star field never jumps between renders. */
  function seeded(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  function background(P, W, H, rx) {
    const { o, t, A, A2 } = P;
    const k = Math.max(0, Math.min(100, o.glow)) / 60;        // light strength, 1 = default
    const pm = Math.max(0, Math.min(100, o.pattern)) / 50;    // pattern strength, 1 = default
    const po = v => Math.min(1, v * pm).toFixed(3);
    const defs = [];
    const layers = [];
    const lights = [];

    // Base fill: two theme colours in the chosen direction.
    const end = o.bg === 'solid' ? t.bg1 : t.bg2;
    if (o.bgDir === 'radial') {
      defs.push(`<radialGradient id="${P.pfx}-bg" cx="0.3" cy="0.2" r="1.1"><stop offset="0" stop-color="${end}"/><stop offset="1" stop-color="${t.bg1}"/></radialGradient>`);
    } else {
      const dir = { diagonal: 'x1="0" y1="0" x2="1" y2="1"', vertical: 'x1="0" y1="0" x2="0" y2="1"', horizontal: 'x1="0" y1="0" x2="1" y2="0"' }[o.bgDir] || 'x1="0" y1="0" x2="1" y2="1"';
      defs.push(`<linearGradient id="${P.pfx}-bg" ${dir}><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${end}"/></linearGradient>`);
    }
    layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-bg)"/>`);

    const ink = t.text;
    const pat = (w, h, body, extra = '') => {
      defs.push(`<pattern id="${P.pfx}-pat" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${extra}>${body}</pattern>`);
      layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-pat)"/>`);
    };
    switch (o.bg) {
      case 'mesh': {
        const blobs = [[0.15, 0.1, A, 0.55], [0.9, 0.25, A2, 0.5], [0.55, 1.05, mix(A, A2, 0.5), 0.45]];
        blobs.forEach(([cx, cy, c, r], i) => {
          defs.push(`<radialGradient id="${P.pfx}-mesh${i}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${c}" stop-opacity="${po(t.isLight ? 0.22 : 0.3)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
          layers.push(`<rect width="${W}" height="${H}" fill="url(#${P.pfx}-mesh${i})"/>`);
        });
        break;
      }
      case 'aurora': {
        defs.push(`<filter id="${P.pfx}-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${Math.max(18, Math.min(W, H) * 0.09)}"/></filter>`);
        defs.push(`<linearGradient id="${P.pfx}-aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${A}"/><stop offset="0.5" stop-color="${A2}"/><stop offset="1" stop-color="${A}"/></linearGradient>`);
        const band = (yy, amp, op) => `<path d="M${-W * 0.1},${yy} C${W * 0.25},${yy - amp} ${W * 0.45},${yy + amp} ${W * 0.7},${yy - amp * 0.4} S${W * 1.05},${yy + amp * 0.6} ${W * 1.1},${yy} L${W * 1.1},${yy + H * 0.16} L${-W * 0.1},${yy + H * 0.16} Z" fill="url(#${P.pfx}-aur)" opacity="${op}"/>`;
        layers.push(`<g filter="url(#${P.pfx}-blur)">${band(H * 0.08, H * 0.12, po(t.isLight ? 0.3 : 0.45))}${band(H * 0.32, H * 0.08, po(t.isLight ? 0.14 : 0.2))}</g>`);
        break;
      }
      case 'grid':
        pat(22, 22, `<path d="M22 0H0V22" fill="none" stroke="${ink}" stroke-opacity="${po(t.isLight ? 0.07 : 0.06)}"/>`);
        defs.push(`<linearGradient id="${P.pfx}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.15"/></linearGradient><mask id="${P.pfx}-mask"><rect width="${W}" height="${H}" fill="url(#${P.pfx}-fade)"/></mask>`);
        layers[layers.length - 1] = layers[layers.length - 1].replace('/>', ` mask="url(#${P.pfx}-mask)"/>`);
        break;
      case 'dots':
        pat(16, 16, `<circle cx="2" cy="2" r="1.1" fill="${ink}" fill-opacity="${po(t.isLight ? 0.13 : 0.1)}"/>`);
        break;
      case 'stripes':
        pat(14, 14, `<rect width="6" height="14" fill="${ink}" fill-opacity="${po(t.isLight ? 0.035 : 0.03)}"/>`, ' patternTransform="rotate(45)"');
        break;
      case 'waves':
        pat(120, 22, `<path d="M0 11 C20 1 40 1 60 11 S100 21 120 11" fill="none" stroke="${A}" stroke-opacity="${po(t.isLight ? 0.16 : 0.13)}" stroke-width="1.4"/>`);
        break;
      case 'hex':
        pat(28, 49, `<path d="M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z" fill="${ink}" fill-opacity="${po(t.isLight ? 0.05 : 0.045)}"/>`);
        break;
      case 'stars': {
        const rnd = seeded(P.card.repo.full);
        const n = Math.round((W * H) / 2600);
        const dots = [];
        for (let i = 0; i < n; i++) {
          const r = rnd() < 0.12 ? 1.3 + rnd() * 0.8 : 0.5 + rnd() * 0.7;
          const c = rnd() < 0.18 ? (rnd() < 0.5 ? A : A2) : ink;
          dots.push(`<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H).toFixed(1)}" r="${r.toFixed(2)}" fill="${c}" fill-opacity="${po((t.isLight ? 0.18 : 0.25) + rnd() * 0.35)}"/>`);
        }
        layers.push(`<g>${dots.join('')}</g>`);
        break;
      }
      case 'rings': {
        const cx = W * 0.92, cy = H * 0.12;
        const rings = [];
        for (let r = 30, i = 0; r < Math.hypot(W, H); r += 26, i++) {
          rings.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="none" stroke="${i % 3 === 0 ? A : ink}" stroke-opacity="${po((i % 3 === 0 ? 0.16 : 0.06) * Math.max(0.25, 1 - r / Math.hypot(W, H)))}"/>`);
        }
        layers.push(`<g>${rings.join('')}</g>`);
        break;
      }
      case 'noise':
        defs.push(`<filter id="${P.pfx}-noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`);
        layers.push(`<rect width="${W}" height="${H}" filter="url(#${P.pfx}-noise)" opacity="${po(t.isLight ? 0.09 : 0.11)}"/>`);
        break;
      default: break;
    }

    // Lighting
    const op = v => Math.min(1, v * k).toFixed(3);
    const glowRect = (id, grad) => { defs.push(grad); lights.push(`<rect width="${W}" height="${H}" fill="url(#${id})"/>`); };
    const g = `${P.pfx}-glow`;
    const stretch = Math.min(2, W / H * 0.7).toFixed(2);
    switch (o.light) {
      case 'corner':
        glowRect(g, `<radialGradient id="${g}" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        break;
      case 'top':
        glowRect(g, `<radialGradient id="${g}" cx="0.5" cy="-0.1" r="0.75" gradientTransform="translate(0.5 0) scale(1 ${stretch}) translate(-0.5 0)"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp * 1.2)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        break;
      case 'bottom':
        glowRect(g, `<radialGradient id="${g}" cx="0.5" cy="1.1" r="0.75" gradientTransform="translate(0.5 1) scale(1 ${stretch}) translate(-0.5 -1)"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp * 1.25)}"/><stop offset="0.5" stop-color="${A2}" stop-opacity="${op(t.glowOp * 0.35)}"/><stop offset="1" stop-color="${A2}" stop-opacity="0"/></radialGradient>`);
        break;
      case 'left':
        glowRect(g, `<radialGradient id="${g}" cx="0" cy="0.5" r="0.8"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp * 1.1)}"/><stop offset="0.6" stop-color="${A2}" stop-opacity="${op(t.glowOp * 0.25)}"/><stop offset="1" stop-color="${A2}" stop-opacity="0"/></radialGradient>`);
        break;
      case 'dual':
        glowRect(g, `<radialGradient id="${g}" cx="1" cy="0" r="0.8"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        glowRect(`${g}2`, `<radialGradient id="${g}2" cx="0" cy="1" r="0.8"><stop offset="0" stop-color="${A2}" stop-opacity="${op(t.glowOp * 0.9)}"/><stop offset="1" stop-color="${A2}" stop-opacity="0"/></radialGradient>`);
        break;
      case 'center':
        glowRect(g, `<radialGradient id="${g}" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="${A}" stop-opacity="${op(t.glowOp * 0.85)}"/><stop offset="0.7" stop-color="${A2}" stop-opacity="${op(t.glowOp * 0.15)}"/><stop offset="1" stop-color="${A2}" stop-opacity="0"/></radialGradient>`);
        break;
      case 'spotlight':
        glowRect(g, `<radialGradient id="${g}" cx="0.5" cy="0" r="0.85"><stop offset="0" stop-color="${t.isLight ? A : '#ffffff'}" stop-opacity="${op(t.isLight ? 0.14 : 0.13)}"/><stop offset="0.45" stop-color="${A}" stop-opacity="${op(t.glowOp * 0.45)}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`);
        glowRect(`${P.pfx}-vig`, `<radialGradient id="${P.pfx}-vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${t.isLight ? 0.06 : 0.35}"/></radialGradient>`);
        break;
      case 'neon':
        glowRect(g, `<radialGradient id="${g}" cx="0.5" cy="0.5" r="0.7"><stop offset="0.55" stop-color="${A}" stop-opacity="0"/><stop offset="1" stop-color="${A}" stop-opacity="${op(t.glowOp * 0.7)}"/></radialGradient>`);
        break;
      default: break;
    }
    if (lights.length) {
      const pulse = o.anim === 'pulse' ? '<animate attributeName="opacity" values="1;0.35;1" dur="3.2s" repeatCount="indefinite"/>' : '';
      layers.push(`<g>${lights.join('')}${pulse}</g>`);
    }

    // Accent strip on top (not on the badge, which has its own)
    if (o.strip && o.template !== 'badge' && o.light !== 'neon') {
      defs.push(`<linearGradient id="${P.pfx}-strip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${A2}"/></linearGradient>`);
      layers.push(`<rect width="${W}" height="3" fill="url(#${P.pfx}-strip)"/>`);
    }

    // Shimmer: a soft band of light that sweeps across the card.
    if (o.anim === 'shimmer') {
      defs.push(`<linearGradient id="${P.pfx}-shim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="${t.isLight ? 0.35 : 0.09}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
      P.overlay = `<rect x="0" y="${-H}" width="${Math.max(120, W * 0.35)}" height="${H * 3}" fill="url(#${P.pfx}-shim)" transform="rotate(20)"><animateTransform attributeName="transform" type="translate" additive="sum" values="${-W * 1.2} 0;${W * 1.6} 0;${W * 1.6} 0" keyTimes="0;0.6;1" dur="5s" repeatCount="indefinite"/></rect>`;
    }

    // Border / neon edge (drawn above the content)
    let edge = '';
    const border = o.border === true ? 'subtle' : o.border === false ? 'none' : o.border;
    const gradDef = id => defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${A2}"/></linearGradient>`);
    if (o.light === 'neon') {
      gradDef(`${P.pfx}-neon`);
      defs.push(`<filter id="${P.pfx}-neonblur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${(3 + 3 * k).toFixed(1)}"/></filter>`);
      const pulse = o.anim === 'pulse' ? `<animate attributeName="opacity" values="${Math.min(1, 0.9 * k).toFixed(2)};0.25;${Math.min(1, 0.9 * k).toFixed(2)}" dur="3.2s" repeatCount="indefinite"/>` : '';
      edge = `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="${Math.max(0, rx - 1)}" fill="none" stroke="url(#${P.pfx}-neon)" stroke-width="${(2 + k).toFixed(1)}" filter="url(#${P.pfx}-neonblur)" opacity="${Math.min(1, 0.9 * k).toFixed(2)}">${pulse}</rect>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${Math.max(0, rx - 1)}" fill="none" stroke="url(#${P.pfx}-neon)" stroke-width="1.5"/>`;
    } else if (border === 'subtle') {
      edge = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${rx}" fill="none" stroke="${t.border}" stroke-opacity="${t.borderOp}"/>`;
    } else if (border === 'accent') {
      edge = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${Math.max(0, rx - 0.5)}" fill="none" stroke="${A}" stroke-opacity="0.75" stroke-width="2"/>`;
    } else if (border === 'gradient') {
      gradDef(`${P.pfx}-edge`);
      edge = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${Math.max(0, rx - 0.5)}" fill="none" stroke="url(#${P.pfx}-edge)" stroke-width="2"/>`;
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
    if (opts && opts.rounded === false && opts.radius === undefined) o.radius = 4; // older saved options
    fullNumbers = o.numbers === 'full';
    const P = painter(card, o, images);
    let size;
    if (o.template === 'wide') size = wideLayout(P);
    else if (o.template === 'badge') size = badgeLayout(P);
    else size = stackLayout(P, STACK[o.template] || STACK.classic);
    fullNumbers = false;
    const { W, H } = size;
    const rx = o.template === 'badge' ? Math.min(H / 2, o.radius * 1.25) : o.radius;
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
${P.overlay || ''}
</g>
${bg.edge}
</svg>`;
    return { svg, width: W, height: H };
  }

  /* =========================================================
     Presets: one-click looks. They change the look only;
     template, elements and title stay as they are.
     ========================================================= */
  const PRESETS = [
    { key: 'cyberpunk', label: 'Cyberpunk', o: { theme: 'midnight', bg: 'grid', light: 'neon', accent: '#EB459E', accent2: '#00E5FF', font: 'mono', glow: 75, tiles: 'outline', radius: 6 } },
    { key: 'synthwave', label: 'Synthwave', o: { theme: 'midnight', bg: 'waves', light: 'bottom', accent: '#FF4FD8', accent2: '#FFB000', glow: 80, tiles: 'accent' } },
    { key: 'terminal', label: 'Terminal', o: { theme: 'oled', bg: 'noise', light: 'none', accent: '#57F287', accent2: '#2ECC71', font: 'mono', radius: 4, tiles: 'outline', chart: 'bars', strip: false } },
    { key: 'ocean', label: 'Ocean', o: { theme: 'midnight', bg: 'waves', light: 'top', accent: '#00A8FC', accent2: '#14B8A6', tiles: 'accent' } },
    { key: 'sunset', label: 'Sunset', o: { theme: 'dark', bg: 'aurora', light: 'dual', accent: '#FF7F50', accent2: '#EC4899', glow: 75 } },
    { key: 'forest', label: 'Forest', o: { theme: 'dark', bg: 'mesh', light: 'left', accent: '#57F287', accent2: '#14B8A6', font: 'rounded' } },
    { key: 'galaxy', label: 'Galaxy', o: { theme: 'midnight', bg: 'stars', light: 'spotlight', accent: '#9B84EE', accent2: '#EB459E', anim: 'shimmer' } },
    { key: 'luxury', label: 'Luxury', o: { theme: 'oled', bg: 'solid', light: 'spotlight', accent: '#E9B949', accent2: '#B8860B', font: 'serif', border: 'accent', tiles: 'plain' } },
    { key: 'pastel', label: 'Pastel', o: { theme: 'light', bg: 'mesh', light: 'none', accent: '#F9A8D4', accent2: '#A5B4FC', font: 'rounded', radius: 24 } },
    { key: 'paper', label: 'Paper', o: { theme: 'cream', bg: 'dots', light: 'none', accent: '#8B5E3C', accent2: '#A0522D', font: 'serif', tiles: 'outline' } },
    { key: 'blueprint', label: 'Blueprint', o: { bgColors: ['#0B3D91', '#0A2A66'], bg: 'grid', light: 'none', accent: '#FFFFFF', accent2: '#9EC5FF', font: 'mono', radius: 4, tiles: 'outline', pattern: 80 } },
    { key: 'slate', label: 'Slate Pro', o: { theme: 'slate', bg: 'solid', light: 'top', accent: '#38BDF8', accent2: '#6366F1', tiles: 'accent', icons: true } },
    { key: 'arcade', label: 'Arcade', o: { theme: 'plum', bg: 'stripes', light: 'top', accent: '#F0B232', accent2: '#EB459E', font: 'mono', chart: 'bars', radius: 4 } },
    { key: 'pulse', label: 'Neon Pulse', o: { theme: 'oled', bg: 'hex', light: 'neon', accent: '#00E5FF', accent2: '#A78BFA', glow: 85, anim: 'pulse' } },
    { key: 'honey', label: 'Honeycomb', o: { theme: 'dark', bg: 'hex', light: 'corner', accent: '#E9B949', accent2: '#F0B232', tiles: 'accent', pattern: 70 } },
    { key: 'orbit', label: 'Orbit', o: { theme: 'plum', bg: 'rings', light: 'dual', accent: '#F472B6', accent2: '#A78BFA', chart: 'dots' } },
  ];

  /** Apply a preset: reset the look to defaults, keep template, elements and title. */
  function applyPreset(o, key) {
    const p = PRESETS.find(x => x.key === key);
    if (!p) return o;
    return { ...defaultOptions(), show: new Set(o.show), template: o.template, title: o.title, ...p.o };
  }

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
    ELEMENTS, THEMES, ACCENTS, TEMPLATES, BACKGROUNDS, LIGHTS, FONTS, TEMPLATE_SUPPORT, PRESETS, CHOICES,
    defaultOptions, optionsToParams, optionsFromParams, applyPreset,
    render, inlineImages, downloadSvg, downloadPng, shiftHue,
  };
})();
