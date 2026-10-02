<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function out(array $v,int $status=200): void { http_response_code($status); echo json_encode($v,JSON_UNESCAPED_SLASHES); exit; }

$mint=trim((string)($_GET['mint']??''));
if(!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,64}$/',$mint)) out(['ok'=>false,'error'=>'invalid_mint'],400);

function http_json(string $url,string $method='GET',?array $payload=null,int $timeout=10): array {
  $body='';$code=0;$error=null;
  if(function_exists('curl_init')){
    $ch=curl_init($url);
    $headers=['Accept: application/json','User-Agent: WorldzIntelligence-Public/1.0'];
    if($method==='POST')$headers[]='Content-Type: application/json';
    curl_setopt_array($ch,[
      CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,
      CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>$timeout,
      CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers
    ]);
    if($payload!==null)curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($payload,JSON_UNESCAPED_SLASHES));
    $r=curl_exec($ch);
    if($r===false)$error=curl_error($ch); else $body=(string)$r;
    $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
  }else{
    $headers="Accept: application/json\r\nUser-Agent: WorldzIntelligence-Public/1.0\r\n";
    if($method==='POST')$headers.="Content-Type: application/json\r\n";
    $ctx=stream_context_create(['http'=>[
      'method'=>$method,'timeout'=>$timeout,'ignore_errors'=>true,'header'=>$headers,
      'content'=>$payload!==null?json_encode($payload,JSON_UNESCAPED_SLASHES):''
    ]]);
    $r=@file_get_contents($url,false,$ctx);
    if($r!==false)$body=(string)$r;else$error='request_failed';
    if(isset($http_response_header[0])&&preg_match('/\s(\d{3})\s/',$http_response_header[0],$m))$code=(int)$m[1];
  }
  $json=json_decode($body,true);
  return ['ok'=>$code>=200&&$code<300&&is_array($json),'code'=>$code,'json'=>is_array($json)?$json:null,'error'=>$error];
}
function rpc(string $method,array $params): array {
  $r=http_json('https://api.mainnet-beta.solana.com','POST',['jsonrpc'=>'2.0','id'=>1,'method'=>$method,'params'=>$params],12);
  if(!$r['ok']||isset($r['json']['error']))return ['ok'=>false,'result'=>null,'error'=>$r['json']['error']['message']??$r['error']??('HTTP '.$r['code'])];
  return ['ok'=>true,'result'=>$r['json']['result']??null,'error'=>null];
}
function n($v): ?float { return is_numeric($v)?(float)$v:null; }
function provider(string $name,array $r,string $reference): array {
  return ['provider'=>$name,'status'=>$r['ok']?'CONFIRMED':'UNAVAILABLE','reference'=>$reference,'error'=>$r['ok']?null:($r['error']??('HTTP '.$r['code']))];
}

$uMint=rawurlencode($mint);
$urls=[
 'jupiter'=>"https://api.jup.ag/tokens/v2/search?query=$uMint",
 'dex'=>"https://api.dexscreener.com/token-pairs/v1/solana/$uMint",
 'gecko'=>"https://api.geckoterminal.com/api/v2/networks/solana/tokens/$uMint",
 'rugcheck'=>"https://api.rugcheck.xyz/v1/tokens/$uMint/report"
];

$j=http_json($urls['jupiter']);
$d=http_json($urls['dex']);
$g=http_json($urls['gecko']);
$r=http_json($urls['rugcheck']);
$a=rpc('getAccountInfo',[$mint,['encoding'=>'jsonParsed','commitment'=>'confirmed']]);
$l=rpc('getTokenLargestAccounts',[$mint,['commitment'=>'confirmed']]);

$jrow=null;
if($j['ok']&&is_array($j['json'])){
  foreach($j['json'] as $row){if(($row['id']??null)===$mint||($row['address']??null)===$mint){$jrow=$row;break;}}
  if($jrow===null)$jrow=$j['json'][0]??null;
}

$pairs=$d['ok']&&is_array($d['json'])?$d['json']:[];
usort($pairs,fn($x,$y)=>((float)($y['liquidity']['usd']??0))<=>((float)($x['liquidity']['usd']??0)));
$deep=$pairs[0]??null;
$aggregate=0.0;$seen=[];
foreach($pairs as $p){
  $key=(string)($p['pairAddress']??$p['url']??count($seen));
  if(isset($seen[$key]))continue;$seen[$key]=true;$aggregate+=(float)($p['liquidity']['usd']??0);
}

