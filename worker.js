export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    let html = await response.text();

    // Remove the Lovable "Edit with Lovable" badge and its generated CSS/font.
    html = html.replace(/\n<style>[\s\S]*?CameraPlainVariable[\s\S]*?<\/style>/, "");

    // Also hide the badge unconditionally in case the generated markup is
    // injected by client-side code after the initial HTML is parsed.
    const badgeKiller = '<style id="print54-no-lovable-badge">#lovable-badge{display:none!important;visibility:hidden!important;pointer-events:none!important}</style>';
    html = html.replace("</head>", `${badgeKiller}</head>`);

    // Remove the badge element when it exists in the server HTML.
    const marker = '<div id="lovable-badge"';
    const start = html.indexOf(marker);
    if (start !== -1) {
      let depth = 0;
      let pos = start;
      while (pos < html.length) {
        const nextOpen = html.indexOf("<div", pos);
        const nextClose = html.indexOf("</div>", pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth += 1;
          pos = nextOpen + 4;
        } else {
          depth -= 1;
          pos = nextClose + 6;
          if (depth === 0) {
            html = html.slice(0, start) + html.slice(pos);
            break;
          }
        }
      }
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "no-store");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
