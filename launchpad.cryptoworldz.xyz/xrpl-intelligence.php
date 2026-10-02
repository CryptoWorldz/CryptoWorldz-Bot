<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function emit(array $v,int $status=200): void { http_response_code($status); echo json_encode($v,JSON_UNESCAPED_SLASHES); exit; }
function classic(string $v): bool { return preg_match('/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/',$v)===1; }
function currency_ok(string $v): bool { return preg_match('/^[A-Z0-9]{3}$/',$v)===1 || preg_match('/^[A-F0-9]{40}$/',$v)===1; }

$network=strtolower(trim((string)($_GET['network']??'testnet')));
if(!in_array($network,['testnet','mainnet'],true))emit(['ok'=>false,'error'=>'invalid_network'],400);
$issuer=trim((string)($_GET['issuer']??''));
$hot=trim((string)($_GET['hot']??''));
$currency=strtoupper(trim((string)($_GET['currency']??'')));
if($issuer!==''&&!classic($issuer))emit(['ok'=>false,'error'=>'invalid_issuer'],400);
if($hot!==''&&!classic($hot))emit(['ok'=>false,'error'=>'invalid_hot_wallet'],400);
if($currency!==''&&!currency_ok($currency))emit(['ok'=>false,'error'=>'invalid_currency'],400);

$rpcUrl=$network==='mainnet'?'https://xrplcluster.com/':'https://s.altnet.rippletest.net:51234/';

function rpc(string $url,string $method,array $params=[]): array {
  $payload=json_encode(['jsonrpc'=>'2.0','id'=>1,'method'=>$method,'params'=>[$params]],JSON_UNESCAPED_SLASHES);
  $body='';$code=0;$error=null;
  if(function_exists('curl_init')){
    $ch=curl_init($url);
    curl_setopt_array($ch,[
      CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,
      CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,
      CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json','User-Agent: XRPWorldz-Intelligence/1.0']
    ]);
    $r=curl_exec($ch);if($r===false)$error=curl_error($ch);else $body=(string)$r;
    $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
  }else{
    $ctx=stream_context_create(['http'=>['method'=>'POST','timeout'=>12,'ignore_errors'=>true,'header'=>"Content-Type: application/json\r\nAccept: application/json\r\nUser-Agent: XRPWorldz-Intelligence/1.0\r\n",'content'=>$payload]]);
    $r=@file_get_contents($url,false,$ctx);if($r!==false)$body=(string)$r;else$error='request_failed';
    if(isset($http_response_header[0])&&preg_match('/\s(\d{3})\s/',$http_response_header[0],$m))$code=(int)$m[1];
  }
  $json=json_decode($body,true);
  $result=is_array($json)?($json['result']??null):null;
  $status=is_array($result)?($result['status']??null):null;
  $apiError=is_array($result)?($result['error']??null):null;
  $ok=$code>=200&&$code<300&&is_array($result)&&$apiError===null&&$status!=='error';
  return ['ok'=>$ok,'result'=>$result,'error'=>$ok?null:($apiError??$error??('HTTP '.$code))];
}
function feature_state(string $url,string $name): array {
  $r=rpc($url,'feature',['feature'=>$name]);
  if(!$r['ok'])return ['name'=>$name,'status'=>'UNAVAILABLE','enabled'=>null,'supported'=>null,'error'=>$r['error']];
  $found=null;
  foreach(($r['result']??[]) as $k=>$v){
    if(is_array($v)&&(($v['name']??null)===$name||$k===$name)){$found=$v;break;}
  }
  return ['name'=>$name,'status'=>$found?'AVAILABLE':'UNKNOWN','enabled'=>$found['enabled']??null,'supported'=>$found['supported']??null,'error'=>null];
}
function has_flag(int $flags,int $flag): bool { return ($flags & $flag)===$flag; }
function source(string $provider,bool $ok,?string $error=null): array { return ['provider'=>$provider,'status'=>$ok?'AVAILABLE':'UNAVAILABLE','error'=>$error]; }