$info=$a['ok']?($a['result']['value']['data']['parsed']['info']??null):null;
$supply=is_array($info)?(string)($info['supply']??'0'):'0';
$top=[];
if($l['ok']&&is_array($l['result']['value']??null)){
  foreach(array_slice($l['result']['value'],0,10) as $x)$top[]=['address'=>$x['address']??null,'amount'=>(string)($x['amount']??'0')];
}
$top10pct=null;$largestpct=null;
if(ctype_digit($supply)&&$supply!=='0'&&function_exists('bcdiv')){
  $sum='0';foreach($top as $x)$sum=bcadd($sum,$x['amount'],0);
  $top10pct=(float)bcmul(bcdiv($sum,$supply,10),'100',8);
  if(isset($top[0]))$largestpct=(float)bcmul(bcdiv($top[0]['amount'],$supply,10),'100',8);
}elseif(is_numeric($supply)&&(float)$supply>0){
  $sum=0.0;foreach($top as $x)$sum+=(float)$x['amount'];
  $top10pct=($sum/(float)$supply)*100;
  if(isset($top[0]))$largestpct=((float)$top[0]['amount']/(float)$supply)*100;
}

$riskRows=[];
if($r['ok']&&is_array($r['json']['risks']??null)){
  foreach($r['json']['risks'] as $x)$riskRows[]=[
    'name'=>$x['name']??$x['type']??'risk','level'=>$x['level']??$x['severity']??null,
    'description'=>$x['description']??$x['message']??null,'value'=>$x['value']??null
  ];
}

$creatorCandidate=$r['ok']&&is_string($r['json']['creator']??null)?$r['json']['creator']:null;
$creator=['status'=>'PROVIDER_CANDIDATE_ONLY','originalDeployerCandidate'=>null,'providerCreatorCandidate'=>$creatorCandidate,'creationSignature'=>null,'historyComplete'=>false,'evidence'=>[]];

// Bounded creator reconstruction: only claim original deployer when complete mint-address history is observed
// and the oldest transaction explicitly contains initializeMint/initializeMint2 for this mint.
$sigs=rpc('getSignaturesForAddress',[$mint,['limit'=>1000,'commitment'=>'confirmed']]);
if($sigs['ok']&&is_array($sigs['result'])){
  if(count($sigs['result'])<1000&&count($sigs['result'])>0){
    $oldest=$sigs['result'][count($sigs['result'])-1];
    $sig=$oldest['signature']??null;
    if(is_string($sig)){
      $tx=rpc('getTransaction',[$sig,['encoding'=>'jsonParsed','commitment'=>'confirmed','maxSupportedTransactionVersion'=>0]]);
      if($tx['ok']&&is_array($tx['result'])){
        $found=false;
        foreach(($tx['result']['transaction']['message']['instructions']??[]) as $ix){
          $type=strtolower((string)($ix['parsed']['type']??''));
          $ixMint=$ix['parsed']['info']['mint']??null;
          if(($type==='initializemint'||$type==='initializemint2')&&$ixMint===$mint){$found=true;break;}
        }
        if($found){
          $signer=null;
          foreach(($tx['result']['transaction']['message']['accountKeys']??[]) as $k){
            if(is_array($k)&&($k['signer']??false)===true){$signer=$k['pubkey']??null;break;}
          }
          $creator=['status'=>$signer?'ORIGINAL_DEPLOYER_EVIDENCE':'INITIALIZATION_FOUND_SIGNER_UNKNOWN','originalDeployerCandidate'=>$signer,'providerCreatorCandidate'=>$creatorCandidate,'creationSignature'=>$sig,'historyComplete'=>true,'evidence'=>$signer?['Oldest complete mint-address history contains initializeMint for this mint; first signer recorded as deployer evidence.']:[]];
        }else{
          $creator=['status'=>'OLDEST_TX_NOT_MINT_INITIALIZATION','originalDeployerCandidate'=>null,'providerCreatorCandidate'=>$creatorCandidate,'creationSignature'=>$sig,'historyComplete'=>true,'evidence'=>[]];
        }
      }
    }
  }elseif(count($sigs['result'])>=1000){
    $creator=['status'=>'HISTORY_WINDOW_INCOMPLETE','originalDeployerCandidate'=>null,'providerCreatorCandidate'=>$creatorCandidate,'creationSignature'=>null,'historyComplete'=>false,'evidence'=>['At least 1000 mint-address signatures observed; genesis was not assumed.']];
  }else{
    $creator=['status'=>'NO_HISTORY','originalDeployerCandidate'=>null,'providerCreatorCandidate'=>$creatorCandidate,'creationSignature'=>null,'historyComplete'=>true,'evidence'=>[]];
  }
}

