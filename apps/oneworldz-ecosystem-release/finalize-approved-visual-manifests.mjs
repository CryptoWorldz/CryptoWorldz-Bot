import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");

const sourceModes = Object.freeze({
  foodworldz: "approved-avif-master",
  donateworldz: "approved-support-composite",
  hodlergalaxy: "approved-production-pair"
});

for (const [key, sourceMode] of Object.entries(sourceModes)) {
  const manifestPath = path.join(dist, key, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.approved_visual = {
    ...(manifest.approved_visual || {}),
    key,
    desktop: `/assets/approved/desktop/${key}-hero.avif`,
    mobile: `/assets/approved/mobile/${key}-hero.avif`,
    responsive_policy: "distinct-production-renders",
    source_mode: sourceMode
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log("Approved responsive visual policy preserved in final release manifests.");