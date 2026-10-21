#!/usr/bin/env node
/** Read-only integrity check for all tracked Worldz public-site roots. */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (path) => join(root, path);
function requireFile(path) {
  if (!existsSync(at(path)) || !statSync(at(path)).isFile() || statSync(at(path)).size === 0) {
    throw new Error('Missing or empty required file: ' + path);
  }
}
requireFile('DOMAINS.txt');
const domains = readFileSync(at('DOMAINS.txt'), 'utf8')
  .split(/\r?\n/).map(value => value.trim()).filter(Boolean);
if (domains.length !== 18 || new Set(domains).size !== 18) {
  throw new Error('Expected 18 unique legacy domain roots, found ' + domains.length);
}
const additionalSites = ['worldzhq.com', 'worldz.live', 'launchpad.cryptoworldz.xyz'];
for (const domain of [...domains, ...additionalSites]) {
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain) || domain.includes('..')) {
    throw new Error('Invalid domain name: ' + domain);
  }
  requireFile(domain + '/index.html');
  const html = readFileSync(at(domain + '/index.html'), 'utf8');
  if (!/<html(?:\s|>)/i.test(html)) throw new Error('Missing HTML document: ' + domain);
}
for (const path of [
  'tools/build_ecosystem.py',
  'tools/full_site_audit.py',
  'test/auto-core.test.js',
  'src/hub-central/preload.js'
]) requireFile(path);
console.log('WORLDZ_REPOSITORY_STRUCTURE_PASS legacy_domains=' + domains.length +
  ' additional_sites=' + additionalSites.length);
