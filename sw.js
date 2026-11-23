/* Kembara Si PeTara - standalone offline cache, scoped to /KSP-offline/.
   Downloads original permitted game assets once; nothing changes in KSP-V2. */
const CACHE_NAME = "ksp-offline-v1-20261124";
const LOCAL_FILES = ["./", "./index.html", "./script.js", "./style.css", "./manifest.webmanifest"];
const ASSETS = [
  "assets/audio/cp1-1.m4a",
  "assets/audio/cp1-2.m4a",
  "assets/audio/cp2-1.m4a",
  "assets/audio/cp2-2.m4a",
  "assets/audio/cp3-1.m4a",
  "assets/audio/cp3-2.m4a",
  "assets/audio/cp4-1.m4a",
  "assets/audio/cp4-2.m4a",
  "assets/audio/cp4-3.m4a",
  "assets/audio/cp5-1.m4a",
  "assets/audio/cp5-2.m4a",
  "assets/audio/kids_cheering.mp3",
  "assets/audio/success-cheer.mp3.mp3",
  "assets/avatars/approved-explorers-atlas.svg",
  "assets/avatars/boy1-down.svg",
  "assets/avatars/boy1-left.svg",
  "assets/avatars/boy1-right.svg",
  "assets/avatars/boy1-up.svg",
  "assets/avatars/boy2-down.svg",
  "assets/avatars/boy2-left.svg",
  "assets/avatars/boy2-right.svg",
  "assets/avatars/boy2-up.svg",
  "assets/avatars/girl1-down.svg",
  "assets/avatars/girl1-left.svg",
  "assets/avatars/girl1-right.svg",
  "assets/avatars/girl1-up.svg",
  "assets/avatars/girl2-down.svg",
  "assets/avatars/girl2-left.svg",
  "assets/avatars/girl2-right.svg",
  "assets/avatars/girl2-up.svg",
  "assets/avatars/teacherF-down.svg",
  "assets/avatars/teacherF-left.svg",
  "assets/avatars/teacherF-right.svg",
  "assets/avatars/teacherF-up.svg",
  "assets/avatars/teacherM-down.svg",
  "assets/avatars/teacherM-left.svg",
  "assets/avatars/teacherM-right.svg",
  "assets/avatars/teacherM-up.svg",
  "assets/checkpoints/cp1-active.png",
  "assets/checkpoints/cp1-completed.png",
  "assets/checkpoints/cp1-locked.png",
  "assets/checkpoints/cp2-active.png",
  "assets/checkpoints/cp2-completed.png",
  "assets/checkpoints/cp2-locked.png",
  "assets/checkpoints/cp3-active.png",
  "assets/checkpoints/cp3-completed.png",
  "assets/checkpoints/cp3-locked.png",
  "assets/checkpoints/cp4-active.png",
  "assets/checkpoints/cp4-completed.png",
  "assets/checkpoints/cp4-locked.png",
  "assets/checkpoints/cp5-active.png",
  "assets/checkpoints/cp5-completed.png",
  "assets/checkpoints/cp5-locked.png",
  "assets/checkpoints/finish-active.png",
  "assets/checkpoints/finish-completed.png",
  "assets/checkpoints/finish-locked.png",
  "assets/ksp-v2-logo.png",
  "assets/map/petara-world-map.png",
  "assets/player/petara-down-1.png",
  "assets/player/petara-down-2.png",
  "assets/player/petara-down-3.png",
  "assets/player/petara-down-4.png",
  "assets/player/petara-idle.png",
  "assets/player/petara-left-1.png",
  "assets/player/petara-left-2.png",
  "assets/player/petara-left-3.png",
  "assets/player/petara-left-4.png",
  "assets/player/petara-right-1.png",
  "assets/player/petara-right-2.png",
  "assets/player/petara-right-3.png",
  "assets/player/petara-right-4.png",
  "assets/player/petara-up-1.png",
  "assets/player/petara-up-2.png",
  "assets/player/petara-up-3.png",
  "assets/player/petara-up-4.png"
];
const ORIGIN_GAME = new URL("../KSP-V2/", self.registration.scope);
const LOCAL_GAME = new URL("./", self.registration.scope);
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Always cache runnable local game shell first.
    await cache.addAll(LOCAL_FILES);
    // Assets are mirrored from the online repo on first installation.
    // GitHub Pages hosts both repositories under the same origin.
    const errors=[];
    // Concurrent batches make initial setup much faster than 75 sequential downloads.
    for(let i=0;i<ASSETS.length;i+=8){
      await Promise.all(ASSETS.slice(i,i+8).map(async relative=>{
        try {
          const original=new URL(relative,ORIGIN_GAME);
          const local=new URL(relative,LOCAL_GAME);
          const response=await fetch(original,{cache:"reload"});
          if(!response.ok)throw new Error(String(response.status));
          await cache.put(local,response);
        } catch(e) { errors.push(relative); }
      }));
    }
    if(errors.length)console.warn("[KSP Offline] Asset cache incomplete:", errors);
    // No automatic skipWaiting while an older game session is in progress.
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("ksp-offline-") && key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  // Do not affect other GitHub Pages sites, including online KSP-V2.
  if(url.origin!==self.location.origin || !url.pathname.startsWith(LOCAL_GAME.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const key=new URL(url.pathname, url.origin); // ignore cache-busting query strings
    const hit=await cache.match(key.href,{ignoreSearch:true});
    if(hit)return hit;
    // Installation may not have finished: lazily fetch and cache missing assets.
    if(url.pathname.startsWith(new URL("assets/",LOCAL_GAME).pathname)){
      try {
        const relative=url.pathname.slice(LOCAL_GAME.pathname.length);
        const remote=new URL(relative,ORIGIN_GAME);
        const response=await fetch(remote);
        if(response.ok){await cache.put(key.href,response.clone());return response;}
      }catch(e){}
    }
    try {
      const response=await fetch(request);
      if(response.ok)await cache.put(key.href,response.clone());
      return response;
    }catch(e){
      if(request.mode==="navigate")return await cache.match(new URL("index.html", LOCAL_GAME).href) ||
        new Response("Offline belum siap. Buka permainan sekali ketika ada Internet.",{headers:{"Content-Type":"text/plain; charset=utf-8"}});
      return new Response("Offline asset unavailable",{status:503});
    }
  })());
});
self.addEventListener("message",event=>{
  if(event.data?.type!=="CHECK_OFFLINE")return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    let found=0;
    for(const relative of ASSETS){if(await cache.match(new URL(relative,LOCAL_GAME).href))found++;}
    event.source?.postMessage({type:"OFFLINE_STATUS",cached:found,total:ASSETS.length,ready:found===ASSETS.length});
  })());
});
