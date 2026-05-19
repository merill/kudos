import { baseUrl, randomState, signedCookie } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response('Missing GITHUB_CLIENT_ID', { status: 500 });
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
}
