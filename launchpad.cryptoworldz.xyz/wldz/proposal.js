(()=>{
const REQUIRED='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const PAYLOAD={"setup":"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQACBtitAX0cbjZIzSXeJUW64q3JrXPTauIR9kStAN1ESfg+lr3TDc7eyB7ZcaTC+DqL64rzJqbGZDIh29MFI4KPttmKAe5O2vnaftXhA9W1IaDTVaTKUnoqXm8TsSwi3rD8jO4UsYbp4zH5HNJTIUCo0ENlLzEOhVzghgB1RVP+JxXYBoHEzkfiI2i4sVVeyIevCS78fvu2bKP1L79o1Kyct6gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMrejQlN9CNEwfuJHlgyN60CCCemDClI0sf8p+a2OUMpAgQFAQIAAAU9wo6NETe5FPgAAS8AAABXT1JMRFogV0xEWiAxNU0gTWV0ZW9yYSBsYXVuY2ggKyBwZXJtYW5lbnQgbG9jawQFAQMAAAUR3DxJ4B5sT58LAAAAAAAAAAEA","addPool":"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAEB9itAX0cbjZIzSXeJUW64q3JrXPTauIR9kStAN1ESfg+igHuTtr52n7V4QPVtSGg01WkylJ6Kl5vE7EsIt6w/IwalBRGEdWcv0zXoyI4w4SliTVTFOGy2FAXe5cw0KP7vwaBxM5H4iNouLFVXsiHrwku/H77tmyj9S+/aNSsnLeolr3TDc7eyB7ZcaTC+DqL64rzJqbGZDIh29MFI4KPttnuFLGG6eMx+RzSUyFAqNBDZS8xDoVc4IYAdUVT/icV2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyt6NCU30I0TB+4keWDI3rQIIJ6YMKUjSx/yn5rY5QykBAwcEBQECAAAGxQZZZOASRUY2TAE4AwAAAgIHFAuQh5Ppe98ka/bknvJZ3e/8pb/jIj0nYE61dM8VYMHC0T4JqWItClugFnyZKrHFLDxj0wqfxEY1pCgVNm1NWhoBsb4SjzwZnrX8gZQAcyz0UnxtPc8ly+l8nxgZnzFocQTzKLu/0X6CPCZdGIZ+dI1zrAoOX8MJ5plmJY3xMI4ZCEaegu7VRuqqaIpxGaIKfW2les9JWWoTXtPONjyttlPhwONUgy3TieQc0WOkp6DH/GnReoTxj5oY9xvhgLZio1V2iOwGPYI2I+SQe8UyfHmL+thCC1tKzYPuYIyZC8YPGC82qubKAZkbqLnnUAy1DGxK6Xh0/IbDOxEjQvcS+UA/+FcKiJGi/lgJVklKpSNRYjTV6dvxhAS3dyoWr+LYYYyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZifZpfVm7NihGRHKtEqrPnii5TtJDwn6zQySlg7HbUGkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAEJLSE1ZXoVnCuH1LZqcNuOl1I4n/dqryBs7QY6OPla7fLM1TWspfFzasgi3Qdz5NkvvYpZspQDUAKVqQEcc6nlBt324e51j94YQl285GzN2rYa/E2DuQ0n/r35KNihi/wqduezRGQKHPxZTIvK0KCRARysfdFWv4OoM/siCOt3rUCLhRPKVac3oLzLwD80+sNUx3FYrGPZ8j9BrWZh2V/NcW5k4Mqs7uzIuIqijlSodWS4yKrkzN51QOAwvYqYAV4FCQYAAgAKCwwBAAEJBgADAA0LDAEAAQsCAAMMAAIAAAABAAAAAAAAAAwBAwEAEQ4VAAEEAA8FBgoNBwgCAwwMEAsRDhITawAUofEYvd20AgAtMQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkOR1QJ24YCAAAAAAAAAAAm1dpTqkaXISxxP7/AAAAAABLxsh4BUzav4Qq93BuAAAAJDkdUCduGAgAAAAAAAAAAAEBAAAA","addLock":"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAEB9itAX0cbjZIzSXeJUW64q3JrXPTauIR9kStAN1ESfg+igHuTtr52n7V4QPVtSGg01WkylJ6Kl5vE7EsIt6w/IxqH8XwNqpyZGF4omwZ/SU8/fe23q2BSjZIDKpv1tELfAaBxM5H4iNouLFVXsiHrwku/H77tmyj9S+/aNSsnLeolr3TDc7eyB7ZcaTC+DqL64rzJqbGZDIh29MFI4KPttnuFLGG6eMx+RzSUyFAqNBDZS8xDoVc4IYAdUVT/icV2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyt6NCU30I0TB+4keWDI3rQIIJ6YMKUjSx/yn5rY5QykBAwcEBQECAAAG9QFZZOASRUY2TADoAAAAAQECBguQh5Ppe98ka/bknvJZ3e/8pb/jIj0nYE61dM8VYMHC4cDjVIMt04nkHNFjpKegx/xp0XqE8Y+aGPcb4YC2YqNVdojsBj2CNiPkkHvFMnx5i/rYQgtbSs2D7mCMmQvGDwktITVlehWcK4fUtmpw246XUjif92qvIGztBjo4+VrtCEaegu7VRuqqaIpxGaIKfW2les9JWWoTXtPONjyttlMqduezRGQKHPxZTIvK0KCRARysfdFWv4OoM/siCOt3rQEDBgECBAAFAxgApbB9BuerutVLxsh4BUzav4Qq93BuAAAAAAA=","activate":"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQACBNitAX0cbjZIzSXeJUW64q3JrXPTauIR9kStAN1ESfg+7hSxhunjMfkc0lMhQKjQQ2UvMQ6FXOCGAHVFU/4nFdgGgcTOR+IjaLixVV7Ih68JLvx++7Zso/Uvv2jUrJy3qJa90w3O3sge2XGkwvg6i+uK8yamxmQyIdvTBSOCj7bZyt6NCU30I0TB+4keWDI3rQIIJ6YMKUjSx/yn5rY5QykBAgMDAAEICyJc+JobM2oA"};
const $=s=>document.querySelector(s);
const set=(m,c='')=>{const e=$('#proposal-status');if(e){e.textContent=m;e.className='status '+c}};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function web3(){return import('https://esm.sh/@solana/web3.js@1.98.4?bundle')}
async function rebuild(encoded,pk,w){
 const old=w.VersionedTransaction.deserialize(bytes(encoded));
 const keys=old.message.staticAccountKeys;
 const instructions=old.message.compiledInstructions.map(ix=>new w.TransactionInstruction({programId:keys[ix.programIdIndex],keys:ix.accountKeyIndexes.map(i=>({pubkey:keys[i],isSigner:old.message.isAccountSigner(i),isWritable:old.message.isAccountWritable(i)})),data:ix.data}));
 const connection=new w.Connection(RPC,'confirmed'); const latest=await connection.getLatestBlockhash('confirmed');
 return {connection,latest,tx:new w.VersionedTransaction(new w.TransactionMessage({payerKey:pk,recentBlockhash:latest.blockhash,instructions}).compileToV0Message())};
}
async function send(provider,encoded,pk,w,label){
 const {connection,latest,tx}=await rebuild(encoded,pk,w); set(label+' — approve in your wallet…','warn');
 const signed=await provider.signTransaction(tx); const signature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
 await connection.confirmTransaction({signature,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed'); return signature;
}
$('#create-proposal')?.addEventListener('click',async()=>{
 const provider=window.phantom?.solana||window.solana;
 if(!provider?.connect||!provider?.signTransaction){set('Wallet unavailable. Open this page in the same wallet browser that is connected to Squads.','warn');return}
 try{
  set('Connecting the authorised WLDZ initiator wallet…','warn'); const result=await provider.connect(); const pk=result.publicKey||provider.publicKey;
  if(!pk||pk.toBase58()!==REQUIRED){throw new Error('Connect '+REQUIRED.slice(0,4)+'…'+REQUIRED.slice(-4)+' only. This wallet is not the authorised WLDZ initiator.')}
  const w=await web3(); const sigs=[];
  sigs.push(await send(provider,PAYLOAD.setup,pk,w,'1/4 Creating the WLDZ batch proposal'));
  sigs.push(await send(provider,PAYLOAD.addPool,pk,w,'2/4 Adding the 15M WLDZ DAMM V2 pool leg'));
  sigs.push(await send(provider,PAYLOAD.addLock,pk,w,'3/4 Adding the permanent LP lock leg'));
  sigs.push(await send(provider,PAYLOAD.activate,pk,w,'4/4 Activating the proposal'));
  set('WLDZ proposal created and active. Open Squads Transactions to review, approve and execute.\n'+sigs.map((s,i)=>(i+1)+'. '+s).join('\n'),'good');
 }catch(e){set('Proposal not created: '+(e?.message||String(e)),'warn')}
});
})();
