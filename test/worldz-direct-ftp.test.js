const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('direct Worldz FTP helper generates PUT commands and switches index last', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'worldz-direct-ftp-'));
  const site = path.join(temp, 'site');
  fs.mkdirSync(path.join(site, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(site, 'config'), { recursive: true });
  fs.writeFileSync(path.join(site, 'index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(site, 'assets', 'app.js'), 'console.log("ok")');
  fs.writeFileSync(path.join(site, 'config', 'worlds.js'), 'window.WORLDZ = {};');

  const script = path.join(__dirname, '..', 'tools', 'worldz-direct-ftp.sh');
  const result = spawnSync('bash', [script, 'upload', site], {
    encoding: 'utf8',
    env: {
      ...process.env,
      FTP_HOST: 'dry-run.invalid',
      FTP_USERNAME: 'dry-run',
      FTP_PASSWORD: 'dry-run',
      FTP_PORT: '21',
      FTP_SERVER_DIR: '/',
      WORLDZ_FTP_DRY_RUN: '1',
      RUNNER_TEMP: temp,
      GITHUB_RUN_ID: 'test'
    }
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /dry run generated 3 file commands/i);

  const commands = fs.readFileSync(path.join(temp, 'worldz-upload-test.lftp'), 'utf8');
  const putCommands = commands.split('\n').filter((line) => line.startsWith('put -O '));
  assert.equal(putCommands.length, 3);
  assert.match(putCommands[0], /assets\/app\.js/);
  assert.match(putCommands[1], /config\/worlds\.js/);
  assert.match(putCommands.at(-1), /index\.html/);
  assert.doesNotMatch(commands, /\bmirror\b/);

  fs.rmSync(temp, { recursive: true, force: true });
});