$server=rpc($rpcUrl,'server_info',[]);
$features=[];
foreach(['AMM','MultiSign','MPTokensV1','MPTokensV2','TokenEscrow','PermissionDelegationV1_1'] as $name)$features[$name]=feature_state($rpcUrl,$name);

$issuerInfo=null;$objects=null;$gateway=null;$lines=null;$amm=null;$asks=null;$bids=null;
if($issuer!==''){
  $issuerInfo=rpc($rpcUrl,'account_info',['account'=>$issuer,'ledger_index'=>'validated','strict'=>true]);
  $objects=rpc($rpcUrl,'account_objects',['account'=>$issuer,'ledger_index'=>'validated','limit'=>200]);
  $gateway=rpc($rpcUrl,'gateway_balances',array_filter([
    'account'=>$issuer,'ledger_index'=>'validated','strict'=>true,'hotwallet'=>$hot!==''?$hot:null
  ],fn($v)=>$v!==null));
}
if($issuer!==''&&$hot!==''){
  $lines=rpc($rpcUrl,'account_lines',['account'=>$hot,'peer'=>$issuer,'ledger_index'=>'validated','limit'=>200]);
}
if($issuer!==''&&$currency!==''){
  $asset=['currency'=>$currency,'issuer'=>$issuer];$xrp=['currency'=>'XRP'];
  $amm=rpc($rpcUrl,'amm_info',['asset'=>$asset,'asset2'=>$xrp,'ledger_index'=>'validated']);
  $asks=rpc($rpcUrl,'book_offers',['taker_gets'=>$asset,'taker_pays'=>$xrp,'ledger_index'=>'validated','limit'=>20]);
  $bids=rpc($rpcUrl,'book_offers',['taker_gets'=>$xrp,'taker_pays'=>$asset,'ledger_index'=>'validated','limit'=>20]);
}

$accountData=$issuerInfo['ok']?($issuerInfo['result']['account_data']??null):null;
$flags=is_array($accountData)?(int)($accountData['Flags']??0):0;
$regularKey=is_array($accountData)?($accountData['RegularKey']??null):null;
$owned=$objects['ok']&&is_array($objects['result']['account_objects']??null)?$objects['result']['account_objects']:[];
$signerLists=[];$delegates=[];
foreach($owned as $o){
  $type=(string)($o['LedgerEntryType']??'');
  if($type==='SignerList')$signerLists[]=$o;
  if($type==='Delegate')$delegates[]=$o;
}
$blackholeKeys=['rrrrrrrrrrrrrrrrrrrrrhoLvTp','rrrrrrrrrrrrrrrrrrrrBZbvji'];
$masterDisabled=has_flag($flags,0x00100000);
$blackholeVerified=$issuerInfo['ok']&&$objects['ok']&&$masterDisabled&&in_array($regularKey,$blackholeKeys,true)&&count($signerLists)===0&&count($delegates)===0;

$trustLine=null;
if($lines['ok']){
  foreach(($lines['result']['lines']??[]) as $line){
    if(($line['account']??null)===$issuer&&($currency===''||strtoupper((string)($line['currency']??''))===$currency)){$trustLine=$line;break;}
  }
}
$obligation=null;$locked=null;
if($gateway['ok']&&$currency!==''){
  $obligation=$gateway['result']['obligations'][$currency]??null;
  $locked=$gateway['result']['locked'][$currency]??null;
}

$ammData=$amm['ok']?($amm['result']['amm']??$amm['result']):null;
$askRows=$asks['ok']&&is_array($asks['result']['offers']??null)?$asks['result']['offers']:[];
$bidRows=$bids['ok']&&is_array($bids['result']['offers']??null)?$bids['result']['offers']:[];

