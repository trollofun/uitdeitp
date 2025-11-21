<objective>
Fix multiple UI/UX issues în kiosk mode și adaugă animații continue pentru always-on display. Scopul este să aibă "best of both worlds": conversion psychology elements + animații continue care atrag atenția + UI responsive fără elemente care ies din chenare.

End goal: Kiosk funcțional, vizual atractiv cu animații, fără probleme de sizing/responsive, cu toate conversion elements păstrate.
</objective>

<context>
Fișier principal: `src/app/kiosk/[station_slug]/page.tsx`
Tech stack: Next.js 14, Framer Motion, Tailwind CSS, date-fns
Kiosk URL: `/kiosk/{station-slug}` (ex: `/kiosk/euro-auto-service`)

Current state:
- ✅ Conversion psychology UI implementat (fear hooks, trust signals, pro tip)
- ✅ Auto-reset după 30s (Step 7 → Step 1)
- ❌ Lipsă animații continue la idle screen
- ❌ Step 3: Cifre numpad ies din chenar
- ❌ Step 6: Calendar nu e responsive, iese din chenar
- ❌ Step 6: Notificare trimisă cu 5 zile înainte (trebuie 7 zile)
- ❌ Step 6: Chenarele calendar slab vizibile
- ❌ Step 6: Year/month picker greu de folosit

Review CLAUDE.md pentru project conventions.
</context>

<requirements>
## 1. Step 1 (Idle Screen) - Animații Continue

**Animații de adăugat pentru always-on kiosk display:**

### Background Animated Blobs
- Restore animated gradient blobs (ca în versiunea originală)
- Continuous floating/scaling animations
- Smooth, subtle movements (nu agresive)
- Folosește Framer Motion `animate` cu `transition: { repeat: Infinity }`

### Trust Signal Badges
- Subtle pulsing animation pe cele 3 badge-uri ("100% Gratuit", "Zero Spam", "1 SMS/an")
- Scale între 1.0 și 1.05
- Stagger delay între ele (0.3s, 0.4s, 0.5s)
- Infinite repeat

### CTA Button
- Shimmer/shine effect pe butonul "Începe Acum"
- Sau subtle scale pulse (1.0 → 1.02 → 1.0)
- Atrage atenția fără să fie enervant

**IMPORTANT:** Păstrează TOATE conversion psychology elements:
- Fear hook badge: "Risc: Amendă ITP"
- Trust signals (3 badges)
- Heading și copy persuasive
- Gradient background pe CTA

## 2. Step 3 (Phone Numpad) - Fix Sizing

**Problema:** Cifrele ies din chenarul butoanelor numpad.

**Soluții posibile:**
- **Opțiunea 1:** Mărește chenarul butoanelor (width și height)
- **Opțiunea 2:** Micșorează font-size la cifre
- **Opțiunea 3:** Combinație - chenar puțin mai mare + cifre puțin mai mici

**Fix recomandat:**
```tsx
// În Numpad.tsx sau direct în page.tsx la Step 3
<motion.button
  // Înainte: h-16 text-3xl
  // După: h-18 text-2xl (sau h-20 text-3xl - depinde ce arată mai bine)
  className="h-20 text-2xl font-medium bg-white/80 ..."
>
  {num}
</motion.button>
```

Testează ambele variante și alege ce arată cel mai bine pe tabletă.

## 3. Step 6 (Calendar) - Multiple Fixes

### 3a. Calendar Responsive (iese din chenar)

**Problema:** Calendarul iese din container pe tablete în landscape.

**Fix:**
- Limitează `max-width` pentru calendar container
- Sau scale down calendarul cu `transform: scale(0.9)` dacă e prea mare
- Asigură-te că `.react-day-picker` are `max-width: 100%` și se auto-scalează

```tsx
<div className="w-full max-w-md mx-auto">
  <Calendar
    mode="single"
    className="rounded-md border shadow-sm scale-90 md:scale-100"
    // ...
  />
</div>
```

### 3b. Fix Notificare: 7 zile înainte (NU 5)

**Problema critică:** Reminder preview arată data greșită (5 zile înainte în loc de 7).

**Verifică în cod:**
```tsx
// GREȘIT (dacă există):
{format(subDays(formData.expiryDate, 5), ...)}

// CORECT:
{format(subDays(formData.expiryDate, 7), 'dd MMMM yyyy', { locale: ro })}
```

Caută toate referințele la `subDays` și asigură-te că e `subDays(..., 7)`.

### 3c. Chenarele Calendar Mai Vizibile

**Problema:** Chenarele zilelor în calendar sunt slab vizibile.

**Fix în tailwind.config.js sau direct în Calendar:**
```tsx
<Calendar
  className="rounded-md border-2 border-gray-300 shadow-md"
  classNames={{
    day_selected: "bg-blue-600 text-white font-bold border-2 border-blue-700",
    day: "border border-gray-200 hover:bg-gray-100",
    // ... alte customizări
  }}
/>
```

Sau adaugă CSS global pentru `.react-day-picker` cu border mai groase.

### 3d. Year/Month Picker Mai Ușor de Folosit

