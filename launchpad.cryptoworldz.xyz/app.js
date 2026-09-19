const tokens=[
  {number:"#001",name:"WORLDZ",ticker:"WLDZ",supply:"100,000,000",accent:"#a24cff",mission:"Global impact and participation — food, water, housing, education, infrastructure and People helping People.",weight:"70/30 Equalizer"},
  {number:"#002",name:"REVIVE",ticker:"RVIV",supply:"200,000,000",accent:"#ff4fb0",mission:"Revive genuine PurpleDiamondCrew / CryptoWorldz legacy history while reducing domination by the largest historic wallets.",weight:"50/50 Equalizer"},
  {number:"#003",name:"PHENIX",ticker:"PNEX",supply:"250,000,000",accent:"#ff8a3d",mission:"Transparent rebirth for failed, abandoned or exhausted crypto/community ideas with stronger governance and no recovery promises.",weight:"40/60 Equalizer"},
  {number:"#004",name:"MIRACLE",ticker:"MRCL",supply:"348,000,000",accent:"#7b8cff",mission:"Community-powered generosity beginning with the Miracle community concept and extending into hunger relief and verified action.",weight:"30/70 Equalizer"}
];
const grid=document.querySelector("#token-grid");
grid.innerHTML=tokens.map(t=>`
  <article class="token-card" style="--accent:${t.accent}">
    <div class="token-number">${t.number} • PLANNED</div>
    <h3>${t.name} <span class="ticker">$${t.ticker}</span></h3>
    <div class="supply">${t.supply}</div>
    <div class="mission">${t.mission}</div>
    <div class="token-meta">
      <span>Fixed supply</span><span>25/25/25/25</span><span>1% Legacy</span><span>${t.weight}</span>
    </div>
  </article>`).join("");
