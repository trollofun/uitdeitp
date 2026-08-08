# Notă: rolul din profilul Academy e acum un enum

**2026-08-09 · de la echipa Academy · notă, nu cerere — nu e nimic de făcut acum**

## Ce s-a schimbat la noi

`user_station_profiles.station_role` era text liber. Cele 12 rânduri din producție conțineau
**patru scrieri pentru două roluri** — `Inspector`, `Ing`, `Inginer`, `1` — plus opt goale.

E acum un select cu două opțiuni, iar valorile stocate sunt **exact vocabularul vostru**:
`inspector` și `patron`. Eticheta din interfață spune „Administrator — răspund de stație",
fiindcă așa își spune un proprietar de stație, dar valoarea salvată rămâne `patron`, ca să
nu existe nimic de tradus la graniță. Există și un `CHECK` în bază, deci nu se mai poate
scrie altceva nici prin API.

Normalizarea rândurilor vechi a fost literală: `Inspector` → `inspector`. `Ing`, `Inginer` și
`1` au devenit `NULL`, iar oamenii sunt întrebați — un inginer la o stație poate fi la fel de
bine inspectorul sau proprietarul, iar a ghici ar fi însemnat să înregistrăm un răspuns pe
care nu l-a dat nimeni.

## Ce NU se schimbă pentru voi: nimic

**Nu trebuie să atingeți nimic.** Am verificat înainte să vă scriem: payload-ul de
provisionare trimite `academy_station_id`, `rar_code`, `name`, `tier`, `inspector_email`,
`rotate`. Rolul **nu e printre ele**, și `station_role` nu e citit nicăieri în afara paginii
noastre de profil.

Deci schimbarea a făcut datele noastre **corelabile**, nu corelate. E o precondiție, nu o
legătură. Contractul e neatins, iar divergența pe care am convenit-o deja — noi punem
`inspector` în `station_members`, voi puneți `patron` — rămâne exact cum ați argumentat-o, și
argumentul vostru a fost bun: sunt două întrebări diferite, iar fără `patron` inspectorul ar
ateriza la voi într-un dashboard din care nu poate face nimic.

## Ce devine posibil, pentru mai târziu

La provisionare puneți `patron` **hardcodat** pe cine face claim-ul. Până acum n-aveam ce
să vă trimitem în loc; valorile noastre erau `Ing` și `1`.

Cazul în care ar conta: dacă installerul îl rulează un inspector angajat, nu proprietarul, el
primește `patron` la voi — adică, prin propria voastră descriere, **vede datele de contact
ale clienților stației**. Nu fiindcă a decis cineva, ci fiindcă el a fost cel care a rulat
programul.

**Nu vă cerem nimic acum**, din trei motive verificate:

1. **Câmpul e aproape gol** — un singur profil din 12 are rolul declarat. Ceilalți unsprezece
   vor fi întrebați când intră în profil. Un câmp `NULL` în 92% din cazuri nu poate decide
   nimic.
2. **E autodeclarat.** Cineva care își bifează singur „Administrator" nu e o autorizare. Ca
   semnal e util; ca temei pentru „vezi datele clienților" e slab, și n-am vrea să vă punem
   să construiți pe el.
3. **Riscul e mai îngust decât pare.** La noi, al doilea om care încearcă să revendice o
   stație cu membri existenți e refuzat cu `not_member` — apelul nici nu ajunge la voi.
   Primul care revendică o stație nouă e, prin construcție, cel care are și installerul și
   stația.

## Când merită discuția

Peste câteva săptămâni, după ce oamenii și-au completat rolul, o singură întrebare:
**vreți `station_role` în payload-ul de provisionare, ca să nu mai hardcodați `patron`?**

Atunci discuția are date în spate, nu o coloană goală. Dacă între timp vedeți din partea
voastră un caz concret în care rolul greșit produce o problemă reală, spuneți-ne mai devreme
— l-am adăuga într-o zi, e aditiv și nu rupe nimic.
