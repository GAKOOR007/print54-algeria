import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

const ORIGIN = 'https://print54-algeria.lovable.app';
const OUT = 'public';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const queue = ['/'];
const seen = new Set();

function localPath(url) {
  const u = new URL(url, ORIGIN);
  let p = decodeURIComponent(u.pathname);
  if (p === '/' || p.endsWith('/')) p += 'index.html';
  return join(OUT, normalize(p).replace(/^[/\\]+/, ''));
}
function sameOrigin(url) {
  try { return new URL(url, ORIGIN).origin === ORIGIN; } catch { return false; }
}
function candidates(text) {
  const found = new Set();
  const re = /(?:src|href|url\(|import\(|sourceMappingURL=|"|')((?:\/|https?:\/\/)[^"'\s)<>]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[1].replace(/&amp;/g, '&');
    if (sameOrigin(raw)) {
      const u = new URL(raw, ORIGIN);
      found.add(u.pathname + u.search);
    }
  }
  return [...found];
}
async function fetchOne(path) {
  const url = new URL(path, ORIGIN).href;
  if (seen.has(url)) return;
  seen.add(url);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const type = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  const out = localPath(url);
  await mkdir(dirname(out), { recursive: true });
  if (type.includes('text') || /\.(html?|css|js|mjs|json|map|xml|svg)(\?|$)/i.test(url)) {
    let text = buf.toString('utf8').replaceAll(ORIGIN, '');
    await writeFile(out, text);
    for (const next of candidates(text)) queue.push(next);
  } else await writeFile(out, buf);
  console.log('mirrored', path);
}
while (queue.length) {
  const path = queue.shift();
  try { await fetchOne(path); } catch (e) { console.warn('skip', path, e.message); }
}
console.log(`Mirror complete: ${seen.size} resources copied from ${ORIGIN}`);
