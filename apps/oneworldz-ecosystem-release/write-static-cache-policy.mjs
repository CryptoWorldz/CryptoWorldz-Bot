import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const policy = `# OneWorldz canonical static freshness policy
# Keep production HTML/XML/JSON on the exact deployed release during final verification.
<IfModule LiteSpeed>
  CacheDisable public /
  RewriteEngine On
  RewriteRule .* - [E=Cache-Control:no-cache,E=Cache-Control:no-store]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(html?|json|xml)$">
    Header always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    Header always set Pragma "no-cache"
    Header always set Expires "0"
  </FilesMatch>
</IfModule>
`;

for (const target of productionTargets) {
  const targetRoot = path.join(dist, target.key);
  const policyPath = path.join(targetRoot, ".htaccess");
  await writeFile(policyPath, policy, "utf8");

  const bytes = Buffer.from(policy, "utf8");
  const manifestPath = path.join(targetRoot, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const record = {
    path: "/.htaccess",
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
  manifest.files = [...(manifest.files || []).filter((item) => item.path !== record.path), record]
    .sort((a, b) => a.path.localeCompare(b.path));
  manifest.cache_policy = "LITESPEED_PUBLIC_CACHE_DISABLED_CANONICAL_STATIC_FLEET";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(`Applied canonical no-stale-cache policy to ${productionTargets.length} production packages.`);