$identityNames=[];$identitySymbols=[];
if(is_array($jrow)){if(!empty($jrow['name']))$identityNames[]=['provider'=>'Jupiter','value'=>$jrow['name']];if(!empty($jrow['symbol']))$identitySymbols[]=['provider'=>'Jupiter','value'=>$jrow['symbol']];}
if(is_array($deep)){
  $tok=(($deep['baseToken']['address']??null)===$mint)?($deep['baseToken']??[]):((($deep['quoteToken']['address']??null)===$mint)?($deep['quoteToken']??[]):($deep['baseToken']??[]));
  if(!empty($tok['name']))$identityNames[]=['provider'=>'DEX Screener','value'=>$tok['name']];
  if(!empty($tok['symbol']))$identitySymbols[]=['provider'=>'DEX Screener','value'=>$tok['symbol']];
}
if($r['ok']&&is_array($r['json']['tokenMeta']??null)){
  if(!empty($r['json']['tokenMeta']['name']))$identityNames[]=['provider'=>'RugCheck','value'=>$r['json']['tokenMeta']['name']];
  if(!empty($r['json']['tokenMeta']['symbol']))$identitySymbols[]=['provider'=>'RugCheck','value'=>$r['json']['tokenMeta']['symbol']];
}
function agrees(array $rows): ?bool {
  if(count($rows)<2)return null;$v=[];foreach($rows as $r)$v[]=strtolower(trim((string)$r['value']));return count(array_unique($v))===1;
}

$providers=[
 provider('Jupiter Tokens V2',$j,$urls['jupiter']),
 provider('DEX Screener',$d,$urls['dex']),
 provider('GeckoTerminal',$g,$urls['gecko']),
 provider('RugCheck',$r,$urls['rugcheck']),
 ['provider'=>'Solana RPC','status'=>$a['ok']&&$l['ok']?'CONFIRMED':'PARTIAL','reference'=>'https://api.mainnet-beta.solana.com','error'=>$a['error']??$l['error']??null]
];

out([
 'ok'=>true,'version'=>'WORLDZ-REAL-INTELLIGENCE-V1','chain'=>'solana','tokenId'=>$mint,'checkedAt'=>gmdate('c'),
 'providers'=>$providers,
 'identity'=>['names'=>$identityNames,'symbols'=>$identitySymbols,'nameAgreement'=>agrees($identityNames),'symbolAgreement'=>agrees($identitySymbols)],
 'onchain'=>is_array($info)?[
   'mintAuthority'=>$info['mintAuthority']??null,'freezeAuthority'=>$info['freezeAuthority']??null,
   'decimals'=>(int)($info['decimals']??0),'supplyRaw'=>$supply,
   'top10ObservedTokenAccountPercent'=>$top10pct,'largestObservedTokenAccountPercent'=>$largestpct,
   'topAccounts'=>$top
 ]:null,
 'liquidity'=>[
   'pairCount'=>count($pairs),'aggregateObservedDexLiquidityUsd'=>$aggregate,
   'deepestPair'=>$deep?[
     'pairAddress'=>$deep['pairAddress']??null,'dexId'=>$deep['dexId']??null,'url'=>$deep['url']??null,
     'liquidityUsd'=>n($deep['liquidity']['usd']??null),'priceUsd'=>n($deep['priceUsd']??null),
     'volume24hUsd'=>n($deep['volume']['h24']??null)
   ]:null,
   'geckoPriceUsd'=>$g['ok']?n($g['json']['data']['attributes']['price_usd']??null):null,
   'geckoTotalReserveUsd'=>$g['ok']?n($g['json']['data']['attributes']['total_reserve_in_usd']??null):null,
   'rule'=>'Observed liquidity is market data. LP lock or permanent protection is proven separately.'
 ],
 'jupiter'=>is_array($jrow)?[
   'name'=>$jrow['name']??null,'symbol'=>$jrow['symbol']??null,'verified'=>($jrow['isVerified']??false)===true,
   'organicScore'=>n($jrow['organicScore']??null),'organicScoreLabel'=>$jrow['organicScoreLabel']??null,
   'holderCount'=>n($jrow['holderCount']??null),'liquidityUsd'=>n($jrow['liquidity']??null),'usdPrice'=>n($jrow['usdPrice']??null)
 ]:null,
 'rugcheck'=>['creatorCandidate'=>$creatorCandidate,'score'=>$r['ok']?n($r['json']['score']??null):null,'risks'=>$riskRows],
 'creatorHistory'=>$creator,
 'rule'=>'Worldz shows provider-attributed evidence and disagreements. No provider result alone creates a SAFE label.'
]);
