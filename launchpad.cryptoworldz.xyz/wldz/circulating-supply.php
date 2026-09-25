<?php
declare(strict_types=1);
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=30');
header('X-Content-Type-Options: nosniff');

$mint = 'AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U';
$rpc = 'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
$circulating = '15000000';
$maxSupply = '100000000';

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
    CURLOPT_USERAGENT => 'WorldzLaunchPad-WLDZ-Supply/2.0'
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

$total = (string)$value['uiAmountString'];

if (isset($_GET['metric']) && $_GET['metric'] === 'circulating') {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['circulatingSupply' => (float)$circulating], JSON_UNESCAPED_SLASHES);
  exit;
}

if (isset($_GET['metric']) && $_GET['metric'] === 'total') {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['totalSupply' => (float)$total], JSON_UNESCAPED_SLASHES);
  exit;
}

if (isset($_GET['format']) && $_GET['format'] === 'plain') {
  header('Content-Type: text/plain; charset=utf-8');
  echo $circulating;
  exit;
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
  'name' => 'WORLDZ',
  'symbol' => 'WLDZ',
  'mint' => $mint,
  'circulatingSupply' => (float)$circulating,
  'totalSupply' => (float)$total,
  'maxSupply' => (float)$maxSupply,
  'decimals' => 6,
  'mintAuthority' => 'REVOKED',
  'freezeAuthority' => 'REVOKED',
  'methodology' => [
    'circulating' => '15,000,000 WLDZ executed as the public Meteora DAMM V2 launch-liquidity tranche. Founder/team and project-controlled treasury/reserve allocations are excluded.',
    'total' => 'Live Solana getTokenSupply result.',
    'coinGeckoMethodology' => 'Project-controlled founder, treasury, reserve, future ecosystem and other uncirculated allocations are excluded from circulating supply.'
  ],
  'excludedProjectWallets' => [
    [
      'address' => 'Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u',
      'role' => 'FOUNDER_PROJECT_WALLET',
      'documentedAllocationWLDZ' => 8000000
    ],
    [
      'address' => 'n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB',
      'role' => 'TREASURY_SOURCE_VAULT',
      'note' => 'Holds the remaining undistributed project-controlled WLDZ supply; distribution legs remain pending.'
    ]
  ],
  'publicLiquidity' => [
    'dex' => 'Meteora DAMM V2',
    'pool' => 'GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ',
    'executedLaunchTrancheWLDZ' => 15000000,
    'lpPosition' => '100% permanently locked'
  ],
  'source' => 'Solana total supply + canonical executed WLDZ allocation state'
], JSON_UNESCAPED_SLASHES);
