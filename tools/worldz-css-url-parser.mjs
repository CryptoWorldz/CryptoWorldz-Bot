export function extractExternalCssImageUrls(cssText, baseUrl) {
  const css = String(cssText || '');
  const rawUrls = [];
  const lower = css.toLowerCase();
  let pos = 0;

  while (pos < css.length) {
    const start = lower.indexOf('url(', pos);
    if (start < 0) break;
    let i = start + 4;
    while (i < css.length && /\s/.test(css[i])) i++;

    let value = '';
    const quote = css[i] === '"' || css[i] === "'" ? css[i++] : null;
    if (quote) {
      while (i < css.length) {
        const ch = css[i++];
        if (ch === '\\' && i < css.length) {
          value += ch + css[i++];
          continue;
        }
        if (ch === quote) break;
        value += ch;
      }
      while (i < css.length && /\s/.test(css[i])) i++;
      if (css[i] === ')') i++;
    } else {
      let depth = 1;
      while (i < css.length && depth > 0) {
        const ch = css[i++];
        if (ch === '(') {
          depth++;
          value += ch;
        } else if (ch === ')') {
          depth--;
          if (depth > 0) value += ch;
        } else {
          value += ch;
        }
      }
    }

    rawUrls.push(value.trim());
    pos = Math.max(i, start + 4);
  }

  const out = [];
  for (const raw of rawUrls) {
    if (!raw || raw.startsWith('#')) continue;
    if (/^(?:data|blob|about|javascript):/i.test(raw)) continue;
    try {
      const href = new URL(raw, baseUrl).href;
      if (/^https?:/i.test(href)) out.push(href);
    } catch {}
  }
  return [...new Set(out)];
}
