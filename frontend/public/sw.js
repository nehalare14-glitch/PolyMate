/* PolyMate network-only service worker */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/*
 * No fetch interception or Cache Storage.
 * Private PDFs, API responses and authentication
 * data are not cached by this service worker.
 */
