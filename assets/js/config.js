/* ============================================================
   Repolysis — site configuration
   ============================================================

   apiProxy: URL of your Repolysis proxy (Cloudflare Worker from the /worker folder),
   e.g. "https://repolysis-proxy.your-name.workers.dev".

   Leave it empty to call api.github.com directly from each visitor's browser
   (60 requests/hour per visitor). With a proxy all visitors share your token's
   5,000 requests/hour, plus an edge cache that makes repeat lookups free.
   If the proxy is down or out of quota, the site falls back to direct calls.
*/
window.REPOLYSIS_CONFIG = {
  apiProxy: '',
};
