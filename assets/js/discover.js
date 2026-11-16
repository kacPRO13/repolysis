/* ============================================================
   Repolysis — Discover: recommend repos from interests and liked repos
   ============================================================

   How it works
   1. Parse the input into "liked repos" (owner/name or GitHub URLs) and
      free-text interests ("terminal ui", "rust", "self-hosted").
   2. Build a taste profile: weighted topics, keywords and languages.
      Liked repos contribute their topics, language and description words.
   3. Run up to four GitHub Search queries from different angles
      (popular in your top topic, active in your second topic,
      keyword match, topic intersection).
   4. Score every candidate on relevance, popularity and freshness,
      then pick three *different* repos: Best match, Hidden gem, Wildcard.
*/
'use strict';

const Discover = (() => {
  const DAY = 86400000;
  const MAX_LIKED = 5;

  const LANGS = {
    rust: 'Rust', python: 'Python', py: 'Python', javascript: 'JavaScript', js: 'JavaScript',
    typescript: 'TypeScript', ts: 'TypeScript', go: 'Go', golang: 'Go', java: 'Java', kotlin: 'Kotlin',
    swift: 'Swift', c: 'C', 'c++': 'C++', cpp: 'C++', 'c#': 'C#', csharp: 'C#', ruby: 'Ruby', php: 'PHP',
    elixir: 'Elixir', erlang: 'Erlang', haskell: 'Haskell', scala: 'Scala', dart: 'Dart', lua: 'Lua',
    zig: 'Zig', julia: 'Julia', shell: 'Shell', bash: 'Shell', clojure: 'Clojure', ocaml: 'OCaml',
    nim: 'Nim', crystal: 'Crystal', perl: 'Perl', 'objective-c': 'Objective-C', vue: 'Vue', svelte: 'Svelte',
    html: 'HTML', css: 'CSS', gdscript: 'GDScript', solidity: 'Solidity', fsharp: 'F#', 'f#': 'F#',
    powershell: 'PowerShell', nix: 'Nix', v: 'V', gleam: 'Gleam', odin: 'Odin',
  };

  const STOP = new Set((
    'a an the and or but of to in on for with without from by at as is are be been was were it its this that these those ' +
    'i im me my mine we our you your they them he she their his her ' +
    'like likes liked love loves loved want wants need needs interested interest interests into about really very ' +
    'stuff things thing something anything some any cool nice good great awesome best fun simple small ' +
    'build building builds make making made use using used write writing written prefer mostly also more ' +
    'project projects repo repos repository repositories code coding program programming software ' +
    'lubie lubię interesuje interesują mnie chce chcę coś cos jakieś jakies projekty projekt oraz albo ' +
    'do na w we z ze i a o od po dla jak'
  ).split(/\s+/));

  // Pieces that look like owner/name but are not repos.
  const NOT_REPOS = new Set(['ci/cd', 'c/c++', 'ui/ux', 'tcp/ip', 'i/o', 'a/b', 'r/w', 'n/a', 'gui/tui', 'cli/tui', 'ai/ml', 'ml/ai']);

  // Topics that say nothing about what a repo actually is.
  const GENERIC_TOPICS = new Set([
    'hacktoberfest', 'hacktoberfest2020', 'hacktoberfest2021', 'hacktoberfest2022', 'hacktoberfest2023',
    'hacktoberfest2024', 'hacktoberfest2025', 'open-source', 'opensource', 'github', 'free', 'good-first-issue',
    'hacktoberfest-accepted', 'first-timers-only', 'beginner-friendly', 'mit-license', 'oss',
  ]);

  const TOPIC_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;
  const REPO_RE = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/([\w.-]{1,100})(?:[/#?].*)?$/i;

  /* ---------- parsing ---------- */
  function words(text) {
    return (text.toLowerCase().match(/[a-z0-9ąćęłńóśźż][a-z0-9ąćęłńóśźż+#.-]*/g) || [])
      .map(w => w.replace(/[.-]+$/, ''))
      .filter(Boolean);
  }

  function parse(text) {
    const pieces = String(text).split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const repos = [];
    const interests = [];
    for (const piece of pieces) {
      const m = piece.match(REPO_RE);
      const isUrl = /github\.com\//i.test(piece);
      if (m && !/\s/.test(piece) && (isUrl || !NOT_REPOS.has(piece.toLowerCase())) && m[2].length >= 2 && m[1].length >= 2) {
        const full = `${m[1]}/${m[2].replace(/\.git$/i, '')}`;
        if (!repos.some(r => r.toLowerCase() === full.toLowerCase())) repos.push(full);
        continue;
      }
      interests.push(interestFromText(piece));
    }
    return { repos: repos.slice(0, MAX_LIKED), extraRepos: Math.max(0, repos.length - MAX_LIKED), interests: interests.filter(i => i.words.length || i.langs.length) };
  }

  function interestFromText(raw) {
    const ws = words(raw.replace(/\//g, ' '));
    const langs = [...new Set(ws.filter(w => LANGS[w]).map(w => LANGS[w]))];
    const rest = ws.filter(w => !LANGS[w] && !STOP.has(w) && w.length > 1);
    const slug = rest.join('-');
    return {
      raw: raw.trim(),
      langs,
      words: rest,
      topic: rest.length && rest.length <= 3 && TOPIC_RE.test(slug) ? slug : null,
    };
  }

  /* ---------- profile ---------- */
  function bump(map, key, w) { map.set(key, (map.get(key) || 0) + w); }
  const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  const usefulTopics = r => r.topics.filter(t => !GENERIC_TOPICS.has(t) && !LANGS[t]);

  function buildProfile(interests, liked) {
    const topics = new Map();
    const keywords = new Map();   // words the person typed – used for search and scoring
    const hints = new Map();      // words from liked repos' descriptions – scoring only
    const langs = new Map();
    const explicitLangs = new Set();

    for (const it of interests) {
      if (it.topic) bump(topics, it.topic, 3);
      for (const w of it.words) {
        bump(keywords, w, 1);
        if (it.words.length > 1 && TOPIC_RE.test(w) && w.length > 2) bump(topics, w, 1);
      }
      for (const l of it.langs) { bump(langs, l, 3); explicitLangs.add(l); }
    }
    for (const r of liked) {
      for (const t of usefulTopics(r)) bump(topics, t, 2);
      for (const t of r.topics) if (LANGS[t]) bump(langs, LANGS[t], 1);
      if (r.lang) bump(langs, r.lang, 2);
      const descWords = words(r.desc).filter(w => !STOP.has(w) && !LANGS[w] && w.length > 3);
      for (const w of descWords.slice(0, 8)) bump(hints, w, 0.5);
    }
    // A liked repo's own name ("bubbletea") is noise – drop it.
    for (const r of liked) { keywords.delete(r.name.toLowerCase()); hints.delete(r.name.toLowerCase()); }
    for (const [w, v] of hints) if (!keywords.has(w)) keywords.set(w, v);

    const totalLang = [...langs.values()].reduce((a, b) => a + b, 0);
    const mainLang = top(langs, 1)[0] || null;
    const dominantLang = mainLang && langs.get(mainLang) / totalLang >= 0.6 ? mainLang : null;
    const typed = [...keywords.entries()].filter(([, v]) => v >= 1).map(([k]) => k);
    return { topics, keywords, typed, langs, mainLang, dominantLang, explicitLangs, liked };
  }

  /* ---------- search ---------- */
  function isoDaysAgo(days) {
    return new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
  }

  function buildQueries(p) {
    const qs = [];
    const t = top(p.topics, 3);
    const kw = p.typed.slice(0, 4).filter(w => !/[^a-z0-9ąćęłńóśźż+#-]/.test(w));
    const lang = p.dominantLang ? ` language:"${p.dominantLang}"` : '';
    const recent = isoDaysAgo(365);
    const live = 'archived:false is:public';

    // 1. Popular in the strongest topic
    if (t[0]) qs.push({ tag: 'popular', q: `topic:${t[0]}${lang} stars:>100 ${live}`, sort: 'stars' });
    // 2. Hidden gems – smaller but recently active
    if (t[0]) qs.push({ tag: 'gems', q: `topic:${t[1] || t[0]}${lang} stars:30..1500 pushed:>${isoDaysAgo(180)} ${live}`, sort: 'stars' });
    // 3. What the person actually typed
    if (kw.length) qs.push({ tag: 'keywords', q: `${kw.join(' ')} in:name,description,topics stars:>20 ${live}${lang}` });
    // 4. "More like this" for each liked repo (its two most telling topics)
    for (const r of p.liked) {
      const rt = usefulTopics(r).slice(0, 2);
      if (rt.length === 2) qs.push({ tag: `like:${r.full}`, q: `topic:${rt[0]} topic:${rt[1]} stars:>20 ${live}`, sort: 'stars' });
    }
    // 5. Intersection of the two strongest topics
    if (t[0] && t[1]) qs.push({ tag: 'intersection', q: `topic:${t[0]} topic:${t[1]} stars:>20 ${live}`, sort: 'stars' });
    // Language-only input
    if (!qs.length && p.mainLang) {
      qs.push({ tag: 'language', q: `language:"${p.mainLang}" stars:>500 pushed:>${recent} ${live}`, sort: 'stars' });
      qs.push({ tag: 'language-gems', q: `language:"${p.mainLang}" stars:50..800 pushed:>${isoDaysAgo(120)} ${live}`, sort: 'stars' });
    }
    // GitHub allows 10 searches/minute without a token – stay at 4 per run.
    const seen = new Set();
    return qs.filter(q => !seen.has(q.q) && seen.add(q.q)).slice(0, 4);
  }

  /* ---------- scoring ---------- */
  function scoreCandidate(c, p, likedSet, likedRepos) {
    if (c.archived || c.fork || likedSet.has(c.full.toLowerCase())) return null;
    const now = Date.now();
    if (c.stars < 10) return null;
    const matchedTopics = c.topics.filter(t => p.topics.has(t));
    let rel = matchedTopics.reduce((a, t) => a + p.topics.get(t), 0);

    const hay = `${c.name} ${c.desc} ${c.topics.join(' ')}`.toLowerCase();
    const matchedWords = [];
    for (const [w, wt] of p.keywords) {
      if (matchedTopics.some(t => t === w || t.split('-').includes(w))) continue;
      if (new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(hay)) {
        rel += 1.2 * Math.min(wt, 2);
        matchedWords.push(w);
      }
    }
    const langMatch = !!(c.lang && p.langs.has(c.lang));
    if (langMatch) rel += p.explicitLangs.has(c.lang) ? 3 : 1.5;
    else if (p.explicitLangs.size) rel -= 1.5; // they asked for a language and this isn't it
    rel += 0.6 * (c.hits - 1);

    const days = c.pushed ? (now - new Date(c.pushed).getTime()) / DAY : 9999;
    const fresh = days < 90 ? 1 : days < 365 ? 0.5 : days < 730 ? 0 : -1.5;
    const pop = Math.log10(1 + c.stars);

    // Which liked repo is it most similar to?
    let similarTo = null;
    for (const r of likedRepos) {
      const shared = usefulTopics(c).filter(t => r.topics.includes(t));
      if (shared.length >= 2 && (!similarTo || shared.length > similarTo.shared.length)) similarTo = { repo: r.full, shared };
    }

    // Relevance first, but popularity matters enough that a 10-star topic match can't beat a great tool.
    const total = rel * 1.2 + pop * 1.4 + fresh + (c.desc ? 0 : -1);
    return { ...c, rel, pop, fresh, days, total, matchedTopics, matchedWords, langMatch, similarTo };
  }

  function jaccard(a, b) {
    if (!a.length && !b.length) return 0;
    const A = new Set(a), B = new Set(b);
    let inter = 0;
    A.forEach(x => { if (B.has(x)) inter++; });
    return inter / (A.size + B.size - inter);
  }

  /** Pick three different repos from the pool, skipping anything in `exclude`. */
  function pickThree(pool, exclude) {
    const avail = pool.filter(c => !exclude.has(c.full));
    if (!avail.length) return [];
    const picks = [];
    const taken = new Set();
    const owners = new Set();
    const take = (c, slot) => { picks.push({ ...c, slot }); taken.add(c.full); owners.add(c.owner.toLowerCase()); };
    const free = c => !taken.has(c.full) && !owners.has(c.owner.toLowerCase());

    // 1. Best match – top total score among repos that are clearly on-topic
    // and already proven (500+ stars) whenever such a repo exists.
    const maxRel = Math.max(...avail.map(c => c.rel));
    const bestScore = c => c.rel * 1.2 + c.pop * 2.2 + c.fresh;
    const best = avail.filter(c => c.rel >= maxRel * 0.4 && c.stars >= 500).sort((a, b) => bestScore(b) - bestScore(a))[0]
      || avail.find(c => c.rel >= maxRel * 0.5) || avail[0];
    take(best, 'best');

    // 2. Hidden gem – relevant, recently active, not (yet) famous
    const gemCap = Math.min(1500, Math.max(200, best.stars * 0.5));
    const gem = avail
      .filter(c => free(c) && c.stars >= 30 && c.stars <= gemCap && c.days < 365 && c.rel >= Math.max(1, best.rel * 0.4))
      .sort((a, b) => (b.rel * 1.6 + b.fresh * 1.5 + b.pop * 0.8) - (a.rel * 1.6 + a.fresh * 1.5 + a.pop * 0.8))[0];
    if (gem) take(gem, 'gem');

    // 3. Wildcard – still relevant, but as different as possible from the picks so far
    const wildScore = c => c.total
      - 4 * Math.max(...picks.map(p => jaccard(c.topics, p.topics)))
      + (c.lang && !picks.some(p => p.lang === c.lang) ? 1.5 : 0);
    const wild = avail
      .filter(c => free(c) && c.rel > 0)
      .sort((a, b) => wildScore(b) - wildScore(a))[0];
    if (wild) take(wild, 'wildcard');

    // Fill any empty slot with the next best different-owner repo (or any repo as a last resort).
    for (const c of avail) {
      if (picks.length >= 3) break;
      if (free(c)) take(c, picks.length === 1 ? 'gem' : 'wildcard');
    }
    for (const c of avail) {
      if (picks.length >= 3) break;
      if (!taken.has(c.full)) take(c, 'wildcard');
    }
    return picks;
  }

  /* ---------- main ---------- */
  /**
   * @returns {Promise<{profile, interests, liked, missing, extraRepos, pool, queries}>}
   */
  async function run(text) {
    const parsed = parse(text);
    if (!parsed.repos.length && !parsed.interests.length) {
      throw new Error('Type a few interests or paste some repos you like.');
    }

    // Resolve liked repos; unknown ones become interests instead of errors.
    const liked = [];
    const missing = [];
    const results = await Promise.allSettled(parsed.repos.map(r => GH.fetchRepo(r)));
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') liked.push(res.value);
      else if (res.reason && res.reason.rateLimited) throw res.reason;
      else {
        missing.push(parsed.repos[i]);
        parsed.interests.push(interestFromText(parsed.repos[i]));
      }
    });

    const interests = parsed.interests.filter(i => i.words.length || i.langs.length);
    const profile = buildProfile(interests, liked);
    const queries = buildQueries(profile);
    if (!queries.length) {
      throw new Error("Couldn't build a search from that. Try more specific interests, e.g. \"terminal ui, rust\".");
    }

    const searchResults = await Promise.allSettled(queries.map(q => GH.searchRepos(q.q, q.sort)));
    const rateErr = searchResults.find(r => r.status === 'rejected' && r.reason && r.reason.rateLimited);
    if (rateErr && searchResults.every(r => r.status === 'rejected')) throw rateErr.reason;

    const byName = new Map();
    searchResults.forEach(r => {
      if (r.status !== 'fulfilled') return;
      for (const c of r.value) {
        const ex = byName.get(c.full);
        if (ex) ex.hits++;
        else byName.set(c.full, { ...c, hits: 1 });
      }
    });

    const likedSet = new Set(liked.map(r => r.full.toLowerCase()));
    const pool = [...byName.values()]
      .map(c => scoreCandidate(c, profile, likedSet, liked))
      .filter(c => c && (c.rel > 0 || c.hits >= 2))
      .sort((a, b) => b.total - a.total);

    return { profile, interests, liked, missing, extraRepos: parsed.extraRepos, pool, queries };
  }

  /* ---------- explanations ---------- */
  function reasons(c) {
    const out = [];
    if (c.similarTo) out.push(`Shares ${c.similarTo.shared.slice(0, 3).map(t => `#${t}`).join(', ')} with ${c.similarTo.repo}`);
    if (c.matchedTopics.length && !c.similarTo) out.push(`Tagged ${c.matchedTopics.slice(0, 3).map(t => `#${t}`).join(', ')}`);
    if (c.matchedWords.length) out.push(`Mentions ${c.matchedWords.slice(0, 3).map(w => `“${w}”`).join(', ')}`);
    if (c.langMatch) out.push(`Written in ${c.lang}, which fits your taste`);
    if (c.slot === 'gem') out.push(c.days < 30 ? 'Under the radar, but actively maintained this month' : `Still small (${c.stars.toLocaleString('en-US')} stars) and alive`);
    if (c.slot === 'wildcard') out.push(c.lang && !c.langMatch ? `A different angle: built with ${c.lang}` : 'A slightly different take on your interests');
    if (c.slot === 'best' && c.stars >= 5000) out.push('Widely trusted by the community');
    if (!out.length) out.push('Closely related to what you described');
    return out.slice(0, 3);
  }

  return { run, pickThree, reasons, parse };
})();
