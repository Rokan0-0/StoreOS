# PRD — StoreOS PWA Implementation
## Phase 3: Progressive Web App — Install Prompt, Offline Shell & Push Notifications
**Version:** 1.0
**Status:** Ready for Implementation
**Prerequisite:** Phase 1 (frontend) must be complete. Phase 2 (Supabase) can run in parallel.

---

## 1. Objective

Turn StoreOS into a fully installable Progressive Web App so that:
- A merchant can install it to their phone's home screen like a native app
- The app loads instantly even with no internet connection
- The merchant receives push notifications for critical business events (low stock, credit reminders)

This is a significant trust signal — an app on the home screen feels real. It closes the gap between "website" and "product."

---

## 2. PWA Checklist (What We're Building)

| Feature | Description |
|---|---|
| Web App Manifest | App name, icons, theme color, display mode |
| Service Worker | Offline shell caching, background sync |
| Install Prompt | Custom UI prompt to add to home screen |
| Offline Fallback Page | Branded page shown when offline + uncached route hit |
| Push Notifications | Permission request + notifications for key events |
| Notification Handler | Service worker intercepts and displays notifications |

---

## 3. Web App Manifest

### 3.1 File
Create `public/manifest.json`:

```json
{
  "name": "StoreOS — Business Manager",
  "short_name": "StoreOS",
  "description": "The operating system for your store. Sales, inventory, credit and statements — all in one place.",
  "start_url": "/dashboard",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#166534",
  "categories": ["business", "finance", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "StoreOS Dashboard"
    }
  ]
}
```

### 3.2 Icons
Generate all icon sizes from a single 512x512 master PNG.
Place all icons in `public/icons/`.
Use a tool like `sharp` or the `pwa-asset-generator` npm package:
```bash
npx pwa-asset-generator public/icons/icon-master.png public/icons --manifest public/manifest.json
```

### 3.3 Link manifest in Next.js
In `app/layout.tsx`, add to the `<head>` metadata:
```ts
export const metadata: Metadata = {
  manifest: '/manifest.json',
  themeColor: '#166534',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StoreOS',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}
```

Also add to `<head>` in layout for iOS Safari (which ignores the manifest for some meta):
```html
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="StoreOS" />
```

---

## 4. Service Worker

### 4.1 Setup with next-pwa
Use `next-pwa` — the simplest way to add a service worker to a Next.js app:
```bash
npm install next-pwa
```

Update `next.config.ts`:
```ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Cache all Next.js page navigations
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'storeos-pages',
        expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Cache static assets aggressively
      urlPattern: /\.(?:js|css|woff2|png|jpg|svg|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'storeos-static',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      // Network-only for Supabase API calls (never cache auth/data)
      urlPattern: /supabase\.co/,
      handler: 'NetworkOnly',
    },
  ],
})

module.exports = withPWA({
  // your existing next config here
})
```

### 4.2 Offline Fallback Page
Create `app/offline/page.tsx`:

**Design:** Branded, calm, helpful. Not a generic browser error.
- StoreOS logo / icon
- Heading: "You're offline"
- Body: "Don't worry — everything you've recorded is saved on this device. Your data will sync automatically when you're back online."
- Button: "Go to Dashboard" (navigates to `/dashboard` — which loads from cache)
- Show the offline indicator matching the Topbar style

Register the fallback in `next-pwa` config:
```ts
fallbacks: {
  document: '/offline',
}
```

---

## 5. Install Prompt

### 5.1 How the Browser Install Prompt Works
Browsers fire a `beforeinstallprompt` event when the PWA criteria are met. By default this shows a small browser banner. We intercept it and show our own UI instead — much higher conversion.

### 5.2 Install Prompt Hook
Create `lib/hooks/use-install-prompt.ts`:

```ts
import { useState, useEffect } from 'react'

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const triggerInstall = async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setPromptEvent(null)
  }

  return { canInstall: !!promptEvent && !isInstalled, isInstalled, triggerInstall }
}
```

### 5.3 Install Banner Component
Create `components/install-prompt.tsx`:

**Trigger:** Show the banner automatically after the user has been on the dashboard for 30 seconds OR after they complete their first sale — whichever comes first. Do not show on first page load.

**Design (bottom sheet style on mobile, top banner on desktop):**
```
┌─────────────────────────────────────────────┐
│  📲  Add StoreOS to your home screen        │
│  Get faster access and use it offline       │
│  [Install App]           [Not now]          │
└─────────────────────────────────────────────┘
```

- Green install button matching brand colour
- Dismissible — store dismissal in `localStorage` with a 7-day cooldown before showing again
- On iOS (where `beforeinstallprompt` is not supported), show manual instructions instead:
  - "Tap the Share button → then 'Add to Home Screen'"
  - Detect iOS with: `navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')`

### 5.4 Where to Mount It
Add `<InstallPrompt />` to the dashboard layout (`app/dashboard/layout.tsx`) so it only appears once the user is inside the app, never on the landing page.

