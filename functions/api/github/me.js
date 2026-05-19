import { github, json, readSignedCookie } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const token = await readSignedCookie(request, 'kudos_token', env);
  if (!token) return json({ error: 'Not signed in' }, 401);

  const me = await github(request, '/user', token);
  if (env.GITHUB_ALLOWED_LOGIN && me.login.toLowerCase() !== env.GITHUB_ALLOWED_LOGIN.toLowerCase()) {
    return json({ error: 'Not allowed' }, 403);
  }

  return json({ login: me.login, avatarUrl: me.avatar_url });
}
