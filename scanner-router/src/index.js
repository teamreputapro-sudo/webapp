export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (!url.pathname.startsWith("/scanner")) {
      return fetch(req);
    }

    const PAGES_ORIGIN = "https://68d331af.webapp-cwo.pages.dev";

    let p = url.pathname.replace(/^\/scanner/, "");
    if (p === "" || p === "/") p = "/index.html";

    const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(p);
    if (!looksLikeFile && p !== "/index.html") p = "/index.html";

    const target = new URL(PAGES_ORIGIN);
    target.pathname = p;
    target.search = url.search;

    return fetch(new Request(target.toString(), req));
  }
};
