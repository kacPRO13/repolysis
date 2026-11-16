# Repolysis

**Analyze a GitHub repository, discover new ones, and turn any repo into a stats card.**

Repolysis has three modes:

- **Analyze a repo.** Paste one repository and see its traits, percentage breakdowns (languages, who writes the code, owner vs community, weekdays vs weekend, when commits happen), health checklist, all stats and a pile of fun facts.
- **Discover repos.** Describe what you're into, paste repos you've liked, or both. You get three *different* recommendations (best match, hidden gem, wildcard), each with a reason it was picked.
- **Repo card.** Paste a repository link and get a stats card in five templates, 16 one-click presets and dozens of style switches: colors, themes, backgrounds, lights, borders, fonts, tile and chart styles, even animation.

Discord-inspired dark theme. Everything runs in the browser, with no backend and no build step.

🔗 **Live demo:** `https://<your-username>.github.io/<repo-name>/`

## Analyze a repo

| Section | What it shows |
|---|---|
| **Repo card** | Grade (S → C), a one-line personality (Solo Craft, Commons, Rocket, Machine, Side Project, Archive…), health bar and up to 20 traits such as *Solo act*, *Community-built*, *Heating up*, *Dormant*, *Weekend project*, *Polyglot*, *Fork magnet* |
| **At a glance** | Stars, forks, contributors, total commits, commits in the last 12 months, watchers, open issues and age, each with a bit of context |
| **Breakdowns** | Profile radar on a fixed scale (100% = top-tier open source), health checklist, language mix, who writes the code (top contributor / next 4 / next 15 / everyone else), owner vs community, weekdays vs weekend, 52-week commit activity (absolute or % of peak), day of week, commit clock by hour (UTC) |
| **All stats** | 19 numbers incl. momentum, weeks with commits, bus factor, issues per 1k stars, last push and latest release |
| **Fun facts** | Busiest week ever, longest quiet streak, peak commit hour, weekend and night share, bots in the team, kilobytes per star, default branch, name length and more |
| **Top contributors** | The ten biggest contributors with their share of commits |

Shareable link: `?r=BurntSushi/ripgrep`

## Discover repos

Type anything, separated by commas or new lines:

```
terminal ui, rust, self-hosted
charmbracelet/bubbletea, https://github.com/sharkdp/bat
```

Repos (`owner/name` or GitHub URLs) and free-text interests can be mixed. Programming languages are recognised automatically.

How picks are made:

1. **Taste profile.** Interests become topics and keywords. Liked repos contribute their topics, language and description words.
2. **Four GitHub searches from different angles:** popular in your strongest topic, smaller and recently active projects, your keywords, and "more like this" for each liked repo.
3. **Scoring.** Each candidate is scored on relevance (shared topics, keywords, language), popularity (log of stars) and freshness (last push). Forks, archived repos and repos you already listed are skipped.
4. **Three different picks:**
   - **Best match:** an established repo (500+ stars when possible) that fits best.
   - **Hidden gem:** under ~1,500 stars and pushed within the last year.
   - **Wildcard:** relevant but as different as possible from the other two (another language or a new angle), and from a different owner.

**Show 3 more** walks through the remaining candidates without making new requests. Shareable link: `?mode=discover&q=terminal%20ui,%20rust`

## Repo card

Paste `owner/repo` or a GitHub link and Repolysis builds an SVG card from the repo's data.

| Group | Elements you can toggle |
|---|---|
| **Header** | Owner avatar, description, language & license, repo grade |
| **Stats** | Stars, forks, total commits, contributors, age, stars per day, watchers, open issues, last push, latest release, size, busiest weekday, forks per 100 stars, bus factor |
| **Sections** | Language bar, 12-month commit activity sparkline, next star milestone (with an ETA at the current pace), repo health checklist, top contributors, topics, footer |

**Templates:** Classic (520 px), Compact (380 px), Banner (860 px wide rectangle), Minimal (text first, no boxes) and Badge (a tiny pill for READMEs).

**Presets:** 16 one-click looks (Cyberpunk, Synthwave, Terminal, Ocean, Sunset, Forest, Galaxy, Luxury, Pastel, Paper, Blueprint, Slate Pro, Arcade, Neon Pulse, Honeycomb, Orbit). A preset changes only the look; your template, elements and title stay.

**Colors:** 15 accent swatches plus any custom color, an automatic or custom second color, 7 themes (Dark, Midnight, OLED, Slate, Plum, Light, Cream) or your own two background colors.

**Background & light:** 12 backgrounds (gradient, solid, mesh, aurora, grid, dots, stripes, waves, hexagons, stars, rings, grain) with a pattern-strength slider and gradient direction (diagonal, vertical, horizontal, radial); 9 lights (corner, top, bottom, side, two corners, center, spotlight, neon edge, none) with a strength slider.

**Shape & text:** corner radius slider, border (subtle, accent, gradient, none), avatar shape, accent strip, 5 fonts (Sans, Mono, Serif, Rounded, Condensed), custom title, description length (1–3 lines) and number format (12.3k or 12,345).

**Stats & charts:** stat tiles (filled, outline, tinted, plain), column count, icons in tiles, activity chart (area, line, bars, dots), languages (bar, thick bar, pills).

**Animation:** shimmer, pulsing light or a chart that draws itself. It plays in the SVG on GitHub and websites; the PNG is always a still.

Ways to use it:

