import test from 'node:test';
import assert from 'node:assert/strict';
import { extractExternalCssImageUrls } from './worldz-css-url-parser.mjs';

const base = 'https://xrpworldz.xyz/path/page';

test('extracts real relative and absolute CSS image URLs', () => {
  assert.deepEqual(
    extractExternalCssImageUrls('linear-gradient(#000,#111), url("/images/hero.webp"), url(https://cdn.example/a.png)', base),
    ['https://xrpworldz.xyz/images/hero.webp', 'https://cdn.example/a.png']
  );
});

test('ignores data SVG and nested paint-server url fragments', () => {
  const svg = `url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg'><defs><radialGradient id='r'/></defs><circle fill='url(#r)'/></svg>")`;
  assert.deepEqual(extractExternalCssImageUrls(svg, base), []);
});

test('ignores standalone fragment paint servers and blob/data URLs', () => {
  assert.deepEqual(extractExternalCssImageUrls(`url(#s), url('#r'), url(data:image/png;base64,abc), url(blob:https://xrpworldz.xyz/123)`, base), []);
});