### 5.5 Install Button in Settings
Also add a persistent "Install App" button in the Settings page under a "App" section:
- If `canInstall` is true → show green install button
- If `isInstalled` is true → show "✓ App is installed" (disabled, greyed out)
- On iOS → show the manual Share instructions in a modal

---

## 6. Push Notifications

### 6.1 Permission Request
**Never ask for notification permission on first load.** This is the #1 UX mistake. Ask only after the user has experienced value.

**Trigger the permission request after:**
- The user records their 3rd sale, OR
- The user manually enables notifications in Settings

**Permission request flow:**
1. Show an in-app modal first — explain the value before the browser asks
2. Modal copy: *"Get alerts when stock runs low or a customer's credit is overdue — so you never miss what matters."*
3. User clicks "Enable Notifications" → then browser permission prompt fires
4. If denied → show a helper in Settings explaining how to re-enable in browser settings
5. Store permission state in `localStorage` as `notif_permission: 'granted' | 'denied' | 'dismissed'`

### 6.2 Notification Types (v1)

| Notification | Trigger | Timing |
|---|---|---|
| Low Stock Alert | A sale reduces a product's quantity below its threshold | Immediately on sale completion |
| Credit Overdue | A customer's credit is unpaid after X days (configurable in Settings, default 7 days) | Daily at 9:00 AM |
| Daily Summary | End of business day summary | Daily at 8:00 PM |

### 6.3 Notification Service Worker Handler
In the service worker, handle the `push` event:
```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: data.tag,          // prevents duplicate notifications
      data: { url: data.url } // URL to open on click
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard')
  )
})
```

### 6.4 Local Notifications (No Server Required for v1)
For v1, push notifications do not require a push server. Use the **Web Notifications API** directly from the client:

```ts
// lib/notifications.ts
export async function sendLocalNotification(
  title: string,
  body: string,
  url: string = '/dashboard'
) {
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  reg.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url },
  })
}
```

Wire this into the app:

**Low Stock:** Call `sendLocalNotification()` inside the POS sale completion handler, after inventory is deducted, if any product falls below threshold.

**Daily Summary:** Use a `setTimeout` / `setInterval` in the dashboard layout that fires at 8 PM if the app is open, or schedule via service worker `periodicsync` if supported.

**Credit Overdue:** Run a check on app open each day — query Dexie for credit transactions older than threshold → fire notifications for each overdue customer.

### 6.5 Notification Settings UI
In `Settings` page, add a "Notifications" section:
- Toggle: Low stock alerts (on/off)
- Toggle: Credit overdue alerts (on/off)
- Toggle: Daily summary (on/off)
- Input: Credit overdue threshold (days) — default 7
- Input: Daily summary time — default 8:00 PM
- If notifications not yet enabled → "Enable Notifications" button
- If denied → "Notifications blocked — tap here to learn how to re-enable"

Store all preferences in Dexie under a `settings` table (or `localStorage` for simplicity in v1).

---

## 7. Implementation Order

Follow this exact sequence:

1. Generate all icon sizes → place in `public/icons/`
2. Create `public/manifest.json`
3. Update `app/layout.tsx` with manifest link + Apple meta tags
4. Install `next-pwa` → update `next.config.ts`
5. Create `app/offline/page.tsx` (offline fallback)
6. Build `lib/hooks/use-install-prompt.ts`
7. Build `components/install-prompt.tsx` (banner + iOS fallback)
8. Mount `<InstallPrompt />` in dashboard layout
9. Add Install button to Settings page
10. Build `lib/notifications.ts`
11. Wire low stock notification into POS sale completion
12. Wire credit overdue check into dashboard load
13. Wire daily summary timer into dashboard layout
14. Add Notifications section to Settings page
15. Test install flow on Chrome (Android) + Safari (iOS)

---

## 8. Testing Checklist

### Install Prompt
- [ ] `beforeinstallprompt` fires after manifest + service worker are valid
- [ ] Custom banner appears after 30s on dashboard (not on landing page)
- [ ] Clicking "Install App" triggers browser install dialog
- [ ] After install, banner no longer appears
- [ ] "Not now" dismisses for 7 days
- [ ] Settings page shows "✓ App is installed" after install
- [ ] iOS shows manual Share instructions instead of install button

### Offline
- [ ] App loads with no internet after first visit
- [ ] Sales can be recorded offline
- [ ] `/offline` page shows when navigating to an uncached route offline
- [ ] Topbar offline indicator activates correctly

### Notifications
- [ ] Permission modal shows after 3rd sale (not on first load)
- [ ] Browser permission prompt fires only after in-app modal confirmation
- [ ] Low stock notification fires correctly after a sale deducts inventory below threshold
- [ ] Notification click opens correct page in app
- [ ] Notification toggles in Settings work correctly

---

## 9. Out of Scope for This Phase

- Push notifications via a server (Web Push Protocol + VAPID keys) — v4
- Background periodic sync for credit checks when app is closed — v4
- Notification history / inbox inside the app — v4
- Email/SMS fallback notifications — v4

---

*Feed this document to Cursor after Phase 2 (database) is underway. PWA can be implemented in parallel — it does not depend on Supabase being complete.*
