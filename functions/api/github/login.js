import { baseUrl, randomState, signedCookie } from './_utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const missing = [
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GITHUB_REPO',
      'COOKIE_SECRET',
    ].filter((key) => !env[key]);
    if (missing.length) {
      return new Response(`Missing environment variables: ${missing.join(', ')}`, {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    const state = randomState();
    const redirectUri = `${baseUrl(request, env)}/api/github/callback`;
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    const headers = new Headers({
      location: url.toString(),
      'set-cookie': await signedCookie('kudos_state', state, env, 60 * 10),
    });
    return new Response(null, { status: 302, headers });
  } catch (error) {
    return new Response(`Login error: ${error?.message || error}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
