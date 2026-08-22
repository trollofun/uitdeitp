/**
 * Pachetele de credite și estimatorul de consum (PRD credite §3.3, §5).
 *
 * Pur, fără importuri de server: rulează și în pagina publică de prețuri
 * (fără cont), și în aplicație. Prețurile sunt FĂRĂ TVA și se afișează peste
 * tot ca „X € + TVA" — Gumroad (Merchant of Record) adaugă TVA-ul la checkout,
 * deci un „total cu TVA" afișat de noi n-ar fi determinist.
 *
 * ATENȚIE (două depozite de adevăr): nimic de aici nu ajunge în Gumroad.
 * Prețul plătit se configurează manual pe fiecare produs Gumroad; la orice
 * schimbare, modifică în AMBELE locuri.
 */

export interface CreditPackage {
  key: 'start' | 'standard' | 'pro';
  name: string;
  /** Preț în EUR, fără TVA. */
  priceEur: number;
  credits: number;
  /** SMS-uri standard — egal cu `credits` după rebazarea A1 (1 SMS = 1 credit). */
  approxSms: number;
  recommended?: boolean;
}

/**
 * Fără pachete sub 25 € — comisionul fix Gumroad le face neprofitabile.
 * După rebazarea A1 (1 credit = 1 SMS standard = 0,10 €), numărul de credite
 * ESTE numărul de SMS-uri standard — fără tildă, fără asterisc.
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  { key: 'start', name: 'Start', priceEur: 25, credits: 250, approxSms: 250 },
  { key: 'standard', name: 'Standard', priceEur: 50, credits: 500, approxSms: 500, recommended: true },
  { key: 'pro', name: 'Pro', priceEur: 100, credits: 1000, approxSms: 1000 },
];

export interface EstimatorParams {
  /** Ponderea clienților cu consimțământ de notificare. */
  consentRate: number;
  /** SMS-uri per client per ciclu (politica de remindere: 30 zile + 3 zile). */
  smsPerClient: number;
  /** Credite per SMS (1 segment, template prevalidat). */
  creditsPerSms: number;
  /** Banda de sezonalitate pentru durata afișată („~4–6 luni"). */
  seasonalityBand: number;
}

/**
 * Configurabili, nu hardcodați (PRD §5.3): valorile pot fi suprascrise prin
 * NEXT_PUBLIC_ESTIMATOR_PARAMS_JSON fără deploy de cod nou.
 */
export const DEFAULT_ESTIMATOR_PARAMS: EstimatorParams = {
  consentRate: 0.65,
  smsPerClient: 2,
  // 1 după rebazarea A1: un SMS standard (template prevalidat) = 1 credit.
  creditsPerSms: 1,
  seasonalityBand: 0.25,
};

export function estimatorParams(): EstimatorParams {
  const raw = process.env.NEXT_PUBLIC_ESTIMATOR_PARAMS_JSON;
  if (!raw) return DEFAULT_ESTIMATOR_PARAMS;
  try {
    return { ...DEFAULT_ESTIMATOR_PARAMS, ...(JSON.parse(raw) as Partial<EstimatorParams>) };
  } catch {
    return DEFAULT_ESTIMATOR_PARAMS;
  }
}

export interface Estimate {
  monthlyCredits: number;
  recommended: CreditPackage;
  /** Durata estimată, cu banda de sezonalitate aplicată (conservator). */
  durationMonths: { min: number; max: number };
  /** Costul lunar efectiv (preț pachet / durata medie), EUR fără TVA. */
  monthlyCostEur: number;
  /** true la volume mari — pachetul cel mai mare se termină sub ~3 luni. */
  needsRenewal: boolean;
}

/**
 * Formula PRD §5.3:
 *   consum_lunar = inspecții × rata_consimțământ × sms_per_client × credite_sms
 * Recomandarea: cel mai mic pachet care ține ≥3 luni; altfel cel mai mare.
 */
export function estimateConsumption(
  inspectionsPerMonth: number,
  params: EstimatorParams = DEFAULT_ESTIMATOR_PARAMS
): Estimate {
  const clients = inspectionsPerMonth * params.consentRate;
  const monthlyCredits = Math.round(clients * params.smsPerClient * params.creditsPerSms);

  const safeMonthly = Math.max(monthlyCredits, 1);
  const pick =
    CREDIT_PACKAGES.find((p) => p.credits / safeMonthly >= 3) ??
    CREDIT_PACKAGES[CREDIT_PACKAGES.length - 1];

  const nominal = pick.credits / safeMonthly;
  // Afișare conservatoare (PRD §5.3): capătul de jos e durata nominală, capătul
  // de sus presupune un sezon mai slab (consum −25%). La 100 inspecții/lună și
  // Standard: nominal 3,85 → afișat „~4–5 luni" (criteriul de acceptanță #7).
  const durationMonths = {
    min: roundHalf(nominal),
    max: roundHalf(nominal / (1 - params.seasonalityBand)),
  };

  return {
    monthlyCredits,
    recommended: pick,
    durationMonths,
    monthlyCostEur: Math.round((pick.priceEur / nominal) * 100) / 100,
    needsRenewal: nominal < 3,
  };
}

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}
