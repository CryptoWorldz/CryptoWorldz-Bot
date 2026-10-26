const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// Follow local imports without executing the application or contacting services.
function completeManifest(root, entries) {
  root = path.resolve(root);
  const files = new Set(entries);
  const queue = [...files];
  for (const entry of queue) {
    const absolute = path.resolve(root, entry);
    if (!absolute.startsWith(root + path.sep) || !/\.(?:js|cjs|json|html|css|svg|png|jpe?g|webp|ico|yaml|yml|txt|woff2?|ttf|map)$/i.test(entry)) {
      throw new Error('Unsafe runtime manifest path: ' + entry);
    }
    if (!/\.(?:js|cjs)$/.test(entry)) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    const resolve = createRequire(absolute).resolve;
    for (const match of source.matchAll(/\brequire\(\s*(['"])(\.[^'"\r\n]+)\1\s*\)/g)) {
      const resolved = resolve(match[2]);
      const relative = path.relative(root, resolved).split(path.sep).join('/');
      if (!resolved.startsWith(root + path.sep) || !/\.(?:js|cjs|json)$/.test(relative)) {
        throw new Error('Unsafe local runtime dependency: ' + entry);
      }
      if (!files.has(relative)) {
        files.add(relative);
        queue.push(relative);
      }
    }
  }
  return [...files].sort();
}

if (require.main === module) {
  const manifest = process.argv[2];
  const entries = fs.readFileSync(manifest, 'utf8').trim().split(/\r?\n/);
  const complete = completeManifest(process.cwd(), entries);
  fs.writeFileSync(manifest, complete.join('\n') + '\n');
  console.log('ZED_RUNTIME_LOCAL_DEPENDENCIES=PASS added=' + (complete.length - entries.length));
}
module.exports = { completeManifest };
