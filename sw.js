/* 文博链 Service Worker：离线缓存（需经 http:// 访问才生效，配合 启动APP.bat） */
var CACHE = 'relicchain-v1.8';
var ASSETS = [
  './区块链平台.html', './区块链演示.html', './存证演示demo.html',
  './可视化总览.html', './官网.html', './大屏.html',
  './icon-192.png', './icon-512.png', './manifest.webmanifest'
];
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); })
  );
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      return hit || fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return res;
      }).catch(function(){ return caches.match('./区块链平台.html'); });
    })
  );
});

