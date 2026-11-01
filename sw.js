const CACHE='sidi-ifni-v2';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const h=new URL(e.request.url).hostname;
  // Google-Tabelle nie zwischenspeichern: immer frische Daten
  if(h.endsWith('docs.google.com')||h.endsWith('googleusercontent.com'))return;
  // Zuerst Cache (schnell/offline), im Hintergrund aktualisieren
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(e.request);
    const net=fetch(e.request).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(e.request,r.clone());return r;}).catch(()=>null);
    return hit||(await net)||(await c.match('./index.html'));
  }));
});
