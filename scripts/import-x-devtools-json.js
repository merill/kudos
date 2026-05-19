import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const inputJson = process.argv[2] || '/Users/merill/Downloads/x-kudos.json';
const projectRoot = process.cwd();
const avatarDir = path.join(projectRoot, 'public', 'avatars');
const outputJson = path.join(projectRoot, 'src', 'lib', 'kudos.json');

const payload = JSON.parse(fs.readFileSync(inputJson, 'utf8'));
const exportedItems = Array.isArray(payload.items) ? payload.items : [];
const kudos = JSON.parse(fs.readFileSync(outputJson, 'utf8'));

fs.mkdirSync(avatarDir, { recursive: true });

const bySource = new Map();
const byNameQuote = new Map();
for (const item of kudos) {
  if (item.source) bySource.set(normalizeSource(item.source), item);
  byNameQuote.set(nameQuoteKey(item), item);
}

let added = 0;
let updated = 0;
let avatarsDownloaded = 0;
let avatarsFailed = 0;

for (const exported of exportedItems) {
  const quote = cleanText(exported.quote);
  const name = cleanText(exported.name || exported.handle);
  const handle = cleanHandle(exported.handle || exported.title);
  const source = normalizeSource(exported.source);
  if (!quote || !name || !source) continue;

  const existing = bySource.get(source) || byNameQuote.get(nameQuoteKey({ name, quote }));
  if (existing) {
    let changed = false;
    if (!existing.source && source) {
      existing.source = source;
      changed = true;
    }
    if (existing.sourceLabel !== 'X') {
      existing.sourceLabel = 'X';
      changed = true;
    }
    if ((!existing.title || existing.title !== `@${handle}`) && handle) {
      existing.title = `@${handle}`;
      changed = true;
    }
    if (exported.avatar && !isLocalAvatar(existing.avatar)) {
      const avatar = await downloadAvatar(exported.avatar, existing.id || makeId(name, source));
      if (avatar) {
        existing.avatar = avatar;
        avatarsDownloaded += 1;
        changed = true;
      } else {
        avatarsFailed += 1;
      }
    }
    if (changed) updated += 1;
    bySource.set(source, existing);
    byNameQuote.set(nameQuoteKey(existing), existing);
    continue;
  }

  const id = uniqueId(`x-${slugify(name)}`, source.match(/\/status\/(\d+)/)?.[1]?.slice(-6), kudos);
  const avatar = exported.avatar ? await downloadAvatar(exported.avatar, id) : '';
  if (avatar) avatarsDownloaded += 1;
  else if (exported.avatar) avatarsFailed += 1;

  const item = {
    id,
    quote,
    name,
    title: handle ? `@${handle}` : '',
    avatar,
    source,
    sourceLabel: 'X',
  };

  kudos.push(item);
  bySource.set(source, item);
  byNameQuote.set(nameQuoteKey(item), item);
  added += 1;
}

fs.writeFileSync(outputJson, `${JSON.stringify(kudos, null, 2)}\n`);

console.log(`Read ${exportedItems.length} X kudos from ${inputJson}`);
console.log(`Added ${added}`);
console.log(`Updated ${updated}`);
console.log(`Downloaded ${avatarsDownloaded} avatars`);
if (avatarsFailed) console.log(`Failed ${avatarsFailed} avatars`);
console.log(`Wrote ${path.relative(projectRoot, outputJson)}`);

async function downloadAvatar(url, id) {
  try {
    const extension = extensionFromUrl(url);
    const destination = path.join(avatarDir, `${id}${extension}`);
    if (fs.existsSync(destination)) return `/avatars/${id}${extension}`;

    execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', '--output', destination, url], {
      stdio: 'pipe',
    });
    return `/avatars/${id}${extension}`;
  } catch {
    return '';
  }
}

function isLocalAvatar(value) {
  return typeof value === 'string' && value.startsWith('/avatars/');
}

function normalizeSource(value) {
  return cleanText(value)
    .replace('https://twitter.com/', 'https://x.com/')
    .replace(/\/analytics$/, '')
    .replace(/[?#].*$/, '');
}

function cleanHandle(value) {
  return cleanText(value).replace(/^@/, '');
}

function nameQuoteKey(item) {
  return `${cleanText(item.name).toLowerCase()}\n${cleanText(item.quote).toLowerCase()}`;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function makeId(name, source) {
  return uniqueId(`x-${slugify(name)}`, source.match(/\/status\/(\d+)/)?.[1]?.slice(-6), []);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uniqueId(base, suffix, existingItems) {
  let id = base || `x-kudo-${suffix || 'item'}`;
  if (!existingItems.some((item) => item.id === id)) return id;

  id = suffix ? `${base}-${suffix}` : base;
  let counter = 2;
  while (existingItems.some((item) => item.id === id)) {
    id = suffix ? `${base}-${suffix}-${counter}` : `${base}-${counter}`;
    counter += 1;
  }
  return id;
}

function extensionFromUrl(value) {
  const pathname = new URL(value).pathname;
  const ext = path.extname(fileURLToPath(`file://${pathname}`));
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase())) return ext;
  return '.jpg';
}
