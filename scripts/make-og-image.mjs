// Generates the OG card at public/og-image.png (1200x630).
// Run with: node scripts/make-og-image.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORTRAIT = path.join(ROOT, 'public', 'merill.jpg');
const OUT = path.join(ROOT, 'public', 'og-image.png');

const W = 1200;
const H = 630;

// 1) Prepare the portrait: 360x360, circular mask.
const portraitSize = 360;
const portraitBuffer = await sharp(PORTRAIT)
  .resize(portraitSize, portraitSize, { fit: 'cover' })
  .composite([
    {
      // Round mask
      input: Buffer.from(
        `<svg width="${portraitSize}" height="${portraitSize}"><circle cx="${portraitSize / 2}" cy="${portraitSize / 2}" r="${portraitSize / 2}" fill="#fff"/></svg>`,
      ),
      blend: 'dest-in',
    },
  ])
  .png()
  .toBuffer();

// 2) Build the background + text layer as SVG (Cairo-style, restrained).
//    Palette taken from the live hero (#f6f3ec parchment, #171615 ink, #b45309
//    accent). The faint stacked rectangles on the left hint at the kudos wall.
const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="parchment" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#faf7f0"/>
      <stop offset="100%" stop-color="#f1ebde"/>
    </linearGradient>
    <linearGradient id="cardShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.75"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="6" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#parchment)"/>

  <!-- Faint stack of card silhouettes (the "wall") in the back-left -->
  <g opacity="0.5" filter="url(#softShadow)">
    <rect x="-30" y="120" width="320" height="170" rx="14" fill="url(#cardShade)" transform="rotate(-7 130 205)"/>
    <rect x="40"  y="300" width="340" height="170" rx="14" fill="url(#cardShade)" transform="rotate(4 210 385)"/>
    <rect x="-10" y="470" width="300" height="170" rx="14" fill="url(#cardShade)" transform="rotate(-3 140 555)"/>
  </g>

  <!-- Eyebrow -->
  <text x="80" y="160"
        font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="24" font-weight="600" letter-spacing="6" fill="#8a7f6a">
    KUDOS WALL
  </text>

  <!-- Title (two lines, sized to clear the portrait) -->
  <text x="80" y="260"
        font-family="ui-serif, Georgia, 'Times New Roman', serif"
        font-size="76" font-weight="700" fill="#171615" letter-spacing="-1.2">
    Kind words
  </text>
  <text x="80" y="345"
        font-family="ui-serif, Georgia, 'Times New Roman', serif"
        font-size="76" font-weight="700" fill="#171615" letter-spacing="-1.2">
    from the
  </text>
  <text x="80" y="430"
        font-family="ui-serif, Georgia, 'Times New Roman', serif"
        font-size="76" font-weight="700" fill="#171615" letter-spacing="-1.2">
    community.
  </text>

  <!-- Hairline divider -->
  <rect x="80" y="475" width="56" height="4" rx="2" fill="#b45309"/>

  <!-- Subtitle / byline -->
  <text x="80" y="530"
        font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="26" font-weight="500" fill="#3f3f46">
    Notes that inspire, motivate, and remind me to keep building.
  </text>

  <!-- Footer URL -->
  <text x="80" y="585"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="20" font-weight="500" fill="#8a7f6a" letter-spacing="0.5">
    kudos.merill.net  ·  by Merill Fernando
  </text>

  <!-- Portrait ring (glass-style halo behind the avatar) -->
  <circle cx="970" cy="315" r="198"
          fill="#ffffff" fill-opacity="0.55"
          stroke="#ffffff" stroke-opacity="0.85" stroke-width="2"/>
  <circle cx="970" cy="315" r="192"
          fill="none"
          stroke="#171615" stroke-opacity="0.06" stroke-width="1"/>
</svg>
`;

// 3) Composite the portrait over the background SVG.
await sharp(Buffer.from(bg))
  .composite([
    { input: portraitBuffer, left: 970 - portraitSize / 2, top: 315 - portraitSize / 2 },
  ])
  .png({ compressionLevel: 9, palette: false })
  .toFile(OUT);

const stat = await fs.stat(OUT);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(stat.size / 1024).toFixed(1)} KB)`);
