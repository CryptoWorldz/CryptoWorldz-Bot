const $=s=>document.querySelector(s);
const KEY='worldz-investment-centre-v1';
const assets=[
  {id:'XRP',label:'XRP',world:'XRPWorldz',risk:'Native XRPL asset'},
  {id:'wXRP',label:'wXRP',world:'XRPWorldz / SolWorldz',risk:'Wrapped asset • reserve/custody proof required'},
  {id:'SOL',label:'SOL',world:'SolWorldz',risk:'Native Solana asset'},
  {id:'HYPE',label:'HYPE',world:'HyperWorldz',risk:'Hyperliquid ecosystem / chain exposure'},
  {id:'BASE',label:'ETH on Base',world:'BaseWorldz',risk:'Base network exposure • ETH gas asset'},
  {id:'ROBIN',label:'Robinhood Chain exposure',world:'RobinWorldz',risk:'Network lane • mainnet execution status must stay visible'},
  {id:'SUI',label:'SUI',world:'SuiWorldz',risk:'Native Sui asset'}
];
function money(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}):'$0.00';}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function row(a,s){
  const x=s[a.id]||{};
  return '<tr data-id="'+a.id+'"><td class="asset"><b>'+a.label+'</b><small>'+a.world+'</small></td>'+
    '<td><input data-k="units" inputmode="decimal" value="'+(x.units??'')+'" placeholder="0"></td>'+
    '<td><input data-k="price" inputmode="decimal" value="'+(x.price??'')+'" placeholder="$"></td>'+
    '<td data-out="value">$0.00</td><td data-out="share">0.00%</td>'+
    '<td><input class="target" data-k="target" inputmode="decimal" value="'+(x.target??'')+'" placeholder="%"></td>'+
    '<td><span class="risk">'+a.risk+'</span></td></tr>';
}
function state(){
  const out={};document.querySelectorAll('#rows tr').forEach(r=>{
    out[r.dataset.id]={};
    r.querySelectorAll('input').forEach(i=>out[r.dataset.id][i.dataset.k]=i.value);
  });return out;
}
function calc(){
  const rows=[...document.querySelectorAll('#rows tr')];
  let total=0;const vals=[];
  for(const r of rows){
    const units=Math.max(0,Number(r.querySelector('[data-k="units"]').value)||0);
    const price=Math.max(0,Number(r.querySelector('[data-k="price"]').value)||0);
    const value=units*price;vals.push({r,id:r.dataset.id,value});total+=value;
    r.querySelector('[data-out="value"]').textContent=money(value);
  }
  let largest=null;
  for(const x of vals){
    const share=total>0?x.value/total*100:0;
    x.r.querySelector('[data-out="share"]').textContent=share.toFixed(2)+'%';
    const target=Number(x.r.querySelector('[data-k="target"]').value);
    const lens=x.r.querySelector('.risk');
    lens.className='risk'+(share>=50?' warn':'');
    if(!largest||x.value>largest.value)largest={...x,share};
    if(Number.isFinite(target)&&target>=0&&total>0){
      const diff=share-target;
      x.r.querySelector('[data-out="share"]').title=(diff>=0?'+':'')+diff.toFixed(2)+' percentage points vs local target';
    }
  }
  $('#total').textContent=money(total);
  $('#largest').textContent=largest&&largest.value>0?largest.id+' • '+largest.share.toFixed(1)+'%':'—';
  $('#concentration').textContent=!largest||largest.value<=0?'Add holdings':largest.share>=70?'VERY CONCENTRATED':largest.share>=50?'CONCENTRATED':largest.share>=35?'WATCH':'DISTRIBUTED';
}
function boot(){
  const saved=load();$('#rows').innerHTML=assets.map(a=>row(a,saved)).join('');
  $('#calc').onclick=calc;
  $('#save').onclick=()=>{localStorage.setItem(KEY,JSON.stringify(state()));calc();$('#save').textContent='Saved Locally ✓';setTimeout(()=>$('#save').textContent='Save Locally',1200);};
  $('#reset').onclick=()=>{localStorage.removeItem(KEY);location.reload();};
  document.querySelectorAll('#rows input').forEach(i=>i.addEventListener('input',calc));calc();
}
boot();