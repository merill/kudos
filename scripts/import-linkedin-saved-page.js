import fs from 'node:fs';
import path from 'node:path';

const sourceHtml = process.argv[2] || '/Users/merill/Downloads/kudos.html';
const projectRoot = process.cwd();
const sourceDir = path.join(path.dirname(sourceHtml), `${path.basename(sourceHtml, '.html')}_files`);
const avatarDir = path.join(projectRoot, 'public', 'avatars');
const outputJson = path.join(projectRoot, 'src', 'lib', 'kudos.json');
const postUrl = 'https://www.linkedin.com/feed/update/urn:li:activity:7460694824514404352/';

const html = fs.readFileSync(sourceHtml, 'utf8');
fs.mkdirSync(avatarDir, { recursive: true });

const renderedKudos = parseRenderedComments();
if (renderedKudos.length > 0) {
  fs.writeFileSync(outputJson, `${JSON.stringify(renderedKudos, null, 2)}\n`);
  console.log(`Imported ${renderedKudos.length} kudos from rendered LinkedIn comments in ${sourceHtml}`);
  console.log(`Wrote ${path.relative(projectRoot, outputJson)}`);
  process.exit(0);
}

const comments = [];
const seenObjects = new Set();

function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$type === 'com.linkedin.voyager.dash.social.Comment') {
    comments.push(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) walk(item);
    return;
  }

  for (const item of Object.values(value)) walk(item);
}