emit([
  'ok'=>true,'version'=>'XRPWORLDZ-NATIVE-INTELLIGENCE-V1','network'=>$network,'rpc'=>$rpcUrl,'checkedAt'=>gmdate('c'),
  'features'=>$features,
  'standardDecision'=>[
    'current'=>'TRUST_LINE_TOKEN',
    'mptIssuanceAvailable'=>$features['MPTokensV1']['enabled']??null,
    'mptDexAmmReady'=>$features['MPTokensV2']['enabled']??false,
    'rule'=>'MPT is not presented as market-parity with trust-line tokens unless the required MPT DEX/AMM amendment is enabled and Worldz has separate execution proof.'
  ],
  'issuer'=>$issuer!==''?[
    'address'=>$issuer,'accountFound'=>$issuerInfo['ok'],'flags'=>$flags,
    'defaultRipple'=>$issuerInfo['ok']?has_flag($flags,0x00800000):null,
    'noFreeze'=>$issuerInfo['ok']?has_flag($flags,0x00200000):null,
    'globalFreeze'=>$issuerInfo['ok']?has_flag($flags,0x00400000):null,
    'disableMaster'=>$issuerInfo['ok']?$masterDisabled:null,
    'allowTrustLineLocking'=>$issuerInfo['ok']?has_flag($flags,0x40000000):null,
    'allowTrustLineClawback'=>$issuerInfo['ok']?has_flag($flags,0x80000000):null,
    'regularKey'=>$regularKey,
    'signerListCount'=>$objects['ok']?count($signerLists):null,
    'delegateCount'=>$objects['ok']?count($delegates):null,
    'blackholeVerified'=>$blackholeVerified,
    'blackholeRule'=>'Verified only when master key is disabled, RegularKey is a known blackhole address, and no SignerList or Delegate objects remain.'
  ]:null,
  'token'=>$issuer!==''&&$currency!==''?[
    'currency'=>$currency,'issuer'=>$issuer,'issuedObligation'=>$obligation,'lockedInEscrow'=>$locked,
    'hotTrustLine'=>$trustLine?[
      'balance'=>$trustLine['balance']??null,'limit'=>$trustLine['limit']??null,'noRipple'=>$trustLine['no_ripple']??null,
      'freeze'=>$trustLine['freeze']??null,'deepFreeze'=>$trustLine['deep_freeze']??null
    ]:null
  ]:null,
  'markets'=>$issuer!==''&&$currency!==''?[
    'amm'=>[
      'status'=>$amm['ok']?'FOUND':'NOT_FOUND_OR_UNAVAILABLE',
      'data'=>$ammData,
      'rule'=>'AMM existence is not a supply-control guarantee.'
    ],
    'clob'=>[
      'askCount'=>count($askRows),'bidCount'=>count($bidRows),
      'asks'=>array_slice($askRows,0,10),'bids'=>array_slice($bidRows,0,10),
      'rule'=>'XRPL Offers are native order-book liquidity and are shown separately from AMM liquidity.'
    ]
  ]:null,
  'sources'=>[
    source('XRPL server_info',$server['ok'],$server['error']),
    source('XRPL account_info',$issuer===''?false:$issuerInfo['ok'],$issuer===''?'issuer_not_supplied':$issuerInfo['error']),
    source('XRPL account_objects',$issuer===''?false:$objects['ok'],$issuer===''?'issuer_not_supplied':$objects['error']),
    source('XRPL gateway_balances',$issuer===''?false:$gateway['ok'],$issuer===''?'issuer_not_supplied':$gateway['error']),
    source('XRPL account_lines',$hot!==''?$lines['ok']:false,$hot===''?'hot_wallet_not_supplied':$lines['error']),
    source('XRPL amm_info',$currency!==''?$amm['ok']:false,$currency===''?'asset_not_supplied':$amm['error']),
    source('XRPL book_offers',$currency!==''?($asks['ok']||$bids['ok']):false,$currency===''?'asset_not_supplied':($asks['error']??$bids['error']))
  ],
  'rule'=>'XRPWorldz reports native XRPL evidence separately: issuer control, obligations, trust line, CLOB and AMM. It does not collapse them into a fake safety score.'
]);
