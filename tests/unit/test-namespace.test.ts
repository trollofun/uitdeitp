import { describe, it, expect } from 'vitest';
import { checkRarNamespace, isTestRarCode } from '@/lib/partner/test-namespace';

const LIVE = 'Academy (atestareitp) - claim provisioning + station lifecycle';
const STAGING = 'Academy (atestareitp) [staging] - flex.atestareitp.com, doar spatiul de test ZZ*';

describe('checkRarNamespace', () => {
  it('cheia de staging nu poate crea o stație reală', () => {
    // Ăsta e scenariul de care se temea Academy: un bug în staging-ul lor
    // provisionează o stație adevărată, fiindcă baza e comună.
    expect(checkRarNamespace(STAGING, 'CT060')?.code).toBe(
      'staging_key_outside_test_namespace'
    );
  });

  it('cheia de producție nu poate intra în spațiul de test', () => {
    // Direcția inversă contează la fel de mult: altfel o stație reală botezată
    // din greșeală ZZ01 ar fi ștearsă la prima curățenie.
    expect(checkRarNamespace(LIVE, 'ZZ01')?.code).toBe('live_key_inside_test_namespace');
  });

  it('lasă în pace perechile corecte', () => {
    expect(checkRarNamespace(LIVE, 'CT060')).toBeNull();
    expect(checkRarNamespace(STAGING, 'ZZ01')).toBeNull();
  });

  it('nu confundă un județ real care începe cu Z', () => {
    // Nu există județ „ZZ", dar există coduri de o literă. Prefixul trebuie să
    // fie exact ZZ, nu „începe cu Z".
    expect(isTestRarCode('Z10')).toBe(false);
    expect(isTestRarCode('ZZ10')).toBe(true);
  });

  it('nu se lasă păcălit de litere mici', () => {
    expect(isTestRarCode('zz01')).toBe(true);
    expect(checkRarNamespace(LIVE, 'zz01')?.code).toBe('live_key_inside_test_namespace');
  });
});
