const { execFileSync, spawnSync } = require("node:child_process");
// Check each tracked file separately: node --check only accepts one entry file.
const filters = process.argv.slice(2);
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(name => /\.(?:js|cjs|mjs)$/.test(name))
  .filter(name => !filters.length || filters.some(filter => name === filter || (filter.endsWith("/") && name.startsWith(filter))));
let failures = 0;
for (const name of paths) {
  const result = spawnSync(process.execPath, ["--check", name], { encoding: "utf8" });
  if (result.status !== 0) {
    failures++;
    process.stderr.write(result.stderr || `Unable to check ${name}\n`);
  }
}
console.log(`JavaScript syntax: ${paths.length} files, ${failures} failures`);
process.exitCode = failures ? 1 : 0;
