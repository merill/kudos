# Kudos Wall

A static Svelte site for collecting public kudos and encouragement.

## Local development

```bash
npm install
npm run dev
```

## Cloudflare Pages

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

Set these environment variables for the Pages Functions admin flow:

- `GITHUB_CLIENT_ID`: GitHub App or OAuth App client ID.
- `GITHUB_CLIENT_SECRET`: GitHub App or OAuth App client secret.
- `GITHUB_REPO`: target repo, for example `merill/kudos`.
- `GITHUB_ALLOWED_LOGIN`: GitHub login allowed to update the wall, for example `merill`.
- `COOKIE_SECRET`: any long random string used to sign the admin session cookie.
- `PUBLIC_BASE_URL`: deployed site URL, for example `https://kudos.example.com`.

## GitHub App setup

The admin sign-in uses GitHub's OAuth authorization-code flow. A GitHub App
scoped to this single repo is the recommended option.

1. Deploy the site to Cloudflare Pages first so you know the final URL
   (for example `https://kudos.example.com`). You need it for the callback URL.
2. Create the GitHub App at <https://github.com/settings/apps/new>:
   - **GitHub App name**: any unique name, for example `kudos-wall-admin`.
   - **Homepage URL**: your Pages URL, for example `https://kudos.example.com`.
   - **Callback URL**: `https://kudos.example.com/api/github/callback`.
   - **Request user authorization (OAuth) during installation**: enabled.
   - **Webhook → Active**: disabled.
   - **Repository permissions**:
     - **Contents**: Read and write (needed to commit `src/lib/kudos.json` and avatar files).
     - **Metadata**: Read-only (default).
   - **Account permissions**: none.
   - **Where can this GitHub App be installed?**: Only on this account.
3. On the new App's settings page, click **Generate a new client secret** and
   copy it.
4. Click **Install App**, choose your account, then **Only select repositories**
   and pick this repo.
5. In Cloudflare Pages → your project → **Settings → Environment variables**
   (Production), set the variables listed above. `GITHUB_CLIENT_ID` is the
   App's Client ID; `GITHUB_CLIENT_SECRET` is the secret from step 3;
   `PUBLIC_BASE_URL` must match the host of the callback URL.
6. Redeploy the Pages project so the functions pick up the new variables.
7. Visit `/admin` on the deployed site, click **Sign in with GitHub**, and
   authorize. You will be redirected back to `/admin` signed in.

The private `/admin` page signs in with GitHub and commits changes directly to this repo. Uploaded avatar images are resized in the browser before upload and saved under `public/avatars/`.

## LinkedIn extraction

The helper at `scripts/extract-linkedin-kudos.js` can be pasted into DevTools on the signed-in LinkedIn post page. It copies the currently rendered comments to the clipboard as JSON, including quote, name, title, profile image URL, and source. Load more comments on LinkedIn, then run it again to capture more.

If you have saved the LinkedIn page from Chrome, use the importer instead:

```bash
node scripts/import-linkedin-saved-page.js /Users/merill/Downloads/kudos.html
```

It reads the rendered LinkedIn comment markup first, falls back to LinkedIn’s embedded data blobs if needed, writes `src/lib/kudos.json`, and copies locally saved profile images from the matching `kudos_files` folder into `public/avatars/`.

For a saved X conversation page, use:

```bash
node scripts/import-x-saved-page.js /Users/merill/Downloads/x-kudos.html
```

It appends rendered X replies to `src/lib/kudos.json`, uses the reply handle as the title, points each source link at the specific X reply, and copies saved profile images from the matching `x-kudos_files` folder into `public/avatars/`.

For a DevTools export from the X thread collector, use:

```bash
npm run import:x -- /Users/merill/Downloads/x-kudos.json
```

It merges by direct source URL, updates older X entries with missing avatars or handles, downloads profile images into `public/avatars/`, and appends any new replies.
