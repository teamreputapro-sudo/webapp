export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (!url.pathname.startsWith("/scanner")) return fetch(req);

    const PAGES_ORIGIN = "https://e4e4ac09.webapp-cwo.pages.dev";

    const isAssetsPath = url.pathname.startsWith("/scanner/assets/");
    let p = url.pathname.replace(/^\/scanner/, "");
    if (p === "" || p === "/") p = "/";

    const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(p);
    if (!isAssetsPath && !looksLikeFile) p = "/";

    const target = new URL(PAGES_ORIGIN);
    target.pathname = p;
    target.search = url.search;

    const proxiedReq = new Request(target.toString(), {
      method: req.method,
      headers: req.headers,
      redirect: "follow",
    });

    const resp = await fetch(proxiedReq);
    const h = new Headers(resp.headers);
    h.set("x-scanner-worker", "1");
    if (isAssetsPath) {
      h.set("Cache-Control", "public, max-age=31536000, immutable");
    }

    return new Response(resp.body, { status: resp.status, headers: h });
  }
};
