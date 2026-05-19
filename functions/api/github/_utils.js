const encoder = new TextEncoder();

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function baseUrl(request, env) {
  return env.PUBLIC_BASE_URL || new URL(request.url).origin;
}

export function repoParts(env) {
  const [owner, repo] = (env.GITHUB_REPO || '').split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPO must be set as owner/repo.');
  return { owner, repo };
}

export function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export async function signedCookie(name, value, env, maxAge = 60 * 60 * 8) {
  if (!env.COOKIE_SECRET) throw new Error('COOKIE_SECRET must be set.');
  const signature = await sign(value, env.COOKIE_SECRET);
  return `${name}=${value}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function readSignedCookie(request, name, env) {
  const header = request.headers.get('cookie') || '';
  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  const raw = match.slice(name.length + 1);
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const value = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = await sign(value, env.COOKIE_SECRET || '');
  return signature === expected ? value : null;
}

export async function github(request, path, token, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'kudos-wall-admin',
      'x-github-api-version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API ${response.status}: ${detail}`);
  }
  return response.json();
}

export function decodeDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) return null;
  return {
    extension: match[1].replace('jpeg', 'jpg').toLowerCase(),
    content: match[2],
  };
}

export function slugify(input) {
  return (input || 'kudo')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 72);
}
