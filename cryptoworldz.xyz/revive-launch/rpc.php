<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Origin: https://cryptoworldz.xyz');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  http_response_code(204);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error'=>'POST only']);
  exit;
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $origin !== 'https://cryptoworldz.xyz' && $origin !== 'https://www.cryptoworldz.xyz') {
  http_response_code(403);
  echo json_encode(['error'=>'origin forbidden']);
  exit;
}
header('Access-Control-Allow-Origin: https://cryptoworldz.xyz');

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 250000) {
  http_response_code(400);
  echo json_encode(['error'=>'invalid request']);
  exit;
}
$body = json_decode($raw, true);
if (!is_array($body) || !isset($body['method'])) {
  http_response_code(400);
  echo json_encode(['error'=>'invalid json-rpc body']);
  exit;
}
$allowed = [
  'getAccountInfo','getMultipleAccounts','getBalance','getTokenAccountBalance',
  'getTokenSupply','getLatestBlockhash','getMinimumBalanceForRentExemption',
  'getFeeForMessage','simulateTransaction','sendTransaction','getSignatureStatuses',
  'getBlockHeight','getSlot','getEpochInfo','getProgramAccounts'
];
if (!in_array($body['method'], $allowed, true)) {
  http_response_code(403);
  echo json_encode([
    'jsonrpc'=>'2.0',
    'error'=>['code'=>403,'message'=>'RPC method not allowed'],
    'id'=>$body['id'] ?? null
  ]);
  exit;
}
$ch = curl_init('https://api.mainnet-beta.solana.com');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $raw,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json','Accept: application/json'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 25,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_USERAGENT => 'CryptoWorldz-REVIVE-Launch/1.0'
]);
$out = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$err = curl_error($ch);
curl_close($ch);
if ($out === false || $code < 200 || $code >= 300) {
  http_response_code(502);
  echo json_encode([
    'jsonrpc'=>'2.0',
    'error'=>['code'=>-32000,'message'=>'Upstream Solana RPC unavailable','detail'=>$err ?: ('HTTP '.$code)],
    'id'=>$body['id'] ?? null
  ]);
  exit;
}
echo $out;
