/**
 * Spațiul rezervat pentru stațiile de test din ecosistem.
 *
 * **Contextul.** Academy ne-a întrebat direct dacă staging-ul nostru are bază
 * separată. Nu are: pe Vercel, `NEXT_PUBLIC_SUPABASE_URL` are aceeași valoare
 * pentru Production, Preview și Development. Deci un claim făcut din staging-ul
 * lor creează o stație reală în baza noastră reală — exact ce descriau ei la §0
 * despre baza lor.
 *
 * Concluzia lor era că, dacă e la fel la ambele capete, e mai cinstit să
 * convenim pe coduri RAR de test decât să ne prefacem că există izolare. De
 * acord — dar o convenție ținută minte de doi agenți se încalcă tăcut. Aici
 * devine regulă verificată la ușă:
 *
 *   - o cheie de staging poate provisiona **numai** coduri din spațiul de test;
 *   - o cheie de producție **nu poate** atinge spațiul de test.
 *
 * A doua direcție contează la fel de mult ca prima: fără ea, o stație reală
 * botezată din greșeală `ZZ01` ar fi ștearsă la prima curățenie.
 *
 * **De ce `ZZ`.** Codurile RAR reale încep cu abrevierea județului. `ZZ` nu e
 * județ, deci nu se poate ciocni cu nimic din realitate, și trece prin regexul
 * existent `^[A-Z]{1,2}[0-9]{2,4}$` fără să-l lărgim.
 */

/** Prefixul rezervat. Orice cod RAR care începe cu el e, prin definiție, de test. */
export const TEST_RAR_PREFIX = 'ZZ';

/** Eticheta cheilor de partener care au voie doar în spațiul de test. */
export const STAGING_KEY_MARKER = '[staging]';

export function isTestRarCode(rarCode: string): boolean {
  return rarCode.toUpperCase().startsWith(TEST_RAR_PREFIX);
}

/**
 * O cheie e „de staging" dacă eticheta ei o spune. Eticheta, nu prefixul cheii:
 * prefixul e vizibil în jurnale și în anteturi, deci ar face din clasificare
 * ceva ce se poate ghici din exterior.
 */
export function isStagingPartner(label: string): boolean {
  return label.toLowerCase().includes(STAGING_KEY_MARKER);
}

export interface NamespaceViolation {
  code: 'staging_key_outside_test_namespace' | 'live_key_inside_test_namespace';
  message: string;
}

export function checkRarNamespace(
  partnerLabel: string,
  rarCode: string
): NamespaceViolation | null {
  const staging = isStagingPartner(partnerLabel);
  const test = isTestRarCode(rarCode);

  if (staging && !test) {
    return {
      code: 'staging_key_outside_test_namespace',
      message: `Cheia de staging poate provisiona doar coduri RAR care încep cu ${TEST_RAR_PREFIX} (ex. ${TEST_RAR_PREFIX}01). Am primit ${rarCode}.`,
    };
  }

  if (!staging && test) {
    return {
      code: 'live_key_inside_test_namespace',
      message: `Prefixul ${TEST_RAR_PREFIX} e rezervat stațiilor de test și nu poate fi folosit cu o cheie de producție.`,
    };
  }

  return null;
}

/**
 * Prefixele către care are voie să trimită o stație de test.
 *
 * `+40700000` e intervalul folosit deja de cheia de staging a Academy, stabilit
 * de NotifyHub — îl refolosim ca să existe un singur interval de test în
 * ecosistem, nu trei care se contrazic.
 *
 * E a doua centură, nu prima: cheia stațiilor de test e oricum `sandbox`, deci
 * providerul nu e apelat niciodată. Prefixul dur acoperă cazul în care
 * sandbox-ul ar avea vreodată un defect.
 */
export const TEST_SMS_PREFIXES = ['+40700000'];
