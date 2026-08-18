import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || 'governance/community-support-links.json';
const outputPath = process.argv[3] || 'tmp/community-facebook-metadata.json';
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function decodeHtml(s='') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? decodeHtml(m[1]) : '';
}

function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const prop = attr(tag, 'property') || attr(tag, 'name');
    if (prop.toLowerCase() === key.toLowerCase()) return attr(tag, 'content');
  }
  return '';
}

function titleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')) : '';
}

function cleanTitle(value) {
  let t = decodeHtml(value).replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*[|–—-]\s*Facebook\s*$/i, '').trim();
  if (/^(facebook|log in or sign up to view|log into facebook)$/i.test(t)) return '';
  return t;
}

async function resolveProfile(profile) {
  const result = {
    display_order: profile.display_order,
    facebook_url: profile.facebook_url,
    final_url: '',
    http_status: 0,
    display_name: '',
    preview_image: '',
    resolved: false,
    reason: ''
  };
  try {
    const res = await fetch(profile.facebook_url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
        'accept-language': 'en-AU,en;q=0.9',
        accept: 'text/html,application/xhtml+xml'
      }
    });
    result.http_status = res.status;
    result.final_url = res.url;
    const html = await res.text();
    const ogTitle = cleanTitle(meta(html, 'og:title'));
    const pageTitle = cleanTitle(titleTag(html));
    result.display_name = ogTitle || pageTitle;
    result.preview_image = meta(html, 'og:image');
    const blocked = /log in to facebook|you must log in|checkpoint|login_form/i.test(html);
    if (!res.ok) result.reason = `HTTP ${res.status}`;
    else if (blocked && !result.display_name) result.reason = 'Facebook login wall / metadata unavailable anonymously';
    else if (!result.display_name) result.reason = 'No public display name metadata returned';
    else if (!result.preview_image) result.reason = 'Display name found but no public preview image metadata returned';
    else result.resolved = true;
  } catch (error) {
    result.reason = String(error?.message || error);
  }
  return result;
}

const results = [];
for (const profile of input.profiles) {
  const result = await resolveProfile(profile);
  results.push(result);
  console.log(`${String(result.display_order).padStart(2,'0')}: ${result.resolved ? 'RESOLVED' : 'UNRESOLVED'} ${result.display_name || result.reason}`);
  await new Promise((r) => setTimeout(r, 500));
}

const resolvedCount = results.filter((x) => x.resolved).length;
const out = {
  generated_at: new Date().toISOString(),
  source_count: input.count,
  resolved_count: resolvedCount,
  unresolved_count: input.count - resolvedCount,
  profiles: results
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`Resolved ${resolvedCount}/${input.count}. Output: ${outputPath}`);

// Protected Hostinger live-monitor trigger: dependency-free GPT startup isolation v2.
