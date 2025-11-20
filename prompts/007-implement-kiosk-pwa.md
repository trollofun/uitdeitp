<objective>
Transformă pagina de kiosk într-o Progressive Web App (PWA) optimizată pentru tablete Android și iOS, cu fullscreen automat, standalone mode, și instalare automată. Scopul este ca kiosk-ul să arate și să funcționeze ca o aplicație nativă pe tablete, oferind o experiență intuitivă și profesională pentru stațiile ITP.

End goal: Când o stație instalează PWA-ul pe tabletă, acesta se va lansa fullscreen (fără browser UI), va afișa prompt-ul "Add to Home Screen" automat, și va oferi o experiență fluidă optimizată pentru touch.
</objective>

<context>
Proiect: uitdeITP - Platformă de remindere ITP pentru România
Tech stack: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
Kiosk URL pattern: `/kiosk/{station-slug}` (ex: `/kiosk/euro-auto-service`)

PWA target users:
- Stații ITP cu tablete Android/iOS
- Utilizare intensivă touch (kiosk mode)
- Trebuie să arate profesional și nativ
- Nu necesită funcționalitate offline completă (doar cache pentru assets)

Review CLAUDE.md pentru convenții project și structură.
</context>

<requirements>
1. **Manifest.json (Web App Manifest)**
   - Display mode: "fullscreen" (fullscreen automat la lansare)
   - Orientation: "any" cu landscape preferat via CSS media queries
   - Theme color și background color din branding-ul stației
   - Icons pentru Android (192x192, 512x512) și iOS (180x180)
   - Start URL: `/kiosk/{station-slug}` (trebuie să suporte slug dinamic)
   - Name: "uitdeITP Kiosk - {Station Name}"
   - Short name: "uitdeITP Kiosk"

2. **Service Worker**
   - Caching strategy pentru assets (CSS, JS, imagini, fonts)
   - Cache-first pentru static assets, network-first pentru API calls
   - Actualizare automată când există versiune nouă
   - NO offline functionality pentru funcționalitatea principală (doar assets)

3. **iOS Support (Apple-specific)**
   - Meta tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
   - Apple touch icon (180x180)
   - Splash screens pentru iPad (landscape și portrait)
   - Fullscreen forțat programatic (iOS nu respectă manifest display: fullscreen)

4. **Install Prompt**
   - Ascultă `beforeinstallprompt` event (Android)
   - Afișează banner/prompt automat pentru instalare
   - UI personalizat pentru instalare (nu doar browser default)
   - Tracking când PWA este instalat

5. **Fullscreen Experience**
   - Auto-enter fullscreen la încărcare (pentru iOS via Fullscreen API)
   - Ascunde orice browser UI sau navigation
   - Landscape preferat dar auto-rotate enabled
   - Touch-optimized (butoane mai mari, spacing generos)

6. **Performance Optimization**
   - Preload critical assets
   - Lazy loading pentru imagini
   - Optimize bundle size pentru kiosk pages
</requirements>

<implementation>
**File Structure:**
```
public/
  manifest.json              # Web app manifest (dinamic per station)
  sw.js                      # Service worker
  icons/
    icon-192x192.png        # Android icon
    icon-512x512.png        # Android icon (splashscreen)
    apple-touch-icon.png    # iOS icon (180x180)
    favicon.ico
src/
  app/
    kiosk/
      [slug]/
        layout.tsx          # Kiosk layout cu PWA meta tags
        page.tsx            # Kiosk page cu fullscreen logic
  components/
    kiosk/
      InstallPrompt.tsx     # PWA install banner
      FullscreenButton.tsx  # Manual fullscreen toggle
  lib/
    pwa/
      register-sw.ts        # Service worker registration
      fullscreen.ts         # Fullscreen API utilities
```

**Key Implementation Points:**

1. **Manifest Generation (Dynamic per Station):**
   - Creează `/app/api/kiosk/[slug]/manifest/route.ts` pentru manifest.json dinamic
   - Include station branding (name, colors) în manifest
   - Returnează manifest cu Content-Type: application/manifest+json

