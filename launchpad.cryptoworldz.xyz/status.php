<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function probe(string $url): array {
    $body = '';
    $code = 0;
    $error = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 7,
            CURLOPT_USERAGENT => 'WorldzLaunchPad-ReadOnly-Status/1.0',
            CURLOPT_HTTPHEADER => ['Accept: application/json']
        ]);
        $result = curl_exec($ch);
        if ($result === false) $error = curl_error($ch);
        else $body = (string)$result;
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http'=>[
            'method'=>'GET','timeout'=>7,'ignore_errors'=>true,
            'header'=>"Accept: application/json\r\nUser-Agent: WorldzLaunchPad-ReadOnly-Status/1.0\r\n"
        ]]);
        $result = @file_get_contents($url, false, $ctx);
        if ($result !== false) $body = (string)$result;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $code = (int)$m[1];
        if ($result === false) $error = 'request_failed';
    }
    $json = json_decode($body, true);
    return ['code'=>$code,'json'=>is_array($json)?$json:[],'error'=>$error];
}
function routeState(array $p): string {
    $c = (int)$p['code'];
    if ($c === 200) return 'healthy';
    if ($c === 401 || $c === 403) return 'protected';
    if ($c === 404) return 'missing';
    return 'degraded';
}

$base = 'https://cryptobotz.cryptoworldz.xyz';
$root = probe($base.'/');
$health = probe($base.'/health');
$auto = probe($base.'/api/mini/auto/status');
$grace = probe($base.'/grace/health');

$rootOk = $root['code'] === 200 && (($root['json']['ok'] ?? false) === true);
$healthOk = $health['code'] === 200 && (($health['json']['ok'] ?? false) === true);
$service = (string)($root['json']['service'] ?? '');
$zedState = ($rootOk && $healthOk) ? (stripos($service, 'Zed Bot') !== false ? 'healthy' : 'gateway') : 'degraded';

echo json_encode([
  'ok'=>true,
  'checked_at'=>gmdate('c'),
  'zed'=>[
    'state'=>$zedState,
    'root_code'=>$root['code'],
    'health_code'=>$health['code'],
    'service'=>$service ?: null,
    'runtime'=>$health['json']['runtime'] ?? ($root['json']['runtime'] ?? null)
  ],
  'auto'=>['state'=>routeState($auto),'code'=>$auto['code']],
  'grace'=>[
    'state'=>routeState($grace),
    'code'=>$grace['code'],
    'service'=>$grace['json']['service'] ?? null,
    'posting'=>$grace['json']['posting'] ?? null
  ]
], JSON_UNESCAPED_SLASHES);
