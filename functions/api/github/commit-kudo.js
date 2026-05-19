import {
  decodeDataUrl,
  github,
  json,
  readSignedCookie,
  repoParts,
  slugify,
} from './_utils.js';

const dataPath = 'src/lib/kudos.json';
const decoder = new TextDecoder();
const encoder = new TextEncoder();

export async function onRequestPost({ request, env }) {
  const token = await readSignedCookie(request, 'kudos_token', env);
  if (!token) return json({ error: 'Not signed in' }, 401);

  const me = await github(request, '/user', token);
  if (env.GITHUB_ALLOWED_LOGIN && me.login.toLowerCase() !== env.GITHUB_ALLOWED_LOGIN.toLowerCase()) {
    return json({ error: 'Not allowed' }, 403);
  }

  const body = await request.json();
  if (!body.quote || !body.name) return json({ error: 'Quote and name are required.' }, 400);

  const { owner, repo } = repoParts(env);
  const id = body.id || `${slugify(body.name)}-${Date.now()}`;
  let avatar = body.avatar || '';
  let avatarCommit = null;

  const image = decodeDataUrl(body.avatarDataUrl);
  if (image) {
    const avatarPath = `public/avatars/${id}.${image.extension}`;
    const existingAvatar = await getContent(owner, repo, avatarPath, token).catch(() => null);
    avatarCommit = await github(
      request,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(avatarPath).replaceAll('%2F', '/')}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({
          message: `Add avatar for ${body.name}`,
          content: image.content,
          sha: existingAvatar?.sha,
        }),
      },
    );
    avatar = `/avatars/${id}.${image.extension}`;
  }

  const current = await getContent(owner, repo, dataPath, token);
  const kudos = JSON.parse(fromBase64(current.content.replace(/\s/g, '')));
  const nextKudo = {
    id,
    quote: body.quote.trim(),
    name: body.name.trim(),
    title: (body.title || '').trim(),
    avatar,
    source: (body.source || '').trim(),
    sourceLabel: (body.sourceLabel || '').trim(),
  };

  const index = kudos.findIndex((entry) => entry.id === id);
  if (index >= 0) kudos[index] = { ...kudos[index], ...nextKudo };
  else kudos.unshift(nextKudo);

  const updated = toBase64(`${JSON.stringify(kudos, null, 2)}\n`);
  const result = await github(
    request,
    `/repos/${owner}/${repo}/contents/${dataPath}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: index >= 0 ? `Update kudo from ${nextKudo.name}` : `Add kudo from ${nextKudo.name}`,
        content: updated,
        sha: current.sha,
      }),
    },
  );

  return json({
    id,
    commitSha: result.commit.sha,
    avatarCommitSha: avatarCommit?.commit?.sha || null,
  });
}

async function getContent(owner, repo, path, token) {
  return github(null, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll('%2F', '/')}`, token);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return decoder.decode(bytes);
}

function toBase64(value) {
  const bytes = encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
