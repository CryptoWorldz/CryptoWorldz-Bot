const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadProtectedEnvironment } = require('../src/protected-env');

test('Jupiter key is recovered from later protected configuration when blank', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worldz-env-'));
  try {
    const appRoot = path.join(root, 'nodejs', 'app');
    const protectedRoot = path.join(root, 'domains', 'cryptobotz.cryptoworldz.xyz', 'nodejs');
    fs.mkdirSync(appRoot, {recursive:true});
    fs.mkdirSync(protectedRoot, {recursive:true});
    fs.writeFileSync(path.join(root,'nodejs','.env'),'JUPITER_API_KEY=\nOTHER_VALUE=primary\n');
    fs.writeFileSync(path.join(protectedRoot,'.env'),'JUPITER_API_KEY=test-placeholder\nOTHER_VALUE=secondary\n');
    const env = {JUPITER_API_KEY:'',HOME:root};
    const result = loadProtectedEnvironment({appRoot,env,home:root});
    assert.equal(result.loaded,true);
    assert.equal(env.JUPITER_API_KEY,'test-placeholder');
    assert.equal(env.OTHER_VALUE,'primary');
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Nonblank process environment Jupiter key is never overridden', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worldz-env-'));
  try {
    fs.writeFileSync(path.join(root,'.env'),'JUPITER_API_KEY=from-file\n');
    const env = {JUPITER_API_KEY:'from-process',HOME:root};
    loadProtectedEnvironment({appRoot:root,env,home:root});
    assert.equal(env.JUPITER_API_KEY,'from-process');
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});
