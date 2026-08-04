const mobileLayoutFix = document.createElement('style');
mobileLayoutFix.textContent = `
  html, body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    overscroll-behavior-x: none;
  }

  body { position: relative; }

  main, header, footer, section, .section,
  .hero, .mission, .explore, .impact, .launch, .cta,
  .feature-grid, .portal-grid, .launch-grid, .impact-panel {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .hero > *, .feature-grid > *, .portal-grid > *,
  .launch-grid > *, .impact-panel > * {
    min-width: 0;
    max-width: 100%;
  }

  .hero-art {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  h1, h2, h3, p, a, strong, span {
    overflow-wrap: anywhere;
  }

  @media (max-width: 760px) {
    .header {
      width: 100%;
      max-width: 100%;
    }

    .brand {
      min-width: 0;
      max-width: calc(100% - 58px);
    }

    .brand-copy {
      min-width: 0;
      max-width: 100%;
    }

    .brand-copy strong {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .section {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }

    .hero {
      min-width: 0;
      overflow: hidden;
    }

    .hero h1 {
      width: 100%;
      max-width: 100%;
      font-size: clamp(2.25rem, 12.5vw, 3.55rem);
      letter-spacing: -0.035em;
    }

    .hero h1 strong {
      display: block;
      width: 100%;
      max-width: 100%;
      word-break: break-word;
    }

    .hero-art {
      min-height: 320px;
    }

    .planet {
      width: min(62vw, 235px);
      max-width: 235px;
    }

    .orbit {
      width: min(84vw, 340px);
      max-width: calc(100vw - 28px);
    }

    .orbit-b {
      width: min(92vw, 370px);
      max-width: calc(100vw - 16px);
    }

    .row {
      align-items: flex-start;
    }

    .row strong {
      max-width: 55%;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .mobile-nav {
      width: 100%;
      max-width: 100%;
    }
  }
`;
document.head.appendChild(mobileLayoutFix);

