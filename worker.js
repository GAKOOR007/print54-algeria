export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    let html = await response.text();

    // Remove generated Lovable badge styles and its external font definition.
    html = html.replace(/<style[^>]*>[\s\S]*?(?:lovable-badge|CameraPlainVariable)[\s\S]*?<\/style>/gi, "");
    html = html.replace(/@import\s+url\(["']?https:\/\/cdn\.gpteng\.co\/mcp-widgets\/v1\/fonts\/CameraPlainVariable\.woff2[^)]*\)[^;]*;?/gi, "");

    // Remove the Lovable badge from server-rendered HTML, including nested elements.
    const marker = '<div id="lovable-badge"';
    let start = html.indexOf(marker);
    while (start !== -1) {
      let depth = 0;
      let pos = start;
      let removed = false;

      while (pos < html.length) {
        const nextOpen = html.indexOf("<div", pos);
        const nextClose = html.indexOf("</div>", pos);
        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 4;
        } else {
          depth--;
          pos = nextClose + 6;
          if (depth === 0) {
            html = html.slice(0, start) + html.slice(pos);
            removed = true;
            break;
          }
        }
      }

      start = removed ? html.indexOf(marker) : -1;
    }

    // Remove the Lovable helper script as well; the independent site must not load it.
    html = html.replace(/<script[^>]+src=["'][^"']*\/~flock\.js[^"']*["'][^>]*><\/script>/gi, "");

    // Defense in depth: remove/hide any badge recreated by client-side code.
    const killer = `<style id="print54-no-lovable-badge">#lovable-badge,#lovable-badge *{display:none!important;visibility:hidden!important;pointer-events:none!important}</style><script>(function(){function x(){document.querySelectorAll('#lovable-badge').forEach(function(e){e.remove()});}x();new MutationObserver(x).observe(document.documentElement,{childList:true,subtree:true});})();</script>`;
    html = html.replace("</head>", `${killer}</head>`);

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "no-store, no-cache, must-revalidate");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
