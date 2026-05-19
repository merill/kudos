import { baseUrl, github, readSignedCookie, signedCookie } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = await readSignedCookie(request, 'kudos_state', env);

  if (!code || !state || state !== expectedState) {
    return new Response('Invalid GitHub sign-in state.', { status: 400 });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'kudos-wall-admin',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${baseUrl(request, env)}/api/github/callback`,
    }),
  });
  const tokenJson = await tokenResponse.json();
  if (!tokenJson.access_token) {
    return new Response('GitHub did not return an access token.', { status: 401 });
  }

  const me = await github(request, '/user', tokenJson.access_token);
  if (env.GITHUB_ALLOWED_LOGIN && me.login.toLowerCase() !== env.GITHUB_ALLOWED_LOGIN.toLowerCase()) {
    return new Response('This GitHub account is not allowed to update the wall.', { status: 403 });
  }

  const headers = new Headers({
    location: '/admin',
    'set-cookie': await signedCookie('kudos_token', tokenJson.access_token, env),
  });
  headers.append('set-cookie', 'kudos_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