const SITES = {
  solworldz: {
    domains:['solworldz.xyz'], name:'SolWorldz', code:'SOL', chain:'Solana',
    accent:'#8b5cff', accent2:'#38e8c6',
    tagline:'One World • One Mission • One SolFam 💜',
    intro:'SolWorldz connects Solana communities, builders, education, token ecosystems and real-world humanitarian action under one united mission.',
    mission:'A Solana community ecosystem designed to help people learn, connect, build and create positive real-world impact.',
    portal:'The Solana home for community, education, future launches and shared CryptoWorldz missions.',
    status:'SolWorldz is being prepared for its official ecosystem launch.',
    social:'https://x.com/Solworldx', socialLabel:'Follow SolWorldz on X'
  },
  ethworldz: {
    domains:['ethworldz.xyz'], name:'EthWorldz', code:'ETH', chain:'Ethereum',
    accent:'#8096ff', accent2:'#c2c9ff',
    tagline:'Ethereum Builders • Shared Purpose • Global Impact',
    intro:'EthWorldz brings Ethereum builders, communities, education and purpose-driven projects into the connected CryptoWorldz ecosystem.',
    mission:'A dedicated Ethereum World where builders and communities can grow independently while supporting the wider mission.',
    portal:'The Ethereum home for builders, education, verified projects and connected community action.',
    status:'EthWorldz is being prepared as the Ethereum portal of CryptoWorldz.'
  },
  xrpworldz: {
    domains:['xrpworldz.xyz'], name:'XRPWorldz', code:'XRP', chain:'XRP Ledger',
    accent:'#37d7ff', accent2:'#ffffff',
    tagline:'Fast Connections • Strong Communities • Real Impact',
    intro:'XRPWorldz connects XRP Ledger communities, payment innovation, education and real-world impact through CryptoWorldz.',
    mission:'A community-first XRP Ledger portal focused on useful technology, stronger connections and positive outcomes.',
    portal:'The XRP Ledger home for community, education, future launches and ecosystem collaboration.',
    status:'XRPWorldz is being prepared as the XRP Ledger portal of CryptoWorldz.'
  },
  baseworldz: {
    domains:['baseworldz.xyz'], name:'BaseWorldz', code:'BASE', chain:'Base',
    accent:'#246bff', accent2:'#67b5ff',
    tagline:'Built on Base • Connected by Purpose',
    intro:'BaseWorldz brings Base communities, builders, programmable projects and real-world impact into CryptoWorldz.',
    mission:'A Base-focused World for accessible building, community participation and transparent impact pathways.',
    portal:'The Base home for builders, programmable launches, education and connected community missions.',
    status:'BaseWorldz is being prepared as the Base portal of CryptoWorldz.'
  },
  bnbworldz: {
    domains:['bnbworldz.xyz'], name:'BNBWorldz', code:'BNB', chain:'BNB Chain',
    accent:'#f6bd29', accent2:'#fff0a8',
    tagline:'Global Reach • Community Power • Shared Mission',
    intro:'BNBWorldz connects the broad BNB Chain community with education, builders and impact-focused CryptoWorldz projects.',
    mission:'A global BNB Chain portal designed for participation, education and community-led growth.',
    portal:'The BNB Chain home for community discovery, verified projects and shared humanitarian missions.',
    status:'BNBWorldz is being prepared as the BNB Chain portal of CryptoWorldz.'
  },
  suiworldz: {
    domains:['suiworldz.xyz'], name:'SuiWorldz', code:'SUI', chain:'Sui',
    accent:'#62c7ff', accent2:'#b6e7ff',
    tagline:'Move Forward • Build Together • Create Impact',
    intro:'SuiWorldz connects the Sui ecosystem’s builders and communities with education, collaboration and real-world purpose.',
    mission:'A fast-moving Sui community portal supporting innovation without losing sight of people and purpose.',
    portal:'The Sui home for builders, learning, future ecosystem projects and connected impact.',
    status:'SuiWorldz is being prepared as the Sui portal of CryptoWorldz.'
  },
  hyperworldz: {
    domains:['hyperworldz.xyz'], name:'HyperWorldz', code:'HYPER', chain:'Hyperliquid',
    accent:'#50f2c2', accent2:'#b2ffe9',
    tagline:'High Performance • Clear Purpose • One Ecosystem',
    intro:'HyperWorldz connects the Hyperliquid community with CryptoWorldz education, collaboration and transparent project discovery.',
    mission:'A performance-focused World designed to connect advanced crypto communities with a shared human mission.',
    portal:'The Hyperliquid home for education, community, future projects and responsible ecosystem discovery.',
    status:'HyperWorldz is being prepared as the Hyperliquid portal of CryptoWorldz.'
  },
  robinworldz: {
    domains:['robinworldz.xyz'], name:'RobinWorldz', code:'R', chain:'Multi-Chain',
    accent:'#39e389', accent2:'#d5ff5f',
    tagline:'Recover • Rebuild • Return Value to the People',
    intro:'RobinWorldz is the CryptoWorldz home for recovery-focused projects, including the RecoverYourDebt mission and community-led value restoration.',
    mission:'A recovery and fairness portal connecting useful financial education, community support and purpose-driven projects.',
    portal:'The home for RecoverYourDebt, recovery education and future community-led financial missions.',
    status:'RobinWorldz is being prepared for its official recovery ecosystem launch.'
  },
  bitworldz: {
    domains:['bitworldz.xyz','bitcoinworldz.xyz'], name:'BitWorldz', code:'BTC', chain:'Bitcoin',
    accent:'#f7a928', accent2:'#ffe0a1',
    tagline:'Strong Foundations • Open Networks • Lasting Impact',
    intro:'BitWorldz connects Bitcoin communities, education and long-term thinking with the wider CryptoWorldz mission.',
    mission:'A Bitcoin-focused World built around education, resilience, community and responsible participation.',
    portal:'The Bitcoin home for education, community discovery and future purpose-driven ecosystem projects.',
    status:'BitWorldz is being prepared as the Bitcoin portal of CryptoWorldz.'
  },
  hodlerworldz: {
    domains:['hodlerworldz.xyz'], name:'HodlerWorldz', code:'HODL', chain:'Multi-Chain',
    accent:'#d669ff', accent2:'#ffd36b',
    tagline:'Patience • Community • Long-Term Purpose',
    intro:'HodlerWorldz celebrates long-term community members across blockchains while connecting patience with meaningful participation.',
    mission:'A cross-chain home for committed supporters, education and long-term ecosystem contribution.',
    portal:'The multi-chain home for long-term supporters, community recognition and connected CryptoWorldz missions.',
    status:'HodlerWorldz is being prepared as the long-term community portal of CryptoWorldz.'
  }
};

function chooseSite(){
  const preview = new URLSearchParams(location.search).get('site');
  if(preview && SITES[preview]) return SITES[preview];
  const host = location.hostname.replace(/^www\./,'').toLowerCase();
  return Object.values(SITES).find(s=>s.domains.includes(host)) || SITES.solworldz;
}

const site = chooseSite();
document.documentElement.style.setProperty('--accent',site.accent);
document.documentElement.style.setProperty('--accent2',site.accent2);
document.title = `${site.name} | CryptoWorldz`;
document.querySelector('meta[name="description"]').setAttribute('content',site.intro);
const set=(id,value)=>{const el=document.getElementById(id); if(el) el.textContent=value};
set('brandOrb',site.code[0]); set('brandName',site.name); set('heroName',site.name.toUpperCase());
set('tagline',site.tagline); set('intro',site.intro); set('chainChip',`⚡ Built for ${site.chain}`);
set('planetCode',site.code); set('planetLabel',site.name.toUpperCase());
set('missionTitle',`${site.name}: A World Built With Purpose`); set('missionText',site.mission);
set('worldBadge',site.code); set('worldPortalName',site.name); set('worldPortalText',site.portal);
set('launchTitle',`${site.name} Launch Centre`); set('statusTitle',`${site.name} — Building`); set('statusText',site.status); set('networkName',site.chain);
set('ctaTitle',`Welcome to ${site.name}`); set('ctaText',site.tagline); set('footerOrb',site.code[0]); set('footerName',site.name); set('copyrightName',site.name);
const social=document.getElementById('socialLink'); social.href=site.social||'https://x.com/CryptoWorldzX'; social.textContent=site.socialLabel||'Follow CryptoWorldz on X';
set('year',new Date().getFullYear());

const menu=document.getElementById('menuButton'), nav=document.getElementById('nav');
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
