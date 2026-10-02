<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60, stale-while-revalidate=120');
header('X-Content-Type-Options: nosniff');

$cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'worldz-newswire-v1.json';
$cacheSeconds = 120;
if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheSeconds) {
    readfile($cacheFile);
    exit;
}

$feedSpecs = [
    ['id'=>'coindesk','name'=>'CoinDesk','class'=>'INDEPENDENT_MEDIA','url'=>'https://www.coindesk.com/arc/outboundfeeds/rss/','max'=>12],
    ['id'=>'solana','name'=>'Solana Changelog','class'=>'FIRST_PARTY_CHAIN','url'=>'https://solana.com/changelog/rss.xml','max'=>8],
    ['id'=>'ethereum','name'=>'Ethereum Foundation Blog','class'=>'FIRST_PARTY_CHAIN','url'=>'https://blog.ethereum.org/feed.xml','max'=>8],
];

$sourceDeck = [
    ['name'=>'XRPL Blog','class'=>'FIRST_PARTY_CHAIN','url'=>'https://xrpl.org/blog','topic'=>'XRP'],
    ['name'=>'Decrypt','class'=>'INDEPENDENT_MEDIA','url'=>'https://decrypt.co/news','topic'=>'CRYPTO'],
    ['name'=>'Base Blog','class'=>'FIRST_PARTY_CHAIN','url'=>'https://blog.base.org/','topic'=>'BASE'],
    ['name'=>'Sui Blog','class'=>'FIRST_PARTY_CHAIN','url'=>'https://www.sui.io/blog','topic'=>'SUI'],
];

function fetch_worldz_url(string $url, int $timeout = 8, int $maxBytes = 2000000): ?string {
    if (!preg_match('#^https://#i', $url)) return null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) return null;
        $body = '';
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_USERAGENT => 'WorldzNewsWire/1.0 (+https://launchpad.cryptoworldz.xyz/news/)',
            CURLOPT_HTTPHEADER => ['Accept: application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, text/html;q=0.5'],
            CURLOPT_WRITEFUNCTION => function($ch, string $data) use (&$body, $maxBytes) {
                if (strlen($body) + strlen($data) > $maxBytes) return 0;
                $body .= $data;
                return strlen($data);
            },
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $ok = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        return ($ok !== false && $code >= 200 && $code < 300) ? $body : null;
    }
    $context = stream_context_create(['http'=>[
        'timeout'=>$timeout,
        'header'=>"User-Agent: WorldzNewsWire/1.0\r\nAccept: application/rss+xml, application/atom+xml, application/xml, application/json\r\n"
    ]]);
    $raw = @file_get_contents($url, false, $context, 0, $maxBytes);
    return $raw === false ? null : $raw;
}

function clean_title(string $value): string {
    $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/u', ' ', trim($value)) ?? trim($value);
    return mb_substr($value, 0, 220);
}

function safe_https_link(string $url): ?string {
    $url = trim($url);
    if (!filter_var($url, FILTER_VALIDATE_URL)) return null;
    $parts = parse_url($url);
    if (($parts['scheme'] ?? '') !== 'https') return null;
    return $url;
}

function topic_for(string $title): string {
    $t = strtoupper($title);
    $rules = [
        'XRP'=>['XRP','XRPL','RIPPLE'],
        'SOL'=>['SOLANA',' SOL ','FIRE DANCER','FIREDANCER'],
        'BTC'=>['BITCOIN',' BTC '],
        'ETH'=>['ETHEREUM',' ETH ','EVM'],
        'BASE'=>['BASE CHAIN','BASE APP',' COINBASE '],
        'SUI'=>[' SUI ','DEEPBOOK','CETUS'],
        'HYPER'=>['HYPERLIQUID','HYPEREVM',' HYPE '],
        'ROBINHOOD'=>['ROBINHOOD'],
        'SECURITY'=>['HACK','EXPLOIT','SECURITY','VULNERABILITY','SCAM','PHISH'],
        'DEFI'=>['DEFI','DEX','AMM','LIQUIDITY','STAKING'],
        'BUILDERS'=>['SDK','DEVELOPER','PROTOCOL','RELEASE','UPGRADE','TESTNET','MAINNET']
    ];
    foreach ($rules as $topic=>$needles) {
        foreach ($needles as $needle) if (str_contains($t, $needle)) return $topic;
    }
    return 'CRYPTO';
}

