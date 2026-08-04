'use strict';

const OFFICIAL = {
  cryptoWorldz: 'https://cryptoworldz.xyz',
  cryptoX: 'https://x.com/CryptoWorldzX',
  solX: 'https://x.com/Solworldx',
  zed: 'https://t.me/CryptoWorldzBot',
  raaiiidd: 'https://t.me/CryptoWorldzRaaiiiddTeam',
  pdc: 'https://purplediamondcrew.com'
};

const BASE_PRINCIPLES = [
  { icon: '📚', title: 'Learn', text: 'Clear education and safer participation for newcomers and experienced community members.' },
  { icon: '🤝', title: 'Connect', text: 'Bring communities, creators, builders and supporters together without losing each World’s identity.' },
  { icon: '🚀', title: 'Build', text: 'Support useful projects, transparent launches and shared tools that can grow across the ecosystem.' },
  { icon: '❤️', title: 'Impact', text: 'Turn online attention into practical support for people already helping others on the ground.' }
];

const PROJECTS = [
  { name: '$SolToken', network: 'Solana', status: 'Coming soon' },
  { name: '$NBC / Next Big Coin', network: 'Solana', status: 'Details awaiting verification' },
  { name: '$RHL / Robin Hood Law', network: 'Multi-chain planning', status: 'Details awaiting verification' },
  { name: '$GIA / Global Impact Alliance', network: 'To be confirmed', status: 'Coming soon' },
  { name: '$W / Uganda Unite', network: 'To be confirmed', status: 'Details awaiting verification' },
  { name: 'Black Bud Bull Token', network: 'To be confirmed', status: 'Details awaiting verification' },
  { name: 'RecoverYourDebt $DEBT', network: 'Solana', status: 'Official links to be verified' },
  { name: '$SMILES / Action Creates Smiles', network: 'Solana planning', status: 'Coming soon' }
];

