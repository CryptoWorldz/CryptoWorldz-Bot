const ROUTES = [
  {key:"solana",name:"Solana",status:"DEVNET FIRST",note:"BTC representation + Meteora/Raydium-compatible BitPair research."},
  {key:"ethereum",name:"Ethereum",status:"TESTNET RESEARCH",note:"Shared EVM adapter + approved ERC-20 BTC representation."},
  {key:"base",name:"Base",status:"TESTNET RESEARCH",note:"Shared EVM adapter + chain-local BTC quote asset."},
  {key:"bnb",name:"BNB Chain",status:"TESTNET RESEARCH",note:"Shared EVM adapter + chain-local BTC quote asset."},
  {key:"sui",name:"Sui",status:"RESEARCH",note:"Move-native market adapter + verified Sui BTC representation."},
  {key:"xrpl",name:"XRP Ledger",status:"RESEARCH",note:"Issued/bridged BTC identity + XRPL-native market proof."},
  {key:"hyperevm",name:"HyperEVM",status:"RESEARCH",note:"Shared EVM family + independently proven BTC asset/venue."},
  {key:"robinhood",name:"Robinhood Chain",status:"RESEARCH",note:"Shared EVM family + independently proven BTC asset/venue."}
];

const routeGrid = document.querySelector("#route-grid");
const chain = document.querySelector("#chain");
const asset = document.querySelector("#asset");
const symbol = document.querySelector("#symbol");
const assetId = document.querySelector("#asset-id");
const venue = document.querySelector("#venue");
const proof = document.querySelector("#proof");
const buildBtn = document.querySelector("#build-proof");
const copyBtn = document.querySelector("#copy-proof");

for (const r of ROUTES) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "route-card";
  card.dataset.chain = r.key;
  card.innerHTML = `<strong>${r.name}</strong><small>${r.note}</small><em>${r.status}</em>`;
  card.addEventListener("click", () => {
    chain.value = r.key;
    document.querySelectorAll(".route-card[data-chain]").forEach(x => x.classList.toggle("active", x.dataset.chain === r.key));
    render();
    document.querySelector("#builder").scrollIntoView({behavior:"smooth",block:"start"});
  });
  routeGrid.append(card);

  const option = document.createElement("option");
  option.value = r.key;
  option.textContent = r.name;
  chain.append(option);
}

function clean(v, max=160) {
  return String(v || "").trim().slice(0,max);
}

function buildIntent() {
  const id = clean(assetId.value, 180);
  return {
    version: "BITWORLDZ-BITPAIR-INTENT-V1",
    mode: "RESEARCH_ONLY",
    targetChain: chain.value,
    bitcoinAsset: {
      class: asset.value,
      symbol: clean(symbol.value || "BTC", 16).toUpperCase(),
      assetId: id || null,
      verificationStatus: id ? "UNVERIFIED_INPUT" : "MISSING_ID"
    },
    venue: clean(venue.value, 120) || null,
    economics: {
      targetGrossTraderFeeBps: 75,
      dynamicFee: false,
      externalBridgeDexAndNetworkFeesSeparate: true,
      worldzControlledSplitPercent: {
        creator: 51,
        referrer: 17,
        legacyFlywheel: 15,
        worldzLaunchPad: 8.5,
        oneWorldzImpact: 8.5
      }
    },
    safety: {
      mainnetExecutionEnabled: false,
      automaticCrossChainMovementEnabled: false,
      worldzCustodiesNativeBitcoin: false,
      exactAssetIdentityRequired: true,
      wrappedOrBridgedMayBeCalledNative: false
    },
    requiredBeforeExecution: [
      "authoritative asset identity verification",
      "peg/custody/bridge and redemption disclosure",
      "venue quote-asset compatibility proof",
      "buy and sell simulation/testnet receipts",
      "all external and Worldz fee receipts",
      "liquidity protection proof",
      "BitProof transaction evidence",
      "explicit chain + asset + venue release"
    ]
  };
}

function render() {
  const obj = buildIntent();
  proof.textContent = JSON.stringify(obj, null, 2);
}

for (const el of [chain,asset,symbol,assetId,venue]) {
  el.addEventListener("input",render);
  el.addEventListener("change",render);
}

buildBtn.addEventListener("click", () => {
  render();
  proof.animate([{opacity:.35},{opacity:1}],{duration:250});
});

copyBtn.addEventListener("click", async () => {
  render();
  try {
    await navigator.clipboard.writeText(proof.textContent);
    const old = copyBtn.textContent;
    copyBtn.textContent = "Copied";
    setTimeout(()=>copyBtn.textContent=old,1200);
  } catch {
    copyBtn.textContent = "Copy blocked — select JSON";
    setTimeout(()=>copyBtn.textContent="Copy JSON",1800);
  }
});

chain.value = "solana";
render();
