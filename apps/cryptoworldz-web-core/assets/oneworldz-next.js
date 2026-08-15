const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const brandTitle = document.querySelector('#brand-title');
const brandSubtitle = document.querySelector('#brand-subtitle');
const walletButton = document.querySelector('#wallet-button');

const LINKS = Object.freeze({
  crypto: 'https://cryptoworldz.xyz',
  pdc: 'https://purplediamondcrew.com',
  learn: 'https://learn.oneworldz.com',
  law: 'https://law.oneworldz.com',
  impact: 'https://impactbased.oneworldz.com',
  food: 'https://foodworldz.com',
  donate: 'https://donateworldz.com',
  command: 'https://cryptobotz.cryptoworldz.xyz',
  bot: 'https://t.me/CryptoWorldzBot'
});

const MEDIA = Object.freeze({
  gateway: ['01-global-gateway.webp', 'OneWorldz global gateway — One Vision'],
  future: ['02-little-legend-future.webp', 'Children, learning, kindness and the future'],
  action: ['03-humanitarian-action.webp', 'People helping people through practical humanitarian action'],
  pillars: ['04-people-planet-tech-leadership.webp', 'People, planet, technology and responsible leadership'],
  learn: ['05-learn.webp', 'Learn.OneWorldz — Knowledge Creates Power'],
  law: ['06-law.webp', 'Law.OneWorldz — fairness, understanding and public pathways'],
  impact: ['07-impactbased.webp', 'ImpactBased — ideas with purpose and projects with proof'],
  hope: ['08-hope-chest.webp', 'The OneWorldz Hope Chest — legacy, lessons and second chances'],
  ecosystem: ['09-worldz-ecosystem.webp', 'The connected OneWorldz ecosystem'],
  stand: ['10-stand-as-one-2030.webp', 'Stand As One 2026 to 2030 humanitarian event concept']
});

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function picture(key, className = '') {
  const [file, alt] = MEDIA[key];
  return `<picture class="${className}">
    <source media="(max-width:780px)" srcset="./assets/images/oneworldz-recovery/mobile/${file}">
    <img src="./assets/images/oneworldz-recovery/desktop/${file}" alt="${esc(alt)}" loading="lazy" decoding="async">
  </picture>`;
}

function button(label, href, variant = '') {
  const external = href.startsWith('http');
  return `<a class="button button-primary ${variant}" href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)}</a>`;
}

function card(icon, title, copy, href = '') {
  return `<article class="ow-action-card"><span class="ow-check" aria-hidden="true">${icon}</span><div><h3>${esc(title)}</h3><p>${esc(copy)}</p></div>${href ? button(`Open ${title}`, href) : ''}</article>`;
}

brandTitle.textContent = 'ONEWORLDZ';
brandSubtitle.textContent = 'ONEWORLDZ 🌏 ONE VISION';
document.title = 'OneWorldz 🌏 One Vision | Helping the People Who Help People';
document.body.classList.add('oneworldz-recovered');

walletButton.textContent = 'Open Command Centre';
walletButton.onclick = () => window.open(LINKS.command, '_blank', 'noopener,noreferrer');

nav.innerHTML = [
  ['Home', '#home'], ['Vision', '#vision'], ['Action', '#action'], ['Learn', LINKS.learn],
  ['Law', LINKS.law], ['ImpactBased', LINKS.impact], ['Worldz', '#worldz'], ['2030', '#stand-as-one']
].map(([label, href]) => `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`).join('');

const worldCards = [
  ['CryptoWorldz', 'Crypto headquarters, education, communities and the protected Command Centre.', LINKS.crypto],
  ['Learn.OneWorldz', 'Knowledge Creates Power — practical learning, confidence and opportunity.', LINKS.learn],
  ['Law.OneWorldz', 'Plain-language public information, fairness and pathways without pretending to replace professional legal advice.', LINKS.law],
  ['ImpactBased', 'Ideas with Purpose. Projects with Proof. Purpose-led projects and transparent participation.', LINKS.impact],
  ['FoodWorldz', 'See needs, food projects and practical impact.', LINKS.food],
  ['DonateWorldz', 'Choose clearly separated support pathways.', LINKS.donate],
  ['Purple Diamond Crew', 'Legacy, community action and the Hope Chest story.', LINKS.pdc],
  ['Command Centre', 'Protected ZED / CryptoBotz operating destination.', LINKS.command]
].map(([name, copy, href]) => `<article class="ow-world-card"><span class="ow-status">CONNECTED DESTINATION</span><span class="ow-world-icon" aria-hidden="true">◎</span><h3>${esc(name)}</h3><p>${esc(copy)}</p>${button(`Visit ${name}`, href)}</article>`).join('');