**Problema:** Anul și luna sunt greu de selectat (probabil dropdown-uri mici sau fără controale).

**Soluții:**

**Opțiunea 1 - Butoane mari pentru navigation:**
```tsx
<Calendar
  captionLayout="dropdown-buttons" // Dropdown-uri mari pentru an/lună
  fromYear={2025}
  toYear={2030}
  classNames={{
    caption_dropdowns: "flex gap-4 text-lg",
    dropdown: "px-4 py-2 text-lg border-2 rounded-lg",
    // ...
  }}
/>
```

**Opțiunea 2 - Custom navigation buttons:**
```tsx
// Butoane mari pentru prev/next month
classNames={{
  nav_button: "h-12 w-12 text-2xl border-2 rounded-lg hover:bg-gray-100",
  nav_button_previous: "mr-2",
  nav_button_next: "ml-2",
}}
```

Testează ce funcționează mai bine pentru tabletă touch interface.

## 4. Păstrează Funcționalitatea Existentă

**NU modifica:**
- API paths (`/api/kiosk/station/${stationSlug}`)
- Auto-reset timer (30s la Step 7)
- Validation logic
- Step navigation
- Form state management
- Conversion psychology copy și elemente

**DOAR modifică:**
- Animations (adaugă)
- Sizing și responsive (fix)
- Calendar UI (îmbunătățește)
- Reminder calculation (fix 7 zile)
</requirements>

<implementation>
## Fișiere de modificat:

### 1. `./src/app/kiosk/[station_slug]/page.tsx`

**Modificări Step 1 (Idle Screen):**
- Adaugă `<AnimatedBlobs />` component sau inline animated divs
- Adaugă animation props la trust signal badges
- Adaugă shimmer/pulse la CTA button

**Modificări Step 3 (Phone Numpad):**
- Ajustează sizing la butoane numpad (vezi Requirements 2)
- Testează `h-18` vs `h-20` pentru înălțime
- Ajustează `text-2xl` vs `text-3xl` pentru font-size

**Modificări Step 6 (Calendar):**
- Wrappuiește calendar în container cu `max-w-md`
- Adaugă `scale-90` dacă calendar e prea mare
- Fix `subDays(..., 7)` în reminder preview
- Customizează `classNames` pentru border-uri vizibile
- Adaugă `captionLayout="dropdown-buttons"` pentru year/month picker

### 2. `./src/components/kiosk/Numpad.tsx` (dacă există)

**Opțional:** Dacă numpad-ul e component separat, modifică sizing-ul acolo.

### 3. `./tailwind.config.js` (opțional)

**Dacă vrei styling global pentru calendar:**
```js
// În theme.extend sau în CSS global
.react-day-picker {
  // Custom styles pentru chenare mai vizibile
}
```

## Exemple de cod:

### Step 1 - Animated Blobs (Background)
```tsx
{/* Animated Background Blobs */}
<motion.div
  animate={{
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0],
    opacity: [0.3, 0.5, 0.3]
  }}
  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
  className="absolute -top-[20%] -right-[20%] w-[800px] h-[800px] rounded-full blur-[100px] opacity-30 bg-blue-400"
/>
<motion.div
  animate={{
    scale: [1, 1.5, 1],
    x: [0, 50, 0],
    opacity: [0.2, 0.4, 0.2]
  }}
  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
  className="absolute -bottom-[20%] -left-[20%] w-[600px] h-[600px] rounded-full blur-[80px] opacity-20 bg-purple-400"
/>
```

### Step 1 - Pulsing Trust Badges
```tsx
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{
    scale: [1, 1.05, 1],
    opacity: 1
  }}
  transition={{
    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    opacity: { delay: 0.3 }
  }}
  className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl"
>
  <ShieldCheck className="w-5 h-5 text-green-600" />
  <span>100% Gratuit</span>
</motion.div>
```

### Step 3 - Numpad Sizing Fix
```tsx
<motion.button
  type="button"
  whileTap={{ scale: 0.9, backgroundColor: '#e5e7eb' }}
  onClick={() => onInput(num.toString())}
  className="h-20 w-20 text-2xl font-medium bg-white/80 backdrop-blur shadow-sm rounded-xl hover:bg-white/90"
>
  {num}
</motion.button>
```