const SITES = {
  oneworldz: {
    domains: ['oneworldz.com', 'www.oneworldz.com'],
    name: 'OneWorldz', code: '1W', network: 'Global Mission',
    accent: '#9b63ff', accent2: '#5ce6d0', accentRgb: '155,99,255', accent2Rgb: '92,230,208',
    eyebrow: 'THE HUMANITARIAN HEAD OFFICE',
    title: 'One World. One Mission. One Future.',
    motto: 'Helping the People who Help People',
    intro: 'OneWorldz connects people, communities, technology and real-world support under one shared mission.',
    missionTitle: 'A Public Mission With Practical Purpose',
    missionText: 'Build stronger connections between humanitarian action, education, community leadership and transparent digital tools.',
    focusTitle: 'Mission Worldz',
    focusText: 'A connected structure for impact, law, learning, relief and community action.',
    focus: ['Impact and transparent humanitarian support', 'Education and digital literacy', 'Fairness, dignity and equal opportunity', 'Community-led action on the ground'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow OneWorldz updates'
  },
  cryptoworldz: {
    domains: ['cryptoworldz.xyz', 'www.cryptoworldz.xyz'],
    name: 'CryptoWorldz', code: 'CW', network: 'Multi-Chain',
    accent: '#945cff', accent2: '#4ce8d1', accentRgb: '148,92,255', accent2Rgb: '76,232,209',
    eyebrow: 'THE CONNECTED CRYPTO ECOSYSTEM',
    title: 'Where Blockchain Meets Humanity.',
    motto: 'Building the Future of Crypto Together',
    intro: 'CryptoWorldz connects chain communities, education, verified project discovery, Zed coordination and real-world impact.',
    missionTitle: 'More Than a Market Portal',
    missionText: 'A central ecosystem designed to make crypto easier to understand, safer to navigate and more useful to real communities.',
    focusTitle: 'The CryptoWorldz Command Map',
    focusText: 'One central directory connecting every chain World, ImpactBased, Purple Diamond Crew and the Zed Command Centre.',
    focus: ['Worldz directory across major chains', 'Education and safer participation', 'Verified launch links only', 'Real-world impact and community missions'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow @CryptoWorldzX'
  },
  solworldz: {
    domains: ['solworldz.xyz', 'www.solworldz.xyz'],
    name: 'SolWorldz', code: 'SOL', network: 'Solana',
    accent: '#8b5cff', accent2: '#38e8c6', accentRgb: '139,92,255', accent2Rgb: '56,232,198',
    eyebrow: 'THE SOLANA WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to SolWorldz',
    motto: 'One World • One Mission • One SolFam 💜',
    intro: 'SolWorldz connects Solana communities, builders, education, token ecosystems and real-world humanitarian action under one united mission.',
    missionTitle: 'A Solana Community Built With Purpose',
    missionText: 'A clear home for learning, community growth, future launches, Zed missions and meaningful action beyond the screen.',
    focusTitle: 'The Solana Home Base',
    focusText: 'A dedicated portal for the SolWorldz community and its long-term ecosystem.',
    focus: ['Solana education and safer participation', 'Community heroes and builder recognition', 'Future $SolToken launch centre', 'Zed missions and real-world impact'],
    social: OFFICIAL.solX, socialLabel: 'Follow @Solworldx'
  },
  ethworldz: {
    domains: ['ethworldz.xyz', 'www.ethworldz.xyz'],
    name: 'EthWorldz', code: 'ETH', network: 'Ethereum',
    accent: '#7f95ff', accent2: '#d1d6ff', accentRgb: '127,149,255', accent2Rgb: '209,214,255',
    eyebrow: 'THE ETHEREUM WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to EthWorldz',
    motto: 'Open Infrastructure • Builders • Shared Purpose',
    intro: 'EthWorldz connects Ethereum builders, communities, education and purpose-driven projects within the wider CryptoWorldz ecosystem.',
    missionTitle: 'Open Building With Human Purpose',
    missionText: 'A dedicated Ethereum portal for builders, learning, verified projects and shared impact pathways.',
    focusTitle: 'Ethereum Builder Portal',
    focusText: 'Independent identity, open infrastructure and one shared mission.',
    focus: ['Builder education', 'Open infrastructure discovery', 'Verified project pathways', 'Connected humanitarian missions'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  xrpworldz: {
    domains: ['xrpworldz.xyz', 'www.xrpworldz.xyz'],
    name: 'XRPWorldz', code: 'XRP', network: 'XRP Ledger',
    accent: '#28c9f6', accent2: '#f5fbff', accentRgb: '40,201,246', accent2Rgb: '245,251,255',
    eyebrow: 'THE XRP LEDGER WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to XRPWorldz',
    motto: 'Fast Connections • Strong Communities • Real Utility',
    intro: 'XRPWorldz connects XRP Ledger communities, payment innovation, education and real-world utility through CryptoWorldz.',
    missionTitle: 'Useful Technology, Clear Connections',
    missionText: 'A community-first XRP Ledger portal focused on education, payments, responsible participation and real outcomes.',
    focusTitle: 'XRP Ledger Community Portal',
    focusText: 'A dedicated place for learning, verified projects and connected impact.',
    focus: ['XRP Ledger education', 'Payments and settlement use cases', 'Community discovery', 'Real-world utility and impact'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  baseworldz: {
    domains: ['baseworldz.xyz', 'www.baseworldz.xyz'],
    name: 'BaseWorldz', code: 'BASE', network: 'Base',
    accent: '#286bff', accent2: '#7db7ff', accentRgb: '40,107,255', accent2Rgb: '125,183,255',
    eyebrow: 'THE BASE WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to BaseWorldz',
    motto: 'Accessible Builders • Programmable Impact',
    intro: 'BaseWorldz brings Base communities, builders, programmable projects and real-world impact into one connected ecosystem.',
    missionTitle: 'Build Accessibly. Launch Transparently.',
    missionText: 'A Base-focused World designed for accessible development, programmable pathways and community participation.',
    focusTitle: 'The Base Builder Gateway',
    focusText: 'A dedicated portal for builders, education and future ImpactBased integration.',
    focus: ['Accessible builder discovery', 'Programmable project pathways', 'ImpactBased integration', 'Verified launch information'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  bnbworldz: {
    domains: ['bnbworldz.xyz', 'www.bnbworldz.xyz'],
    name: 'BNBWorldz', code: 'BNB', network: 'BNB Chain',
    accent: '#f2b928', accent2: '#ffe9a1', accentRgb: '242,185,40', accent2Rgb: '255,233,161',
    eyebrow: 'THE BNB CHAIN WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to BNBWorldz',
    motto: 'Global Reach • Community Power • Shared Mission',
    intro: 'BNBWorldz connects the broad BNB Chain community with education, builders and impact-focused projects.',
    missionTitle: 'Global Community, Clear Standards',
    missionText: 'A worldwide portal for education, project discovery and responsible community-led growth.',
    focusTitle: 'BNB Chain Community Gateway',
    focusText: 'Global participation connected to one shared mission.',
    focus: ['Global community reach', 'Education and safer participation', 'Verified project discovery', 'Connected humanitarian action'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  suiworldz: {
    domains: ['suiworldz.xyz', 'www.suiworldz.xyz'],
    name: 'SuiWorldz', code: 'SUI', network: 'Sui',
    accent: '#56bdf3', accent2: '#c5edff', accentRgb: '86,189,243', accent2Rgb: '197,237,255',
    eyebrow: 'THE SUI WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to SuiWorldz',
    motto: 'Move Forward • Build Together • Create Impact',
    intro: 'SuiWorldz connects Sui builders and communities with education, collaboration and real-world purpose.',
    missionTitle: 'Fast Innovation With Shared Purpose',
    missionText: 'A Sui-focused portal supporting builders, education and connected impact without losing sight of people.',
    focusTitle: 'Sui Builder and Community Portal',
    focusText: 'Innovation, learning and one connected mission.',
    focus: ['Sui ecosystem education', 'Builder and creator discovery', 'Future verified projects', 'Connected impact missions'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  hyperworldz: {
    domains: ['hyperworldz.xyz', 'www.hyperworldz.xyz'],
    name: 'HyperWorldz', code: 'HYPER', network: 'Hyperliquid',
    accent: '#49e6b8', accent2: '#c8ffef', accentRgb: '73,230,184', accent2Rgb: '200,255,239',
    eyebrow: 'THE HYPERLIQUID WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to HyperWorldz',
    motto: 'High Performance • Clear Purpose • One Ecosystem',
    intro: 'HyperWorldz connects high-performance crypto communities with education, transparent discovery and shared human purpose.',
    missionTitle: 'Performance Without Losing Perspective',
    missionText: 'A responsible portal for advanced communities, education and transparent project discovery.',
    focusTitle: 'Hyperliquid Community Portal',
    focusText: 'High-performance ecosystems connected to clear standards and real purpose.',
    focus: ['Responsible education', 'Transparent project discovery', 'Advanced community connections', 'Shared humanitarian mission'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  robinworldz: {
    domains: ['robinworldz.xyz', 'www.robinworldz.xyz'],
    name: 'RobinWorldz', code: 'R', network: 'Multi-Chain',
    accent: '#35d989', accent2: '#d8ff67', accentRgb: '53,217,137', accent2Rgb: '216,255,103',
    eyebrow: 'THE RECOVERY WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to RobinWorldz',
    motto: 'Recover • Rebuild • Return Value to the People',
    intro: 'RobinWorldz is the home of RecoverYourDebt and recovery-focused initiatives built around fairness, education and rebuilding.',
    missionTitle: 'Recovery, Fairness and Education',
    missionText: 'A recovery-focused portal designed to help people understand options, rebuild confidence and connect with responsible community projects.',
    focusTitle: 'RecoverYourDebt Home Base',
    focusText: 'A clear public portal for recovery education and future community-led initiatives.',
    focus: ['RecoverYourDebt project home', 'Practical recovery education', 'Fairness and community support', 'No guarantees or legal claims'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  bitworldz: {
    domains: ['bitworldz.xyz', 'www.bitworldz.xyz', 'bitcoinworldz.xyz', 'www.bitcoinworldz.xyz'],
    name: 'BitWorldz', code: 'BTC', network: 'Bitcoin',
    accent: '#f6a725', accent2: '#ffe2a0', accentRgb: '246,167,37', accent2Rgb: '255,226,160',
    eyebrow: 'THE BITCOIN WORLD OF CRYPTOWORLDZ',
    title: 'Welcome to BitWorldz',
    motto: 'Strong Foundations • Open Networks • Lasting Impact',
    intro: 'BitWorldz connects Bitcoin communities, education and long-term thinking with the wider CryptoWorldz mission.',
    missionTitle: 'Strong Foundations and Responsible Learning',
    missionText: 'A Bitcoin-focused World built around education, resilience, open networks and long-term community thinking.',
    focusTitle: 'Bitcoin Education Portal',
    focusText: 'Foundational learning connected to long-term purpose.',
    focus: ['Bitcoin education', 'Open network principles', 'Long-term resilience', 'Responsible community participation'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  hodlerworldz: {
    domains: ['hodlerworldz.xyz', 'www.hodlerworldz.xyz'],
    name: 'HodlerWorldz', code: 'HODL', network: 'Multi-Chain',
    accent: '#d568ff', accent2: '#ffd46d', accentRgb: '213,104,255', accent2Rgb: '255,212,109',
    eyebrow: 'THE LONG-TERM COMMUNITY WORLD',
    title: 'Welcome to HodlerWorldz',
    motto: 'Patience • Community • Long-Term Purpose',
    intro: 'HodlerWorldz recognises long-term supporters across blockchains while connecting loyalty with meaningful participation.',
    missionTitle: 'Long-Term Community Contribution',
    missionText: 'A multi-chain home for committed supporters, education, recognition and responsible participation.',
    focusTitle: 'The Long-Term Community Hub',
    focusText: 'Recognition, education and purpose beyond short-term hype.',
    focus: ['Community recognition', 'Multi-chain education', 'Long-term participation', 'Connected missions and rewards'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  purplediamondcrew: {
    domains: ['purplediamondcrew.com', 'www.purplediamondcrew.com'],
    name: 'Purple Diamond Crew', code: 'PDC', network: 'Real-World Action',
    accent: '#9f5cff', accent2: '#f0c9ff', accentRgb: '159,92,255', accent2Rgb: '240,201,255',
    eyebrow: 'THE LEADERS ON THE GROUND',
    title: 'Real People. Real Action.',
    motto: 'One World • One Mission • One Crew',
    intro: 'Purple Diamond Crew is the home of live ecosystem projects and real-world action led by people helping communities directly.',
    missionTitle: 'Practical Help Where It Matters',
    missionText: 'Support food, clothing, blankets, tents, schools, mattresses, gardening, bore drilling and medical assistance.',
    focusTitle: 'The Live Project and Action Hub',
    focusText: 'One place for existing projects, verified updates and leaders on the ground.',
    focus: ['Food and BBQ support for homeless people', 'Clothing, blankets and tents', 'School building and mattresses', 'Gardening, bore drilling and medical support'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow the ecosystem'
  },
  impactbased: {
    domains: ['impact.oneworldz.com', 'impactbased.oneworldz.com'],
    name: 'ImpactBased', code: 'IB', network: 'Purpose-Driven Launches',
    accent: '#62db8c', accent2: '#d4ff75', accentRgb: '98,219,140', accent2Rgb: '212,255,117',
    eyebrow: 'PURPOSE-FOCUSED LAUNCH ECOSYSTEM',
    title: 'Launch With a Visible Purpose.',
    motto: 'Programmable Pathways • Transparent Impact',
    intro: 'ImpactBased is designed to connect project launches with clear, programmable fee pathways and transparent real-world impact.',
    missionTitle: 'Make the Impact Path Easy to Understand',
    missionText: 'Explain where fees may go, who benefits and how allocations can be checked without inventing launch details.',
    focusTitle: 'From Charity.Based to Impact.Based',
    focusText: 'The current board may still use the Charity.Based name while the ecosystem prepares the Impact.Based identity.',
    focus: ['Plain-language programmable fee explanations', 'Transparent allocation pathways', 'Verified launches only', 'No invented contracts, prices or partnerships'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  law: {
    domains: ['law.oneworldz.com'],
    name: 'Robin Hood Law', code: 'RHL', network: 'Fairness Mission',
    accent: '#3bd18a', accent2: '#f2d86d', accentRgb: '59,209,138', accent2Rgb: '242,216,109',
    eyebrow: 'FAIRNESS, EDUCATION AND COMMUNITY',
    title: 'Knowledge Before Fear.',
    motto: 'Fairness • Dignity • Responsible Support',
    intro: 'Robin Hood Law is a mission-focused portal for fairness, education and community support without making legal guarantees.',
    missionTitle: 'Clear Information, Responsible Boundaries',
    missionText: 'Help people understand options, prepare questions and locate appropriate support while avoiding unqualified legal advice.',
    focusTitle: 'A Fairness and Education Portal',
    focusText: 'Support understanding without promising outcomes.',
    focus: ['General education only', 'No legal guarantees', 'Preparation and referral support', 'Community dignity and fairness'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  learn: {
    domains: ['learn.oneworldz.com'],
    name: 'LearnWorldz', code: 'LEARN', network: 'Education',
    accent: '#5f8dff', accent2: '#7ff3dd', accentRgb: '95,141,255', accent2Rgb: '127,243,221',
    eyebrow: 'EDUCATION FOR EVERY WORLD',
    title: 'Learn Clearly. Participate Safely.',
    motto: 'Crypto • Digital Skills • Community Education',
    intro: 'LearnWorldz is the education hub for blockchain basics, digital literacy, safer participation and practical community learning.',
    missionTitle: 'Education That Builds Confidence',
    missionText: 'Turn difficult subjects into clear steps that help people understand technology without pressure or hype.',
    focusTitle: 'The Education Gateway',
    focusText: 'A shared learning layer for every Worldz portal.',
    focus: ['Blockchain fundamentals', 'Wallet and scam safety', 'Digital literacy', 'Community and builder education'],
    social: OFFICIAL.cryptoX, socialLabel: 'Follow CryptoWorldz'
  },
  zed: {
    domains: ['cryptobotz.cryptoworldz.xyz'],
    name: 'Zed Command Centre', code: 'ZED', network: 'Telegram',
    accent: '#9a5cff', accent2: '#52ead1', accentRgb: '154,92,255', accent2Rgb: '82,234,209',
    eyebrow: 'THE CRYPTOWORLDZ COMMAND CENTRE',
    title: 'Meet Commander Zed.',
    motto: 'Register • Participate • Govern • Build',
    intro: 'Zed coordinates registration, profiles, missions, Raaiiidd activity, points, leaderboards, governance and contribution verification.',
    missionTitle: 'One Command Centre Across Every Group',
    missionText: 'Bring separate communities together through clear missions, shared tools and transparent participation.',
    focusTitle: 'Zed Core Features',
    focusText: 'A community coordination layer built for the wider CryptoWorldz ecosystem.',
    focus: ['Registration and wallet profile', 'Missions and Raaiiidd activity', 'Points and leaderboards', 'Governance and verification'],
    social: OFFICIAL.zed, socialLabel: 'Start @CryptoWorldzBot'
  }
};

const WORLD_DIRECTORY = [
  ['oneworldz', 'OneWorldz', '1W', 'Humanitarian head office and public mission hub.'],
  ['cryptoworldz', 'CryptoWorldz', 'CW', 'Central multi-chain ecosystem and Worldz directory.'],
  ['solworldz', 'SolWorldz', 'SOL', 'Solana community, builders, education and impact.'],
  ['ethworldz', 'EthWorldz', 'ETH', 'Ethereum builders, open infrastructure and purpose.'],
  ['xrpworldz', 'XRPWorldz', 'XRP', 'XRP Ledger education, payments and community utility.'],
  ['baseworldz', 'BaseWorldz', 'BASE', 'Accessible builders and programmable impact pathways.'],
  ['bnbworldz', 'BNBWorldz', 'BNB', 'Global BNB Chain community and education.'],
  ['suiworldz', 'SuiWorldz', 'SUI', 'Sui builders, innovation and shared impact.'],
  ['hyperworldz', 'HyperWorldz', 'HYPER', 'High-performance communities and transparent discovery.'],
  ['robinworldz', 'RobinWorldz', 'R', 'RecoverYourDebt and recovery-focused initiatives.'],
  ['bitworldz', 'BitWorldz', 'BTC', 'Bitcoin education, resilience and long-term thinking.'],
  ['hodlerworldz', 'HodlerWorldz', 'HODL', 'Long-term supporters across blockchains.'],
  ['purplediamondcrew', 'Purple Diamond Crew', 'PDC', 'Live projects and leaders on the ground.'],
  ['impactbased', 'ImpactBased', 'IB', 'Purpose-focused launch and fee-pathway ecosystem.'],
  ['learn', 'LearnWorldz', 'LEARN', 'Education, digital literacy and safer participation.'],
  ['zed', 'Zed Command Centre', 'ZED', 'Missions, points, governance and coordination.']
];

function keyFromLocation() {
  const params = new URLSearchParams(location.search);
  const requested = (params.get('site') || '').toLowerCase();
  if (requested && SITES[requested]) return requested;

  const pathMatch = location.pathname.match(/\/world\/([a-z0-9-]+)/i);
  if (pathMatch && SITES[pathMatch[1].toLowerCase()]) return pathMatch[1].toLowerCase();

  const host = location.hostname.toLowerCase();
  const found = Object.entries(SITES).find(([, site]) => site.domains.includes(host));
  return found ? found[0] : 'cryptoworldz';
}

function siteUrl(key) {
  const target = SITES[key];
  if (!target) return OFFICIAL.cryptoWorldz;
  if (target.domains.length && !target.domains[0].includes('localhost')) return `https://${target.domains[0]}`;
  return `?site=${key}&preview=1`;
}

const siteKey = keyFromLocation();
const site = SITES[siteKey];

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--accent', site.accent);
  root.style.setProperty('--accent-2', site.accent2);
  root.style.setProperty('--accent-rgb', site.accentRgb);
  root.style.setProperty('--accent2-rgb', site.accent2Rgb);

  document.title = `${site.name} | One Connected Worldz Ecosystem`;
  document.querySelector('meta[name="description"]').setAttribute('content', site.intro);

  setText('brandMark', site.code.slice(0, 2));
  setText('brandName', site.name);
  setText('brandSubline', siteKey === 'oneworldz' ? 'THE PUBLIC MISSION HEAD OFFICE' : 'A CONNECTED WORLDZ ECOSYSTEM');
  setText('heroEyebrow', site.eyebrow);
  setText('heroTitle', site.title);
  setText('heroMotto', site.motto);
  setText('heroIntro', site.intro);
  setText('networkChip', site.network);
  setText('orbCode', site.code);
  setText('orbLabel', site.name.toUpperCase());
  setText('missionTitle', site.missionTitle);
  setText('missionText', site.missionText);
  setText('focusEyebrow', site.network.toUpperCase());
  setText('focusTitle', site.focusTitle);
  setText('focusText', site.focusText);
  setText('focusCode', site.code);
  setText('focusBadgeTitle', site.name.toUpperCase());
  setText('focusBadgeText', site.motto);
  setText('finalTitle', `Join ${site.name}`);
  setText('finalText', site.motto);
  setText('footerMark', site.code.slice(0, 2));
  setText('footerName', site.name);
  setText('copyrightName', site.name);
  setText('year', String(new Date().getFullYear()));

  const socialAction = document.getElementById('socialAction');
  socialAction.href = site.social;
  socialAction.textContent = site.socialLabel;

  const primaryAction = document.getElementById('primaryAction');
  if (siteKey === 'zed') {
    primaryAction.href = OFFICIAL.zed;
    primaryAction.target = '_blank';
    primaryAction.rel = 'noopener noreferrer';
    primaryAction.textContent = 'Start Zed';
  } else {
    primaryAction.href = '#worldz';
    primaryAction.textContent = siteKey === 'oneworldz' ? 'Explore Mission Worldz' : 'Explore the Worldz';
  }
}

function renderPrinciples() {
  const grid = document.getElementById('principleGrid');
  grid.innerHTML = BASE_PRINCIPLES.map(item => `
    <article class="card reveal">
      <span class="card-icon" aria-hidden="true">${item.icon}</span>
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    </article>`).join('');
}

function renderWorlds() {
  const grid = document.getElementById('worldGrid');
  grid.innerHTML = WORLD_DIRECTORY.map(([key, name, code, text]) => {
    const active = key === siteKey ? ' aria-current="page"' : '';
    return `<a class="world-card reveal" href="${siteUrl(key)}"${active}>
      <span class="world-code">${code}</span>
      <h3>${name}</h3>
      <p>${text}</p>
      <span class="open-link">Open ${name} →</span>
    </a>`;
  }).join('');
}

function renderFocus() {
  const list = document.getElementById('focusList');
  list.innerHTML = site.focus.map(item => `<div class="focus-item">${item}</div>`).join('');
}

function renderProjects() {
  const grid = document.getElementById('projectGrid');
  const relevant = siteKey === 'purplediamondcrew' ? PROJECTS : PROJECTS.slice(0, 6);
  grid.innerHTML = relevant.map(project => `
    <article class="project-card reveal">
      <span class="status-pill">${project.status}</span>
      <h3>${project.name}</h3>
      <p>Official contract, chart and launch links will appear only after verification.</p>
      <div class="project-meta">
        <div class="project-row"><span>Network</span><strong>${project.network}</strong></div>
        <div class="project-row"><span>Contract</span><strong>Not yet verified</strong></div>
      </div>
    </article>`).join('');
}

function setupMenu() {
  const button = document.getElementById('menuButton');
  const nav = document.getElementById('siteNav');
  button.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  }));
}

function setupReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function setupPreview() {
  const params = new URLSearchParams(location.search);
  const enabled = params.get('preview') === '1' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!enabled) return;
  const panel = document.getElementById('previewPanel');
  const select = document.getElementById('previewSelect');
  panel.hidden = false;
  select.innerHTML = Object.entries(SITES).map(([key, item]) => `<option value="${key}"${key === siteKey ? ' selected' : ''}>${item.name}</option>`).join('');
  select.addEventListener('change', () => {
    location.href = `?site=${encodeURIComponent(select.value)}&preview=1`;
  });
}

applyTheme();
renderPrinciples();
renderWorlds();
renderFocus();
renderProjects();
setupMenu();
setupPreview();
setupReveal();