function parse_feed_items(string $xmlText, array $spec): array {
    if (!function_exists('simplexml_load_string')) return [];
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlText, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
    if ($xml === false) return [];
    $items = [];
    $nodes = [];
    if (isset($xml->channel->item)) $nodes = $xml->channel->item;
    elseif (isset($xml->entry)) $nodes = $xml->entry;
    foreach ($nodes as $node) {
        if (count($items) >= (int)$spec['max']) break;
        $title = clean_title((string)($node->title ?? ''));
        if ($title === '') continue;
        $link = '';
        if (isset($node->link)) {
            $attrs = $node->link->attributes();
            $link = isset($attrs['href']) ? (string)$attrs['href'] : (string)$node->link;
        }
        $link = safe_https_link($link) ?? '';
        if ($link === '') continue;
        $dateText = (string)($node->pubDate ?? $node->published ?? $node->updated ?? '');
        $ts = $dateText ? strtotime($dateText) : false;
        $items[] = [
            'kind'=>'EXTERNAL_NEWS',
            'title'=>$title,
            'url'=>$link,
            'source'=>$spec['name'],
            'sourceClass'=>$spec['class'],
            'topic'=>topic_for($title),
            'publishedAt'=>$ts ? gmdate('c', $ts) : null,
            'publishedTs'=>$ts ?: 0
        ];
    }
    return $items;
}

$items = [];
$health = [];
foreach ($feedSpecs as $spec) {
    $raw = fetch_worldz_url($spec['url']);
    if ($raw === null) {
        $health[] = ['source'=>$spec['name'],'ok'=>false];
        continue;
    }
    $parsed = parse_feed_items($raw, $spec);
    $items = array_merge($items, $parsed);
    $health[] = ['source'=>$spec['name'],'ok'=>count($parsed)>0,'items'=>count($parsed)];
}

/* Worldz registry events are evidence-linked project news, never fabricated headlines. */
$registryUrl = 'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';
$registryRaw = fetch_worldz_url($registryUrl, 6, 1000000);
if ($registryRaw !== null) {
    $registry = json_decode($registryRaw, true);
    if (is_array($registry) && isset($registry['launches']) && is_array($registry['launches'])) {
        foreach (array_slice($registry['launches'], 0, 8) as $launch) {
            if (!is_array($launch)) continue;
            $name = clean_title((string)($launch['token_name'] ?? ''));
            $symbol = strtoupper(clean_title((string)($launch['symbol'] ?? '')));
            if ($name === '' || $symbol === '') continue;
            $stage = strtoupper(str_replace('_', ' ', (string)($launch['stage'] ?? 'REGISTERED')));
            $network = strtoupper((string)($launch['network'] ?? ''));
            $title = "{$name} (${$symbol}) • {$stage}" . ($network ? " • {$network}" : '');
            $mint = trim((string)($launch['mint'] ?? ''));
            $url = $mint !== '' ? 'https://launchpad.cryptoworldz.xyz/trust/?mint='.rawurlencode($mint) : 'https://launchpad.cryptoworldz.xyz/';
            $dateText = (string)($launch['updated_at'] ?? $launch['created_at'] ?? '');
            $ts = $dateText ? strtotime($dateText) : false;
            $items[] = [
                'kind'=>'WORLDZ_REGISTRY_EVENT',
                'title'=>$title,
                'url'=>$url,
                'source'=>'WorldzProof Registry',
                'sourceClass'=>'WORLDZ_VERIFIED_EVENT',
                'topic'=>'WORLDZ',
                'publishedAt'=>$ts ? gmdate('c',$ts) : null,
                'publishedTs'=>$ts ?: time()
            ];
        }
    }
}

usort($items, fn($a,$b) => ($b['publishedTs'] ?? 0) <=> ($a['publishedTs'] ?? 0));
$seen=[];$dedup=[];
foreach ($items as $item) {
    $key = strtolower(($item['source'] ?? '').'|'.($item['title'] ?? ''));
    if (isset($seen[$key])) continue;
    $seen[$key]=true;
    unset($item['publishedTs']);
    $dedup[]=$item;
    if (count($dedup)>=24) break;
}

$out = [
    'ok'=>true,
    'version'=>'WORLDZ-NEWSWIRE-V1',
    'generatedAt'=>gmdate('c'),
    'cacheSeconds'=>$cacheSeconds,
    'items'=>$dedup,
    'sources'=>$sourceDeck,
    'feedHealth'=>$health,
    'disclaimer'=>'Headlines remain attributed to their original publishers. Worldz NewsWire is for information and research, not a buy or sell instruction.'
];
$json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($json === false) $json='{"ok":false,"error":"encode_failed"}';
@file_put_contents($cacheFile, $json, LOCK_EX);
echo $json;
