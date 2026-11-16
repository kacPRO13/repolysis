/* ============================================================
   Repolysis — GitHub API client (REST + Search + optional GraphQL)
   ============================================================ */
'use strict';

const GH = (() => {
  const API = 'https://api.github.com';
  // Optional shared proxy (see worker/ and assets/js/config.js).
  const PROXY = String((window.REPOLYSIS_CONFIG && window.REPOLYSIS_CONFIG.apiProxy) || '').trim().replace(/\/+$/, '');
  const TOKEN_KEY = 'repolysis.token';
  const CACHE_PREFIX = 'repolysis.v1.';

  // How long each kind of data stays in the browser cache.
  const MIN = 60 * 1000;
  const TTL = {
    card: 60 * MIN,     // repo card data
    repo: 6 * 60 * MIN, // single repo (Discover "liked" repos)
    search: 60 * MIN,   // search results
  };

  const rate = { remaining: null, limit: null, reset: null, proxied: false };
  const rateListeners = new Set();
  let proxyDown = false;   // flips to true for this page load if the proxy fails
  let proxySkipUntil = 0;  // proxy out of quota: go direct until its limit resets

  class ApiError extends Error {
    constructor(message, status, extra = {}) {
      super(message);
      this.status = status;
      Object.assign(this, extra);
    }
  }

  /* ---------- token ---------- */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  }
  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* storage unavailable */ }
    clearCache();
  }

  /* ---------- cache (localStorage, survives closing the tab) ---------- */
  const store = (() => {
    try {
      const k = '__repolysis_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return localStorage;
    } catch {
      try { return sessionStorage; } catch { return null; }
    }
  })();

  const ourKeys = () => {
    if (!store) return [];
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    return keys;
  };

  function cacheGet(key) {
    if (!store) return null;
    try {
      const raw = store.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { t, ttl, v } = JSON.parse(raw);
      if (Date.now() - t > ttl) { store.removeItem(CACHE_PREFIX + key); return null; }
      return v;
    } catch { return null; }
  }

  /** Drop the oldest half of our entries to make room. */
  function evictOldest() {
    const entries = ourKeys().map(k => {
      try { return { k, t: JSON.parse(store.getItem(k)).t || 0 }; } catch { return { k, t: 0 }; }
    }).sort((a, b) => a.t - b.t);
    entries.slice(0, Math.max(1, Math.ceil(entries.length / 2))).forEach(e => store.removeItem(e.k));
  }

  function cacheSet(key, value, ttl) {
    if (!store) return;
    const raw = JSON.stringify({ t: Date.now(), ttl, v: value });
    try { store.setItem(CACHE_PREFIX + key, raw); }
    catch {
      try { evictOldest(); store.setItem(CACHE_PREFIX + key, raw); }
      catch { /* still too big – skip caching this one */ }
    }
  }

  function clearCache() {
    ourKeys().forEach(k => store.removeItem(k));
    // Also drop data saved under the project's old name (GitArena).
    try {
      for (const s of [localStorage, sessionStorage]) {
        Object.keys(s).filter(k => /^gitarena\./.test(k)).forEach(k => s.removeItem(k));
      }
    } catch { /* ignore */ }
  }

  function cacheInfo() {
    const keys = ourKeys();
    const bytes = keys.reduce((a, k) => a + (store.getItem(k) || '').length * 2, 0);
    return { entries: keys.length, bytes };
  }

  // Prune expired entries once per page load.
  (function prune() {
    ourKeys().forEach(k => {
      try {
        const { t, ttl } = JSON.parse(store.getItem(k));
        if (Date.now() - t > ttl) store.removeItem(k);
      } catch { store.removeItem(k); }
    });
  })();

  const usingProxy = () => !!PROXY && !proxyDown && !getToken() && Date.now() >= proxySkipUntil;
  const authKey = () => (getToken() ? 'auth' : usingProxy() ? 'proxy' : 'anon');

  /* ---------- rate limit ---------- */
  function readRate(res, viaProxy) {
    const rem = res.headers.get('x-ratelimit-remaining');
    const resource = res.headers.get('x-ratelimit-resource');
    // Search and GraphQL have their own buckets – the badge tracks the REST "core" bucket.
    if (rem === null || (resource && resource !== 'core')) return;
    rate.remaining = Number(rem);
    rate.limit = Number(res.headers.get('x-ratelimit-limit'));
    rate.reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    rate.proxied = !!viaProxy;
    rateListeners.forEach(fn => fn({ ...rate }));
  }
  function onRate(fn) { rateListeners.add(fn); }

  /* ---------- low-level request ---------- */
  async function send(base, path, options, withToken) {
    const headers = { Accept: 'application/vnd.github+json' };
    const token = withToken ? getToken() : '';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body) headers['Content-Type'] = 'application/json';
    return fetch(base + path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  async function request(path, options = {}) {
    let res = null;
    let viaProxy = false;

    // 1. Shared proxy (only when the visitor has no token of their own).
    if (usingProxy()) {
      try {
        res = await send(PROXY, path, options, false);
        viaProxy = true;
        const proxyBroken = res.status >= 500 || (res.status === 403 && !res.headers.has('x-ratelimit-remaining'));
        const proxyLimited = (res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0';
        if (proxyBroken) proxyDown = true;
        if (proxyLimited) proxySkipUntil = (Number(res.headers.get('x-ratelimit-reset')) * 1000) || Date.now() + 10 * 60 * 1000;
        if (proxyBroken || proxyLimited) { res = null; viaProxy = false; }
      } catch {
        proxyDown = true;
        res = null;
      }
    }

    // 2. Direct to GitHub (with the visitor's token if they set one).
    if (!res) {
      try {
        res = await send(API, path, options, true);
      } catch {
        throw new ApiError("Couldn't reach the GitHub API. Check your connection.", 0);
      }
    }
    readRate(res, viaProxy);

    // 202 = GitHub is still computing statistics, 204 = empty repository.
    if (res.status === 202 || res.status === 204) return options.raw ? { json: null, headers: res.headers, status: res.status } : null;
    if (res.ok) {
      const json = await res.json();
      return options.raw ? { json, headers: res.headers, status: res.status } : json;
    }

    if (res.status === 404) throw new ApiError('Not found.', 404);
    if (res.status === 401) throw new ApiError('Your GitHub token is invalid or expired. Update it in settings.', 401);
    if (res.status === 422) throw new ApiError('GitHub rejected the query.', 422);
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000 || null;
      throw new ApiError('GitHub API rate limit reached.', res.status, {
        rateLimited: remaining === '0' || res.status === 429 || res.headers.has('retry-after'),
        reset,
      });
    }
    throw new ApiError(`GitHub returned an error (${res.status}).`, res.status);
  }

  /* ---------- slimming (keeps cache small) ---------- */
  // Richer shape used by the recommender.
  function slimDiscoverRepo(r) {
    return {
      full: r.full_name, name: r.name, owner: r.owner ? r.owner.login : '',
      avatar: r.owner ? r.owner.avatar_url : '', url: r.html_url, desc: r.description || '',
      stars: r.stargazers_count, forks: r.forks_count, lang: r.language,
      topics: r.topics || [], pushed: r.pushed_at, created: r.created_at,
      archived: !!r.archived, fork: !!r.fork, license: r.license ? r.license.spdx_id : null,
    };
  }

  /* ---------- discover endpoints ---------- */
  async function fetchRepo(fullName) {
    const key = `repo.${fullName.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return cached;
    const [owner, name] = fullName.split('/');
    const raw = await request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
    const repo = slimDiscoverRepo(raw);
    cacheSet(key, repo, TTL.repo);
    return repo;
  }

  async function searchRepos(q, sort) {
    const key = `search.${sort || 'best'}.${q}`;
    const cached = cacheGet(key);
    if (cached) return cached;
    const params = new URLSearchParams({ q, per_page: '40' });
    if (sort) { params.set('sort', sort); params.set('order', 'desc'); }
    const json = await request(`/search/repositories?${params}`);
    const items = (json.items || []).map(slimDiscoverRepo);
    cacheSet(key, items, TTL.search);
    return items;
  }

  /* ---------- repo card endpoints ---------- */
  function lastPage(headers) {
    const link = headers && headers.get('link');
    const m = link && link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    return m ? Number(m[1]) : null;
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  /** GitHub computes /stats/* lazily: the first call may answer 202 "come back later". */
  async function fetchStat(path, isReady) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await request(path);
        if (data && isReady(data)) return data;
      } catch (err) {
        if (err.rateLimited) throw err;
        return null;
      }
      await wait(1500 * (attempt + 1));
    }
    return null;
  }

  async function fetchCommitActivity(base) {
    const data = await fetchStat(`${base}/stats/commit_activity`, d => Array.isArray(d) && d.length > 0);
    return data ? data.map(w => ({ week: w.week, total: w.total, days: w.days })) : null;
  }

  /**
   * Repo card data plus deeper stats for the analysis view:
   * punch card (commits by weekday × hour, UTC) and participation (owner vs everyone, 52 weeks).
   */
  async function fetchRepoAnalysis(fullName) {
    const card = await fetchRepoCard(fullName);
    const key = `analysis.${card.repo.full.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return { ...card, ...cached };
    const [owner, name] = card.repo.full.split('/');
    const b = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    const soft = p => p.catch(err => { if (err.rateLimited) throw err; return null; });
    const [punch, participation] = await Promise.all([
      soft(fetchStat(`${b}/stats/punch_card`, d => Array.isArray(d) && d.length > 0)),
      soft(fetchStat(`${b}/stats/participation`, d => d && Array.isArray(d.all) && d.all.length > 0)),
    ]);
    const extra = { punch, participation };
    if (punch && participation) cacheSet(key, extra, TTL.card);
    return { ...card, ...extra };
  }

  /**
   * Everything the repo card needs.
   * Returns { repo, languages, contributors, contributorsMore, commits, release, activity }.
   */
  async function fetchRepoCard(fullName) {
    const key = `card.${fullName.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    const [owner, name] = fullName.split('/');
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    let raw;
    try {
      raw = await request(base);
    } catch (err) {
      if (err.status === 404) throw new ApiError(`Repository "${fullName}" doesn't exist or is private.`, 404);
      throw err;
    }
    const b = `/repos/${encodeURIComponent(raw.owner.login)}/${encodeURIComponent(raw.name)}`;

    const soft = p => p.catch(err => { if (err.rateLimited) throw err; return null; });
    const [languages, contribRes, commitsRes, release, activity] = await Promise.all([
      soft(request(`${b}/languages`)),
      soft(request(`${b}/contributors?per_page=100`, { raw: true })),
      soft(request(`${b}/commits?per_page=1`, { raw: true })),
      soft(request(`${b}/releases/latest`)),
      soft(fetchCommitActivity(b)),
    ]);

    const contributors = contribRes && Array.isArray(contribRes.json)
      ? contribRes.json.map(c => ({ login: c.login, avatar: c.avatar_url, contributions: c.contributions, type: c.type }))
      : [];
    let commits = null;
    if (commitsRes && Array.isArray(commitsRes.json)) commits = lastPage(commitsRes.headers) || commitsRes.json.length;

    const card = {
      repo: {
        ...slimDiscoverRepo(raw),
        watchers: raw.subscribers_count, issues: raw.open_issues_count, size: raw.size,
        homepage: raw.homepage, defaultBranch: raw.default_branch, ownerType: raw.owner.type,
        hasWiki: !!raw.has_wiki, hasPages: !!raw.has_pages, hasDiscussions: !!raw.has_discussions,
        isTemplate: !!raw.is_template, updated: raw.updated_at,
      },
      languages: languages || {},
      contributors,
      contributorsMore: !!(contribRes && contribRes.headers && /rel="next"/.test(contribRes.headers.get('link') || '')),
      commits,
      release: release ? { tag: release.tag_name, name: release.name, date: release.published_at || release.created_at } : null,
      activity,
      fetchedAt: Date.now(),
    };
    // Don't cache while GitHub is still computing activity stats – next try may have them.
    if (activity) cacheSet(key, card, TTL.card);
    return card;
  }

  return {
    fetchRepo, searchRepos, fetchRepoCard, fetchRepoAnalysis, getToken, setToken, onRate, rate, ApiError,
    clearCache, cacheInfo, hasProxy: () => !!PROXY, usingProxy,
  };
})();
