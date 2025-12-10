<objective>
Ajustează timpii de timeout și layout-ul în modulul Kiosk pentru a îmbunătăți experiența utilizatorului.

Problema principală: Utilizatorii sunt resetați la starea inițială în timpul introducerii codului de verificare, deși codul este valid 10 minute. De asemenea, după ce utilizatorul a introdus numărul de telefon, este clar că vrea să finalizeze procesul, deci timpii de reset trebuie crescuți semnificativ.
</objective>

<context>
Proiect: uitdeITP - platformă de reminder-e ITP pentru șoferi români
Tech stack: Next.js 14, React, TailwindCSS, Supabase
Modul: Kiosk mode pentru service-uri auto

Fișiere relevante:
- `/src/app/kiosk/[station_slug]/page.tsx` - Orchestratorul principal (933 linii) cu toată logica de timeout
- `/src/components/kiosk/PhoneVerificationStep.tsx` - Componenta de verificare telefon și cod
- `/src/types/kiosk.ts` - Configurația KIOSK_CONFIG cu timeout-uri

Flow-ul actual al step-urilor:
1. Idle (bine vine) - 60s
2. Name (nume) - 60s
3. Phone (telefon) - 60s
4. Code (cod verificare) - 60s timeout page, dar codul e valid 600s (10 min)
5. Plate (număr auto) - 180s (după engagement)
6. Date (dată expirare) - 180s
7. Success - 30s auto-reset

Configurația actuală din page.tsx (liniile 310-325):
- Pre-engagement (steps 2-6): 60 secunde
- Post-engagement (steps 2-6): 180 secunde (3 minute)
- Engagement flag se setează la verificarea codului (GREȘIT - ar trebui la telefon)
</context>

<requirements>
1. **Mutare engagement flag**: Setează `isEngaged = true` imediat după ce utilizatorul a introdus numărul de telefon (step 3), NU la verificarea codului (step 4)

2. **Timeout pentru step-ul de cod (step 4)**:
   - Timeout-ul paginii trebuie să fie MINIM 600 secunde (10 minute) - cât timp este valid codul
   - Rațiune: Utilizatorul poate primi SMS-ul cu întârziere, poate fi distras de client, etc.

3. **Timeout-uri generale după engagement**:
   - După introducerea telefonului: MINIM 120 secunde (2 minute) per step
   - Recomandare: 180 secunde (3 minute) este bine, dar verifică să nu fie 60s
   - Step-ul de cod: 600 secunde (excepție - trebuie să corespundă validității codului)

4. **Layout step verificare cod**:
   - Checkbox-ul GDPR și butonul de acceptare trebuie să fie vizibile FĂRĂ scroll
   - Ajustează spațierile, padding-urile, sau dimensiunile elementelor
   - Pe ecrane touch (kiosk), scroll-ul este problematic

5. **Nu modifica**:
   - Timeout-ul pentru step 1 (Idle) - rămâne 60s
   - Timeout-ul pentru step 7 (Success) - rămâne 30s auto-reset
   - Validitatea codului de verificare din API (600s) - asta e corectă
</requirements>

<implementation>
Pași de implementare:

1. **În `/src/app/kiosk/[station_slug]/page.tsx`**:
   - Găsește logica de setare a `isEngaged` flag-ului
   - Mută setarea la step 3 (phone) în loc de step 4 (code)
   - Modifică funcția `getTimeoutForStep()` să returneze 600000ms pentru step 4

2. **În `/src/types/kiosk.ts`**:
   - Adaugă o constantă nouă: `codeVerificationTimeout: 600000` (10 minute)
   - Documentează de ce e diferită de alte timeout-uri

3. **În `/src/components/kiosk/PhoneVerificationStep.tsx`**:
   - Reduce spațierile (gap, padding, margin) pentru a evita scroll
   - Verifică dacă countdown-ul, input-ul de cod, checkbox GDPR și butonul încap pe ecran
   - Folosește clase Tailwind precum `py-2` în loc de `py-4`, `gap-3` în loc de `gap-6`, etc.

4. **Verificare**:
   - Testează pe viewport 1024x768 (dimensiune tipică kiosk)
   - Toate elementele trebuie vizibile fără scroll
   - Timeout-ul nu resetează pagina în primele 10 minute pentru step-ul de cod
</implementation>

<verification>
Înainte de a declara task-ul complet, verifică:

1. `isEngaged` se setează când utilizatorul introduce telefonul (step 3), nu la cod
2. Step-ul de cod (4) are timeout de 600 secunde (10 minute)
3. Celelalte step-uri post-engagement au minim 120 secunde
4. Pe viewport 1024x768, step-ul de verificare cod afișează:
   - Countdown-ul
   - Input-ul pentru cod
   - Checkbox-ul GDPR
   - Butonul de acceptare
   - TOATE vizibile fără scroll

5. Rulează `npm run typecheck` pentru a verifica că nu sunt erori TypeScript
</verification>

<success_criteria>
- Utilizatorul NU este resetat la idle în primele 10 minute pe step-ul de cod
- După introducerea telefonului, utilizatorul are minim 2 minute pe fiecare step
- Checkbox-ul GDPR și butonul sunt vizibile fără scroll pe kiosk
- Codul compilează fără erori TypeScript
</success_criteria>
