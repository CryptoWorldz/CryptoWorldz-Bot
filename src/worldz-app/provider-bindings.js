"use strict";
const {createReadAdapter,createReadSnapshot}=require("./read-adapter-contract");
const {jsonRpc}=require("./rpc-client");

const DEFINITIONS=Object.freeze({
  solana:{id:"solana",family:"SOLANA",env:"WORLDZ_SOLANA_RPC_URL"},
  ethereum:{id:"ethereum",family:"EVM",env:"WORLDZ_ETHEREUM_RPC_URL"},
  base:{id:"base",family:"EVM",env:"WORLDZ_BASE_RPC_URL"},
  bnb:{id:"bnb",family:"EVM",env:"WORLDZ_BNB_RPC_URL"},
  hyperevm:{id:"hyperevm",family:"EVM",env:"WORLDZ_HYPEREVM_RPC_URL"},
  xrpl:{id:"xrpl",family:"XRPL",env:"WORLDZ_XRPL_RPC_URL"},
  sui:{id:"sui",family:"SUI",env:"WORLDZ_SUI_RPC_URL"}
});

function envUrl(definition,env=process.env){
  const value=env[definition.env];
  if(!value) throw new Error("WORLDZAPP_PROVIDER_NOT_CONFIGURED:"+definition.env);
  return value;
}

function makeSolana(def,env){
  const url=()=>envUrl(def,env);
  return createReadAdapter(def,{
    getHealth:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{health:await jsonRpc(url(),"getHealth")}}),
    getNetwork:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{version:await jsonRpc(url(),"getVersion")}}),
    getAccountSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,balanceLamports:(await jsonRpc(url(),"getBalance",[address,{commitment:"confirmed"}])).value}}),
    getBalanceSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,balanceLamports:(await jsonRpc(url(),"getBalance",[address,{commitment:"confirmed"}])).value}}),
    getTransactionStatus:async({signature})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{signature,status:(await jsonRpc(url(),"getSignatureStatuses",[[signature],{searchTransactionHistory:true}])).value?.[0]||null}})
  });
}

function makeEvm(def,env){
  const url=()=>envUrl(def,env);
  return createReadAdapter(def,{
    getHealth:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{chainId:await jsonRpc(url(),"eth_chainId")}}),
    getNetwork:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{chainId:await jsonRpc(url(),"eth_chainId"),clientVersion:await jsonRpc(url(),"web3_clientVersion")}}),
    getAccountSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,balanceWei:await jsonRpc(url(),"eth_getBalance",[address,"latest"])}}),
    getBalanceSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,balanceWei:await jsonRpc(url(),"eth_getBalance",[address,"latest"])}}),
    getTransactionStatus:async({hash})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{hash,receipt:await jsonRpc(url(),"eth_getTransactionReceipt",[hash])}})
  });
}

function makeXrpl(def,env){
  const url=()=>envUrl(def,env);
  return createReadAdapter(def,{
    getHealth:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{serverInfo:await jsonRpc(url(),"server_info",[])}}),
    getNetwork:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{serverInfo:await jsonRpc(url(),"server_info",[])}}),
    getAccountSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,accountInfo:await jsonRpc(url(),"account_info",[{account:address,ledger_index:"validated",strict:true}])}}),
    getBalanceSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,accountInfo:await jsonRpc(url(),"account_info",[{account:address,ledger_index:"validated",strict:true}])}}),
    getProposalHistory:async({address,limit=20})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,transactions:await jsonRpc(url(),"account_tx",[{account:address,ledger_index_min:-1,ledger_index_max:-1,limit}])}})
  });
}

function makeSui(def,env){
  const url=()=>envUrl(def,env);
  return createReadAdapter(def,{
    getHealth:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{discovery:await jsonRpc(url(),"rpc.discover",[])}}),
    getNetwork:async()=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{chainIdentifier:await jsonRpc(url(),"sui_getChainIdentifier",[])}}),
    getAccountSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,balance:await jsonRpc(url(),"suix_getBalance",[address])}}),
    getBalanceSummary:async({address})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{address,balances:await jsonRpc(url(),"suix_getAllBalances",[address])}}),
    getTransactionStatus:async({digest})=>createReadSnapshot({adapterId:def.id,chain:def.id,data:{digest,transaction:await jsonRpc(url(),"sui_getTransactionBlock",[digest,{showEffects:true,showEvents:true}] )}})
  });
}

function createProviderAdapter(chain,{env=process.env}={}){
  const def=DEFINITIONS[chain];
  if(!def) throw new Error("WORLDZAPP_PROVIDER_CHAIN_UNSUPPORTED:"+chain);
  if(def.family==="SOLANA") return makeSolana(def,env);
  if(def.family==="EVM") return makeEvm(def,env);
  if(def.family==="XRPL") return makeXrpl(def,env);
  if(def.family==="SUI") return makeSui(def,env);
  throw new Error("WORLDZAPP_PROVIDER_FAMILY_UNSUPPORTED:"+def.family);
}

module.exports={DEFINITIONS,createProviderAdapter};
