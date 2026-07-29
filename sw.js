// Service worker retirement file.
// This removes old cached website files so GitHub Pages updates appear correctly.
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(client => client.navigate(client.url));
  })());
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
