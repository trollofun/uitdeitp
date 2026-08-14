import type { Metadata } from 'next';
import Link from 'next/link';
import { legalEntity, LEGAL_CONTACT_EMAIL } from '@/lib/config/legal';

/**
 * Termenii serviciului.
 *
 * Două puncte poartă greutatea. §4: un SMS de reamintire nu e o garanție
 * legală, iar responsabilitatea inspecției rămâne a proprietarului — fără el,
 * un client căruia i-a picat un mesaj ar putea susține că amenda e a noastră.
 * §6: pentru datele venite de la o stație, stația e operatorul și răspunde
 * pentru temeiul prelucrării, cu despăgubire dacă lipsește.
 *
 * Delimitarea din §6 merge până unde poate merge, și nu mai departe. Pentru
 * conturile create direct pe site nu există nicio stație la mijloc: acolo noi
 * stabilim scopul, deci noi suntem operatorul, oricât ne-ar conveni altfel. O
 * declinare scrisă peste realitatea asta n-ar rezista la prima verificare și ar
 * slăbi-o și pe cea reală.
 *
 * Restul e cadrul obișnuit — dar formulat pe ce face aplicația, nu pe un șablon.
 */
export const metadata: Metadata = {
  title: 'Termeni și condiții | uitdeITP',
  description:
    'Condițiile de utilizare a serviciului uitdeITP: ce oferim, ce nu garantăm, drepturile și obligațiile fiecărei părți.',
};

