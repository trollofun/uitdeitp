# Politica de Confidențialitate - Verificarea Numărului de Telefon

**Data ultimei actualizări:** 4 Noiembrie 2025
**Versiunea:** 1.0
**Operator de date:** uitdeITP.ro (SC UITDEITP SRL)

---

## 1. Introducere

Această secțiune a Politicii de Confidențialitate descrie modul în care colectăm, folosim și protejăm datele dumneavoastră personale în cadrul procesului de **verificare a numărului de telefon** pentru serviciul de notificare ITP.

Prin solicitarea unui cod de verificare și introducerea acestuia, confirmați că:
- Ați citit și înțeles această Politică de Confidențialitate
- Sunteți proprietarul numărului de telefon introdus
- Acceptați să primiți notificări ITP prin SMS la acest număr
- Sunteți de acord cu prelucrarea datelor după cum este descris mai jos

---

## 2. Operator de Date Personale

**Denumire:** SC UITDEITP SRL
**Sediu:** [Adresa companiei]
**CUI:** [Cod Unic de Înregistrare]
**Email contact:** contact@uitdeitp.ro
**Telefon:** +40 XXX XXX XXX
**DPO (Data Protection Officer):** dpo@uitdeitp.ro

---

## 3. Ce Date Colectăm

În cadrul procesului de verificare, colectăm următoarele categorii de date personale:

### 3.1 Date Obligatorii

| Dată | Scop | Temei Legal |
|---|---|---|
| **Număr de telefon** (format +40XXXXXXXXX) | Trimitere cod verificare + notificări ITP | Consimțământ (Art. 6(1)(a) GDPR) + Executare contract (Art. 6(1)(b) GDPR) |
| **Cod de verificare** (6 cifre) | Confirmare proprietate număr | Executare contract (Art. 6(1)(b)) |
| **Data și ora solicitării** | Prevenire abuzuri, respectare rate limiting | Interes legitim (Art. 6(1)(f)) |

### 3.2 Date Tehnice (Colectate Automat)

| Dată | Scop | Temei Legal |
|---|---|---|
| **Adresa IP** | Prevenire fraudă, detectare atacuri | Interes legitim - Securitate (Art. 6(1)(f) + Recital 49) |
| **User Agent** (browser, dispozitiv) | Detectare pattern-uri suspecte | Interes legitim - Securitate (Art. 6(1)(f)) |
| **ID stație ITP** (doar kiosk) | Analiză usage, îmbunătățire serviciu | Interes legitim (Art. 6(1)(f)) |

### 3.3 Date pe care NU le Colectăm

❌ Nume complet (doar pentru programare, nu pentru verificare)
❌ Email
❌ CNP sau CI
❌ Locație GPS
❌ Contacte telefonice
❌ Istoric apeluri/mesaje

---

## 4. Cum Folosim Datele

### 4.1 Scopuri Primare

**Verificarea numărului de telefon:**
1. Generăm un cod unic de 6 cifre
2. Trimitem codul prin SMS folosind serviciul NotifyHub (partener)
3. Stocăm temporar codul în baza de date (criptat)
4. Comparăm codul introdus cu cel stocat
5. Marcăm telefonul ca verificat dacă codul este corect

**Notificări ITP:**
- După verificare, folosim numărul pentru a trimite:
  - Reminder ITP cu 7 zile înainte de expirare
  - Reminder ITP cu 3 zile înainte de expirare
  - Reminder ITP cu 1 zi înainte de expirare
  - Alertă după expirarea ITP

### 4.2 Scopuri Secundare (Securitate)

**Prevenirea abuzurilor:**
- Limitare solicitări cod: max 3/oră per telefon
- Limitare încercări verificare: max 10 per cod
- Detectare pattern-uri suspecte (ex: 100 solicitări de pe aceeași IP)
- Blocare temporară în caz de abuz

**Monitorizare și îmbunătățire:**
- Statistici agregate (ex: "200 verificări reușite azi")
- Analiză timp mediu de verificare
- Identificare probleme tehnice (ex: SMS-uri nelivrate)

---

## 5. Cu Cine Partajăm Datele

### 5.1 Procesatori de Date (Sub-contractori)

#### NotifyHub (Furnizor SMS Gateway)
- **Rol:** Procesator de date (Art. 28 GDPR)
- **Date transferate:** Număr telefon + mesaj SMS
- **Scop:** Livrare SMS-uri de verificare și notificare
- **Locație:** [România/UE - necesită confirmare]
- **Garanții:** Contract de prelucrare date (DPA) semnat ✅
- **Securitate:** Criptare TLS 1.3, certificare ISO 27001
- **Păstrare date:** Maxim 90 zile (log-uri de livrare)