- **README:** click *Download SVG*, commit it as `.github/repolysis-card.svg`, and paste the generated Markdown snippet. Avatars are embedded inside the SVG, so it renders on GitHub.
- **PNG:** *Download PNG* exports a 2× image for slides or social posts.
- **Website (live):** copy the `<iframe>` snippet. It loads `?mode=widget&repo=…&embed=1`, which shows only the card on a transparent background and fetches fresh numbers on every visit.

The **bus factor** is the smallest number of contributors who together wrote half of all commits (bots excluded). GitHub computes commit activity lazily, so the first request for a repo sometimes arrives without it. Generate again a few seconds later to add the sparkline.

## How it works

- Data comes from the public [GitHub REST API](https://docs.github.com/en/rest): repository details, languages, contributors, commits, releases, the statistics endpoints (commit activity, punch card, participation) and [repository search](https://docs.github.com/en/rest/search/search#search-repositories).
- GitHub computes the statistics endpoints lazily. The first request for a repo can come back empty; Repolysis retries a few times and tells you if you should try again in a few seconds.
- The **Repolysis score** is a log-scaled mix of stars, forks, contributors, yearly commits, health, age and recent activity, so a 50-star repo still gets a meaningful bar next to one with 200k stars.

### Rate limits

Without a token GitHub allows **60 requests per hour** and **10 searches per minute** per IP address. Because the site calls GitHub from each visitor's browser, every visitor has their own budget. One analyzed repo costs about 8 requests, a repo card 5–6 (shared with the analysis cache), and one Discover run up to 4 searches.

Repolysis stretches that budget in three layers:

1. **Browser cache.** Results are saved in `localStorage` (repo analyses, cards and searches for 1 hour, single repos for 6 hours), so repeat lookups and return visits cost nothing. When storage fills up, the oldest entries are dropped. Visitors can clear it in ⚙ settings.
2. **Shared proxy (optional, recommended for a public site).** A small Cloudflare Worker in [`worker/`](worker/) holds *your* token server-side and caches responses at the edge. All visitors share 5,000 requests/hour, identical lookups are served from cache, and stale entries are revalidated with ETags (a `304 Not Modified` doesn't count against GitHub's limit). If the proxy is down or out of quota, the site automatically falls back to direct requests.
3. **Personal token.** Anyone can paste a [fine-grained token](https://github.com/settings/personal-access-tokens/new) with no extra permissions in ⚙ settings to get their own 5,000/hour. It stays in their browser and is sent only to `api.github.com`. A personal token bypasses the proxy.

Never put a token in the site's source code: anyone could read it, and GitHub revokes tokens it finds in public repositories.

### Setting up the proxy (about 10 minutes, free)

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and Node.js.

1. Create a GitHub [fine-grained token](https://github.com/settings/personal-access-tokens/new): *Repository access → Public repositories (read-only)*, no extra permissions.
2. Edit [`worker/wrangler.toml`](worker/wrangler.toml) and set `ALLOWED_ORIGINS` to your site's address, e.g. `https://your-name.github.io`.
3. Deploy:

   ```bash
   cd worker
   npx wrangler login                  # opens the browser once
   npx wrangler secret put GITHUB_TOKEN   # paste the token when asked
   npx wrangler deploy
   ```

   Wrangler prints the Worker URL, e.g. `https://repolysis-proxy.your-name.workers.dev`.
4. Put that URL in [`assets/js/config.js`](assets/js/config.js):

   ```js
   window.REPOLYSIS_CONFIG = { apiProxy: 'https://repolysis-proxy.your-name.workers.dev' };
   ```

5. Commit and push. The API badge in the header now reads **API · shared**.

What the proxy will and won't do:

- It only forwards the read-only endpoints Repolysis uses (repos, languages, contributors, commits, releases, statistics, repo search). Everything else gets `404`/`405`, so the token can't be used for anything else.
- It only answers requests from origins listed in `ALLOWED_ORIGINS`.
- Freshness: repo details 30 min, languages/contributors/commits/releases 1 h, statistics 6 h, search 30 min. If GitHub rate-limits the proxy, it serves the last known data instead of an error.
- Cloudflare's free plan covers 100,000 requests per day.

## Run locally

No install needed, just any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open the URL it prints.

## Deploy to GitHub Pages

The repo includes a ready-made workflow, [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

1. Push to the `main` branch.
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. After about a minute the site is live at `https://<username>.github.io/<repo>/`.

The GitHub icon in the header detects the repository URL automatically on GitHub Pages. For a custom domain, add a `CNAME` file and configure DNS as described in the [docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Project structure

```
index.html              # layout and both modes
assets/css/style.css    # theme (Discord palette, dark mode)
assets/js/config.js     # site config: optional proxy URL
assets/js/api.js        # GitHub API client, caching, proxy fallback, rate limits
assets/js/analyze.js    # repo analysis: traits, percentages, fun facts
assets/js/charts.js     # analysis charts (Chart.js)
assets/js/discover.js   # repo recommender
assets/js/widget.js     # repo card: templates, backgrounds, lights, style parser, SVG/PNG export
assets/js/app.js        # UI and rendering
worker/                 # optional Cloudflare Worker proxy (shared token + edge cache)
```

## Tech

Plain HTML, CSS and JavaScript, [Chart.js 4](https://www.chartjs.org/) from a CDN, and the Inter, Space Grotesk and JetBrains Mono fonts.

## License

MIT. Not affiliated with GitHub, Inc. or Discord Inc.
