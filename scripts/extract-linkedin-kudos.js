(() => {
  const postUrl = location.href;
  const commentRoots = [
    ...document.querySelectorAll(
      '.comments-comment-entity, .comments-comment-item, [data-test-id*="comment"], article',
    ),
  ];

  const seen = new Set();
  const results = [];

  const clean = (value = '') =>
    value
      .replace(/\s+/g, ' ')
      .replace(/\bsee more\b/gi, '')
      .replace(/\b\d+\s+Reactions?\b/gi, '')
      .replace(/\bReply\b/gi, '')
      .trim();

  const findProfileLink = (root) =>
    [...root.querySelectorAll('a[href*="/in/"]')]
      .filter((link) => /^View:/i.test(clean(link.getAttribute('aria-label') || '')))
      .find((link) => !/Merill Fernando Author/i.test(clean(link.getAttribute('aria-label') || '')));

  const getNameTitle = (link) => {
    const label = clean(link?.getAttribute('aria-label') || link?.innerText || '');
    const match = label.match(/View:\s*(.*?)\s*(?:•|,)\s*(?:1st|2nd|3rd)?\s*(.*)$/i);
    if (match) return { name: clean(match[1]), title: clean(match[2]) };
    const fallback = label.replace(/^View\s+/i, '').replace(/'s graphic link$/i, '');
    return { name: clean(fallback), title: '' };
  };

  const findQuote = (root, name) => {
    const candidates = [
      ...root.querySelectorAll(
        '.comments-comment-item__main-content, .comments-comment-entity__content, [dir="ltr"], span[aria-hidden="true"]',
      ),
    ]
      .map((node) => clean(node.innerText || node.textContent || ''))
      .filter(Boolean)
      .filter((text) => text.length > 20)
      .filter((text) => !text.includes('Open options'))
      .filter((text) => !text.startsWith(name));

    return candidates.sort((a, b) => b.length - a.length)[0] || '';
  };

  const findAvatar = (root, name) => {
    const images = [...root.querySelectorAll('img')];
    const direct = images.find((img) => {
      const alt = img.getAttribute('alt') || '';
      return alt && name && alt.toLowerCase().includes(name.toLowerCase().split(' ')[0]);
    });
    const anyProfile = direct || images.find((img) => (img.src || '').includes('profile-displayphoto'));
    return anyProfile?.src || '';
  };

  for (const root of commentRoots) {
    const link = findProfileLink(root);
    if (!link) continue;

    const { name, title } = getNameTitle(link);
    if (!name || /Merill Fernando/i.test(name) || seen.has(name)) continue;

    const quote = findQuote(root, name);
    if (!quote) continue;

    seen.add(name);
    results.push({
      id: name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-'),
      quote,
      name,
      title,
      avatar: findAvatar(root, name),
      source: postUrl,
      sourceLabel: 'LinkedIn',
    });
  }

  copy(JSON.stringify(results, null, 2));
  console.table(results.map(({ name, title, avatar }) => ({ name, title, hasAvatar: Boolean(avatar) })));
  console.info(`Copied ${results.length} LinkedIn kudos to the clipboard.`);
})();
