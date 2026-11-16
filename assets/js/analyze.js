/* ============================================================
   Repolysis — Repo analysis: traits, percentages and fun facts
   Input: data from GH.fetchRepoAnalysis (repo card + punch card + participation)
   ============================================================ */
'use strict';

const RepoStats = (() => {
  const DAY = 86400000;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const EMOJI_RE = /\p{Extended_Pictographic}/gu;
  const L = v => Math.log10(1 + Math.max(0, v || 0));
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  const isBot = c => c.type === 'Bot' || /\[bot\]$/.test(c.login || '');

  function compute(a) {
    const r = a.repo;
    const now = Date.now();
    const ageDays = Math.max(1, (now - new Date(r.created).getTime()) / DAY);
    const ageYears = ageDays / 365.25;
    const pushedDays = (now - new Date(r.pushed).getTime()) / DAY;

    /* ---------- languages ---------- */
    const langTotal = sum(Object.values(a.languages));
    const languages = Object.entries(a.languages)
      .map(([name, bytes]) => ({ name, bytes, pct: langTotal ? (bytes / langTotal) * 100 : 0 }))
      .sort((x, y) => y.bytes - x.bytes);
    const meaningfulLangs = languages.filter(l => l.pct >= 1).length;

    /* ---------- contributors ---------- */
    const all = a.contributors || [];
    const humans = all.filter(c => !isBot(c));
    const bots = all.filter(isBot);
    const cTotal = sum(humans.map(c => c.contributions));
    const share = (from, to) => (cTotal ? sum(humans.slice(from, to).map(c => c.contributions)) / cTotal : 0);
    const concentration = cTotal ? {
      top1: share(0, 1), top2to5: share(1, 5), top6to20: share(5, 20), rest: share(20, humans.length),
    } : null;
    let busFactor = null;
    if (cTotal) {
      let acc = 0, n = 0;
      for (const c of humans) { acc += c.contributions; n++; if (acc >= cTotal / 2) break; }
      busFactor = n;
    }
    const topContributor = humans[0] || null;
    const contributorCount = all.length;

    /* ---------- activity (52 weeks) ---------- */
    let weeks = null, yearCommits = null, activeWeeks = null, quietStreak = null, busiestWeek = null, momentum = null;
    if (a.activity && a.activity.length) {
      weeks = a.activity.map(w => ({ t: w.week * 1000, total: w.total }));
      yearCommits = sum(weeks.map(w => w.total));
      activeWeeks = weeks.filter(w => w.total > 0).length / weeks.length;
      let run = 0; quietStreak = 0;
      for (const w of weeks) { run = w.total === 0 ? run + 1 : 0; quietStreak = Math.max(quietStreak, run); }
      busiestWeek = weeks.reduce((b, w) => (w.total > b.total ? w : b), weeks[0]);
      const recent = sum(weeks.slice(-13).map(w => w.total));
      const before = sum(weeks.slice(-26, -13).map(w => w.total));
      momentum = before ? (recent - before) / before : recent ? 1 : 0;
    }

    /* ---------- when commits happen (UTC) ---------- */
    let weekdays = null, hours = null, rhythmSource = null;
    if (a.punch && a.punch.length) {
      weekdays = Array(7).fill(0); hours = Array(24).fill(0);
      for (const [d, h, c] of a.punch) { weekdays[d] += c; hours[h] += c; }
      rhythmSource = 'punch';
    } else if (a.activity && a.activity.length) {
      weekdays = Array(7).fill(0);
      a.activity.forEach(w => (w.days || []).forEach((c, i) => { weekdays[i] += c; }));
      rhythmSource = 'activity';
    }
    const pct = arr => {
      const t = sum(arr || []);
      return arr ? arr.map(v => (t ? (v / t) * 100 : 0)) : null;
    };
    const weekdaysPct = pct(weekdays);
    const hoursPct = pct(hours);
    // Monday-first for display
    const weekdaysPctMon = weekdaysPct ? [...weekdaysPct.slice(1), weekdaysPct[0]] : null;
    const weekendShare = weekdaysPct ? (weekdaysPct[0] + weekdaysPct[6]) / 100 : null;
    const nightShare = hoursPct ? sum(hoursPct.slice(0, 6)) / 100 : null;
    const peakHour = hours && sum(hours) ? hours.indexOf(Math.max(...hours)) : null;
    const peakDay = weekdays && sum(weekdays) ? WEEKDAYS[weekdays.indexOf(Math.max(...weekdays))] : null;
    const quietDay = weekdays && sum(weekdays) ? WEEKDAYS[weekdays.indexOf(Math.min(...weekdays))] : null;

    /* ---------- owner vs community ---------- */
    let ownerShare = null;
    if (a.participation && a.participation.all) {
      const allC = sum(a.participation.all);
      const ownerC = sum(a.participation.owner || []);
      ownerShare = allC ? ownerC / allC : null;
    }

    /* ---------- health ---------- */
    const health = [
      ['Description', !!r.desc],
      ['License', !!(r.license && r.license !== 'NOASSERTION')],
      ['Topics', r.topics.length > 0],
      ['Website', !!r.homepage],
      ['Releases', !!a.release],
      ['Active in 90 days', pushedDays <= 90],
      ['Not archived', !r.archived],
      ['Discussions or wiki', !!(r.hasDiscussions || r.hasWiki)],
    ];
    const healthScore = health.filter(h => h[1]).length / health.length;

    /* ---------- ratios ---------- */
    const velocity = r.stars / ageDays;
    const forkRate = r.stars ? r.forks / r.stars : 0;
    const issuesPer1k = r.stars ? (r.issues / r.stars) * 1000 : r.issues;
    const starsPerContributor = contributorCount ? r.stars / contributorCount : r.stars;
    const commitsPerContributor = contributorCount && a.commits ? a.commits / contributorCount : null;
    const kbPerStar = r.stars ? r.size / r.stars : r.size;
    const releaseDays = a.release ? (now - new Date(a.release.date).getTime()) / DAY : null;

    /* ---------- score & grade ---------- */
    const score = Math.round(
      L(r.stars) * 140 + L(r.forks) * 60 + L(contributorCount) * 70 + L(yearCommits || 0) * 50
      + healthScore * 80 + Math.min(ageYears, 15) * 6 + (pushedDays < 30 ? 40 : pushedDays < 180 ? 20 : 0)
    );
    const grade = score >= 1050 ? 'S' : score >= 900 ? 'A+' : score >= 780 ? 'A' : score >= 660 ? 'B+' : score >= 540 ? 'B' : score >= 420 ? 'C+' : 'C';

    const s = {
      a, r, full: r.full, ageDays, ageYears, pushedDays, languages, meaningfulLangs, humans, bots, contributorCount,
      concentration, busFactor, topContributor, weeks, yearCommits, activeWeeks, quietStreak, busiestWeek, momentum,
      weekdaysPct, weekdaysPctMon, hoursPct, rhythmSource, weekendShare, nightShare, peakHour, peakDay, quietDay,
      ownerShare, health, healthScore, velocity, forkRate, issuesPer1k, starsPerContributor, commitsPerContributor,
      kbPerStar, releaseDays, score, grade,
      emojiInDesc: (r.desc.match(EMOJI_RE) || []).length,
    };
    s.traits = traits(s);
    s.personality = personality(s);
    return s;
  }

  /* ---------- traits (badges) ---------- */
  function traits(s) {
    const out = [];
    const add = (ico, name, desc) => out.push({ ico, name, desc });
    const r = s.r;
    const pc = v => `${Math.round(v * 100)}%`;

    if (r.stars >= 50000) add('🌌', 'Legend', 'Over 50,000 stars.');
    else if (r.stars >= 10000) add('✨', 'Star magnet', 'Over 10,000 stars.');
    if (s.velocity >= 20) add('🚀', 'Rocket', `${Math.round(s.velocity)} stars per day on average.`);
    if (s.concentration && s.concentration.top1 >= 0.7) add('🧍', 'Solo act', `One person wrote ${pc(s.concentration.top1)} of commits.`);
    if (s.busFactor >= 5) add('🤝', 'Community-built', `${s.busFactor} people wrote half the code.`);
    if (s.ownerShare !== null && s.ownerShare < 0.2 && s.yearCommits > 20) add('🌍', 'Outside-driven', `Owner made only ${pc(s.ownerShare)} of last year's commits.`);
    if (s.activeWeeks !== null && s.activeWeeks >= 0.9) add('⏱️', 'Clockwork', `Commits in ${pc(s.activeWeeks)} of weeks.`);
    if (s.momentum !== null && s.momentum >= 0.5 && s.yearCommits > 20) add('📈', 'Heating up', `Last quarter had ${pc(s.momentum)} more commits than the one before.`);
    if (s.momentum !== null && s.momentum <= -0.5 && s.yearCommits > 20) add('📉', 'Cooling down', `Last quarter had ${pc(-s.momentum)} fewer commits.`);
    if (s.pushedDays > 365) add('💤', 'Dormant', 'No pushes for over a year.');
    if (s.weekendShare !== null && s.weekendShare >= 0.3) add('🎮', 'Weekend project', `${pc(s.weekendShare)} of commits land on weekends.`);
    if (s.nightShare !== null && s.nightShare >= 0.25) add('🌙', 'Night shift', `${pc(s.nightShare)} of commits between 00:00 and 06:00 UTC.`);
    if (s.meaningfulLangs >= 5) add('🗣️', 'Polyglot', `${s.meaningfulLangs} languages above 1%.`);
    if (s.languages[0] && s.languages[0].pct >= 95) add('🎯', 'Pure', `${Math.round(s.languages[0].pct)}% ${s.languages[0].name}.`);
    if (s.forkRate >= 0.25) add('🍴', 'Fork magnet', `${Math.round(s.forkRate * 100)} forks per 100 stars.`);
    if (s.ageYears >= 10) add('🏛️', 'Veteran', `${Math.floor(s.ageYears)} years old.`);
    if (s.ageYears < 1) add('🐣', 'Newborn', 'Less than a year old.');
    if (s.healthScore >= 0.875) add('🩺', 'Well kept', `${Math.round(s.healthScore * 8)}/8 health checks.`);
    if (s.bots.length >= 2) add('🤖', 'Bot-assisted', `${s.bots.length} bots among contributors.`);
    if (r.isTemplate) add('📋', 'Template', 'Marked as a template repository.');
    return out;
  }

  /** One-line "personality" summary. */
  function personality(s) {
    if (s.pushedDays > 365) return { name: 'The Archive', desc: 'Finished, abandoned, or simply done.' };
    if (s.concentration && s.concentration.top1 >= 0.7) return { name: 'The Solo Craft', desc: 'Mostly one person’s work.' };
    if (s.busFactor >= 8) return { name: 'The Commons', desc: 'Built by a wide community.' };
    if (s.velocity >= 20) return { name: 'The Rocket', desc: 'Grew unusually fast.' };
    if (s.activeWeeks !== null && s.activeWeeks >= 0.85) return { name: 'The Machine', desc: 'Steady, week after week.' };
    if (s.weekendShare !== null && s.weekendShare >= 0.3) return { name: 'The Side Project', desc: 'Lives on weekends.' };
    return { name: 'The Workhorse', desc: 'Solid, regular development.' };
  }

  return { compute, WEEKDAYS };
})();
