import fs from 'node:fs';

const outputJson = 'src/lib/kudos.json';

const captured = [
  {
    name: 'inversecos',
    handle: 'inversecos',
    quote: 'Excited for you Merrill!',
    source: 'https://x.com/inversecos/status/2055112294657675417',
  },
  {
    name: 'Jonathan Bourke',
    handle: 'jonathanbourke',
    quote: 'Best of luck @merill!',
    source: 'https://x.com/jonathanbourke/status/2054985582799970665',
  },
  {
    name: 'Jeremy Sinclair #NET',
    handle: 'sinclairinat0r',
    quote: "Best of luck and thanks for all the awesome things you've been doing for making Entra make sense \\o/",
    source: 'https://x.com/sinclairinat0r/status/2054958124520374410',
  },
  {
    name: 'sysadafterdark',
    handle: 'sysadafterdark',
    quote: 'Good luck and thanks for your help!',
  },
  {
    name: 'mRr3b00t',
    handle: 'UK_Daniel_Card',
    quote: 'Congrats mate!',
  },
  {
    name: 'Matthew Miles',
    handle: 'yeti195',
    quote: "Congratulations Merrill. I’m excited to see what’s to come, you are absolutely amazing, and I wish you nothing but success.",
    source: 'https://x.com/yeti195/status/2054938938012213514',
  },
  {
    name: 'Sam Erde',
    handle: 'SamErde',
    quote: "You've been a great example to all, my friend. Can't wait to see what you create next!",
    source: 'https://x.com/SamErde/status/2054966332374847815',
  },
  {
    name: 'sapir federovsky',
    handle: 'sapirxfed',
    quote: "Thats amazing Merill, I'm sure you will do great things!",
  },
  {
    name: 'SwiftOnSecurity',
    handle: 'SwiftOnSecurity',
    quote: 'Oh wow! Best wishes Merill!',
  },
  {
    name: 'CJ',
    handle: 'N805DN',
    quote: 'Huge congrats Merill! You will kill it on your own. Excited to see what you come up with!',
    source: 'https://x.com/N805DN/status/2055027280934482410',
  },
  {
    name: 'Waldek Mastykarz',
    handle: 'waldekm',
    quote: 'All the best! Looking forward to seeing what you’ll build!',
    source: 'https://x.com/waldekm/status/2054966554538774532',
  },
  {
    name: 'drnimrod',
    handle: 'drnimrod',
    quote: 'Wow! I can’t wait to see what cool stuff you come up with. Congratulations Merrill!',
  },
  {
    name: 'Sean Metcalf',
    handle: 'PyroTek3',
    quote: 'Congrats and Good Luck!',
  },
  {
    name: 'BlackRoomSec',
    handle: 'blackroomsec',
    quote: 'Best of luck, Merill!!!',
  },
  {
    name: 'Miha Pecnik',
    handle: 'MihaPecnik',
    quote: 'Oh no, another great gone from MS :(. Wish you all the best.',
  },
  {
    name: 'Greg Kutzbach, CISSP',
    handle: 'dasgrog',
    quote: 'Can’t wait to see what you build! What you’ve already done is amazing and I can’t imagine where you’re going from here',
    source: 'https://x.com/dasgrog/status/2054991134410358940',
  },
  {
    name: 'Augustine C',
    handle: 'augvcor',
    quote: 'All the best, Merill, for your future endeavours. I learnt so much from your tweets on #cybersecurity, #AzureAD, #Entra etc',
    source: 'https://x.com/augvcor/status/2054943918673056145',
  },
  {
    name: 'b33f | 🇺🇦 ✊',
    handle: 'FuzzySec',
    quote: 'Big news, excited for you 👏 👏',
  },
  {
    name: 'Devang Chheda',
    handle: 'devangchheda_',
    quote: 'Congratulations Merill 🎉\n\nExcited to see what you do next!',
  },
  {
    name: 'Steve Prentice | SWB',
    handle: 'steveprentice',
    quote: 'Best of luck! Definitely Microsoft’s loss.',
  },
  {
    name: 'Marco Dijkshoorn',
    handle: 'Didyman',
    quote: 'Oh wow, didn’t see that one coming! Good luck with the new endeavors! A big loss for Microsoft.',
    source: 'https://x.com/Didyman/status/2055198560040177720',
  },
  {
    name: 'AI Operator',
    handle: 'InfraScaler',
    quote: "Wow big news, can't wait to follow your new adventures!",
  },
  {
    name: 'Wolf Kristen',
    handle: 'ISO19770',
    quote: 'Best of luck and success, Merill',
  },
  {
    name: 'Erik Hajník',
    handle: '7764803',
    quote: 'I can’t wait to hear more from you in the coming months. I wish you the best of luck with your new chapter. 😊',
    source: 'https://x.com/7764803/status/2054933955560784144',
  },
  {
    name: 'E',
    handle: 'DataBufferA',
    quote: 'Microsoft losing one of their best. I admire your work and your expertise and look forward to your next chapter. Good luck!',
  },
  {
    name: 'Nathan McNulty',
    handle: 'NathanMcNulty',
    quote: 'Congrats Merill 🥳\n\nI am so excited to see what you do next! Would love to help in any way I can :)',
  },
  {
    name: 'Hugo Batista',
    handle: '0xhugobatista',
    quote: 'Godspeed!',
  },
  {
    name: 'Przemysław Kłys',
    handle: 'PrzemyslawKlys',
    quote: 'Time to become MVP 😎 I’ll let you say goodbye before we nominate you 🤣',
  },
  {
    name: 'spencer',
    handle: 'techspence',
    quote: 'DUDE incredible! Wish you so much success and happiness with the new thing 👏 👏',
  },
  {
    name: 'Dr. Nestori Syynimaa',
    handle: 'DrAzureAD',
    quote: "All the best for your next chapter, shol'va! You'll be missed ❤️",
  },
  {
    name: 'Fabian Bader',
    handle: 'fabian_bader',
    quote: 'You did amazing work inside of Microsoft and I’m curious to see what you will archive outside of it.\nMerill "unleashed"',
  },
  {
    name: 'Robert Schoneman',
    handle: 'rschoneman',
    quote: 'I can’t wait to see what you build. @merill you’ve always been the best Entra feature.',
  },
  {
    name: 'San',
    handle: 'sangramgobil',
    quote: "Best wishes @merill, We wait to see what's coming!",
  },
  {
    name: "Ewelina Paczkowska (Welka's World)",
    handle: 'WelkasWorld',
    quote: 'Congratulations and all the best for the next chapter! 👏☺️',
  },
  {
    name: 'Ric Lewis',
    handle: 'keylimesoda',
    quote: 'End of an era. Good luck with what’s next.',
  },
  {
    name: 'Kevin Comfort',
    handle: 'Kevin_Comfort',
    quote: 'Sign me up to buy whatever it is you build! First beta customer right here.',
  },
];

const existing = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
const seen = new Set(existing.map((item) => `${item.name}\n${item.quote}`));
const additions = [];

for (const item of captured) {
  const key = `${item.name}\n${item.quote}`;
  if (seen.has(key)) continue;
  seen.add(key);

  additions.push({
    id: uniqueId(`x-${slugify(item.name)}`, item.handle, [...existing, ...additions]),
    quote: item.quote,
    name: item.name,
    title: `@${item.handle}`,
    avatar: '',
    source: item.source || '',
    sourceLabel: 'X',
  });
}

fs.writeFileSync(outputJson, `${JSON.stringify([...existing, ...additions], null, 2)}\n`);
console.log(`Imported ${additions.length} scroll-captured X kudos`);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uniqueId(base, suffix, existingItems) {
  let id = base || `x-kudo-${suffix}`;
  if (!existingItems.some((item) => item.id === id)) return id;

  id = `${base}-${suffix.toLowerCase()}`;
  let counter = 2;
  while (existingItems.some((item) => item.id === id)) {
    id = `${base}-${suffix.toLowerCase()}-${counter}`;
    counter += 1;
  }
  return id;
}
