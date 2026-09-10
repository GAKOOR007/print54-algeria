export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    // Use Cloudflare's HTMLRewriter so the badge is removed structurally,
    // including nested elements. This is more reliable than regex/string parsing.
    const transformed = new HTMLRewriter()
      .on("#lovable-badge", {
        element(element) {
          element.remove();
        },
      })
      .on("script[src]", {
        element(element) {
          const src = element.getAttribute("src") || "";
          if (src.includes("/~flock.js")) {
            element.remove();
          }
        },
      })
      .on("style", {
        text(text) {
          if (text.text.includes("lovable-badge") || text.text.includes("CameraPlainVariable")) {
            text.remove();
          }
        },
      })
      .transform(response);

    const headers = new Headers(transformed.headers);
    headers.delete("content-length");
    headers.set("cache-control", "no-store, no-cache, must-revalidate");

    return new Response(transformed.body, {
      status: transformed.status,
      statusText: transformed.statusText,
      headers,
    });
  },
};