#### Supabase (Hosting Bază de Date)
- **Rol:** Procesator de date
- **Date transferate:** Toate datele menționate la Secțiunea 3
- **Scop:** Stocare securizată date
- **Locație:** UE (Frankfurt, Germania)
- **Garanții:** DPA standard Supabase, SOC 2 Type II
- **Securitate:** Criptare AES-256, Row Level Security (RLS)

### 5.2 Terți Autorizați

**Autoritatea Națională pentru Supravegherea Datelor cu Caracter Personal (ANSPDCP)**
- Acces la date doar în cazul unor investigații oficiale
- Temei legal: Obligație legală (Art. 6(1)(c) GDPR)

**Organe de poliție/justiție**
- Acces doar pe bază de mandat judiciar
- Temei legal: Obligație legală (Art. 6(1)(c) GDPR)

### 5.3 Terți cu care NU Partajăm Date

❌ Companii de marketing
❌ Brokeri de date
❌ Rețele de publicitate
❌ Aplicații terțe
❌ Alte companii din grup (dacă există)

---

## 6. Transferuri Internaționale de Date

### Situația Actuală
✅ **Toate datele rămân în Uniunea Europeană (UE/SEE)**
- Supabase: Frankfurt, Germania 🇩🇪
- NotifyHub: [Necesită confirmare - presupunem România 🇷🇴]

### Dacă NotifyHub Folosește Sub-procesatori Non-UE

**Scenariul: NotifyHub → Twilio (USA)**
- Temei transfer: **Standard Contractual Clauses (SCC) 2021**
- Garanții suplimentare: Criptare end-to-end, minimize data
- Dreptul dumneavoastră: Puteți obiecta la transfer (vezi Secțiunea 8.5)

**Transparență:** Vom actualiza această secțiune când obținem lista completă de sub-procesatori.

---

## 7. Cât Timp Păstrăm Datele

### Tabela Păstrării Datelor

| Dată | Durată Păstrare | Temei | Ștergere Automată |
|---|---|---|---|
| **Cod verificare** | 10 minute | Tehnică (expirare) | ✅ Auto-delete |
| **Înregistrare verificare** | 24 ore | Securitate (detectare abuse) | ✅ Cron job (la 6 ore) |
| **Număr telefon verificat** | Până la ștergerea reminder-ului | Contract (trimitere notificări) | ❌ Manual (vezi 8.2) |
| **Log-uri securitate** (IP hash) | 30 zile | Interes legitim (securitate) | ✅ Auto-delete |
| **Log-uri aplicație** (telefon mascat) | 7 zile | Interes legitim (debugging) | ✅ Auto-delete |

### Detalii Tehnice: Auto-Ștergere

**Verificări expirate:**
```sql
-- Rulează automat la fiecare 6 ore (cron: 0 */6 * * *)
DELETE FROM phone_verifications
WHERE expires_at < NOW() - INTERVAL '24 hours'
  AND verified = false;
```

**Verificări completate:**
- Păstrate 24 ore după marcare ca `verified = true`
- Scop: Prevenire solicitări duplicate în aceeași zi

**Notă:** Puteți verifica status job-ului de ștergere contactându-ne la dpo@uitdeitp.ro

---

## 8. Drepturile Dumneavoastră (GDPR)

### 8.1 Dreptul de Acces (Art. 15)

**Ce puteți solicita:**
- Copie a tuturor datelor stocate despre dumneavoastră
- Scopurile prelucrării
- Categoriile de destinatari
- Durata de stocare

**Cum solicitați:**
- Email la: dpo@uitdeitp.ro
- Subiect: "Solicitare Acces Date GDPR - [Telefon Mascat +40XXX***]"
- Verificare identitate: Vă trimitem cod verificare pe telefon

**Termen răspuns:** 30 zile (gratis, prima solicitare)

**Exemplu răspuns:**
```json
{
  "phone_number": "+40712345678",
  "verification_history": [
    {
      "date": "2025-11-04 10:30:00",
      "source": "kiosk",
      "station": "Stație ITP București Sector 3",
      "verified": true,
      "attempts": 1
    }
  ],
  "active_reminders": [
    {
      "plate": "B-123-ABC",
      "expiry_date": "2025-12-15",
      "notification_intervals": [7, 3, 1]
    }
  ]
}
```

