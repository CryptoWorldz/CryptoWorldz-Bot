(() => {
 const API='https://cryptobotz.cryptoworldz.xyz/api/worldz-token-designer';
 const $=s=>document.querySelector(s);
 const clean=(v)=>String(v||'').trim();
 function brief(){
  return {
   creator_mode:$('#mode').value,
   token_name:clean($('#name').value),
   symbol:clean($('#symbol').value).toUpperCase(),
   primary_chain:$('#chain').value,
   supply:Number($('#supply').value)||null,
   budget_aud:Number($('#budget').value)||null,
   purpose:clean($('#purpose').value),
   audience:clean($('#audience').value),
   distribution_priorities:clean($('#distribution').value),
   liquidity_preference:$('#liquidity').value,
   cross_chain_targets:[...document.querySelectorAll('.check input:checked')].map(x=>x.value),
   notes:clean($('#notes').value)
  };
 }
 function localPrompt(b){
  return [
   'Act as a careful crypto token launch architect. Design a token plan from this brief:',
   JSON.stringify(b,null,2),
   '',
   'Return these headings exactly:',
   'TOKEN IDENTITY',
   'PURPOSE + UTILITY',
   'CHAIN ARCHITECTURE',
   'SUPPLY + DISTRIBUTION',
   'LIQUIDITY PLAN',
   'STARTING PRICE METHOD',
   'FEES + TREASURY',
   'SECURITY + PROOF',
   'CROSS-CHAIN PLAN',
   'NEXT 5 ACTIONS',
   '',
   'Rules:',
   '• Percent allocations must total 100%.',
   '• If using WorldzLaunchPad, reserve the disclosed 0.60% genesis allocation: 0.30% Operations Multisig, 0.18% Miricle Team Multisig, 0.12% Purple Diamond Crew Multisig.',
   '• Treat the stated budget as the creator\'s personal capital unless explicitly stated otherwise.',
   '• Distinguish a token BUY from an LP DEPOSIT.',
   '• Never invent exact DAMM v2 LP requirements: require a live pool quote.',
   '• Do not guess a starting price. Give a method and up to three clearly-labelled scenarios.',
   '• Keep one canonical economic supply across chains; wrapped representations require lock/burn/reserve proof.',
   '• Centralized listings such as Robinhood are targets, not guaranteed.',
   '• Do not recommend wash trading, fake volume or deceptive market activity.',
   '• Flag missing information before any irreversible action.'
  ].join('\n');
 }
 async function status(){
  try{
   const r=await fetch(API+'/status',{cache:'no-store'});
   const j=await r.json();
   $('#status').textContent=j.configured
    ? 'WORLDZ CHATGPT DESIGN: READY • free to visitor within Worldz daily allowance • no browser API key'
    : 'WORLDZ CHATGPT DESIGN: API allowance unavailable • free prompt builder still works';
  }catch{
   $('#status').textContent='Worldz AI status unavailable • free prompt builder still works';
  }
 }
 $('#prompt').addEventListener('click',()=>{
  const b=brief();
  if(!b.purpose){$('#output').textContent='Enter the token purpose first.';return}
  $('#output').textContent=localPrompt(b);
  $('#status').textContent='FREE PROMPT READY — copy it and open ChatGPT.';
 });
 $('#design').addEventListener('click',async()=>{
  const b=brief();
  if(!b.purpose){$('#output').textContent='Enter the token purpose first.';return}
  $('#output').textContent='Designing token architecture…';
  $('#design').disabled=true;
  try{
   const r=await fetch(API+'/design',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.ok){
    $('#output').textContent='Worldz AI is unavailable right now.\n\nFREE CHATGPT PROMPT:\n\n'+localPrompt(b);
    $('#status').textContent='AI allowance unavailable — fallback prompt generated.';
    return;
   }
   $('#output').textContent=j.design;
   $('#status').textContent='OPENAI-POWERED WORLDZ DESIGN READY • planning only • no transaction executed';
  }catch(e){
   $('#output').textContent='Worldz AI request failed.\n\nFREE CHATGPT PROMPT:\n\n'+localPrompt(b);
   $('#status').textContent='Fallback prompt generated.';
  }finally{$('#design').disabled=false}
 });
 $('#copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#output').textContent);$('#copy').textContent='COPIED ✓';setTimeout(()=>$('#copy').textContent='COPY OUTPUT',1200)}
  catch{$('#copy').textContent='COPY FAILED'}
 });
 status();
})();