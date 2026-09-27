"use strict";

const {createReadAdapter,createReadSnapshot}=require("./read-adapter-contract");

async function postJson(url,body,{timeoutMs=12000}={}){
  if(!url) throw new Error("WORLDZAPP_READ_PROVIDER_URL_REQUIRED");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body),
      signal:controller.signal
    });
    if(!response.ok) throw new Error("WORLDZAPP_READ_PROVIDER_HTTP_"+response.status);
    const payload=await response.json();
    if(payload.error) throw new Error("WORLDZAPP_READ_PROVIDER_RPC_"+(payload.error.code??"ERROR")+":"+(payload.error.message??""));
    return payload.result;
  } finally { clearTimeout(timer); }
}


async function postGraphQL(url,query,variables={},options={}){
  if(!url) throw new Error("WORLDZAPP_READ_PROVIDER_URL_REQUIRED");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs||12000);
  try{
    const response=await fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({query,variables}),
      signal:controller.signal
    });
    if(!response.ok) throw new Error("WORLDZAPP_READ_PROVIDER_HTTP_"+response.status);
    const payload=await response.json();
    if(payload.errors?.length) throw new Error("WORLDZAPP_SUI_GRAPHQL:"+payload.errors.map(e=>e.message).join(" | "));
    return payload.data;
  } finally { clearTimeout(timer); }
}

function evmAdapter({id,providerUrl,expectedChainId}){
  return createReadAdapter({id,family:"EVM",state:providerUrl?"PROVIDER_CONFIGURED":"PROVIDER_NOT_CONFIGURED"},{
    async getHealth(){
      const chainHex=await postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]});
      const chainId=Number.parseInt(chainHex,16);
      return createReadSnapshot({adapterId:id,chain:id,state:chainId===expectedChainId?"READ_OK":"CHAIN_ID_MISMATCH",data:{chainId,expectedChainId}});
    },
    async getNetwork(){
      const [chainHex,blockHex]=await Promise.all([
        postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]}),
        postJson(providerUrl,{jsonrpc:"2.0",id:2,method:"eth_blockNumber",params:[]})
      ]);
      return createReadSnapshot({adapterId:id,chain:id,data:{chainId:Number.parseInt(chainHex,16),blockNumber:Number.parseInt(blockHex,16)}});
    },
    async getBalanceSummary({address}){
      if(!/^0x[a-fA-F0-9]{40}$/.test(String(address||""))) throw new Error("WORLDZAPP_EVM_ADDRESS_INVALID");
      const balanceHex=await postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"eth_getBalance",params:[address,"latest"]});
      return createReadSnapshot({adapterId:id,chain:id,data:{address,nativeBalanceWei:BigInt(balanceHex).toString()}});
    },
    async getTransactionStatus({transactionId}){
      const receipt=await postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"eth_getTransactionReceipt",params:[transactionId]});
      return createReadSnapshot({adapterId:id,chain:id,data:{transactionId,receipt}});
    }
  });
}

function solanaAdapter({providerUrl}){
  return createReadAdapter({id:"solana",family:"SOLANA",state:providerUrl?"PROVIDER_CONFIGURED":"PROVIDER_NOT_CONFIGURED"},{
    async getHealth(){
      const result=await postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"getHealth"});
      return createReadSnapshot({adapterId:"solana",chain:"solana",data:{health:result}});
    },
    async getNetwork(){
      const [version,slot]=await Promise.all([
        postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"getVersion"}),
        postJson(providerUrl,{jsonrpc:"2.0",id:2,method:"getSlot",params:[{"commitment":"finalized"}]})
      ]);
      return createReadSnapshot({adapterId:"solana",chain:"solana",data:{version,finalizedSlot:slot}});
    },
    async getBalanceSummary({address}){
      if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(address||""))) throw new Error("WORLDZAPP_SOLANA_ADDRESS_INVALID");
      const result=await postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"getBalance",params:[address,{"commitment":"finalized"}]});
      return createReadSnapshot({adapterId:"solana",chain:"solana",data:{address,lamports:result.value,contextSlot:result.context?.slot??null}});
    },
    async getTransactionStatus({transactionId}){
      const result=await postJson(providerUrl,{jsonrpc:"2.0",id:1,method:"getSignatureStatuses",params:[[transactionId],{"searchTransactionHistory":true}]});
      return createReadSnapshot({adapterId:"solana",chain:"solana",data:{transactionId,status:result.value?.[0]??null}});
    }
  });
}

function xrplAdapter({providerUrl}){
  const request=async(method,params={})=>{
    const result=await postJson(providerUrl,{method,params:[params]});
    if(result?.status==="error"||result?.error){
      const code=result.error||result.error_code||"XRPL_ERROR";
      const message=result.error_message||result.error_exception||"XRPL request failed";
      throw new Error("WORLDZAPP_XRPL_RPC_"+code+":"+message);
    }
    return result;
  };
  return createReadAdapter({id:"xrpl",family:"XRPL",state:providerUrl?"PROVIDER_CONFIGURED":"PROVIDER_NOT_CONFIGURED"},{
    async getHealth(){
      const info=await request("server_info");
      return createReadSnapshot({adapterId:"xrpl",chain:"xrpl",data:{validatedLedger:info.info?.validated_ledger?.seq??null,serverState:info.info?.server_state??null}});
    },
    async getAccountSummary({address}){
      const account=await request("account_info",{account:address,ledger_index:"validated",strict:true});
      return createReadSnapshot({adapterId:"xrpl",chain:"xrpl",data:{address,accountData:account.account_data}});
    },
    async getBalanceSummary({address}){
      const account=await request("account_info",{account:address,ledger_index:"validated",strict:true});
      const lines=await request("account_lines",{account:address,ledger_index:"validated"});
      return createReadSnapshot({adapterId:"xrpl",chain:"xrpl",data:{address,xrpDrops:account.account_data?.Balance??null,issuedTokenLines:lines.lines??[]}});
    },
    async getTransactionStatus({transactionId}){
      const tx=await request("tx",{transaction:transactionId});
      return createReadSnapshot({adapterId:"xrpl",chain:"xrpl",data:{transactionId,tx}});
    }
  });
}

function suiAdapter({providerUrl}){
  return createReadAdapter({id:"sui",family:"SUI",state:providerUrl?"PROVIDER_CONFIGURED_GRAPHQL":"PROVIDER_NOT_CONFIGURED"},{
    async getHealth(){
      const data=await postGraphQL(providerUrl,"query WorldzAppSuiHealth { chainIdentifier }");
      return createReadSnapshot({adapterId:"sui",chain:"sui",data:{chainIdentifier:data?.chainIdentifier??null,transport:"GRAPHQL"}});
    }
  });
}

module.exports={postJson,postGraphQL,evmAdapter,solanaAdapter,xrplAdapter,suiAdapter};