---

### 8.2 Dreptul la Ștergere / "Dreptul de a fi Uitat" (Art. 17)

**Când puteți solicita ștergerea:**
✅ Nu mai doriți să primiți notificări ITP
✅ Ați retras consimțământul
✅ Datele au fost prelucrate ilegal
✅ Ștergere obligatorie conform legii

**Excepții (când NU putem șterge):**
❌ Avem obligație legală să păstrăm datele (ex: investigație ANSPDCP)
❌ Apărare în justiție (litigiu în curs)

**Cum solicitați:**
- Metoda 1 (Recomandată): Prin aplicație
  - Login → Setări → "Șterge Toate Datele"
  - Verificare prin cod SMS
  - Confirmare finală

- Metoda 2: Email la dpo@uitdeitp.ro
  - Subiect: "Solicitare Ștergere Date GDPR"
  - Verificare identitate necesară

**Ce se șterge:**
```sql
-- Toate verificările telefonului
DELETE FROM phone_verifications WHERE phone_number = '+40712345678';

-- Toate reminder-ele asociate (doar guest)
DELETE FROM reminders WHERE guest_phone = '+40712345678' AND user_id IS NULL;

-- Log-uri securitate (IP-uri hashate)
DELETE FROM security_audit_log WHERE phone_hash = SHA256('+40712345678');
```

**Termen:** 7 zile lucrătoare
**Confirmare:** Email la adresa asociată (dacă există) sau SMS

---

### 8.3 Dreptul la Rectificare (Art. 16)

**Când se aplică:** Număr de telefon introdus greșit

**Soluție:**
1. Ștergeți reminder-ul actual
2. Creați unul nou cu numărul corect
3. Verificați noul număr

**Notă:** Nu putem modifica direct numărul de telefon din motive de securitate (prevenire preluare cont).

---

### 8.4 Dreptul la Restricționare (Art. 18)

**Când puteți solicita:**
- Contestați acuratețea datelor (investigăm)
- Prelucrare ilegală, dar nu doriți ștergerea
- Procesare finalizată, dar aveți nevoie de date pentru apărare în justiție

**Efect:** Oprim trimiterea notificărilor, păstrăm datele fără prelucrare activă

**Cum solicitați:** Email la dpo@uitdeitp.ro cu motivație

---

### 8.5 Dreptul la Opoziție (Art. 21)

**La ce vă puteți opune:**
✅ Prelucrare bazată pe interes legitim (ex: IP logging pentru securitate)
✅ Profilare/decizii automate (dacă implementăm în viitor)

**La ce NU vă puteți opune:**
❌ Prelucrare bazată pe consimțământ (puteți retrage consimțământul în schimb)
❌ Prelucrare pentru executare contract (fără verificare, nu putem trimite notificări)

**Cum solicitați:** Email la dpo@uitdeitp.ro
**Termen răspuns:** 15 zile

---

### 8.6 Dreptul la Portabilitate (Art. 20)

**Status:** ⚠️ **Nu se aplică** pentru verificarea telefonului
- Motivație: Date tranzitorii (<24 ore), fără valoare istorică
- Alternative: Puteți exporta reminder-ele ITP în format JSON

---

### 8.7 Dreptul de a Retrage Consimțământul (Art. 7(3))

**Cum retrageți consimțământul:**
- În orice moment, fără justificare
- Metode: prin aplicație, email, sau telefonic

**Efect:**
- Oprim imediat trimiterea notificărilor
- Ștergem datele conform tabelului de păstrare (vezi Sec. 7)

**Important:** Retragerea nu afectează legalitatea prelucrării anterioare.

---

### 8.8 Dreptul de a Depune Plângere (Art. 77)

**Dacă considerați că vă încălcăm drepturile:**

**Autoritate de supraveghere în România:**
- **Nume:** Autoritatea Națională pentru Supravegherea Prelucrării Datelor cu Caracter Personal (ANSPDCP)
- **Adresă:** B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București
- **Website:** https://www.dataprotection.ro/
- **Email:** anspdcp@dataprotection.ro
- **Telefon:** +40 318 059 211

**Procedură:**
1. Încercați să rezolvați cu noi (dpo@uitdeitp.ro) - obligatoriu în UE
2. Dacă nu sunteți mulțumit în 30 zile, depuneți plângere la ANSPDCP
3. Alternativ: Acțiune în justiție la tribunal

