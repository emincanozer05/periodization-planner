/**
 * CoachOS — Service Worker (Web Push)
 *
 * The only job this file has is notifications. It deliberately does NOT cache anything:
 * CoachOS is a single index.html that the coach edits and redeploys, and a cache here
 * would serve yesterday's app long after a fix went out — the one failure mode that looks
 * exactly like "the change did not work".
 *
 * Registered by the app (see pushRegisterSW() in index.html) from the site root, so its
 * scope covers the whole app. The Worker (tally-worker.js) sends the pushes; this decides
 * what the athlete's phone actually shows.
 */

const PUSH_ICON = 'logo-mark.png';
const PUSH_TAG  = 'coachos-form-reminder';   // a second reminder replaces the first

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* A push carries the JSON the Worker encrypted for this device. A delivery that arrives
   without a body (some browsers wake the worker with nothing to prove the channel works)
   still has to show something — a push event that shows no notification costs the site
   its permission in Chrome. */
self.addEventListener('push', event => {
  let d = {};
  if (event.data) {
    try { d = event.data.json(); }
    catch (e) { d = { body: event.data.text() }; }
  }
  const title = d.title || 'CoachOS';
  const options = {
    body: d.body || 'Bugünkü formunu doldurdun mu?',
    icon: d.icon || PUSH_ICON,
    badge: d.badge || PUSH_ICON,
    tag: d.tag || PUSH_TAG,
    renotify: true,
    requireInteraction: false,
    data: { url: d.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* Tapping the notification focuses the tab the app is already open in rather than piling
   up a new one each time. */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const url = new URL(target, self.location.origin);
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === url.origin && 'focus' in c) {
        if ('navigate' in c && c.url !== url.href) { try { await c.navigate(url.href); } catch (e) { /* focus alone is enough */ } }
        return c.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url.href);
  })());
});

/* Chrome rotates a subscription when its keys expire. Without this the device goes quiet
   and nothing in the app says why; re-subscribing here keeps it reachable, and the app
   re-registers the new endpoint on its next load. */
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const old = event.oldSubscription || null;
    const key = (event.newSubscription && event.newSubscription.options && event.newSubscription.options.applicationServerKey)
      || (old && old.options && old.options.applicationServerKey);
    if (!key) return;
    const fresh = event.newSubscription
      || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'coachos-push-resubscribe', subscription: fresh.toJSON(), oldEndpoint: old ? old.endpoint : null });
  })());
});
