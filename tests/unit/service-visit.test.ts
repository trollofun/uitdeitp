import { describe, it, expect } from 'vitest';
import { toServiceVisit, parseOdometer, isPlausibleVin } from '@/lib/integrations/service-visit';

const base = {
  stationId: 'st-1',
  reminderId: null,
  plateNumber: 'CT30LLE',
  externalRef: 'ev-1',
};

describe('parseOdometer', () => {
  it('acceptă numere', () => {
    expect(parseOdometer(123456)).toBe(123456);
    expect(parseOdometer(0)).toBe(0);
  });

  it('curăță textul cum vine din OCR', () => {
    expect(parseOdometer('123.456 km')).toBe(123456);
    expect(parseOdometer('123 456')).toBe(123456);
  });

  it('aruncă valorile absurde în loc să le stocheze', () => {
    // Un raport pe rulaj construit peste o citire greșită de OCR e mai rău
    // decât unul cu o valoare lipsă.
    expect(parseOdometer(9_000_000)).toBeNull();
    expect(parseOdometer(-5)).toBeNull();
  });

  it('întoarce null pentru ce nu poate citi', () => {
    expect(parseOdometer(undefined)).toBeNull();
    expect(parseOdometer('necunoscut')).toBeNull();
    expect(parseOdometer({})).toBeNull();
  });
});

describe('isPlausibleVin', () => {
  it('acceptă un VIN real', () => {
    expect(isPlausibleVin('WVWZZZ1JZ3W386752')).toBe(true);
  });

  it('respinge lungimea greșită', () => {
    expect(isPlausibleVin('WVWZZZ1JZ3W38675')).toBe(false);
  });

  it('respinge I, O și Q — nu apar în VIN-uri, tocmai ca să nu se confunde cu 1 și 0', () => {
    expect(isPlausibleVin('WVWZZZ1JZ3W3867I2')).toBe(false);
    expect(isPlausibleVin('WVWZZZ1JZ3W3867O2')).toBe(false);
    expect(isPlausibleVin('WVWZZZ1JZ3W3867Q2')).toBe(false);
  });
});

describe('toServiceVisit', () => {
  it('extrage inspecția fără să depindă de blocurile opționale', () => {
    const visit = toServiceVisit({
      ...base,
      payload: {
        inspectie: {
          data: '2026-08-09',
          expirare: '2027-08-09',
          rezultat: 'admis',
          serie_certificat: 'AB123',
        },
        vehicul: { numar_inmatriculare: 'CT30LLE' },
      },
    });

    expect(visit).toMatchObject({
      visited_at: '2026-08-09',
      expires_at: '2027-08-09',
      result: 'passed',
      certificate_series: 'AB123',
      vin: null,
      odometer_km: null,
    });
  });

  it('recunoaște respingerea, deși SIRAR nu o trimite azi', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { inspectie: { rezultat: 'respins' }, vehicul: {} },
    });
    expect(visit.result).toBe('rejected');
  });

  it('păstrează blocurile tehnice întregi, inclusiv pe cele necunoscute', () => {
    // O schemă rigidă ar cere migrare la fiecare revizie SIRAR, iar despachetarea
    // selectivă ar arunca tăcut exact ce nu cunoaștem încă.
    const visit = toServiceVisit({
      ...base,
      payload: {
        inspectie: { deficiente: ['frana stanga'], valabilitate: 24 },
        vehicul: {},
        masuratori: { co: 0.02 },
        obfcm: { total_fuel_l: 1200 },
        diagnoza: { dtc_codes: ['P0420'] },
        vehicul_extins: { an_fabricatie: 2015 },
      },
    });

    expect(visit.technical).toMatchObject({
      masuratori: { co: 0.02 },
      obfcm: { total_fuel_l: 1200 },
      diagnoza: { dtc_codes: ['P0420'] },
      vehicul_extins: { an_fabricatie: 2015 },
      deficiente: ['frana stanga'],
      valabilitate: 24,
    });
  });

  it('citește VIN-ul din oricare din cele trei locuri posibile', () => {
    // SIRAR nu-l trimite încă. Codul e pregătit pentru ziua în care îl adaugă,
    // oriunde l-ar pune.
    const vin = 'WVWZZZ1JZ3W386752';

    for (const payload of [
      { vehicul_extins: { vin }, vehicul: {}, inspectie: {} },
      { vehicul: { vin }, inspectie: {} },
      { vin, vehicul: {}, inspectie: {} },
    ]) {
      expect(toServiceVisit({ ...base, payload }).vin).toBe(vin);
    }
  });

  it('refuză un VIN care nu poate fi VIN', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { vehicul: { vin: 'NU-E-VIN' }, inspectie: {} },
    });
    expect(visit.vin).toBeNull();
  });

  it('ia odometrul din blocul dedicat', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { inspectie: {}, vehicul: {}, odometru: { actual_km: 145_000 } },
    });
    expect(visit.odometer_km).toBe(145_000);
  });

  it('folosește ziua de azi când inspecția n-are dată', () => {
    const visit = toServiceVisit({ ...base, payload: { inspectie: {}, vehicul: {} } });
    expect(visit.visited_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