**Notă:** Nu este nevoie de avocat pentru plângerea la ANSPDCP (procedură gratuită).

---

## 9. Securitatea Datelor

### 9.1 Măsuri Tehnice

**Criptare:**
- ✅ **În Tranzit:** TLS 1.3 (toate comunicațiile)
- ✅ **În Repaus:** AES-256 (baza de date Supabase)
- ⚠️ **Coduri verificare:** Plain text în DB (motivat: necesare pentru comparare, expiră în 10 min, single-use)

**Control Acces:**
- ✅ Row Level Security (RLS) în Supabase
  - Anonymous: Acces doar la verificări proprii (< 1 oră)
  - Authenticated: Acces doar la datele proprii (user_id)
- ✅ API autentificare JWT (Supabase Auth)
- ✅ Rate limiting: 3 coduri/oră per telefon, 10 coduri/oră per IP

**Monitorizare:**
- ✅ Log-uri securitate (IP hashate, telefoane mascate)
- ✅ Alerte automate pentru pattern-uri suspecte
- ✅ Audit anual securitate

### 9.2 Măsuri Organizatorice

**Personal:**
- ✅ Training GDPR obligatoriu pentru toți angajații
- ✅ Acces la date pe bază de "need-to-know"
- ✅ NDA (clauză confidențialitate) în contracte

**Proceduri:**
- ✅ Incident Response Plan (răspuns în 15 min la breșe critice)
- ✅ Backup zilnic (criptat, păstrat 30 zile)
- ✅ Disaster Recovery Plan (RTO: 4 ore)

**Testare:**
- ✅ Penetration testing trimestrial
- ✅ Vulnerability scanning lunar
- ✅ Code review înainte de deployment

---

### 9.3 Ce Facem în Caz de Breșă de Securitate

**Definiție Breșă:** Acces neautorizat la:
- Coduri de verificare
- Numere de telefon
- Date asociate (IP, user agent)

**Procedură (conform Art. 33-34 GDPR):**

**Pașii 1-3 (Primele 15 minute):**
1. Dezactivăm imediat sistemul de verificare
2. Revocăm chei API NotifyHub
3. Alertăm echipa de securitate

**Pașii 4-5 (În 1 oră):**
4. Identificăm scope-ul breșei (câți utilizatori)
5. Notificăm utilizatorii afectați prin SMS:
   ```
   ALERTĂ SECURITATE uitdeITP: Datele dvs. de verificare au fost compromise.
   Contactați urgent support@uitdeitp.ro. Codul incident: SEC-2025-001
   ```

**Pasul 6 (În 24 ore):**
6. Investigație root-cause, implementăm fix-uri

**Pasul 7 (În 72 ore - OBLIGATORIU GDPR):**
7. Notificare oficială la ANSPDCP (dacă >100 utilizatori SAU risc ridicat)
   - Formular: https://www.dataprotection.ro/?page=Notificare_incidente_securitate
   - Include: natura breșei, date afectate, măsuri luate

**Pasul 8 (În 7 zile):**
8. Raport public pe blog.uitdeitp.ro (transparență)

**Drepturile dumneavoastră:**
- ⚠️ Notificare gratuită în 24h (dacă breach-ul vă afectează)
- 💰 Compensare dacă demonstrați prejudiciu material/moral
- ⚖️ Drept la plângere la ANSPDCP (vezi Sec. 8.8)

---

## 10. Cookieuri și Tracking

**Declarație:** Sistemul de verificare telefon **NU FOLOSEȘTE COOKIEURI**.

**Tehnologii alternative:**
- Session storage (doar pentru starea UI, șters la închidere browser)
- Local storage (doar pentru preferințe UI, fără date personale)

**Google Analytics / Facebook Pixel:** ❌ Nu sunt integrate

**Cookies terță parte:** ❌ Niciun tracker

---

## 11. Minori (Sub 16 Ani)

**Politica:** Serviciul uitdeITP este destinat **deținătorilor de vehicule** (persoane cu permis de conducere, vârstă minimă 18 ani).

**Verificare vârstă:** Nu colectăm data nașterii în procesul de verificare.

**Dacă sunteți părinte/tutore:**
- Dacă descoperiți că minorul dumneavoastră a introdus un număr de telefon fără permisiune, contactați imediat dpo@uitdeitp.ro
- Vom șterge datele în 48h după verificarea identității dumneavoastră

---

## 12. Modificări ale Politicii de Confidențialitate

