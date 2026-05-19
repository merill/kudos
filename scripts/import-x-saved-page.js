import fs from 'node:fs';
import path from 'node:path';

const sourceHtml = process.argv[2] || '/Users/merill/Downloads/x-kudos.html';
const projectRoot = process.cwd();
const sourceDir = path.join(path.dirname(sourceHtml), `${path.basename(sourceHtml, '.html')}_files`);
const avatarDir = path.join(projectRoot, 'public', 'avatars');
const outputJson = path.join(projectRoot, 'src', 'lib', 'kudos.json');
const originalStatusId = '2054929592188866696';

const html = fs.readFileSync(sourceHtml, 'utf8');
const existing = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
const imported = [];
const seen = new Set(existing.map((item) => `${item.name}\n${item.quote}`));

fs.mkdirSync(avatarDir, { recursive: true });

const articles = html.match(/<article[\s\S]*?<\/article>/g) || [];

for (const article of articles) {
  const source = extractSource(article);
  if (!source || source.includes(`/status/${originalStatusId}`)) continue;

  const handle = extractHandle(article);
  const name = extractName(article) || handle;
  const quote = extractTweetText(article);
  if (!name || !quote || handle === 'merill') continue;

  const key = `${name}\n${quote}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const statusId = source.match(/\/status\/(\d+)/)?.[1] || `${imported.length + 1}`;
  const id = uniqueId(`x-${slugify(name)}`, statusId.slice(-6), [...existing, ...imported]);
  const avatar = copyAvatar(article, id);

  imported.push({
    id,
    quote,
    name,
    title: handle ? `@${handle}` : '',
    avatar,
    source,
    sourceLabel: 'X',
  });
}

fs.writeFileSync(outputJson, `${JSON.stringify([...existing, ...imported], null, 2)}\n`);
console.log(`Imported ${imported.length} X kudos from ${sourceHtml}`);
console.log(`Wrote ${path.relative(projectRoot, outputJson)}`);

function extractName(article) {
  const userBlock = article.match(/data-testid="User-Name"[\s\S]*?(?=<div class="css-175oi2r r-1kkk96v"|data-testid="caret"|data-testid="tweetText")/)?.[0] || article;
  const profileLink = userBlock.match(/<a href="https:\/\/x\.com\/[^"]+"[\s\S]*?<\/a>/)?.[0] || userBlock;
  const text = htmlToText(profileLink).split('@')[0].trim();
  return text.replace(/\s+/g, ' ');
}

function extractHandle(article) {
  const match = article.match(/https:\/\/x\.com\/([A-Za-z0-9_]+)\/status\//);
  if (match) return match[1];

  const userBlock = article.match(/data-testid="User-Name"[\s\S]*?data-testid="tweetText"/)?.[0] || article;
  return userBlock.match(/@([A-Za-z0-9_]{1,15})/)?.[1] || '';
}

function extractTweetText(article) {
  const match = article.match(/<div\b[^>]*data-testid="tweetText"[^>]*>([\s\S]*?)<\/div>/);
  return match ? cleanText(htmlToText(match[1])) : '';
}

function extractSource(article) {
  const hrefs = [...article.matchAll(/href="(https:\/\/x\.com\/[^"]+\/status\/\d+[^"]*)"/g)]
    .map((match) => decode(match[1]))
    .filter((href) => !href.includes('/analytics') && !href.includes('/photo/') && !href.includes('/quotes') && !href.includes('/quick_promote'));

  return hrefs[0] || '';
}

function copyAvatar(article, id) {
  const avatarBlock = article.match(/data-testid="Tweet-User-Avatar"[\s\S]*?(?=data-testid="User-Name")/)?.[0] || article;
  const src = avatarBlock.match(/<img\b[^>]*src="([^"]+)"/)?.[1] || '';
  const sourceName = src.split('?')[0].split('/').filter(Boolean).at(-1);
  if (!sourceName) return '';

  const sourcePath = path.join(sourceDir, sourceName);
  if (!fs.existsSync(sourcePath)) return '';

  const extension = path.extname(sourceName) || extensionForFile(sourcePath);
  const destination = path.join(avatarDir, `${id}${extension}`);
  fs.copyFileSync(sourcePath, destination);
  return `/avatars/${id}${extension}`;
}

function htmlToText(value) {
  return decode(value)
    .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function cleanText(value) {
  return value
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function decode(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
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
  let id = base || `x-kudo-${suffix}`;
  if (!existingItems.some((item) => item.id === id)) return id;

  id = `${base}-${suffix}`;
  let counter = 2;
  while (existingItems.some((item) => item.id === id)) {
    id = `${base}-${suffix}-${counter}`;
    counter += 1;
  }
  return id;
}

function extensionForFile(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return '.jpg';
  if (header[0] === 0x89 && header.toString('ascii', 1, 4) === 'PNG') return '.png';
  if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return '.jpg';
}
