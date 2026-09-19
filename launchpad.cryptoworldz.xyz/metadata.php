<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');

$mint = isset($_GET['mint']) ? trim((string)$_GET['mint']) : '';
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,64}$/', $mint)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_mint'], JSON_UNESCAPED_SLASHES);
    exit;
}

$url = 'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-metadata?mint=' . rawurlencode($mint);
$body = false;
$status = 502;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'WorldzLaunchPad-Metadata-Proxy/1.0',
        CURLOPT_HTTPHEADER => ['Accept: application/json']
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
} else {
    $ctx = stream_context_create(['http' => [
        'method' => 'GET',
        'timeout' => 10,
        'ignore_errors' => true,
        'header' => "Accept: application/json\r\nUser-Agent: WorldzLaunchPad-Metadata-Proxy/1.0\r\n"
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $status = (int)$m[1];
    }
}

if ($body === false) {
    http_response_code(502);
    echo json_encode(['error' => 'metadata_backend_unavailable'], JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code($status >= 100 && $status <= 599 ? $status : 502);
echo $body;
