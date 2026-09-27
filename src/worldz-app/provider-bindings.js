"use strict";
const {createReadAdapter,createReadSnapshot}=require("./read-adapter-contract");
const {jsonRpc,graphQL}=require("./rpc-client");

const DEFINITIONS=Object.freeze({
  solana:{
    id:"solana",family:"SOLANA",env:"WORLDZ_SOLANA_RPC_URL",
    publicVerificationEndpoint:"https://api.mainnet.solana.com"
  },
  ethereum:{
    id:"ethereum",family:"EVM",env:"WORLDZ_ETHEREUM_RPC_URL",expectedChainId:1,
    publicVerificationEndpoint:null
  },
  base:{
    id:"base",family:"EVM",env:"WORLDZ_BASE_RPC_URL",expectedChainId:8453,
    publicVerificationEndpoint:"https://mainnet.base.org"
  },
  bnb:{
    id:"bnb",family:"EVM",env:"WORLDZ_BNB_RPC_URL",expectedChainId:56,
    publicVerificationEndpoint:"https://bsc-dataseed.bnbchain.org"
  },
  hyperevm:{
    id:"hyperevm",family:"EVM",env:"WORLDZ_HYPEREVM_RPC_URL",expectedChainId:999,
    publicVerificationEndpoint:"https://rpc.hyperliquid.xyz/evm"
  },
  xrpl:{
    id:"xrpl",family:"XRPL",env:"WORLDZ_XRPL_RPC_URL",
    publicVerificationEndpoint:"https://s1.ripple.com:51234/"
  },
  sui:{
    id:"sui",family:"SUI",env:"WORLDZ_SUI_GRAPHQL_URL",transport:"GRAPHQL",
    publicVerificationEndpoint:"https://graphql.mainnet.sui.io/graphql"
  },
  robinhood:{
    id:"robinhood",family:"EVM",env:"WORLDZ_ROBINHOOD_RPC_URL",expectedChainId:4663,
    publicVerificationEndpoint:"https://rpc.mainnet.chain.robinhood.com"
  }
});

function resolveProviderUrl(definition,env=process.env){
  const configured=env[definition.env];
  if(configured) return configured;
  if(env.WORLDZAPP_ALLOW_PUBLIC_VERIFY==="1" && definition.publicVerificationEndpoint){
    return definition.publicVerificationEndpoint;
  }
  throw new Error("WORLDZAPP_PROVIDER_NOT_CONFIGURED:"+definition.env);
}

function makeSolana(def,env){
  const url=()=>resolveProviderUrl(def,env);
  return createReadAdapter(def,{
    getHealth:async()=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{health:await jsonRpc(url(),"getHealth")}
    }),
    getNetwork:async()=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{
        version:await jsonRpc(url(),"getVersion"),
        finalizedSlot:await jsonRpc(url(),"getSlot",[{commitment:"finalized"}])
      }
    }),
    getAccountSummary:async({address})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{address,balanceLamports:(await jsonRpc(url(),"getBalance",[address,{commitment:"finalized"}])).value}
    }),
    getBalanceSummary:async({address})=>{
      const result=await jsonRpc(url(),"getBalance",[address,{commitment:"finalized"}]);
      return createReadSnapshot({
        adapterId:def.id,chain:def.id,
        data:{address,balanceLamports:result.value,contextSlot:result.context?.slot??null}
      });
    },
    getTransactionStatus:async({signature})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{signature,status:(await jsonRpc(url(),"getSignatureStatuses",[[signature],{searchTransactionHistory:true}])).value?.[0]||null}
    })
  });
}

function makeEvm(def,env){
  const url=()=>resolveProviderUrl(def,env);
  async function chainSnapshot(){
    const chainHex=await jsonRpc(url(),"eth_chainId");
    const chainId=Number.parseInt(chainHex,16);
    const state=chainId===def.expectedChainId?"READ_OK":"CHAIN_ID_MISMATCH";
    return createReadSnapshot({
      adapterId:def.id,chain:def.id,state,
      data:{chainId,expectedChainId:def.expectedChainId}
    });
  }
  return createReadAdapter(def,{
    getHealth:chainSnapshot,
    getNetwork:async()=>{
      const chain=await chainSnapshot();
      const clientVersion=await jsonRpc(url(),"web3_clientVersion");
      return createReadSnapshot({
        adapterId:def.id,chain:def.id,state:chain.state,
        data:{...chain.data,clientVersion}
      });
    },
    getAccountSummary:async({address})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{address,balanceWei:await jsonRpc(url(),"eth_getBalance",[address,"latest"])}
    }),
    getBalanceSummary:async({address})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{address,balanceWei:await jsonRpc(url(),"eth_getBalance",[address,"latest"])}
    }),
    getTransactionStatus:async({hash})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{hash,receipt:await jsonRpc(url(),"eth_getTransactionReceipt",[hash])}
    })
  });
}

function makeXrpl(def,env){
  const url=()=>resolveProviderUrl(def,env);
  async function xrpl(method,params=[]){
    const result=await jsonRpc(url(),method,params);
    if(result?.status==="error" || result?.error){
      const code=result.error||result.error_code||"XRPL_ERROR";
      const message=result.error_message||result.error_exception||"XRPL request failed";
      throw new Error("WORLDZAPP_XRPL_RPC_"+code+":"+message);
    }
    return result;
  }
  return createReadAdapter(def,{
    getHealth:async()=>{
      const result=await xrpl("server_info",[]);
      return createReadSnapshot({
        adapterId:def.id,chain:def.id,
        data:{
          validatedLedger:result.info?.validated_ledger?.seq??null,
          serverState:result.info?.server_state??result.info?.server_state_duration_us??null
        }
      });
    },
    getNetwork:async()=>createReadSnapshot({
      adapterId:def.id,chain:def.id,data:{serverInfo:await xrpl("server_info",[])}
    }),
    getAccountSummary:async({address})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{address,accountInfo:await xrpl("account_info",[{account:address,ledger_index:"validated",strict:true}])}
    }),
    getBalanceSummary:async({address})=>{
      const [accountInfo,lines]=await Promise.all([
        xrpl("account_info",[{account:address,ledger_index:"validated",strict:true}]),
        xrpl("account_lines",[{account:address,ledger_index:"validated"}])
      ]);
      return createReadSnapshot({
        adapterId:def.id,chain:def.id,
        data:{address,xrpDrops:accountInfo.account_data?.Balance??null,issuedTokenLines:lines.lines??[]}
      });
    },
    getProposalHistory:async({address,limit=20})=>createReadSnapshot({
      adapterId:def.id,chain:def.id,
      data:{address,transactions:await xrpl("account_tx",[{account:address,ledger_index_min:-1,ledger_index_max:-1,limit}])}
    })
  });
}

function makeSui(def,env){
  const url=()=>resolveProviderUrl(def,env);
  return createReadAdapter(def,{
    getHealth:async()=>{
      const data=await graphQL(url(),"query WorldzAppSuiHealth { chainIdentifier }");
      return createReadSnapshot({
        adapterId:def.id,chain:def.id,
        data:{chainIdentifier:data?.chainIdentifier??null,transport:"GRAPHQL"}
      });
    },
    getNetwork:async()=>{
      const data=await graphQL(url(),"query WorldzAppSuiNetwork { chainIdentifier }");
      return createReadSnapshot({
        adapterId:def.id,chain:def.id,
        data:{chainIdentifier:data?.chainIdentifier??null,transport:"GRAPHQL"}
      });
    }
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

module.exports={DEFINITIONS,resolveProviderUrl,createProviderAdapter};
