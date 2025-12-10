<objective>
Îmbunătățește UX-ul kioskului uitdeITP prin:
1. Afișare an cu 2 cifre în SimpleDatePicker (25 în loc de 2025) pentru simetrie vizuală
2. Implementare timeouts adaptive per step - mai lungi după engagement (verificare telefon)
3. Rebranding buton selectie rapidă "Mașină veche" (1 an) → "ITP anual" (mai prietenos)

Aceste modificări îmbunătățesc conversia și reduc abandonarea fluxului kiosk prin:
- Vizualizare mai clară a datei (ziua/luna/anul toate simetrice 2 cifre)
- Prevenirea timeout-urilor premature când utilizatorul e deja engaged
- Mesaje mai pozitive pentru clienți (evitare antagonizare)
</objective>

<context>
Aplicație: uitdeITP kiosk mode (Next.js 14, React, Framer Motion)
Flux actual: Home → Phone → Verification → Plate → Date → Consent → Success

Problema observată:
- După verificare telefon (+40729440132), timeout-ul resetează la home prea repede
- Utilizatorii trebuie să reintre și să plătească a doua verificare SMS
- Butonul "Mașină veche" sună negativ pentru proprietari
- Anul afișat cu 4 cifre (2025) nu e simetric cu ziua (25) și luna (11)

Fișiere cheie:
@src/components/kiosk/SimpleDatePicker.tsx - Date picker component
@src/app/kiosk/[station_slug]/page.tsx - Kiosk main flow cu steps
@src/components/kiosk/*.tsx - Toate step components

Citește CLAUDE.md pentru convenții proiect.
</context>

<requirements>
**1. SimpleDatePicker - Afișare an cu 2 cifre:**
- Schimbă afișarea anului de la 4 cifre (2025) → 2 cifre (25)
- Păstrează logic anul complet în state și database (2025)
- Afișare vizuală: "25" în picker, "2025" în preview text complet
- Range valid: 25-35 (2025-2035) pentru ITP-uri viitoare
- Preview format complet rămâne: "25 noiembrie 2025" (anul complet în text)

**2. Timeouts adaptive per step:**

Flow logic:
- **Pre-engagement** (înainte de verificare telefon): 60s timeout
  - Steps: Home screen, Phone input (fără cod verificat)

- **Post-engagement** (după verificare telefon reușită): 180s timeout
  - Steps: Plate input, Date picker, Consent
  - Rațiune: Utilizatorul a plătit SMS, e committed, are nevoie de timp pentru:
    * Scoate talonul din mașină (30-60s)
    * Citește data ITP (10-20s)
    * Selectează data în picker (20-40s)
    * Citește consimțământ GDPR (30-60s)

- **Success screen**: 30s timeout apoi redirect home
  - Timp pentru citire confirmation code și înțelegere next steps

**3. Rebranding buton selectie rapidă 1 an:**

Schimbă de la:
```tsx
<div className="text-sm leading-tight">Mașină veche</div>
<div className="text-xs opacity-90">1 an</div>
```

La:
```tsx
<div className="text-sm leading-tight">ITP anual</div>
<div className="text-xs opacity-90">1 an</div>
```

Variante acceptabile (alege ce sună mai bine):
- "ITP anual" (recomandat - neutru, descriptiv)
- "Verificare anuală"
- "Standar (1 an)"

**4. Tracking engagement state:**
- Adaugă flag `isEngaged` în kiosk page state
- Set `isEngaged = true` când phone verification succeeds
- Folosește `isEngaged` pentru a determina timeout-ul corect per step
</requirements>

<implementation>
**Pas 1: SimpleDatePicker - Afișare an 2 cifre**

În `/src/components/kiosk/SimpleDatePicker.tsx`:

```typescript
// State rămâne cu anul complet (2025)
const [year, setYear] = useState(currentDate.getFullYear());

// Display year - doar ultimele 2 cifre
const displayYear = year.toString().slice(-2); // "2025" → "25"

// În UI - picker column pentru an:
<motion.span className="text-5xl font-black text-white">
  {displayYear}
</motion.span>

// Label sub picker:
<p className="text-xs text-center text-slate-500 font-medium">
  25 - 35
</p>

// Preview text complet (păstrează anul întreg):
<p className="text-3xl font-black text-center text-slate-900">
  {format(new Date(year, month - 1, day), 'dd MMMM yyyy', { locale: ro })}
  {/* Output: "25 noiembrie 2025" - anul complet în text */}
</p>
```

**Pas 2: Timeouts adaptive în kiosk page**

În `/src/app/kiosk/[station_slug]/page.tsx`:

```typescript
'use client';

