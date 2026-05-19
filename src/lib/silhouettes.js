const palette = [
  ['#f3d0a4', '#415a77', '#0d1b2a'],
  ['#d8e2dc', '#2d6a4f', '#1b4332'],
  ['#ffd6a5', '#6d597a', '#355070'],
  ['#cde7be', '#287271', '#1d3557'],
  ['#e5d4ed', '#7b2cbf', '#240046'],
  ['#bde0fe', '#457b9d', '#1d3557'],
];

export function silhouetteFor(seed = '') {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const colors = palette[hash % palette.length];
  return colors;
}
