const RETIRED_CACHE_PREFIX = "kaila-";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(RETIRED_CACHE_PREFIX))
              .map((key) => caches.delete(key)),
          ),
        ),
      self.registration.unregister(),
      self.clients.claim(),
    ]),
  );
});
