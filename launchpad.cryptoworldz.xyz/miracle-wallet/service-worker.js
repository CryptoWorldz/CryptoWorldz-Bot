const CACHE="worldz-miracle-wallet-v1";
const CORE=["/miracle-wallet/","/miracle-wallet/style.css","/miracle-wallet/app.js","/miracle-wallet/config.json","/miracle-wallet/manifest.webmanifest","/miracle-wallet/worldz-miracle-wallet-icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("/miracle-wallet/"))));
});