export default function KioskStationPage() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isEngaged, setIsEngaged] = useState<boolean>(false); // NEW

  // Timeout adaptive bazat pe engagement
  const getTimeoutForStep = (step: number): number => {
    if (step === 0) return 60000; // Home: 60s

    if (step === 1 && !isEngaged) return 60000; // Phone input pre-verification: 60s

    if (isEngaged) return 180000; // Post-verification steps: 180s (3 min)

    return 60000; // Default: 60s
  };

  // Reset timeout când step se schimbă
  useEffect(() => {
    const timeout = getTimeoutForStep(currentStep);
    const timer = setTimeout(() => {
      // Reset to home
      setCurrentStep(0);
      setIsEngaged(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [currentStep, isEngaged]);

  // Când phone verification succeeds:
  const handlePhoneVerified = () => {
    setIsEngaged(true); // MARK USER AS ENGAGED
    setCurrentStep(3); // Go to plate input
  };

  // Success screen timeout mai scurt
  useEffect(() => {
    if (currentStep === 6) { // Success step
      const timer = setTimeout(() => {
        window.location.reload(); // Reset kiosk
      }, 30000); // 30s

      return () => clearTimeout(timer);
    }
  }, [currentStep]);
}
```

**Pas 3: Update buton "Mașină veche" → "ITP anual"**

În `/src/components/kiosk/SimpleDatePicker.tsx`, găsește butonul pentru 1 an (12 months):

```typescript
// Button 2: 1 year - OLD vehicles
<motion.button
  onClick={() => setDateToMonthsFromNow(12)}
  className="..."
>
  <span className="text-2xl">🚙</span>
  <div className="text-left">
    <div className="text-sm leading-tight">ITP anual</div>
    <div className="text-xs opacity-90">1 an</div>
  </div>
</motion.button>
```

**Pas 4: Verificare console logging (opțional)**

Adaugă logging pentru debugging timeout-uri:

```typescript
console.log(`[Kiosk] Step ${currentStep}, Engaged: ${isEngaged}, Timeout: ${getTimeoutForStep(currentStep)}ms`);
```
</implementation>

<output>
Modifică fișierele:
- `./src/components/kiosk/SimpleDatePicker.tsx` - Afișare an 2 cifre
- `./src/app/kiosk/[station_slug]/page.tsx` - Timeouts adaptive + engagement tracking
- Testează flow-ul complet kiosk pentru a valida timeouts

NU creaza fisiere noi - doar modifică existente.
</output>

<verification>
Înainte de a declara complet, verifică:

**1. SimpleDatePicker visual:**
- [ ] Anul afișat în picker: "25" (2 cifre)
- [ ] Anul în preview text: "25 noiembrie 2025" (complet)
- [ ] Label sub picker: "25 - 35"
- [ ] State intern păstrează 2025 (anul complet)
- [ ] Incrementare/decrementare funcționează (25 → 26 → 27)

**2. Timeouts per step:**
- [ ] Home screen: 60s timeout
- [ ] Phone input (pre-verification): 60s timeout
- [ ] După phone verification: 180s timeout pentru plate/date/consent
- [ ] Success screen: 30s timeout apoi refresh

**3. Engagement tracking:**
- [ ] `isEngaged` se setează la `true` când phone verification succeeds
- [ ] `isEngaged` se resetează la `false` când revenim la home
- [ ] Console log-urile arată corect step + engaged + timeout

**4. Rebranding buton:**
- [ ] Butonul 1 an afișează "ITP anual" (nu "Mașină veche")
- [ ] Emoji și culori rămân neschimbate
- [ ] Funcționalitate setare 12 luni funcționează

**5. Test flow complet:**
```
1. Start kiosk → timeout 60s (verificat: resetează la home)
2. Intră număr telefon → timeout 60s (fără verificare)
3. Verifică telefon (SMS) → isEngaged = true
4. Plate input → timeout 180s (MULT MAI LUNG - verificat că NU resetează rapid)
5. Date picker → timeout 180s (timp suficient să scoți talonul)
6. Consent → timeout 180s
7. Success → timeout 30s apoi refresh
```

Test scenario real:
- Lasă kiosk pe plate input 2 minute → NU ar trebui să reseteze (timeout 180s)
- Lasă kiosk pe home 1 minut → AR TREBUI să reseteze (timeout 60s)
</verification>

<success_criteria>
✅ Anul afișat cu 2 cifre (25) în picker, păstrând logica completă (2025)
✅ Timeout 60s înainte de verificare telefon
✅ Timeout 180s (3 min) după verificare telefon pentru plate/date/consent
✅ Buton "ITP anual" în loc de "Mașină veche"
✅ Testare manuală confirmă că timeouts funcționează corect
✅ UX îmbunătățit - utilizatorii engaged nu pierd progresul
</success_criteria>

<notes>
**Design rationale:**
- **2 cifre pentru an**: Creează simetrie vizuală perfectă (25 / 11 / 25)
- **180s post-engagement**: Timpul real necesar pentru un utilizator să scoată talonul, să citească data, să selecteze în picker
- **"ITP anual" vs "Mașină veche"**: Evită percepția negativă, rămâne descriptiv
- **Engagement flag**: Determină corect când utilizatorul e committed (a plătit SMS) vs browsing

**Trade-offs considerate:**
- Timeout mai lung = risc kiosk blocat → Mitigat prin success screen auto-refresh la 30s
- An 2 cifre = posibilă confuzie 25 vs 2025 → Mitigat prin preview text complet "25 noiembrie 2025"
</notes>
