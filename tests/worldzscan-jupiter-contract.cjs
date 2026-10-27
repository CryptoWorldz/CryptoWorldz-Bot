const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/worldzscan.js'), 'utf8');
assert.match(source, /"x-api-key": apiKey/, 'Jupiter tokens lookup must authenticate');
assert.match(source, /row\.id === address \|\| row\.address === address/, 'match exact mint only');
assert.doesNotMatch(source, /\|\| rows\[0\]/, 'do not use unrelated search results');
assert.match(source, /jupiterApiKey: env\.JUPITER_API_KEY/, 'bot command must pass runtime key');
console.log('PASS: WorldzScan Jupiter authentication and exact-mint contract');
