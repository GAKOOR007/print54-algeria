export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    let html = await response.text();

    // Remove the Lovable "Edit with Lovable" badge and its generated CSS/font.
    html = html.replace(/\n<style>\n\t@font-face \{\n\t\tfont-family: 'CameraPlainVariable';[\s\S]*?<\/style>/, "");
    html = html.replace(/<div id="lovable-badge"[\s\S]*?<\/div>\s*(?=<\/main>|<script|<\/body>)/, "");
    html = html.replace(/<div id="lovable-badge"[\s\S]*?<\/div>/, "");

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
