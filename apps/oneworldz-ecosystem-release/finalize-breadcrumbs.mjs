import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const plain = (value = "") => String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function listHtml(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listHtml(dir, child));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

function routeFor(file) {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`;
  return `/${file}`;
}

let added = 0;
for (const target of productionTargets) {
  const packageDir = path.join(dist, target.key);
  for (const file of await listHtml(packageDir)) {
    const route = routeFor(file);
    if (route === "/") continue;
    const page = path.join(packageDir, file);
    let html = await readFile(page, "utf8");
    if (html.includes('"@type":"BreadcrumbList"') || html.includes('"@type": "BreadcrumbList"')) continue;
    const title = plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || target.expectedTitle);
    const canonical = `https://${target.domain}${route}`;
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: target.expectedTitle.split("|")[0].trim(), item: `https://${target.domain}/` },
        { "@type": "ListItem", position: 2, name: title, item: canonical }
      ]
    };
    const tag = `<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>`;
    if (!html.includes("</head>")) throw new Error(`${target.key}/${file}: missing head for breadcrumb schema`);
    html = html.replace("</head>", `  ${tag}\n</head>`);
    await writeFile(page, html, "utf8");
    added += 1;
  }
}

if (added < 18) throw new Error(`Breadcrumb finalizer expected multiple structural pages, added only ${added}`);
console.log(`BreadcrumbList schema finalized on ${added} non-home pages.`);
