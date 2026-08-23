import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(root, "dist", "ecosystem");

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

test("the final background layer preserves every approved main desktop and mobile image", async () => {
  const htmlFiles = (await walk(distRoot)).filter((file) => file.endsWith(".html"));
  let checked = 0;

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const picture = html.match(/<picture class="[^"]*\b(?:hero-art|support-emblem)\b[^"]*">([\s\S]*?)<\/picture>/)?.[1];
    if (!picture) continue;

    const desktop = picture.match(/<img\b[^>]*\bsrc="(\/assets\/[^"?#]+)"/)?.[1];
    const mobile = picture.match(/<source\b[^>]*\bsrcset="(\/assets\/[^"?#]+)"/)?.[1] || desktop;
    assert.ok(desktop, `${file}: approved main desktop image missing`);
    assert.ok(html.includes(`--full-bg-desktop:url('${desktop}')`), `${file}: desktop main image overwritten`);
    assert.ok(html.includes(`--full-bg-mobile:url('${mobile}')`), `${file}: mobile main image overwritten`);
    checked += 1;
  }

  assert.ok(checked >= 18, `expected approved main-image proof across the fleet; checked ${checked}`);
});
