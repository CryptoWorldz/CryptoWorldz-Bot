<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function emit(array $v,int $status=200): void { http_response_code($status); echo json_encode($v,JSON_UNESCAPED_SLASHES); exit; }

$network=strtolower(trim((string)($_GET['network']??'testnet')));
$hash=strtoupper(trim((string)($_GET['tx']??'')));
if(!in_array($network,['testnet','mainnet'],true))emit(['ok'=>false,'error'=>'invalid_network'],400);
if(!preg_match('/^[A-F0-9]{64}$/',$hash))emit(['ok'=>false,'error'=>'invalid_transaction_hash'],400);
$rpcUrl=$network==='mainnet'?'https://xrplcluster.com/':'https://s.altnet.rippletest.net:51234/';

function rpc(string $url,string $method,array $params=[]): array {
  $payload=json_encode(['jsonrpc'=>'2.0','id'=>1,'method'=>$method,'params'=>[$params]],JSON_UNESCAPED_SLASHES);
  $body='';$code=0;$error=null;
  if(function_exists('curl_init')){
    $ch=curl_init($url);
    curl_setopt_array($ch,[
      CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,
      CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,
      CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json','User-Agent: XRPWorldz-Transaction-Diagnosis/1.0']
    ]);
    $r=curl_exec($ch);if($r===false)$error=curl_error($ch);else $body=(string)$r;
    $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
  }else{
    $ctx=stream_context_create(['http'=>['method'=>'POST','timeout'=>12,'ignore_errors'=>true,'header'=>"Content-Type: application/json\r\nAccept: application/json\r\nUser-Agent: XRPWorldz-Transaction-Diagnosis/1.0\r\n",'content'=>$payload]]);
    $r=@file_get_contents($url,false,$ctx);if($r!==false)$body=(string)$r;else$error='request_failed';
    if(isset($http_response_header[0])&&preg_match('/\s(\d{3})\s/',$http_response_header[0],$m))$code=(int)$m[1];
  }
  $json=json_decode($body,true);
  $result=is_array($json)?($json['result']??null):null;
  return ['code'=>$code,'result'=>is_array($result)?$result:null,'error'=>$error];
}

$r=rpc($rpcUrl,'tx',['transaction'=>$hash,'binary'=>false]);
$result=$r['result'];
if(!is_array($result)){
  emit([
    'ok'=>true,'version'=>'XRPWORLDZ-TRANSACTION-DIAGNOSIS-V1','network'=>$network,'txId'=>$hash,
    'state'=>'UNKNOWN','validated'=>false,'transactionResult'=>null,'feeDrops'=>null,'ledgerIndex'=>null,
    'checkedAt'=>gmdate('c'),'detail'=>$r['error']??('HTTP '.$r['code']),
    'rule'=>'Worldz never upgrades a submitted transaction to CONFIRMED until XRPL reports a validated transaction with tesSUCCESS.'
  ]);
}
if(($result['error']??null)==='txnNotFound'){
  emit([
    'ok'=>true,'version'=>'XRPWORLDZ-TRANSACTION-DIAGNOSIS-V1','network'=>$network,'txId'=>$hash,
    'state'=>'UNKNOWN','validated'=>false,'transactionResult'=>null,'feeDrops'=>null,'ledgerIndex'=>null,
    'checkedAt'=>gmdate('c'),'detail'=>'txnNotFound',
    'rule'=>'Not found is not failure and not confirmation. A just-submitted transaction may still be propagating.'
  ]);
}

$validated=($result['validated']??false)===true;
$meta=$result['meta']??null;
$txResult=is_array($meta)?($meta['TransactionResult']??null):null;
if($validated&&$txResult==='tesSUCCESS')$state='CONFIRMED';
elseif($validated&&is_string($txResult)&&$txResult!=='tesSUCCESS')$state='FAILED';
elseif(!$validated)$state='CONFIRMING';
else $state='UNKNOWN';

$txJson=is_array($result['tx_json']??null)?$result['tx_json']:$result;
$fee=$txJson['Fee']??null;
$ledger=$result['ledger_index']??($txJson['ledger_index']??null);

emit([
  'ok'=>true,'version'=>'XRPWORLDZ-TRANSACTION-DIAGNOSIS-V1','network'=>$network,'txId'=>$hash,
  'state'=>$state,'validated'=>$validated,'transactionResult'=>$txResult,'feeDrops'=>$fee,
  'ledgerIndex'=>$ledger,'date'=>$result['date']??null,'checkedAt'=>gmdate('c'),
  'rule'=>'CONFIRMED requires XRPL validated=true and meta.TransactionResult=tesSUCCESS. A transaction hash alone is only submission evidence.'
]);
