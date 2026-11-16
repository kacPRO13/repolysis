/**
 * Repolysis API proxy — a Cloudflare Worker that sits between the website and api.github.com.
 *
 *  - Uses YOUR GitHub token (stored as a Worker secret, never sent to browsers),
 *    so every visitor shares a 5,000 requests/hour budget instead of 60 each.
 *  - Caches responses at the edge. When a cached entry gets old it is revalidated with
 *    an ETag ("has anything changed?"); GitHub answers 304 and that doesn't count
 *    against the rate limit.
 *  - Only forwards the read-only endpoints Repolysis needs, so the token can't be abused
 *    for anything else.
 *
 * Environment:
 *  GITHUB_TOKEN     (secret)  fine-grained token with no extra permissions
 *  ALLOWED_ORIGINS  (var)     comma-separated list, e.g. "https://you.github.io,http://localhost:8080" or "*"
 */

const GITHUB = 'https://api.github.com';

const LOGIN = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})';
const NAME = '[A-Za-z0-9._-]{1,100}';

// [pattern, fresh-for seconds]
const ROUTES = [
    [new RegExp(`^/repos/${LOGIN}/${NAME}$`), 1800],
  [new RegExp(`^/repos/${LOGIN}/${NAME}/(languages|contributors|commits|releases/latest)$`), 3600],
  [new RegExp(`^/repos/${LOGIN}/${NAME}/stats/(commit_activity|punch_card|participation)$`), 6 * 3600],
  [/^\/search\/repositories$/, 1800],
  [/^\/rate_limit$/, 0],
];

const KEEP_FOR = 7 * 24 * 3600; // how long stale entries stay in the edge cache for ETag revalidation
const PASS_HEADERS = ['content-type', 'link', 'etag', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-ratelimit-resource', 'retry-after'];
const EXPOSE = 'Link, ETag, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Resource, Retry-After, X-Repolysis-Proxy, X-Repolysis-Cache';

/* ---------- helpers ---------- */
function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const list = String(env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes('*')) return origin || '*';
  if (origin && list.includes(origin)) return origin;
  return null;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Expose-Headers': EXPOSE,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Repolysis-Proxy': '1', ...(origin ? corsHeaders(origin) : {}) },
  });
}

function githubHeaders(env, extra = {}) {
  const h = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Repolysis-proxy',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
  if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return h;
}

/** Build the response we send to the browser from a stored/fetched one. */
function toClient(res, origin, cacheState) {
  const headers = new Headers(corsHeaders(origin));
  for (const name of PASS_HEADERS) {
    const v = res.headers.get(name);
    if (v) headers.set(name, v);
  }
  headers.set('X-Repolysis-Proxy', '1');
  headers.set('X-Repolysis-Cache', cacheState);
  headers.set('Cache-Control', 'no-store'); // the browser has its own cache layer
  return new Response(res.body, { status: res.status, headers });
}

/** Store a response in the edge cache with the time we last confirmed it. */
async function store(cache, key, body, upstream, ctx) {
  const headers = new Headers();
  for (const name of PASS_HEADERS) {
    const v = upstream.headers.get(name);
    if (v) headers.set(name, v);
  }
  headers.set('Cache-Control', `public, max-age=${KEEP_FOR}`);
  headers.set('X-Fetched-At', String(Date.now()));
  const res = new Response(body, { status: upstream.status, headers });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/**
 * Serve from edge cache when fresh; revalidate with ETag when stale; fetch otherwise.
 * `doFetch(extraHeaders)` performs the upstream request.
 */
async function cached(cacheKey, ttl, doFetch, origin, ctx) {
  const cache = caches.default;
  const hit = ttl > 0 ? await cache.match(cacheKey) : null;

  if (hit) {
    const age = (Date.now() - Number(hit.headers.get('X-Fetched-At') || 0)) / 1000;
    if (age < ttl) return toClient(hit, origin, 'HIT');

    // Stale: ask GitHub whether it changed. A 304 is free.
    const etag = hit.headers.get('etag');
    if (etag) {
      const up = await doFetch({ 'If-None-Match': etag });
      if (up.status === 304) {
        const body = await hit.arrayBuffer();
        const refreshed = await store(cache, cacheKey, body, hit, ctx);
        return toClient(refreshed, origin, 'REVALIDATED');
      }
      return handleFresh(up, cache, cacheKey, ttl, origin, ctx, hit);
    }
  }

  const up = await doFetch({});
  return handleFresh(up, cache, cacheKey, ttl, origin, ctx, hit);
}

async function handleFresh(up, cache, cacheKey, ttl, origin, ctx, stale) {
  // Rate limited or GitHub hiccup: serve stale data rather than an error, if we have it.
  if (stale && (up.status === 403 || up.status === 429 || up.status >= 500)) {
    return toClient(stale, origin, 'STALE');
  }
  // 202 = GitHub still computing stats; don't cache, the client retries.
  if (up.status === 200 && ttl > 0) {
    const body = await up.arrayBuffer();
    const saved = await store(cache, cacheKey, body, up, ctx);
    return toClient(saved, origin, 'MISS');
  }
  return toClient(up, origin, 'BYPASS');
}

/* ---------- handlers ---------- */
async function handleGet(url, request, env, ctx, origin) {
  const route = ROUTES.find(([re]) => re.test(url.pathname));
  if (!route) return json(404, { message: 'Endpoint not allowed by Repolysis proxy.' }, origin);
  const ttl = route[1];

  // Normalise the cache key: path + sorted query, nothing user-specific.
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(params).toString();
  const upstreamUrl = `${GITHUB}${url.pathname}${qs ? `?${qs}` : ''}`;
  const cacheKey = new Request(`https://repolysis-cache.internal${url.pathname}${qs ? `?${qs}` : ''}`);

  return cached(cacheKey, ttl, extra => fetch(upstreamUrl, { headers: githubHeaders(env, extra) }), origin, ctx);
}

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request, env);
    if (!origin) return json(403, { message: 'Origin not allowed.' }, null);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    const url = new URL(request.url);
    try {
      if (request.method === 'GET') return await handleGet(url, request, env, ctx, origin);
      return json(405, { message: 'Method not allowed.' }, origin);
    } catch (err) {
      return json(502, { message: 'Proxy error.', detail: String(err && err.message || err) }, origin);
    }
  },
};
