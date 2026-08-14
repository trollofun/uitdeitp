import type { Metadata } from 'next';
import Link from 'next/link';
import { legalEntity, LEGAL_PRIVACY_EMAIL } from '@/lib/config/legal';

/**
 * Politica de confidențialitate.
 *
 * Scrisă din ce face codul, nu dintr-un șablon: sursele enumerate sunt cele
 * patru căi reale prin care intră o înregistrare (cont, kiosk, stație parteneră
 * prin Contract A, import atestat), drepturile trimit la rutele care există
 * (`/api/account/export`, `/api/account/delete`, `/o`), iar categoriile de date
 * sunt coloanele care chiar se scriu. Dacă adaugi o sursă sau o coloană nouă,
 * se actualizează și aici — altfel documentul devine fals, ceea ce e mai rău
 * decât să lipsească.
 */
export const metadata: Metadata = {
  title: 'Politica de confidențialitate | uitdeITP',
  description:
    'Ce date personale prelucrează uitdeITP, în ce scop, cât timp le păstrează și cum îți exerciți drepturile GDPR.',
};

export default function PoliticaConfidentialitatePage() {
  const entity = legalEntity();

  return (
    <>
      <h1>Politica de confidențialitate</h1>
      <p className="text-muted-foreground">
        Documentul explică ce date personale prelucrăm prin uitdeITP, de ce, cât timp le
        păstrăm și ce poți cere oricând. E scris ca să fie citit, nu ca să fie bifat.
      </p>

      <h2>1. Cine prelucrează datele</h2>
      {entity.name ? (
        <p>
          Operatorul este <strong>{entity.name}</strong>
          {entity.registration ? `, ${entity.registration}` : ''}
          {entity.vat ? `, CUI ${entity.vat}` : ''}
          {entity.address ? `, cu sediul în ${entity.address}` : ''}.
        </p>
      ) : (
        <p>
          Operatorul serviciului uitdeITP poate fi contactat la{' '}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>.
        </p>
      )}
      <p>
        Pentru orice chestiune legată de datele tale, scrie la{' '}
        <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>. Răspundem în cel
        mult 30 de zile, termenul din art. 12 GDPR.
      </p>
      <h3>Cine răspunde pentru ce</h3>
      <p>
        Rolul depinde de calea pe care au ajuns datele la noi, iar diferența e reală, nu
        formală:
      </p>
      <ul>
        <li>
          <strong>Datele venite de la o stație ITP</strong> — de la terminalul din stație,
          din programul ei de gestiune sau dintr-o listă transmisă de ea. Aici{' '}
          <strong>stația este operatorul</strong>: ea a strâns datele, ea ți-a cerut
          acordul și ea decide de ce te contactează. Noi suntem doar împuternicitul care
          execută, pe baza contractului cu ea. Stația ne garantează contractual că are
          consimțământul tău; <strong>răspunderea pentru temeiul prelucrării și pentru
          corectitudinea datelor îi aparține</strong>.
        </li>
        <li>
          <strong>Datele pe care ni le dai direct</strong>, când îți faci cont pe
          uitdeITP. Aici nu e nicio stație la mijloc, deci{' '}
          <strong>operatorul suntem noi</strong> și răspundem ca atare.
        </li>
      </ul>
      <p>
        În practică nu-ți schimbă nimic din ce poți cere: scrie-ne la adresa de mai sus
        indiferent de caz. Dacă cererea privește date pentru care operatorul e stația, o
        transmitem mai departe către ea și îți spunem cui.
      </p>

      <h2>2. De unde avem datele</h2>
      <ul>
        <li>
          <strong>Direct de la tine</strong>, când îți faci cont și adaugi o scadență.
        </li>
        <li>
          <strong>De la terminalul dintr-o stație</strong> (modul kiosk), dacă ai completat
          formularul acolo și ai bifat acordul.
        </li>
        <li>
          <strong>De la stația care ți-a făcut inspecția</strong>, prin software-ul ei de
          gestiune, dacă ți-ai dat acordul la stație pentru a fi anunțat.
        </li>
        <li>
          <strong>Dintr-o listă transmisă de stație</strong>, caz în care stația ne
          confirmă expres că are consimțământul tău. Aceste înregistrări nu primesc
          niciodată solicitări de recenzie.
        </li>
      </ul>

      <h2>3. Ce date prelucrăm și de ce</h2>
      <table>
        <thead>
          <tr>
            <th>Categorie</th>
            <th>Scop</th>
            <th>Temei</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Număr de telefon</td>
            <td>Trimiterea SMS-ului de reamintire</td>
            <td>Consimțământ (art. 6(1)(a))</td>
          </tr>
          <tr>
            <td>Nume</td>
            <td>Personalizarea mesajului</td>
            <td>Consimțământ</td>
          </tr>
          <tr>
            <td>E-mail</td>
            <td>Contul, notificările, resetarea parolei</td>
            <td>Executarea contractului (art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Număr de înmatriculare</td>
            <td>Identificarea vehiculului în mesaj</td>
            <td>Consimțământ / contract</td>
          </tr>
          <tr>
            <td>Scadențe ITP, RCA, rovinietă</td>
            <td>Calculul datei la care te anunțăm</td>
            <td>Consimțământ / contract</td>
          </tr>
          <tr>
            <td>Serie de șasiu, serie carte de identitate, kilometraj</td>
            <td>Istoricul vehiculului la stația care ni le-a transmis</td>
            <td>Interes legitim al stației (art. 6(1)(f))</td>
          </tr>
          <tr>
            <td>Programări</td>
            <td>Rezervarea intervalului la stație</td>
            <td>Executarea contractului</td>
          </tr>
          <tr>
            <td>Jurnalul mesajelor trimise</td>
            <td>Dovada trimiterii, facturare, remedierea erorilor</td>
            <td>Interes legitim și obligație legală</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Nu prelucrăm categorii speciale de date</strong> și nu luăm decizii
        automate cu efecte juridice asupra ta. Nu vindem datele nimănui și nu le folosim
        pentru publicitatea altor firme.
      </p>

      <h2>4. Cui le transmitem</h2>
      <ul>
        <li>
          <strong>Stației cu care ești în relație</strong> — vede datele clienților ei, ca
          să-i poată programa și contacta.
        </li>
        <li>
          <strong>Furnizorilor care ne țin serviciul în funcțiune</strong>: găzduirea
          aplicației, baza de date, expedierea SMS-urilor și a e-mailurilor. Toți
          prelucrează strict pe baza instrucțiunilor noastre, prin contract de
          împuternicire.
        </li>
        <li>
          <strong>Autorităților</strong>, doar când o cere legea.
        </li>
      </ul>
      <p>
        Datele sunt stocate pe servere din Uniunea Europeană. Dacă un furnizor prelucrează
        date în afara UE, o face pe baza clauzelor contractuale standard aprobate de
        Comisia Europeană.
      </p>

      <h2>5. Cât le păstrăm</h2>
      <ul>
        <li>
          <strong>Cât timp ai cont</strong>, plus 30 de zile după ștergere, interval în
          care mai putem reface o ștergere făcută din greșeală.
        </li>
        <li>
          <strong>Scadențele</strong> — până le ștergi tu sau până îți retragi acordul.
        </li>
        <li>
          <strong>Jurnalul mesajelor</strong> — 3 ani, ca dovadă a trimiterii și pentru
          facturare.
        </li>
        <li>
          <strong>Dovada dezabonării</strong> — nelimitat, în formă minimă. E singurul mod
          de a garanta că nu-ți mai scriem niciodată; ștergerea ei ar însemna să te putem
          contacta din nou.
        </li>
      </ul>

      <h2>6. Drepturile tale</h2>
      <p>
        Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate, opoziție
        și retragerea consimțământului în orice moment. Retragerea nu afectează
        prelucrarea de dinainte.
      </p>
      <ul>
        <li>
          <strong>Oprirea mesajelor, imediat</strong>: linkul de dezabonare din fiecare
          SMS. Se aplică pe loc, fără să fie nevoie de cont și fără să ne scrii.
        </li>
        <li>
          <strong>Copia datelor tale</strong>: din cont, secțiunea{' '}
          <Link href="/dashboard/settings">Setări</Link>, butonul de export. Primești un
          fișier cu profilul, scadențele și istoricul notificărilor.
        </li>
        <li>
          <strong>Ștergerea contului</strong>: tot din Setări. Șterge profilul, scadențele
          și istoricul, apoi contul de autentificare.
        </li>
        <li>
          <strong>Dacă nu ai cont</strong> — de exemplu ai fost înscris la o stație — scrie
          la <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a> și
          rezolvăm noi.
        </li>
      </ul>
      <p>
        Dacă ceva nu-ți convine, te poți adresa Autorității Naționale de Supraveghere a
        Prelucrării Datelor cu Caracter Personal (ANSPDCP),{' '}
        <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">
          dataprotection.ro
        </a>
        . Preferăm însă să încerci întâi la noi.
      </p>

      <h2>7. Cookie-uri</h2>
      <p>
        Folosim doar cookie-uri strict necesare: cele care țin sesiunea de autentificare.
        Fără ele nu poți rămâne logat. Nu folosim cookie-uri de publicitate și nu urmărim
        comportamentul între site-uri, deci nu-ți cerem acordul pentru ceva ce nu facem.
      </p>

      <h2>8. Securitate</h2>
      <p>
        Accesul la date este restricționat la nivelul bazei de date, nu doar în interfață:
        fiecare stație vede strict clienții ei. Comunicația e criptată, iar cheile de acces
        ale partenerilor sunt stocate sub formă de amprentă și pot fi revocate imediat.
      </p>

      <h2>9. Modificări</h2>
      <p>
        Dacă schimbăm ceva important — un scop nou, o categorie nouă de date — anunțăm
        înainte, prin e-mail sau în aplicație. Data ultimei actualizări e în subsolul
        paginii.
      </p>
    </>
  );
}