export default function TermeniPage() {
  const entity = legalEntity();

  return (
    <>
      <h1>Termeni și condiții</h1>
      <p className="text-muted-foreground">
        Prin folosirea uitdeITP accepți condițiile de mai jos. Sunt scrise pe scurt și fără
        ocolișuri, ca să știi exact la ce te înscrii.
      </p>

      <h2>1. Cine oferă serviciul</h2>
      <p>
        uitdeITP este operat de{' '}
        {entity.name ? (
          <>
            <strong>{entity.name}</strong>
            {entity.registration ? `, ${entity.registration}` : ''}
            {entity.vat ? `, CUI ${entity.vat}` : ''}
          </>
        ) : (
          'operatorul platformei'
        )}
        , contact <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <h2>2. Ce face serviciul</h2>
      <p>
        Îți trimitem un mesaj înainte să-ți expire ITP-ul, RCA-ul sau rovinieta, pe baza
        datelor pe care ni le dai tu sau stația la care ai fost. Poți gestiona scadențele
        din cont și, la stațiile care au activat funcția, îți poți rezerva un interval
        pentru inspecție.
      </p>
      <p>
        Serviciul este gratuit pentru șoferi. Stațiile partenere plătesc un abonament, în
        condiții stabilite separat prin contract.
      </p>

      <h2>3. Contul tău</h2>
      <ul>
        <li>Datele pe care le introduci trebuie să fie corecte și ale tale.</li>
        <li>
          Ești responsabil de parola contului. Dacă bănuiești că cineva ți-a accesat contul,
          anunță-ne.
        </li>
        <li>
          Poți șterge contul oricând, din Setări. Ștergerea e definitivă după perioada de
          grație descrisă în{' '}
          <Link href="/politica-confidentialitate">politica de confidențialitate</Link>.
        </li>
        <li>Serviciul se adresează persoanelor de peste 18 ani.</li>
      </ul>

      <h2>4. Ce nu garantăm — citește acest punct</h2>
      <p>
        <strong>
          Obligația de a avea ITP, RCA și rovinietă valabile îți aparține în întregime.
        </strong>{' '}
        Reamintirea noastră este un ajutor, nu un substitut al propriei evidențe.
      </p>
      <p>
        Un SMS poate întârzia sau se poate pierde din motive care nu țin de noi: rețeaua
        operatorului de telefonie, numărul schimbat, telefonul oprit, mesajul filtrat.
        Datele pot fi greșite dacă au fost introduse greșit. Din aceste motive{' '}
        <strong>
          nu răspundem pentru amenzi, puncte de penalizare, refuzuri de despăgubire sau
          orice alt prejudiciu
        </strong>{' '}
        rezultat din netrimiterea, întârzierea sau conținutul greșit al unei notificări.
      </p>
      <p>
        Verifică întotdeauna documentele mașinii direct la sursă. Datele afișate în
        directorul public de stații sunt informative și pot fi neactualizate.
      </p>

      <h2>5. Mesajele și dezabonarea</h2>
      <p>
        Îți scriem doar dacă ți-ai dat acordul — al tău direct, sau cel dat stației care
        ne-a transmis datele. Fiecare SMS conține un link de dezabonare, iar folosirea lui
        ne oprește imediat și definitiv. Nu trimitem publicitate pentru terți.
      </p>

      <h2>6. Stațiile partenere — cine răspunde pentru datele clienților</h2>
      <p>
        Punctul acesta privește stațiile ITP care folosesc platforma, nu șoferii. Îl scriem
        aici fiindcă delimitarea îi interesează pe amândoi.
      </p>
      <p>
        <strong>
          Pentru datele pe care ni le transmite, stația este operatorul, iar uitdeITP
          împuternicitul care execută instrucțiunile ei.
        </strong>{' '}
        Se aplică indiferent de cale: terminalul din stație, programul propriu de gestiune
        sau o listă încărcată manual.
      </p>
      <p>Prin folosirea platformei, stația garantează și își asumă că:</p>
      <ul>
        <li>
          a obținut, înainte de transmitere, consimțământul valabil al fiecărei persoane
          pentru a fi contactată prin SMS, și poate dovedi acest lucru;
        </li>
        <li>
          datele transmise sunt corecte, actuale și obținute legal, iar numerele de telefon
          aparțin persoanelor indicate;
        </li>
        <li>
          nu încarcă liste cumpărate, colectate din surse publice sau preluate de la terți
          fără temei;
        </li>
        <li>
          ne anunță fără întârziere despre orice retragere de consimțământ ajunsă direct la
          ea;
        </li>
        <li>
          textele pe care le personalizează în șabloane respectă legea și nu transformă
          reamintirea în publicitate nesolicitată.
        </li>
      </ul>
      <p>
        <strong>
          Răspunderea pentru temeiul prelucrării acestor date aparține stației.
        </strong>{' '}
        Dacă o autoritate ne sancționează sau o persoană ne cheamă în judecată din cauza
        unor date transmise fără temei de o stație, stația ne despăgubește integral,
        inclusiv cheltuielile de apărare. Putem suspenda imediat trimiterile unei stații
        când avem indicii temeinice că această clauză e încălcată — și o facem, fiindcă
        alternativa e ca mesajele ei să ajungă la oameni care n-au cerut nimic.
      </p>
      <p>
        Ce rămâne în sarcina noastră: securitatea platformei, respectarea instrucțiunilor
        stației, dezabonarea funcțională în fiecare mesaj și transmiterea către stație a
        cererilor pe care le primim de la persoanele vizate.
      </p>

      <h2>7. Ce nu ai voie</h2>
      <ul>
        <li>Să introduci datele altcuiva fără acordul acelei persoane.</li>
        <li>
          Să încerci accesarea datelor altor utilizatori sau ale altor stații, ori să testezi
          securitatea platformei fără acordul nostru scris.
        </li>
        <li>Să extragi automat conținut din platformă sau să suprasoliciți serviciul.</li>
        <li>Să folosești serviciul pentru trimiterea de mesaje nesolicitate.</li>
      </ul>
      <p>
        Dacă găsești o vulnerabilitate, scrie-ne la{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Preferăm să
        aflăm de la tine.
      </p>

      <h2>8. Disponibilitate</h2>
      <p>
        Ne străduim ca serviciul să meargă continuu, dar pot exista întreruperi pentru
        mentenanță sau din cauze independente de noi. Putem modifica ori închide funcții,
        cu anunț prealabil când schimbarea e importantă.
      </p>

      <h2>9. Proprietate intelectuală</h2>
      <p>
        Platforma, numele și conținutul ei ne aparțin. Datele pe care le introduci rămân ale
        tale; ne dai doar dreptul de a le folosi pentru a-ți furniza serviciul.
      </p>

      <h2>10. Modificarea termenilor</h2>
      <p>
        Îi putem actualiza. Dacă schimbarea e semnificativă, te anunțăm din timp. Continuarea
        folosirii după notificare înseamnă acceptare; dacă nu ești de acord, poți închide
        contul.
      </p>

      <h2>11. Legea aplicabilă</h2>
      <p>
        Se aplică legea română. Neînțelegerile le rezolvăm întâi pe cale amiabilă; dacă nu
        reușim, competente sunt instanțele din România. Ca și consumator, îți păstrezi toate
        drepturile prevăzute de lege, inclusiv accesul la{' '}
        <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer">
          ANPC
        </a>{' '}
        și la platforma europeană{' '}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer"
        >
          SOL
        </a>
        .
      </p>
    </>
  );
}
