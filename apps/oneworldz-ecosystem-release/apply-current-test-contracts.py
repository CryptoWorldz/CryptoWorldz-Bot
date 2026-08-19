from pathlib import Path

root = Path('.')

def replace(path, old, new):
    p = root / path
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'anchor missing in {path}: {old[:80]}')
    p.write_text(s.replace(old, new, 1))

replace(
    'apps/oneworldz-ecosystem-release/package.json',
    'node finalize-user-structure.mjs && node optimize-seo.mjs && node finalize-themes.mjs',
    'node finalize-user-structure.mjs && node optimize-seo.mjs && node finalize-breadcrumbs.mjs && node finalize-themes.mjs'
)

replace(
    'apps/oneworldz-ecosystem-release/test/expansion.test.mjs',
    'buildTest("DonateWorldz contains three separated support routes and payment boundaries", async () => {\n  const root = path.join(distRoot, "donateworldz");\n  for (const route of ["reagan-children", "community-impact", "jayjayteamdev"]) {',
    'buildTest("DonateWorldz contains four separated support routes and payment boundaries", async () => {\n  const root = path.join(distRoot, "donateworldz");\n  for (const route of ["reagan-children", "community-impact", "support-jayjayteamdev", "davis-family"]) {'
)

replace(
    'apps/oneworldz-ecosystem-release/test/production-readiness.test.mjs',
    '  assert.match(oneworldz, /class="oneworldz-blue-white"/);\n  assert.match(oneworldz, /--accent:#4da3ff;--accent-2:#ffffff/);\n  assert.match(cryptoworldz, /class="cryptoworldz-visual route-home"/);\n  assert.match(cryptoworldz, /cryptoworldz-visual\\.css/);\n  assert.match(pdc, /class="pdc-purple-theme"/);',
    '  assert.match(oneworldz, /class="[^"]*\\boneworldz-blue-white\\b[^"]*"/);\n  assert.match(oneworldz, /--accent:#4da3ff;--accent-2:#ffffff/);\n  assert.match(cryptoworldz, /class="[^"]*\\bcryptoworldz-visual\\b[^"]*"/);\n  assert.match(cryptoworldz, /class="[^"]*\\broute-home\\b[^"]*"/);\n  assert.match(cryptoworldz, /cryptoworldz-visual\\.css/);\n  assert.match(pdc, /class="[^"]*\\bpdc-purple-theme\\b[^"]*"/);'
)

replace(
    'apps/oneworldz-ecosystem-release/test/user-experience-reality.test.mjs',
    '  assert.ok(html.includes("Evidence → Human Review → Recognition"));\n  assert.ok(html.includes("https://cryptobotz.cryptoworldz.xyz/api/public/heroes"));\n  const sitemap = await read(path.join(dist, "oneworldz", "sitemap.xml"));',
    '  assert.ok(html.includes("Evidence → Human Review → Recognition"));\n  assert.ok(html.includes("/assets/js/heroes.js"));\n  const heroesJs = await read(path.join(dist, "oneworldz", "assets", "js", "heroes.js"));\n  assert.ok(heroesJs.includes("https://cryptobotz.cryptoworldz.xyz/api/public/heroes"));\n  assert.ok(heroesJs.includes(\'location.hostname === "oneworldz.com"\'));\n  assert.ok(heroesJs.includes(\'location.hostname === "www.oneworldz.com"\'));\n  const sitemap = await read(path.join(dist, "oneworldz", "sitemap.xml"));'
)

replace(
    'test/http.test.js',
    '  assert.match(miniAppSource, /Help Reagan Feed 60 Orphaned Children in Uganda/);\n  assert.match(miniAppSource, /https:\\/\\/gofund\\.me\\/c2e4fa936/);\n  assert.doesNotMatch(miniAppSource, /https:\\/\\/gofund\\.me\\/65129e58a/);',
    '  assert.match(miniAppSource, /Help Reagan & Children in Uganda/);\n  assert.match(miniAppSource, /https:\\/\\/donateworldz\\.com\\/reagan-children\\//);\n  assert.doesNotMatch(miniAppSource, /gofund(?:me)?\\.com|gofund\\.me/i);'
)

print('CURRENT_TEST_CONTRACTS_AND_BREADCRUMB_BUILD_ORDER=PATCHED')
