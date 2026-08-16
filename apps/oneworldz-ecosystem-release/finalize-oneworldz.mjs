import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "dist", "ecosystem", "oneworldz", "index.html");
let html = await readFile(file, "utf8");

html = html.replace('<body style="--accent:#4da3ff;--accent-2:#b763ff">', '<body class="oneworldz-blue-white" style="--accent:#4da3ff;--accent-2:#ffffff;background:#061328;color:#ffffff">');
if (!html.includes('class="oneworldz-blue-white"')) throw new Error("OneWorldz blue/white theme marker missing");
if (!html.includes("little-legend.webp")) throw new Error("Little Legend / future scholar lead visual missing from OneWorldz");
if (!html.includes('href="/community-support/"')) throw new Error("Dedicated Community Support route missing from OneWorldz");
if (!html.includes("2026–2030 HELP THE PEOPLE MOVEMENT")) throw new Error("2026–2030 Help the People movement missing from OneWorldz");

await writeFile(file, html, "utf8");
console.log("OneWorldz finalised: blue/white identity, Little Legend lead visual, Community Support and 2026–2030 movement locked.");
