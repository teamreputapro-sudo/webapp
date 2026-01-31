export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (!url.pathname.startsWith("/scanner")) return fetch(req);

    const PAGES_ORIGIN = "https://68d331af.webapp-cwo.pages.dev";

    let p = url.pathname.replace(/^\/scanner/, "");
    if (p === "" || p === "/") p = "/";

    const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(p);
    if (!looksLikeFile) p = "/";

    const target = new URL(PAGES_ORIGIN);
    target.pathname = p;
    target.search = url.search;

    const proxiedReq = new Request(target.toString(), {
      method: req.method,
      headers: req.headers,
      redirect: "follow",
    });

    const res = await fetch(proxiedReq);
    const h = new Headers(res.headers);
    h.set("x-scanner-worker", "1");

    return new Response(res.body, { status: res.status, headers: h });
  }
};
