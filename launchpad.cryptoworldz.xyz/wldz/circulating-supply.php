<?php
declare(strict_types=1);
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=30');
header('X-Content-Type-Options: nosniff');

$mint = 'AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U';
$rpc = 'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
$payload = json_encode([
  'jsonrpc' => '2.0',
  'id' => 1,
  'method' => 'getTokenSupply',
  'params' => [$mint, ['commitment' => 'confirmed']]
], JSON_UNESCAPED_SLASHES);

$body = false;
if (function_exists('curl_init')) {
  $ch = curl_init($rpc);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_USERAGENT => 'WorldzLaunchPad-WLDZ-Supply/1.0'
  ]);
  $body = curl_exec($ch);
  curl_close($ch);
} else {
  $ctx = stream_context_create(['http' => [
    'method' => 'POST',
    'timeout' => 10,
    'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
    'content' => $payload
  ]]);
  $body = @file_get_contents($rpc, false, $ctx);
}

if ($body === false) {
  http_response_code(502);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'supply_backend_unavailable']);
  exit;
}

$data = json_decode($body, true);
$value = $data['result']['value'] ?? null;
if (!is_array($value) || !isset($value['uiAmountString'])) {
  http_response_code(502);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'invalid_supply_response']);
  exit;
}

$current = (string)$value['uiAmountString'];
if (isset($_GET['format']) && $_GET['format'] === 'plain') {
  header('Content-Type: text/plain; charset=utf-8');
  echo $current;
  exit;
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
  'name' => 'WORLDZ',
  'symbol' => 'WLDZ',
  'mint' => $mint,
  'circulatingSupply' => $current,
  'totalSupply' => $current,
  'maxSupply' => '100000000',
  'decimals' => 6,
  'mintAuthority' => 'REVOKED',
  'freezeAuthority' => 'REVOKED',
  'source' => 'Solana getTokenSupply confirmed'
], JSON_UNESCAPED_SLASHES);
