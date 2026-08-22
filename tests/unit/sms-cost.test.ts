/**
 * Suita comună a motorului de tarifare (PRD credite §6.1, criteriile #1, #3,
 * #7, #8). Aceleași funcții rulează în client și pe server — suita asta e
 * contractul dintre ele.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSmsCost,
  computeCostForMessages,
  creditsToEur,
  stripToGsm7,
  CREDITS_BY_SEGMENTS,
} from '@/lib/pricing/sms-cost';
import { estimateConsumption, CREDIT_PACKAGES, DEFAULT_ESTIMATOR_PARAMS } from '@/lib/pricing/packages';

const gsm = (n: number) => 'a'.repeat(n);
const ucs = (n: number) => 'ă' + 'a'.repeat(n - 1); // un singur „ă" comută tot mesajul

describe('computeSmsCost — praguri exacte (criteriul #8)', () => {
  it.each([
    // [text, segments, credits, encoding]
    [gsm(1), 1, 1, 'GSM-7'],
    [gsm(160), 1, 1, 'GSM-7'],
    [gsm(161), 2, 2, 'GSM-7'],
    [gsm(306), 2, 2, 'GSM-7'],
    [gsm(307), 3, 3, 'GSM-7'],
    [gsm(459), 3, 3, 'GSM-7'],
    [ucs(70), 1, 1, 'UCS-2'],
    [ucs(71), 2, 2, 'UCS-2'],
    [ucs(134), 2, 2, 'UCS-2'],
    [ucs(135), 3, 3, 'UCS-2'],
    [ucs(201), 3, 3, 'UCS-2'],
  ] as const)('lungime %#: %s segmente / %s credite', (text, segments, credits, encoding) => {
    const cost = computeSmsCost(text);
    expect(cost.segments).toBe(segments);
    expect(cost.credits).toBe(credits);
    expect(cost.encoding).toBe(encoding);
    expect(cost.blocked).toBe(false);
  });

  it('460 caractere GSM-7 → blocat (4 segmente nu se trimit)', () => {
    const cost = computeSmsCost(gsm(460));
    expect(cost.blocked).toBe(true);
    expect(cost.credits).toBe(0);
  });

  it('202 caractere cu diacritice → blocat', () => {
    expect(computeSmsCost(ucs(202)).blocked).toBe(true);
  });

  it('mesaj gol → 1 segment, 1 credit (validarea de gol e în altă parte)', () => {
    const cost = computeSmsCost('');
    expect(cost.segments).toBe(1);
    expect(cost.blocked).toBe(false);
  });
});

describe('computeSmsCost — declanșatori (criteriul #1)', () => {
  it('un singur „ă" într-un mesaj de 96 comută pe UCS-2: 1→2 SMS, 1→2 credite', () => {
    const clean = gsm(96);
    const withDiacritic = 'ă' + gsm(95);

    expect(computeSmsCost(clean)).toMatchObject({ segments: 1, credits: 1 });
    const after = computeSmsCost(withDiacritic);
    expect(after).toMatchObject({ segments: 2, credits: 2, encoding: 'UCS-2' });

    // Declanșatorul e numit și poziționat, pentru evidențierea inline.
    expect(after.triggers).toEqual([{ char: 'ă', kind: 'ucs2', positions: [0] }]);
  });

  it('caracterele extinse GSM (€ [ ] ~) contează dublu și sunt raportate', () => {
    const cost = computeSmsCost(gsm(159) + '€');
    expect(cost.chars).toBe(161); // 159 + 2 septeți pentru €
    expect(cost.segments).toBe(2);
    expect(cost.triggers).toEqual([{ char: '€', kind: 'extended', positions: [159] }]);
  });

  it('emoji forțează UCS-2 și ocupă 2 unități', () => {
    const cost = computeSmsCost('Salut 😀');
    expect(cost.encoding).toBe('UCS-2');
    expect(cost.chars).toBe(8); // 6 + surrogate pair
    expect(cost.triggers[0]).toMatchObject({ char: '😀', kind: 'ucs2' });
  });

  it('pe UCS-2, extended-urile nu mai sunt declanșatori (totul costă la fel)', () => {
    const cost = computeSmsCost('preț: 10€');
    expect(cost.encoding).toBe('UCS-2');
    expect(cost.triggers.every((t) => t.kind === 'ucs2')).toBe(true);
  });

  it('toate pozițiile aceluiași caracter sunt raportate', () => {
    const cost = computeSmsCost('țară țintă');
    const tz = cost.triggers.find((t) => t.char === 'ț');
    expect(tz?.positions).toEqual([0, 5]);
  });
});

describe('transliterarea (criteriul #2 — butonul „Scrie fără diacritice")', () => {
  it('tabelul fix: ă/â→a, î→i, ș/ț→s/t, plus majusculele', () => {
    expect(stripToGsm7('ăâîșț ĂÂÎȘȚ')).toBe('aaist AAIST');
  });

  it('reduce costul: mesajul de 96 cu diacritice revine la 1 SMS / 1 credit', () => {
    const expensive = 'ă' + gsm(95);
    expect(computeSmsCost(expensive).credits).toBe(2);
    expect(computeSmsCost(stripToGsm7(expensive)).credits).toBe(1);
  });

  it('ghilimelele tipografice și liniuțele lungi se transliterează și ele', () => {
    expect(computeSmsCost(stripToGsm7('„test" – gata')).encoding).toBe('GSM-7');
  });
});

describe('computeCostForMessages — defalcarea per destinatar (criteriul #3)', () => {
  it('139 × 1 segment + 4 × 2 segmente = 139 + 8 = 147 credite', () => {
    const messages = [
      ...Array.from({ length: 139 }, () => gsm(100)),
      ...Array.from({ length: 4 }, () => gsm(200)),
    ];
    const breakdown = computeCostForMessages(messages);

    expect(breakdown.byCredits.get(1)).toBe(139);
    expect(breakdown.byCredits.get(2)).toBe(4);
    expect(breakdown.totalCredits).toBe(147);
    expect(breakdown.blockedRecipients).toEqual([]);
  });

  it('destinatarii blocați sunt numiți, nu tarifați', () => {
    const breakdown = computeCostForMessages([gsm(100), gsm(500), gsm(100)]);
    expect(breakdown.blockedRecipients).toEqual([1]);
    expect(breakdown.totalCredits).toBe(2);
  });
});

describe('valoarea creditului', () => {
  it('1 credit = 0,10 € — maparea 1/2/3 dă 0,10 / 0,20 / 0,30 €', () => {
    // Rebazarea A1: 1 SMS standard costă exact la fel ca înainte (0,10 €);
    // multipart-ul urmărește liniar costul per parte, nu mai e subvenționat.
    expect(creditsToEur(CREDITS_BY_SEGMENTS[1])).toBe(0.1);
    expect(creditsToEur(CREDITS_BY_SEGMENTS[2])).toBe(0.2);
    expect(creditsToEur(CREDITS_BY_SEGMENTS[3])).toBe(0.3);
  });
});

describe('estimatorul (PRD §5, criteriul #7)', () => {
  it('100 inspecții/lună → 130 credite/lună, recomandă Standard, durată în 4–6 luni', () => {
    const e = estimateConsumption(100, DEFAULT_ESTIMATOR_PARAMS);
    expect(e.monthlyCredits).toBe(130);
    expect(e.recommended.key).toBe('standard');
    expect(e.durationMonths.min).toBeGreaterThanOrEqual(4);
    expect(e.durationMonths.max).toBeLessThanOrEqual(6);
  });

  it('50 → Start, 200 → Pro, 300 → Pro cu reîncărcare', () => {
    expect(estimateConsumption(50).recommended.key).toBe('start');
    expect(estimateConsumption(200).recommended.key).toBe('pro');
    const heavy = estimateConsumption(300);
    expect(heavy.recommended.key).toBe('pro');
    expect(heavy.needsRenewal).toBe(true);
  });

  it('niciun pachet sub 25 € (comisionul fix Gumroad)', () => {
    expect(Math.min(...CREDIT_PACKAGES.map((p) => p.priceEur))).toBeGreaterThanOrEqual(25);
  });
});
