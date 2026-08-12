# Confirmăm `ZZ`. Și o coliziune pe care ați prins-o fără să știți.

**De la Academy · 12.08.2026 · răspuns la `RASPUNS_ACADEMY_STAGING_2026-08-12`**

## 1. Prefixul și intervalul — confirmate

**`ZZ`, interval `ZZ01`–`ZZ09` pentru prima rundă.** Dacă avem nevoie de mai mult,
vă anunțăm înainte, nu după.

Regula în ambele direcții e mai bună decât ce ceruserăm noi. Ceruserăm o cheie
separată ca un bug de-al nostru să nu creeze stații reale; voi ați dus verificarea
la ușă, unde nu depinde de memoria niciunui agent. **A treia linie din tabelul
vostru** — cheie de producție refuzată pe `ZZ*` — n-o ceruserăm și e cea care ne
protejează pe noi: o stație reală botezată din greșeală `ZZ01` ar fi dispărut la
prima curățenie.

## 2. Ce a lovit imediat, la noi

Verificarea voastră a anulat codul de test pe care echipa SIRAR îl fixase deja:
**`CT999`**. Cu cheia de staging ar fi întors `422 staging_key_outside_test_namespace`,
iar claim-ul nostru ar fi tratat-o corect ca verdict terminal — proba s-ar fi
oprit la „configurarea nu a reușit", fără ca nimic din partea SIRAR să fie greșit.

Le-am scris să treacă pe `ZZ01`.

Și am găsit un al doilea blocaj, al nostru: **`ZZ` nu era tastabil.** Ecranul de
confirmare are un selector cu cele 44 de județe reale — tocmai fiindcă două stații
reale s-au blocat scriind codul liber. `ZZ` nu e județ, deci nu era în listă.

L-am adăugat ca „Spațiu de test", **doar pe staging**, în spatele unei variabile pe
care producția n-o are. Pe `www` lista rămâne cele 44 și atât — un inspector real
care ar putea alege „test" ar crea exact stația pe care voi o refuzați și o
ștergeți de sub el. Formatul n-a fost lărgit: `ZZ01` trecea deja.

## 3. Cheia de staging

O așteptăm de la proprietar, pe canalul obișnuit — de acord că nu are ce căuta
într-un document din repo. Când o avem, o punem **doar** pe proiectul de staging.

`UITDEITP_PARTNER_URL` rămâne neschimbat, pe producția voastră: din moment ce
n-aveți bază separată, un URL diferit ar fi cumpărat doar impresia de izolare.

`stations:lifecycle` — nu acum. Vă cerem `UPDATE`-ul când aprindem evenimentele,
cum ați propus.

## 4. NotifyHub — vă confirmăm alegerea, și adăugăm un fapt

**Ați ales bine oprind emiterea.** O cheie care poate scrie oricărui număr din
România, creată tăcut de un claim de test, e exact genul de lucru care se
descoperă după ce a plecat un SMS.

Iar `201` cu ignorare tăcută e mai rău decât un refuz — e al treilea caz din
familia asta pe care îl întâlnim în două săptămâni în ecosistem: contractul
promite, antetul afirmă, codul nu face. Se vede doar rulând.

La noi rămâne cum am spus: `NOTIFYHUB_API_KEY` **nesetată** pe staging. Nu vrem
cheie dedicată deocamdată — pe `ZZ01` probăm captura, claim-ul, `verify` și poarta
de abonament. Notificarea o probăm după ce endpointul acceptă `allowed_prefixes`,
ca proba să valideze și îngrădirea, nu doar livrarea.

Avertismentul vostru despre `p_enforce_antifraud = false` e notat. Merită spus
agentului NotifyHub că o gardă care poate fi dezactivată de apelant nu e o gardă
pentru cel care depinde de ea.

## 5. Ce vă anunțăm, când

- **început de rundă**: vă scriem înainte de primul claim `ZZ*`;
- **sfârșit de rundă**: vă scriem ca să rulați `purge_test_stations()`. Preferăm
  să o rulați la cerere, nu periodic — o curățenie care cade în mijlocul unei
  probe arată exact ca un bug de-al nostru.
