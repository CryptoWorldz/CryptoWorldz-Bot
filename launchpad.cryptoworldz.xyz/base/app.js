import {
  BrowserProvider,ContractFactory,getAddress,isAddress,formatUnits
} from 'https://esm.sh/ethers@6.15.0?bundle';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const BASE_SEPOLIA_CHAIN_ID=84532;
const BASE_SEPOLIA_HEX='0x14a34';
const BASE_SEPOLIA_RPC='https://sepolia.base.org';
const SOURCE=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WorldzFairToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    uint256 public constant WORLDZ_SAFE_LAUNCH_VERSION = 1;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 wholeSupply_,
        address[5] memory recipients_,
        uint16[5] memory bps_
    ) {
        require(bytes(name_).length >= 2 && bytes(name_).length <= 32, "name");
        require(bytes(symbol_).length >= 2 && bytes(symbol_).length <= 10, "symbol");
        require(wholeSupply_ >= 1000 && wholeSupply_ <= 1_000_000_000_000, "supply");
        require(bps_[0] <= 500, "creator >5%");
        require(bps_[1] >= 2500 && bps_[1] <= 6000, "liquidity");
        require(bps_[2] >= 2000, "community");
        require(bps_[3] <= 1500, "treasury");

        uint256 sum;
        for (uint256 i=0; i<5; i++) {
            require(recipients_[i] != address(0), "zero recipient");
            sum += bps_[i];
            for (uint256 j=0; j<i; j++) require(recipients_[i] != recipients_[j], "duplicate recipient");
        }
        require(sum == 10000, "allocations !=100%");

        name = name_;
        symbol = symbol_;
        totalSupply = wholeSupply_ * 1e18;

        uint256 allocated;
        for (uint256 i=0; i<4; i++) {
            uint256 amount = totalSupply * bps_[i] / 10000;
            allocated += amount;
            balanceOf[recipients_[i]] = amount;
            emit Transfer(address(0), recipients_[i], amount);
        }
        uint256 finalAmount = totalSupply - allocated;
        balanceOf[recipients_[4]] = finalAmount;
        emit Transfer(address(0), recipients_[4], finalAmount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "zero");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "balance");
        unchecked { balanceOf[from] = bal - amount; }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}`;

let provider=null,signer=null,walletAddress='',abi=null,bytecode='',compiled=false,checked=false,deployedAddress='',deployTx='';

function setStatus(id,text,type=''){const el=$(id);el.textContent=text;el.className='status'+(type?' '+type:'');}
function allocations(){
  const out={};$$('.allocation').forEach(x=>out[x.dataset.key]=Number(x.value)||0);return out;
}
function allocationTotal(){return Object.values(allocations()).reduce((a,b)=>a+b,0);}
function values(){
  return {
    name:$('#name').value.trim(),
    symbol:$('#symbol').value.trim().toUpperCase(),
    supply:$('#supply').value.trim(),
    fee:Number($('#fee').value),
    alloc:allocations(),
    recipients:[
      $('#creator-wallet').value.trim(),
      $('#liquidity-wallet').value.trim(),
      $('#community-wallet').value.trim(),
      $('#treasury-wallet').value.trim(),
      $('#growth-wallet').value.trim()
    ]
  };
}
async function compileTemplate(){
  $('#compile').disabled=true;
  setStatus('#compile-status','Loading Solidity compiler in your browser…','warn');
  try{
    const mod=await import('https://esm.sh/solc@0.8.30?bundle');
    const solc=mod.default||mod;
    if(typeof solc.compile!=='function')throw new Error('Solidity compiler did not expose compile().');
    const input={
      language:'Solidity',
      sources:{'WorldzFairToken.sol':{content:SOURCE}},
      settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}
    };
    const output=JSON.parse(solc.compile(JSON.stringify(input)));
    const errors=(output.errors||[]).filter(x=>x.severity==='error');
    if(errors.length)throw new Error(errors.map(x=>x.formattedMessage||x.message).join('\n'));
    const contract=output.contracts?.['WorldzFairToken.sol']?.WorldzFairToken;
    if(!contract?.abi||!contract?.evm?.bytecode?.object)throw new Error('Compiled token artifact missing.');
    abi=contract.abi;bytecode='0x'+contract.evm.bytecode.object;compiled=true;
    setStatus('#compile-status','SAFE TEMPLATE COMPILED ✅\nNo post-genesis mint function. No freeze function. Fixed 18 decimals. Direct genesis allocation.\nBytecode size: '+((bytecode.length-2)/2).toLocaleString()+' bytes.','good');
    runPreflight();
  }catch(e){
    console.error(e);compiled=false;setStatus('#compile-status','TEMPLATE COMPILE FAILED\n'+(e?.message||String(e)),'bad');
  }finally{$('#compile').disabled=false;}
}
async function connect(){
  if(!window.ethereum)return setStatus('#status','No EVM wallet detected. Open in Coinbase Wallet / MetaMask or enable an EIP-1193 wallet.','bad');
  try{
    await window.ethereum.request({method:'eth_requestAccounts'});
    const current=await window.ethereum.request({method:'eth_chainId'});
    if(current.toLowerCase()!==BASE_SEPOLIA_HEX){
      try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:BASE_SEPOLIA_HEX}]});}
      catch(err){
        if(err?.code!==4902)throw err;
        await window.ethereum.request({method:'wallet_addEthereumChain',params:[{
          chainId:BASE_SEPOLIA_HEX,chainName:'Base Sepolia',nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},
          rpcUrls:[BASE_SEPOLIA_RPC],blockExplorerUrls:['https://sepolia.basescan.org']
        }]});
      }
    }
    provider=new BrowserProvider(window.ethereum);
    const network=await provider.getNetwork();
    if(Number(network.chainId)!==BASE_SEPOLIA_CHAIN_ID)throw new Error('Wallet is not on Base Sepolia.');
    signer=await provider.getSigner();walletAddress=await signer.getAddress();
    $('#wallet').textContent=walletAddress.slice(0,6)+'…'+walletAddress.slice(-4);
    $('#wallet').classList.add('connected');
    if(!$('#creator-wallet').value.trim())$('#creator-wallet').value=walletAddress;
    setStatus('#status','BASE SEPOLIA WALLET CONNECTED ✅\n'+walletAddress+'\nNo transaction has been requested.','good');
    runPreflight();
  }catch(e){setStatus('#status','WALLET CONNECTION FAILED\n'+(e?.message||String(e)),'bad');}
}
function runPreflight(){
  const v=values(),errors=[];
  if(!compiled)errors.push('Compile the Worldz token template first.');
  if(!walletAddress)errors.push('Connect an EVM wallet on Base Sepolia.');
  if(v.name.length<2||v.name.length>32)errors.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(v.symbol))errors.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!/^\d+$/.test(v.supply)||BigInt(v.supply)<1000n||BigInt(v.supply)>1000000000000n)errors.push('Supply must be 1,000 to 1,000,000,000,000 whole tokens.');
  if(!Number.isFinite(v.fee)||v.fee<0.5||v.fee>3)errors.push('Configured project trading fee must be 0.50%–3.00%.');
  const total=allocationTotal();
  if(Math.abs(total-100)>0.001)errors.push('Genesis allocations must total exactly 100%. Current: '+total+'%.');
  if(v.alloc.creator<0||v.alloc.creator>5)errors.push('Base v1 creator liquid allocation is capped at 5%.');
  if(v.alloc.liquidity<25||v.alloc.liquidity>60)errors.push('Liquidity allocation must be 25–60%.');
  if(v.alloc.community<20)errors.push('Community allocation must be at least 20%.');
  if(v.alloc.treasury<0||v.alloc.treasury>15)errors.push('Treasury allocation cannot exceed 15%.');
  const normalized=[];
  for(const x of v.recipients){
    if(!isAddress(x)){errors.push('Every genesis destination must be a valid EVM address.');break;}
    normalized.push(getAddress(x));
  }
  if(normalized.length===5&&new Set(normalized.map(x=>x.toLowerCase())).size!==5)errors.push('All five genesis destination addresses must be distinct.');
  if(walletAddress&&normalized.length===5&&normalized[0].toLowerCase()!==walletAddress.toLowerCase())errors.push('Creator wallet must match the connected deploying wallet for Base v1 proof.');
  checked=!errors.length;
  $('#deploy').disabled=!checked||!!deployedAddress;
  setStatus('#status',errors.length?'BASE PREFLIGHT BLOCKED\n• '+errors.join('\n• '):
    'BASE PREFLIGHT PASS ✅\nNetwork: Base Sepolia (84532)\nTemplate: fixed supply / no mint / no freeze\nAllocation: '+total+'%\nCreator liquid: '+v.alloc.creator+'%\nLiquidity designated: '+v.alloc.liquidity+'%\nWorldz fee policy configured: '+v.fee.toFixed(2)+'% project fee; Worldz cap 10% of collected fee only\n\nTESTNET LIMIT: liquidity pool + fee router + LP lock are NOT executing yet.','good');
  return checked;
}
async function deploy(){
  if(!runPreflight())return;
  $('#deploy').disabled=true;
  try{
    const v=values();
    const recipients=v.recipients.map(getAddress);
    const bps=[
      Math.round(v.alloc.creator*100),
      Math.round(v.alloc.liquidity*100),
      Math.round(v.alloc.community*100),
      Math.round(v.alloc.treasury*100),
      Math.round(v.alloc.growth*100)
    ];
    if(bps.reduce((a,b)=>a+b,0)!==10000)throw new Error('Basis-point allocation must total 10,000.');
    const factory=new ContractFactory(abi,bytecode,signer);
    const deployTxRequest=await factory.getDeployTransaction(v.name,v.symbol,BigInt(v.supply),recipients,bps);
    const gas=await provider.estimateGas({...deployTxRequest,from:walletAddress});
    setStatus('#status','DEPLOYMENT SIMULATION / GAS ESTIMATE PASS ✅\nEstimated gas: '+gas.toString()+'\nWaiting for your wallet signature…','warn');
    const contract=await factory.deploy(v.name,v.symbol,BigInt(v.supply),recipients,bps);
    const deployment=contract.deploymentTransaction();
    deployTx=deployment?.hash||'';
    await contract.waitForDeployment();
    deployedAddress=await contract.getAddress();
    const [version,totalSupply]=await Promise.all([contract.WORLDZ_SAFE_LAUNCH_VERSION(),contract.totalSupply()]);
    if(Number(version)!==1)throw new Error('Worldz template version proof failed.');
    const expected=BigInt(v.supply)*10n**18n;
    if(totalSupply!==expected)throw new Error('On-chain supply verification failed.');
    $('#contract').textContent=deployedAddress;$('#tx').textContent=deployTx;
    $('#explorer').href='https://sepolia.basescan.org/address/'+deployedAddress;
    $('#result').classList.add('show');
    setStatus('#proof-status','BASE SEPOLIA ON-CHAIN PROOF ✅\nContract: '+deployedAddress+'\nWorldz template version: 1\nTotal supply: '+formatUnits(totalSupply,18)+'\nNo mainnet Policy Pass claimed.','good');
    setStatus('#status','BASE SEPOLIA TOKEN DEPLOYED ✅\nThis is a real testnet ERC-20 contract. Next Base milestones are pool creation, LP locking, project-fee routing and server-side Worldz Proof.','good');
  }catch(e){console.error(e);setStatus('#status','BASE DEPLOYMENT FAILED\n'+(e?.shortMessage||e?.message||String(e)),'bad');}
  finally{$('#deploy').disabled=!!deployedAddress||!checked;}
}
function loadQuery(){
  const q=new URLSearchParams(location.search);
  if(q.get('name'))$('#name').value=q.get('name');
  if(q.get('symbol'))$('#symbol').value=q.get('symbol');
  if(q.get('supply'))$('#supply').value=q.get('supply');
  if(q.get('fee'))$('#fee').value=Math.min(3,Math.max(.5,Number(q.get('fee'))||1));
  const map={creator:'creatorTeam',liquidity:'liquidity',community:'communityPublic',treasury:'treasuryReserve',growth:'growthEcosystem'};
  for(const [local,remote] of Object.entries(map)){
    const val=q.get('alloc_'+remote);if(val!==null)$('[data-key="'+local+'"]').value=val;
  }
  if(Number($('[data-key="creator"]').value)>5)$('[data-key="creator"]').value=5;
  const total=allocationTotal();
  if(Math.abs(total-100)>0.001){
    const other=100-(Number($('[data-key="creator"]').value)||0)-(Number($('[data-key="liquidity"]').value)||0)-(Number($('[data-key="community"]').value)||0)-(Number($('[data-key="treasury"]').value)||0);
    $('[data-key="growth"]').value=Math.max(0,other);
  }
}
$('#compile').addEventListener('click',compileTemplate);
$('#wallet').addEventListener('click',connect);
$('#check').addEventListener('click',runPreflight);
$('#deploy').addEventListener('click',deploy);
$$('input').forEach(x=>x.addEventListener('input',()=>{if(!deployedAddress){checked=false;$('#deploy').disabled=true;}}));
loadQuery();
