import { describe, it, expect } from 'vitest';
import { parseContractA } from '@/lib/integrations/contract-a';
import { addDays } from 'date-fns';

const FUTURE = addDays(new Date(), 200).toISOString();

const rev3 = {
  versiune: 2,
  payload_rev: 3,
  inspectie: {
    expirare: FUTURE,
    data: '2026-08-01',
    rezultat: 'admis',
    deficiente: [{ cod: '1.1.1', text: 'uzura' }],
    warnings: ['w1'],
    valabilitate: 24,
  },
  vehicul: { numar_inmatriculare: 'CT-01-ABC', an_fabricatie: 2015 },
  masuratori: { co_mers_incet: 0.2, lambda: 1.01 },
  obfcm: { total_fuel_l: 1234, total_distance_km: 45678, test_time: 999 },
  diagnoza: { dtc_codes: ['P0420'] },
  telemetrie: { durata_totala_s: 610 },
  vehicul_extins: { cilindree: 1598, putere_kw: 85, co2_wltp: 120 },
  destinatar: { telefon: '0729440127', consimtamant_la: '2026-08-01T10:00:00Z' },
  statie_ref: { rar_code: 'CT0xx' },
};

describe('Contract A — payload revizia 3 de la SIRAR', () => {
  const parsed = parseContractA(rev3) as Record<string, any>;

  it('acceptă payload-ul fără eroare', () => {
    expect(parsed.payload_variant).toBe('full');
  });

  it('păstrează blocurile NOI de la rădăcină', () => {
    for (const bloc of ['masuratori', 'obfcm', 'diagnoza', 'telemetrie', 'vehicul_extins']) {
      expect(parsed[bloc], `blocul ${bloc}`).toBeDefined();
    }
  });

  it('păstrează câmpurile necunoscute de la rădăcină', () => {
    expect(parsed.payload_rev).toBe(3);
    expect(parsed.versiune).toBe(2);
  });

  // Zod taie implicit cheile necunoscute din obiectele imbricate, deci astea
  // ajungeau pe fir și dispăreau tăcut — fără 422, fără eroare. De aceea
  // blocurile imbricate au acum și ele .passthrough().
  it('păstrează câmpurile noi din interiorul lui `inspectie`', () => {
    expect(parsed.inspectie.deficiente).toHaveLength(1);
    expect(parsed.inspectie.warnings).toEqual(['w1']);
    expect(parsed.inspectie.valabilitate).toBe(24);
  });

  it('păstrează câmpurile noi din interiorul lui `vehicul`', () => {
    expect(parsed.vehicul.an_fabricatie).toBe(2015);
  });

  it('nu validează `versiune` — SIRAR poate face bump fără 422', () => {
    expect(() => parseContractA({ ...rev3, versiune: 3 })).not.toThrow();
  });
});
