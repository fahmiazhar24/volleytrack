self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Lewatkan semua request langsung ke jaringan agar Server Actions & Supabase selalu fresh
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});