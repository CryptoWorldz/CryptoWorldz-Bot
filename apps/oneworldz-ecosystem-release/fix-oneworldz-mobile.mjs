import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const cssFile = path.join(root, "dist", "ecosystem", "oneworldz", "assets", "css", "oneworldz-visual.css");
const marker = "ONEWORLDZ_OFFICIAL_NETWORK_MOBILE_FIX";

const patch = `

/* ${marker}: keep the OneWorldz X and Telegram destinations readable as separate cards. */
.oneworldz-blue-white #launch-network .launch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.5rem 0 0;
}

.oneworldz-blue-white #launch-network .launch-grid > a {
  display: grid;
  gap: .3rem;
  min-width: 0;
  padding: 1rem 1.15rem;
  border: 1px solid rgba(101, 185, 255, .28);
  border-radius: .8rem;
  background: linear-gradient(145deg, rgba(10, 55, 105, .76), rgba(2, 14, 34, .96));
  color: #fff;
  text-decoration: none;
  box-shadow: 0 18px 48px rgba(0, 0, 0, .2);
}

.oneworldz-blue-white #launch-network .launch-grid > a small,
.oneworldz-blue-white #launch-network .launch-grid > a strong,
.oneworldz-blue-white #launch-network .launch-grid > a span {
  display: block;
  min-width: 0;
}

.oneworldz-blue-white #launch-network .launch-grid > a small {
  color: var(--ow-sky);
  font-size: .68rem;
  font-weight: 900;
  letter-spacing: .18em;
}

.oneworldz-blue-white #launch-network .launch-grid > a strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.25rem, 2vw, 1.7rem);
  line-height: 1.1;
}

.oneworldz-blue-white #launch-network .launch-grid > a span {
  overflow-wrap: anywhere;
  color: #cbdff5;
  font-size: .82rem;
}

@media (max-width: 720px) {
  .oneworldz-blue-white #launch-network .launch-grid {
    grid-template-columns: 1fr;
    gap: .8rem;
  }

  .oneworldz-blue-white #launch-network .launch-grid > a {
    width: 100%;
    padding: 1rem;
  }

  .oneworldz-blue-white #launch-network .button-row,
  .oneworldz-blue-white #launch-network .button {
    width: 100%;
  }
}
`;

let css = await readFile(cssFile, "utf8");
if (!css.includes(marker)) {
  css += patch;
  await writeFile(cssFile, css, "utf8");
}

if (!css.includes("#launch-network .launch-grid")) throw new Error("OneWorldz official network layout patch missing");
console.log("ONEWORLDZ_MOBILE_NETWORK_FIX=PASS");