### Step 6 - Calendar Responsive + Custom Styling
```tsx
<div className="w-full max-w-md mx-auto">
  <Calendar
    mode="single"
    selected={formData.expiryDate ?? undefined}
    onSelect={(date) => {
      setFormData(p => ({ ...p, expiryDate: date ?? null }));
      updateActivity();
    }}
    disabled={(date) => date < new Date()}
    captionLayout="dropdown-buttons"
    fromYear={2025}
    toYear={2030}
    className="rounded-2xl border-2 border-gray-300 shadow-lg scale-90 md:scale-100"
    classNames={{
      day_selected: "bg-blue-600 text-white font-bold border-2 border-blue-800 rounded-lg",
      day: "border border-gray-300 hover:bg-gray-100 rounded-md",
      day_today: "bg-blue-50 font-bold border-2 border-blue-400",
      caption_dropdowns: "flex gap-3",
      dropdown: "px-4 py-3 text-lg font-semibold border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50",
      nav_button: "h-12 w-12 border-2 border-gray-300 rounded-lg hover:bg-gray-100",
    }}
  />
</div>

{/* Reminder Preview - FIX: 7 zile înainte */}
{formData.expiryDate && (
  <motion.div className="bg-green-50 p-5 rounded-2xl border-2 border-green-200">
    <p className="font-bold text-green-900">Vei primi SMS pe:</p>
    <p className="text-2xl font-black text-green-700">
      {format(subDays(formData.expiryDate, 7), 'dd MMMM yyyy', { locale: ro })}
    </p>
    <p className="text-sm text-green-700">(cu 7 zile înainte de expirare)</p>
  </motion.div>
)}
```

## Ce să EVIȚI:

❌ NU schimba API endpoints
❌ NU modifica logic-ul de validare
❌ NU șterge conversion psychology elements (fear hook, trust signals, pro tip)
❌ NU schimba auto-reset timer-ul (30s)
❌ NU folosi animații agresive/enervante (subtle și continuous e key)
</implementation>

<output>
Modify:
- `./src/app/kiosk/[station_slug]/page.tsx` - Add animations, fix sizing, fix calendar, fix reminder calculation

Optional (dacă numpad e component separat):
- `./src/components/kiosk/Numpad.tsx` - Fix button sizing

No new files needed - doar modificări la fișierul principal kiosk page.
</output>

<verification>
Înainte de a declara complete, verifică:

1. **Animations Test:**
   - [ ] Step 1 idle screen are animated blobs în background (continuous loop)
   - [ ] Trust signal badges au subtle pulse animation
   - [ ] CTA button are shimmer sau pulse effect
   - [ ] Animațiile rulează smooth, fără lag

2. **Step 3 Numpad Test:**
   - [ ] Toate cifrele (0-9) sunt complet vizibile în chenare
   - [ ] Nu iese nimic din border la niciunul dintre butoane
   - [ ] Spacing-ul arată bine pe tabletă

3. **Step 6 Calendar Test:**
   - [ ] Calendarul NU iese din container (responsive)
   - [ ] Chenarele zilelor sunt clar vizibile (border-uri groase)
   - [ ] Year/month picker sunt ușor de folosit (dropdown-uri mari sau butoane mari)
   - [ ] Reminder preview arată data corectă: **expiry_date - 7 zile**
   - [ ] Testează cu multiple expiry dates pentru a confirma calculul corect

4. **Functionality Preservation:**
   - [ ] Auto-reset funcționează (30s după Step 7 → Step 1)
   - [ ] Toate conversion elements prezente (fear hook, trust signals, pro tip)
   - [ ] Step navigation funcționează normal
   - [ ] Validation funcționează (phone, plate, date)
   - [ ] API call la `/api/kiosk/station/${slug}` funcționează

5. **Build Test:**
   - [ ] Run `npm run build` - no TypeScript errors
   - [ ] Test local cu `npm run dev` pe `localhost:3000/kiosk/euro-auto-service`
   - [ ] Testează pe tabletă (sau browser responsive mode în landscape 1024x768)
</verification>

<success_criteria>
- ✅ Step 1 idle screen are animații continue (blobs, badges, CTA) pentru always-on display
- ✅ Step 3 numpad - toate cifrele se văd complet în chenare (fix sizing)
- ✅ Step 6 calendar responsive - NU iese din container
- ✅ Step 6 reminder preview arată data corectă (7 zile înainte, NU 5)
- ✅ Step 6 calendar - chenare vizibile și year/month picker ușor de folosit
- ✅ Toate conversion psychology elements păstrate
- ✅ Auto-reset funcționează (30s)
- ✅ Build fără erori TypeScript
- ✅ Functional pe tablete în landscape mode
</success_criteria>

<notes>
**Despre animații:**
- Animațiile trebuie să fie **continue** (infinite loop) pentru always-on kiosk
- Trebuie să fie **subtle** (nu agresive) - scopul e să atragă atenția, nu să enerveze
- Folosește `transition: { repeat: Infinity, ease: "easeInOut" }` pentru smooth loops

**Despre calendar:**
- `react-day-picker` vine din `@/components/ui/calendar` (shadcn/ui)
- Customizarea se face prin `classNames` prop
- `captionLayout="dropdown-buttons"` oferă dropdowns mari pentru year/month

**Despre reminder calculation:**
- Verifică că TOATE referințele la `subDays` folosesc `7` (nu 5, nu 3)
- Data afișată în preview trebuie să matchuiască data la care se va trimite efectiv SMS-ul
- Backend trimite la `expiry_date - 7 days`, deci frontend TREBUIE să afișeze același calculation

**Testing pe tabletă:**
- Landscape mode: 1024x768 sau 1280x800
- Portrait mode: 768x1024 (secundar, dar trebuie să funcționeze)
- Touch targets: minim 44x44px (Apple HIG) - numpad buttons trebuie mari
</notes>