2. **Service Worker Strategy:**
   - Use Workbox (Google's PWA library) pentru simplitate
   - Cache static assets cu stale-while-revalidate
   - Network-first pentru API calls
   - Cleanup old caches la update

3. **iOS Fullscreen Workaround:**
   - iOS nu respectă `display: fullscreen` din manifest
   - Trebuie forțat programatic cu:
     ```typescript
     if (document.documentElement.requestFullscreen) {
       document.documentElement.requestFullscreen();
     }
     ```
   - Trigger automat la mount pentru iOS detection

4. **Install Prompt UX:**
   - Banner sticky bottom cu "Instalează aplicația"
   - Dismiss-able (nu forța utilizatorul)
   - Show doar dacă nu e deja instalat
   - Store preference în localStorage

5. **Orientation Handling:**
   - Manifest: `"orientation": "any"`
   - CSS media query pentru landscape optimization:
     ```css
     @media (orientation: landscape) {
       /* Optimized layout for landscape */
     }
     ```
   - Notificați utilizatorul dacă ține tableta portrait

**What to AVOID and WHY:**
- ❌ Nu folosi `display: "standalone"` - folosește `"fullscreen"` pentru maximum immersion
- ❌ Nu hard-code station name în manifest - trebuie dinamic per station
- ❌ Nu implementa offline-first pentru funcționalitate - doar cache assets (stația are internet)
- ❌ Nu lock orientation la landscape only - unele tablete sunt folosite portrait

**Examples:**

Good manifest.json (dinamic):
```json
{
  "name": "uitdeITP Kiosk - Euro Auto Service",
  "short_name": "uitdeITP Kiosk",
  "start_url": "/kiosk/euro-auto-service?source=pwa",
  "display": "fullscreen",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Good iOS meta tags:
```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="uitdeITP Kiosk" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

Good install prompt component:
```tsx
'use client';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white shadow-lg rounded-lg p-4 flex items-center justify-between z-50">
      <p>Instalează aplicația pentru o experiență mai bună!</p>
      <button onClick={handleInstall}>Instalează</button>
    </div>
  );
}
```
</implementation>

<output>
Create/modify the following files:

**PWA Configuration:**
- `./public/manifest.json` - Base manifest template (will be overridden by dynamic API)
- `./public/sw.js` - Service worker with Workbox caching
- `./src/app/api/kiosk/[slug]/manifest/route.ts` - Dynamic manifest per station
- `./src/lib/pwa/register-sw.ts` - Service worker registration logic
- `./src/lib/pwa/fullscreen.ts` - Fullscreen API utilities

**Icons:**
- `./public/icons/icon-192x192.png` - Android icon (placeholder or generate)
- `./public/icons/icon-512x512.png` - Android icon large (placeholder or generate)
- `./public/icons/apple-touch-icon.png` - iOS icon 180x180 (placeholder or generate)

**Components:**
- `./src/components/kiosk/InstallPrompt.tsx` - PWA install banner component
- `./src/components/kiosk/FullscreenButton.tsx` - Manual fullscreen toggle (fallback)

**Layout Updates:**
- `./src/app/kiosk/[slug]/layout.tsx` - Add PWA meta tags, manifest link, iOS tags
- `./src/app/kiosk/[slug]/page.tsx` - Add fullscreen auto-trigger and InstallPrompt

**Documentation:**
- `./docs/PWA-SETUP.md` - Installation guide for stations (how to install PWA on tablets)
</output>

<verification>
Before declaring complete, verify your implementation:

1. **Manifest Validation:**
   - Visit `/api/kiosk/{slug}/manifest` and verify JSON is valid
   - Check that station name and colors are dynamic
   - Confirm all required manifest fields are present

2. **Service Worker Registration:**
   - Open DevTools → Application → Service Workers
   - Verify SW is registered and active
   - Check caching strategy is working (Network tab)

3. **iOS Support:**
   - Verify meta tags are in `<head>` (View Source)
   - Check apple-touch-icon is accessible at `/icons/apple-touch-icon.png`
   - Test fullscreen trigger on iOS Safari

4. **Install Prompt:**
   - On Chrome/Edge Android, verify beforeinstallprompt fires
   - Check that install banner appears
   - Test install flow (click banner, install, verify app appears on home screen)

5. **Fullscreen Experience:**
   - Install PWA and launch from home screen
   - Verify it opens fullscreen (no browser UI)
   - Test auto-rotate works (landscape ↔ portrait)
   - Confirm landscape is visually optimized

6. **Build Test:**
   - Run `npm run build` to ensure no TypeScript errors
   - Verify bundle size didn't increase significantly
   - Test production build with `npm start`

7. **Lighthouse PWA Audit:**
   - Run Lighthouse audit on `/kiosk/{slug}` page
   - Target: PWA score ≥ 90/100
   - Must pass: Installable, Configured for custom splash screen, Themed omnibox
</verification>

<success_criteria>
- ✅ Manifest.json generat dinamic per station cu branding corect
- ✅ Service worker funcțional cu caching pentru assets
- ✅ Icons pentru Android (192x192, 512x512) și iOS (180x180)
- ✅ Meta tags iOS complete și funcționale
- ✅ Install prompt afișat automat pe Android Chrome
- ✅ Fullscreen automat la lansare (Android și iOS)
- ✅ Landscape preferat dar auto-rotate functional
- ✅ PWA instalabilă pe home screen (Android și iOS)
- ✅ Lighthouse PWA audit ≥ 90/100
- ✅ Build fără erori TypeScript
- ✅ Documentație pentru instalare pe tablete
</success_criteria>

<research>
Before starting implementation, research:
- Current kiosk layout structure (@src/app/kiosk/[slug]/layout.tsx)
- Station branding fields in database (@kiosk_stations table)
- Existing icon/logo assets (@public/)
- Next.js 14 metadata API for dynamic manifests
</research>

<notes>
**PWA Quirks to Handle:**

1. **iOS Limitations:**
   - Safari iOS nu suportă beforeinstallprompt (trebuie manual "Add to Home Screen")
   - Fullscreen din manifest ignorat (trebuie forțat programatic)
   - Service worker limitat (nu poate intercepta toate requests)

2. **Android Variations:**
   - Chrome, Edge, Samsung Internet au comportament ușor diferit
   - Unele device-uri blochează fullscreen automat (trebuie user gesture)
   - Install criteria: HTTPS + manifest valid + service worker + user engagement

3. **Tablet Considerations:**
   - Screen size mare (optimize touch targets: min 44x44px)
   - Landscape primary dar portrait secondary
   - Battery saving mode poate afecta service worker

**Testing Checklist:**
- [ ] Android Chrome (prompt instalare automată)
- [ ] Android Edge (verificare compatibilitate)
- [ ] iOS Safari (instalare manuală, fullscreen forțat)
- [ ] iPad landscape (layout optimizat)
- [ ] iPad portrait (layout adaptat)
- [ ] Network offline (assets cached corect)
- [ ] App update (service worker update flow)
</notes>
