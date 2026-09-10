export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    let html = await response.text();

    // Remove every generated Lovable badge style block.
    html = html.replace(/<style[^>]*>[\s\S]*?(?:lovable-badge|CameraPlainVariable)[\s\S]*?<\/style>/gi, "");

    // Remove the badge from the server-rendered HTML, including nested divs.
    const marker = '<div id="lovable-badge"';
    let start = html.indexOf(marker);
    while (start !== -1) {
      let depth = 0;
      let pos = start;
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
            break;
          }
        }
      }
      start = html.indexOf(marker);
    }

    // Defense in depth: if any client-side code recreates it, hide and remove it immediately.
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
