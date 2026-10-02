<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function out(array $v,int $status=200): void { http_response_code($status); echo json_encode($v,JSON_UNESCAPED_SLASHES); exit; }
$sig=trim((string)($_GET['tx']??''));
if(!preg_match('/^[1-9A-HJ-NP-Za-km-z]{64,120}$/',$sig)) out(['ok'=>false,'error'=>'invalid_signature'],400);

function rpc(string $method,array $params): array {
  $url='https://api.mainnet-beta.solana.com';
  $payload=json_encode(['jsonrpc'=>'2.0','id'=>1,'method'=>$method,'params'=>$params],JSON_UNESCAPED_SLASHES);
  $body='';$code=0;$error=null;
  if(function_exists('curl_init')){
    $ch=curl_init($url);
    curl_setopt_array($ch,[
      CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,
      CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,
      CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json','User-Agent: WorldzTransactionDiagnosis/1.0']
    ]);
    $r=curl_exec($ch);if($r===false)$error=curl_error($ch);else $body=(string)$r;
    $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
  }else{
    $ctx=stream_context_create(['http'=>['method'=>'POST','timeout'=>12,'ignore_errors'=>true,'header'=>"Content-Type: application/json\r\nAccept: application/json\r\nUser-Agent: WorldzTransactionDiagnosis/1.0\r\n",'content'=>$payload]]);
    $r=@file_get_contents($url,false,$ctx);if($r!==false)$body=(string)$r;else$error='request_failed';
    if(isset($http_response_header[0])&&preg_match('/\s(\d{3})\s/',$http_response_header[0],$m))$code=(int)$m[1];
  }
  $json=json_decode($body,true);
  if($code<200||$code>=300||!is_array($json)||isset($json['error']))return ['ok'=>false,'result'=>null,'error'=>$json['error']['message']??$error??('HTTP '.$code)];
  return ['ok'=>true,'result'=>$json['result']??null,'error'=>null];
}

$s=rpc('getSignatureStatuses',[[$sig],['searchTransactionHistory'=>true]]);
$t=rpc('getTransaction',[$sig,['encoding'=>'jsonParsed','commitment'=>'confirmed','maxSupportedTransactionVersion'=>0]]);
$status=$s['ok']?($s['result']['value'][0]??null):null;
$tx=$t['ok']?$t['result']:null;

$state='UNKNOWN';
if(is_array($status)){
  if(($status['err']??null)!==null)$state='FAILED';
  else{
    $cs=(string)($status['confirmationStatus']??'');
    if($cs==='finalized'||$cs==='confirmed')$state='CONFIRMED';
    elseif($cs==='processed')$state='CONFIRMING';
    else $state='SUBMITTED';
  }
}

$meta=is_array($tx)?($tx['meta']??null):null;
$fee=is_array($meta)&&isset($meta['fee'])?(int)$meta['fee']:null;

$tokenChanged=false;
if(is_array($meta)){
  $pre=[];foreach(($meta['preTokenBalances']??[]) as $x){$k=(string)($x['accountIndex']??'').'|'.(string)($x['mint']??'').'|'.(string)($x['owner']??'');$pre[$k]=(string)($x['uiTokenAmount']['amount']??'0');}
  $post=[];foreach(($meta['postTokenBalances']??[]) as $x){$k=(string)($x['accountIndex']??'').'|'.(string)($x['mint']??'').'|'.(string)($x['owner']??'');$post[$k]=(string)($x['uiTokenAmount']['amount']??'0');}
  foreach(array_unique(array_merge(array_keys($pre),array_keys($post))) as $k){if(($pre[$k]??'0')!==($post[$k]??'0')){$tokenChanged=true;break;}}
}
$nonFeeLamports=false;
if(is_array($meta)&&is_array($meta['preBalances']??null)&&is_array($meta['postBalances']??null)){
  $n=min(count($meta['preBalances']),count($meta['postBalances']));
  for($i=0;$i<$n;$i++){
    $delta=(int)$meta['postBalances'][$i]-(int)$meta['preBalances'][$i];
    if($i===0&&$fee!==null&&$delta===-$fee)continue;
    if($delta!==0){$nonFeeLamports=true;break;}
  }
}
$fundsMoved=is_array($meta)?(($tokenChanged||$nonFeeLamports)?'YES':'NO'):'UNKNOWN';

out([
 'ok'=>true,'version'=>'WORLDZ-TRANSACTION-DIAGNOSIS-V1','chain'=>'solana','txId'=>$sig,
 'state'=>$state,'confirmationStatus'=>is_array($status)?($status['confirmationStatus']??null):null,
 'confirmations'=>is_array($status)?($status['confirmations']??null):null,
 'slot'=>is_array($status)?($status['slot']??($tx['slot']??null)):($tx['slot']??null),
 'error'=>is_array($status)?($status['err']??($meta['err']??null)):($meta['err']??null),
 'networkFeeLamports'=>$fee,'fundsMoved'=>$fundsMoved,'tokenBalanceChanged'=>$tokenChanged,
 'nonFeeLamportBalanceChanged'=>$nonFeeLamports,'blockTime'=>is_array($tx)?($tx['blockTime']??null):null,
 'checkedAt'=>gmdate('c'),
 'rule'=>'CONFIRMED is reported only from Solana RPC confirmation state; manually supplied context cannot upgrade itself.'
]);
