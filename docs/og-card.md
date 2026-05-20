# OG Card — design + implementation notes

## Original request

> add a og card to the site. maybe use the top part of the page as the card
> image

Goal: when `https://kudos.merill.net/` is shared on Twitter/X, LinkedIn,
Discord, Slack, iMessage, etc., the link unfurls into a rich preview with a
visual that matches the site hero (title + portrait + warm parchment
background).

## Context

- Stack: Svelte + Vite, deployed via Cloudflare Pages with Pages Functions
  under `functions/api/github/`.
- Site lives at `https://kudos.merill.net/` (custom domain on the `kudos`
  Cloudflare Pages project, mapped to the `merill/kudos` GitHub repo).
- The hero block consists of:
  - Eyebrow: "Kudos Wall"
  - h1: "Kudos Wall"
  - Note paragraph starting with "👋 Hi folks, I'm Merill Fernando…"
  - Round portrait at `public/merill.jpg` (440x440, ~42 KB), wrapped in a
    frosted-glass ring (`.portrait-link` in `src/styles.css`).
- Public asset directory is `public/`, copied verbatim into `dist/` at build.
- Long-lived caching for static assets is configured in `public/_headers`
  (assets/avatars/jpg/ico all cached; HTML revalidates).
- Current `index.html` only has `<link rel="icon">` and the Vite entry script,
  no social meta tags yet.

## Decisions still needed (open)

The implementation is paused waiting on the user to choose how to generate
the OG image and which Twitter card type to use.

### 1. Image source

| Option | Pros | Cons |
| --- | --- | --- |
| **Pre-rendered static PNG** (`public/og-image.png`, 1200x630) — recommended | Zero runtime cost, cacheable forever, easy to iterate on, deterministic | Have to re-export when hero copy changes |
| **Cloudflare Function with `@vercel/og` / Satori** | Lets you change copy at deploy time without re-exporting; can render per-kudo cards later | Adds runtime deps; cold-start cost; more moving parts |
| **Screenshot of live hero** | Pixel-perfect match with current design | Flat raster; needs re-screenshotting on any visual change; manual workflow |

### 2. Twitter / X card type

| Option | Behavior |
| --- | --- |
| **`summary_large_image`** (recommended) | Big 1200x630 hero card on Twitter, LinkedIn, Discord, Slack |
| **`summary`** | Square ~144x144 thumbnail next to the link; compact |

Once those two are decided, the work below is small.

## Implementation plan (once decisions are made)

### 1. Asset

- Place the image at `public/og-image.png` (default; or `.jpg` if the file is
  large at PNG quality).
- Target spec: **1200x630**, < ~300 KB after compression. Twitter recommends
  PNG/JPG, max 5 MB; LinkedIn likes < 5 MB; Discord clips ratios outside ~1.91:1.
- Design language: match the hero — parchment background `#f6f3ec`, dark
  text `#171615`, the warm orange accent `#b45309` used for `.name-link`,
  and the round portrait with the glass ring. Include:
  - "Kudos Wall" wordmark
  - One-line tagline (e.g. "Kind words from the community")
  - Round portrait pulled from `public/merill.jpg`
  - Optional faint stack of card silhouettes behind to hint at the wall

### 2. Meta tags

Add to `index.html` `<head>`:

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Kudos Wall" />
<meta property="og:title" content="Kudos Wall — kind words from the community" />
<meta property="og:description" content="Notes that inspire me, motivate me, and help me keep building toward the dreams I have. — Merill Fernando" />
<meta property="og:url" content="https://kudos.merill.net/" />
<meta property="og:image" content="https://kudos.merill.net/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Kudos Wall — Merill Fernando" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@merill" />
<meta name="twitter:creator" content="@merill" />
<meta name="twitter:title" content="Kudos Wall — kind words from the community" />
<meta name="twitter:description" content="Notes that inspire me, motivate me, and help me keep building toward the dreams I have." />
<meta name="twitter:image" content="https://kudos.merill.net/og-image.png" />

<meta name="description" content="A wall of kind words from the community, kept by Merill Fernando." />
```

Also update the page `<title>` from the default Vite one to something like
`Kudos Wall — kind words from the community`.

### 3. Caching

Existing `public/_headers` already covers PNG/JPG well (the catch-all rule
applies short max-age + SWR to anything not under `/assets/*`). The OG image
will be served with `Cache-Control: public, max-age=0, must-revalidate` from
the `/*` rule. That's fine, but social previews are heavily cached by
crawlers (Twitter, FB, LinkedIn). If we want crawlers to refresh after a new
design, the file path must change — e.g. `og-image-v2.png`. Keep that in mind
when iterating.

Optionally add a specific rule to `public/_headers` for the OG image with a
longer TTL:

```
/og-image.png
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

### 4. Validation

After deploy, validate with the platform debuggers:

- Twitter / X: https://cards-dev.twitter.com/validator (paste URL)
- Facebook / Meta: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/
- Discord/Slack: paste the link into a private channel/DM; both honor the
  same OpenGraph tags.

If the preview is stale after a change, click "Scrape Again" / "Re-fetch" in
the respective debugger — that clears the platform-side cache.

## Status

- [x] User picked: **pre-rendered static PNG** as the image source.
- [x] User picked: **`summary_large_image`** as the Twitter card type.
- [x] Created `public/og-image.png` — 1200x630, ~267 KB.
- [x] Generator script at `scripts/make-og-image.mjs` (run with sharp; not in
      `package.json` deps — install on demand).
- [x] OpenGraph + Twitter meta tags added to `index.html`.
- [x] Dedicated cache rule added in `public/_headers` (7d max-age, 1d SWR).
- [x] Build verified — `dist/og-image.png` (273 KB), `dist/index.html` (2.1 KB,
      0.69 KB gzip) carry the tags.
- [ ] Deploy to production.
- [ ] Validate in Twitter, LinkedIn, Facebook, Discord debuggers.

## Regenerating the image

The PNG is checked into git, so day-to-day deploys don't need to regenerate
it. When you want to change the copy, layout, or refresh the portrait:

```bash
# sharp isn't in package.json, install it ad hoc:
mkdir -p /tmp/og-tool && cd /tmp/og-tool && npm init -y >/dev/null && npm install sharp
cd /path/to/kudos
ln -sf /tmp/og-tool/node_modules/sharp node_modules/sharp
ln -sf /tmp/og-tool/node_modules/@img   node_modules/@img
node scripts/make-og-image.mjs
rm node_modules/sharp node_modules/@img
```

To force social platforms to re-fetch after a design change, rename the file
(`og-image-v2.png`) and update both `<meta>` tags in `index.html` plus the
`/og-image.png` rule in `public/_headers`. Most crawlers cache aggressively
based on URL.