app.innerHTML = `<div class="ow-shell">
  <section id="home" class="ow-hero">
    <div class="ow-hero-copy">
      <p class="eyebrow">ONEWORLDZ 🌏 ONE VISION</p>
      <h1>OneWorldz</h1>
      <p>The global gateway connecting people, humanitarian action, knowledge, fair pathways, responsible technology and specialised Worldz around one practical mission: helping people help people.</p>
      <div class="button-row ow-hero-actions">${button('Explore the Worldz', '#worldz')}${button('Help People', LINKS.donate, 'button-muted')}${button('Learn', LINKS.learn, 'button-muted')}</div>
      <div class="ow-trust-strip"><span>One World • One Mission</span><span>Kindness Matters</span><span>Action Creates Change</span></div>
    </div>
    ${picture('gateway', 'ow-hero-art')}
  </section>

  <div class="ow-rally"><strong>Helping the People Who Help People</strong><span>One connected vision • many specialised destinations</span></div>

  <section id="vision" class="ow-impact-gallery">
    ${picture('future')}
    <div><p class="eyebrow">THE ONE VISION BLUEPRINT</p><h2>The future is the reason.</h2><p>OneWorldz starts with people — especially children and communities whose opportunities should never depend on where they were born. The goal is not another website network. It is a structure people can understand, join, test and improve.</p><div class="button-row">${button('Knowledge Creates Power', LINKS.learn)}${button('See Humanitarian Action', '#action', 'button-muted')}</div></div>
  </section>

  <section class="ow-section"><div class="ow-section-heading"><p class="eyebrow">VISION → MISSION → PRINCIPLES → ACTION</p><h2>A framework that keeps improving.</h2><p>Research → Compare → Verify → Recommend → Implement → Measure Results → Improve Again.</p></div><div class="ow-action-grid">
    ${card('1','Vision','A connected world where people, communities and technology work together for practical positive change.')}
    ${card('2','Mission','Turn ideas and community effort into real projects with clear purpose and transparent outcomes.')}
    ${card('3','Core Principles','Kindness, fairness, transparency, participation, accountability and respect.')}
  </div></section>

  <section class="ow-impact-gallery">
    ${picture('pillars')}
    <div><p class="eyebrow">FOUR PILLARS</p><h2>People • Planet • Technology • Leadership</h2><p>Food, dignity and opportunity. Water, farming and sustainable systems. Technology used where it genuinely improves access or transparency. Leadership measured by responsibility and outcomes.</p></div>
  </section>

  <section id="action" class="ow-impact-gallery">
    ${picture('action')}
    <div><p class="eyebrow">HUMANITARIAN ACTION STAYS CENTRAL</p><h2>See the need. Understand it. Then act.</h2><p>FoodWorldz explains needs and projects. DonateWorldz keeps support pathways clearly separated. OneWorldz connects that action to the wider mission without turning humanitarian work into a side feature.</p><div class="button-row">${button('Open FoodWorldz', LINKS.food)}${button('Open DonateWorldz', LINKS.donate, 'button-muted')}</div></div>
  </section>

  <section class="ow-section"><div class="ow-section-heading"><p class="eyebrow">FLAGSHIP PATHWAYS</p><h2>Three different jobs. One shared standard.</h2></div><div class="ow-action-grid">
    ${card('L','Learn.OneWorldz','Knowledge Creates Power — education, digital literacy, practical skills and confident participation.', LINKS.learn)}
    ${card('⚖','Law.OneWorldz','Public information, rights awareness and understandable pathways with clear professional-advice boundaries.', LINKS.law)}
    ${card('♥','ImpactBased','Ideas with Purpose. Projects with Proof. Discover projects, purpose and transparent ways to participate.', LINKS.impact)}
  </div></section>

  <section class="ow-split-section">
    <article class="ow-story-panel ow-story-purple">${picture('learn')}<p class="eyebrow">LEARN.ONEWORLDZ.COM</p><h2>Knowledge Creates Power.</h2><p>Learning should make difficult systems easier to understand and give people confidence to participate safely.</p>${button('Enter Learn', LINKS.learn)}</article>
    <article class="ow-story-panel ow-story-gold">${picture('law')}<p class="eyebrow">LAW.ONEWORLDZ.COM</p><h2>Understand the pathway.</h2><p>Clear public information about systems, rights, options and questions to ask — without false legal-advice claims.</p>${button('Enter Law', LINKS.law)}</article>
  </section>

  <section class="ow-impact-gallery">${picture('impact')}<div><p class="eyebrow">IMPACTBASED.ONEWORLDZ.COM</p><h2>Ideas with Purpose. Projects with Proof.</h2><p>ImpactBased connects purpose-driven projects, transparent information and participation while keeping claims tied to what can actually be verified.</p>${button('Enter ImpactBased', LINKS.impact)}</div></section>

  <section class="ow-impact-gallery">${picture('hope')}<div><p class="eyebrow">STORIES • LEGACY • SECOND CHANCES</p><h2>The Hope Chest</h2><p>History, lessons, people and useful work are preserved without confusing legacy information with current production status.</p>${button('Visit Purple Diamond Crew', LINKS.pdc)}</div></section>

  <section id="worldz" class="ow-section"><div class="ow-section-heading">${picture('ecosystem')}<p class="eyebrow">ONE ECOSYSTEM • MANY WORLDZ</p><h2>Go directly to what you came here for.</h2><p>OneWorldz is the map and global gateway. Each connected destination has a specialised purpose.</p></div><div class="ow-world-grid">${worldCards}</div></section>

  <section id="stand-as-one" class="ow-impact-gallery">${picture('stand')}<div><p class="eyebrow">2026 → 2030</p><h2>Stand As One.</h2><p>A developing humanitarian music, community and practical-action concept: people gathering to help, learn, share food, support infrastructure and celebrate what humanity can build together. Artists, sponsors and venues are only described as confirmed when they genuinely are.</p><div class="button-row">${button('Explore the Mission', '#vision')}${button('Command Centre', LINKS.command, 'button-muted')}</div></div></section>

  <section class="ow-section"><div class="ow-section-heading"><p class="eyebrow">LONG-TERM GOAL</p><h2>Build a structure people can join, understand and improve.</h2><p>Progress is judged by practical outcomes, transparent learning and whether the system helps people help people.</p></div></section>

  <p class="sw-disclaimer">OneWorldz is a public gateway. Verify external destinations before interacting. It does not provide personalised legal advice, store payment credentials, expose private Command Centre controls or guarantee financial or humanitarian outcomes.</p>
</div>`;