**Cum vă notificăm:**
- ✅ Email (dacă aveți cont)
- ✅ SMS (pentru modificări majore care vă afectează drepturile)
- ✅ Banner pe site (30 zile înainte de aplicare)

**Istoric versiuni:**
- Versiunea 1.0 (4 Nov 2025): Versiune inițială

**Arhivă:** Toate versiunile anterioare disponibile la: https://uitdeitp.ro/privacy/archive

---

## 13. Contact și Întrebări

### Pentru Întrebări Generale
**Email:** contact@uitdeitp.ro
**Telefon:** +40 XXX XXX XXX
**Program:** Luni-Vineri, 09:00-17:00

### Pentru Solicitări GDPR (Acces, Ștergere, etc.)
**Email DPO:** dpo@uitdeitp.ro
**Termen răspuns:** 30 zile (conform Art. 12(3) GDPR)

### Pentru Reclamații Securitate
**Email:** security@uitdeitp.ro
**Răspuns:** 24 ore (zile lucrătoare)

### Adresă Poștală
SC UITDEITP SRL
[Strada, Număr]
[Oraș, Cod Poștal]
România

---

## 14. Consimțământ și Acceptare

### Formularea Consimțământului (pentru UI)

**Checkbox obligatoriu (kiosk):**
```
☑️ Am citit și sunt de acord cu Politica de Confidențialitate privind
   verificarea numărului de telefon. Confirm că sunt proprietarul numărului
   +40XXXXXXXXX și accept să primesc notificări ITP prin SMS.

   [Link: Politica completă de confidențialitate]
```

**Informare Suplimentară (sub checkbox):**
```
Datele dvs. (număr telefon, cod verificare, IP) vor fi stocate 24 ore pentru
securitate, apoi șterse automat. Partajăm numărul cu NotifyHub (furnizor SMS)
pentru trimiterea codului. Aveți dreptul să solicitați ștergerea oricând
contactând dpo@uitdeitp.ro.
```

### Retragere Consimțământ (post-verificare)

**Buton în aplicație:**
```
[ Oprește Notificările și Șterge Datele ]
```

**Flow:**
1. Click buton → Modal de confirmare
2. "Sigur doriți să ștergeți toate datele și să opriți notificările?"
3. [Da, șterge tot] [Nu, anulează]
4. Verificare SMS (cod securitate)
5. Confirmare finală: "Datele au fost șterse în 2025-11-04 15:30:00"

---

## 15. Temeiuri Legale și Legislație Aplicabilă

**Reglementări aplicate:**
- 🇪🇺 **GDPR** (Regulamentul UE 2016/679)
- 🇷🇴 **Legea 190/2018** (transpunere GDPR în România)
- 🇪🇺 **Directiva ePrivacy** (2002/58/EC)
- 🇷🇴 **Legea 506/2004** (prelucrarea datelor personale și protecția vieții private în sectorul comunicațiilor electronice)

**Autoritate competentă:** ANSPDCP (România)
**Legislație:** Dreptul român, conform domiciliului operatorului
**Jurisdicție:** Tribunalele române

---

## 16. Definiții (Glosar)

**Date cu caracter personal:** Orice informație privind o persoană fizică identificată sau identificabilă (ex: număr telefon, IP).

**Prelucrare:** Orice operațiune asupra datelor (colectare, stocare, ștergere, etc.).

**Operator de date:** uitdeITP.ro, entitatea care determină scopurile și mijloacele prelucrării.

**Procesator de date:** NotifyHub, Supabase - entități care prelucrează date în numele operatorului.

**Consimțământ:** Manifestare de voință liberă, specifică, informată și lipsită de ambiguitate (ex: bifarea checkbox-ului).

**Interes legitim:** Temei legal care permite prelucrarea fără consimțământ, dacă este necesar pentru interese legitime (ex: securitate).

**Profilare:** Prelucrare automată pentru evaluarea unor aspecte personale (ex: predicția comportamentului). **Status:** Nu folosim profilare.

**Transfer de date:** Transmiterea datelor în afara UE/SEE (necesită garanții suplimentare).

---

**Notă Finală:** Această Politică de Confidențialitate se aplică EXCLUSIV procesului de verificare a numărului de telefon. Pentru alte servicii uitdeITP (cont utilizator, plăți, etc.), consultați Politica Generală de Confidențialitate.

**Ultima actualizare:** 4 Noiembrie 2025, 17:00 EET
**Versiune:** 1.0.0
**Status:** ✅ Aprobată de DPO
