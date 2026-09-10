export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    let html = await response.text();

    // Remove all generated Lovable badge styles and its external font definition.
    html = html.replace(/<style[^>]*>[\s\S]*?(?:lovable-badge|CameraPlainVariable)[\s\S]*?<\/style>/gi, "");
    html = html.replace(/@import\s+url\(["']?https:\/\/cdn\.gpteng\.co\/mcp-widgets\/v1\/fonts\/CameraPlainVariable\.woff2[^)]*\)[^;]*;?/gi, "");

    // Remove every Lovable badge element from server-rendered HTML, regardless of tag name or nesting.
    const removeLovableBadge = (source) => {
      const open = /<([a-zA-Z][\w:-]*)\b[^>]*\bid\s*=\s*["']lovable-badge["'][^>]*>/i;
      let match;
      while ((match = open.exec(source))) {
        const tag = match[1];
        const start = match.index;
        const bodyStart = start + match[0].length;
        const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
        token.lastIndex = bodyStart;
        let depth = 1;
        let end = source.length;
        let tokenMatch;
        while ((tokenMatch = token.exec(source))) {
          if (/^<\//.test(tokenMatch[0])) {
            depth--;
            if (depth === 0) {
              end = tokenMatch.index + tokenMatch[0].length;
              break;
            }
          } else if (!/\/\s*>$/.test(tokenMatch[0])) {
            depth++;
          }
        }
        source = source.slice(0, start) + source.slice(end);
      }
      return source;
    };

    html = removeLovableBadge(html);

    // Remove Lovable's helper/analytics script from the independent deployment.
    html = html.replace(/<script[^>]+src=["'][^"']*\/~flock\.js[^"']*["'][^>]*><\/script>/gi, "");

    // Defense in depth: if any client-side code recreates a Lovable badge, remove it immediately.
    const killer = `<style id="print54-no-lovable-badge">#lovable-badge,#lovable-badge *,[id*="lovable-badge"],[class*="lovable-badge"]{display:none!important;visibility:hidden!important;pointer-events:none!important}</style><script>(function(){function purge(){document.querySelectorAll('#lovable-badge,[id*="lovable-badge"],[class*="lovable-badge"]').forEach(function(e){e.remove()});}purge();new MutationObserver(purge).observe(document.documentElement,{childList:true,subtree:true});})();</script>`;
    html = html.replace(/<\/head>/i, `${killer}</head>`);

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