for (const line of html.split(/\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;

  try {
    walk(JSON.parse(trimmed));
  } catch {
    // LinkedIn embeds a lot of non-data script content. Ignore anything that is not JSON.
  }
}

const kudos = [];
const seenCommentUrns = new Set();
const seenPeople = new Set();

for (const comment of comments) {
  const key = comment.entityUrn || comment.urn || comment.commentary?.text;
  if (!key || seenCommentUrns.has(key)) continue;
  seenCommentUrns.add(key);

  const name = decode(comment.commenter?.title?.text || '');
  const quote = cleanQuote(decode(comment.commentary?.text || ''), name);
  const title = decode(comment.commenter?.subtitle || '');
  const isAuthor = comment.commenter?.author || name === 'Merill Fernando';

  if (isAuthor || !name || !quote || seenPeople.has(name)) continue;
  if (quote.startsWith('Merill Fernando ')) continue;

  seenPeople.add(name);
  const id = slugify(name);
  const avatar = copyAvatar(comment, id);

  kudos.push({
    id,
    quote,
    name,
    title,
    avatar,
    source: decode(comment.permalink || postUrl).replaceAll('&amp;', '&'),
    sourceLabel: 'LinkedIn',
  });
}

fs.writeFileSync(outputJson, `${JSON.stringify(kudos, null, 2)}\n`);
console.log(`Imported ${kudos.length} kudos from ${sourceHtml}`);
console.log(`Wrote ${path.relative(projectRoot, outputJson)}`);

function parseRenderedComments() {
  const rendered = [];
  const seen = new Set();
  const articles = html.match(/<article class="comments-comment-entity[\s\S]*?<\/article>/g) || [];

  for (const article of articles) {
    const urn = getAttr(article, 'data-id');
    const name = extractName(article);
    const title = extractSubtitle(article);
    const quote = cleanQuote(extractQuote(article), name);

    if (!name || !quote || name === 'Merill Fernando') continue;
    if (quote.startsWith('Merill Fernando ')) continue;

    const key = `${name}\n${quote}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const suffix = urn?.match(/,(\d+)\)/)?.[1]?.slice(-6) || `${rendered.length + 1}`;
    const id = uniqueId(slugify(name), suffix, rendered);
    const avatar = copyRenderedAvatar(article, id);

    rendered.push({
      id,
      quote,
      name,
      title,
      avatar,
      source: sourceForUrn(urn),
      sourceLabel: 'LinkedIn',
    });
  }

  return rendered;
}

function extractName(article) {
  const titleMatch = article.match(/<span class="comments-comment-meta__description-title">([\s\S]*?)<\/span>/);
  const nameFromTitle = titleMatch ? cleanInlineText(titleMatch[1]) : '';
  if (nameFromTitle) return nameFromTitle;

  const label = getAttr(article, 'aria-label', /<a\b[^>]*class="[^"]*comments-comment-meta__description-container[^"]*"[^>]*>/);
  const labelMatch = label.match(/^View:\s*(.*?)\s*(?:•|$)/);
  return cleanInlineText(labelMatch?.[1] || '');
}

function extractSubtitle(article) {
  const match = article.match(/<div class="comments-comment-meta__description-subtitle">([\s\S]*?)<\/div>/);
  return match ? cleanInlineText(match[1]) : '';
}

function extractQuote(article) {
  const match = article.match(/<div dir="ltr" class="update-components-text relative">([\s\S]*?)<\/div>/);
  return match ? htmlToText(match[1]) : '';
}

function cleanInlineText(value) {
  return htmlToText(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToText(value) {
  return decode(value)
    .replace(/<!---->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span\b[^>]*class="white-space-pre"[^>]*>[\s\S]*?<\/span>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getAttr(markup, attr, tagPattern = /<article\b[^>]*>/) {
  const tag = markup.match(tagPattern)?.[0] || '';
  const match = tag.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
  return decode(match?.[1] || '').trim();
}

function uniqueId(base, suffix, existing) {
  let id = base || `kudo-${suffix}`;
  if (!existing.some((item) => item.id === id)) return id;

  id = `${base}-${suffix}`;
  let counter = 2;
  while (existing.some((item) => item.id === id)) {
    id = `${base}-${suffix}-${counter}`;
    counter += 1;
  }
  return id;
}

function sourceForUrn(urn) {
  if (!urn) return postUrl;
  const match = urn.match(/^urn:li:comment:\(activity:(\d+),(\d+)\)$/);
  if (!match) return `${postUrl}?${new URLSearchParams({ commentUrn: urn }).toString()}`;

  const [, activityId, commentId] = match;
  const params = new URLSearchParams({
    commentUrn: urn,
    dashCommentUrn: `urn:li:fsd_comment:(${commentId},urn:li:activity:${activityId})`,
  });
  return `${postUrl}?${params.toString()}`;
}

function copyRenderedAvatar(article, id) {
  const src = getAttr(article, 'src', /<img\b[^>]*class="[^"]*EntityPhoto-circle[^"]*"[^>]*>/);
  const sourceName = src.split('?')[0].split('/').filter(Boolean).at(-1);
  if (!sourceName) return '';

  const sourcePath = path.join(sourceDir, sourceName);
  if (!fs.existsSync(sourcePath)) return '';

  const extension = extensionForFile(sourcePath);
  const destination = path.join(avatarDir, `${id}${extension}`);
  fs.copyFileSync(sourcePath, destination);
  return `/avatars/${id}${extension}`;
}

function extensionForFile(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return '.jpg';
  if (header[0] === 0x89 && header.toString('ascii', 1, 4) === 'PNG') return '.png';
  if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return '.jpg';
}

function cleanQuote(value, name) {
  return value
    .replace(/\u2028/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(new RegExp(`^${escapeRegExp(name)}\\s+`), '')
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

function copyAvatar(comment, id) {
  const vectorImage = findVectorImage(comment.commenter?.image);
  const artifact = vectorImage?.artifacts
    ?.filter((item) => item.fileIdentifyingUrlPathSegment)
    ?.sort((a, b) => (a.width || 0) - (b.width || 0))[0];

  const segment = artifact?.fileIdentifyingUrlPathSegment || '';
  const sourceName = segment.split('?')[0].split('/').filter(Boolean).at(-1);
  if (!sourceName) return '';

  const sourcePath = path.join(sourceDir, sourceName);
  if (!fs.existsSync(sourcePath)) return '';

  const destination = path.join(avatarDir, `${id}.jpg`);
  fs.copyFileSync(sourcePath, destination);
  return `/avatars/${id}.jpg`;
}

function findVectorImage(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.rootUrl && Array.isArray(value.artifacts)) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVectorImage(item);
      if (found) return found;
    }
    return null;
  }

  for (const item of Object.values(value)) {
    const found = findVectorImage(item);
    if (found) return found;
  }
  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
