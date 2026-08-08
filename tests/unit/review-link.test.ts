import { describe, it, expect } from 'vitest';
import { checkReviewLink } from '@/lib/services/review-link';

describe('checkReviewLink — acceptă formele reale Google', () => {
  it.each([
    'https://g.page/r/CQxyzAbCdEfGhI/review',
    'https://search.google.com/local/writereview?placeid=ChIJabc123',
    'https://maps.app.goo.gl/aBcDeFgH',
    'https://www.google.com/maps/place/Euro+Auto+Service/@44.1,28.6,17z',
    'https://google.ro/maps/place/Statie+ITP',
  ])('%s', (link) => {
    expect(checkReviewLink(link).ok).toBe(true);
  });
});

describe('checkReviewLink — respinge ce eșuează tăcut', () => {
  it('shortenerele, pentru că expiră sau se redirecționează oriunde', () => {
    const result = checkReviewLink('https://shorturl.at/abc123');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('shorturl.at');
  });

  it('linkul de căutare Google — greșeala cea mai frecventă', () => {
    const result = checkReviewLink('https://www.google.com/search?q=itp+constanta');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('link de căutare');
    // Eroarea trebuie să spună și cum se repară, nu doar că e greșit.
    expect(result.error).toContain('Distribuie');
  });

  it('alte domenii', () => {
    expect(checkReviewLink('https://facebook.com/statia-mea').ok).toBe(false);
  });

  it('http simplu', () => {
    const result = checkReviewLink('http://g.page/r/CQabc/review');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('https');
  });

  it('text care nu e URL', () => {
    expect(checkReviewLink('cauta-ne pe google').ok).toBe(false);
  });

  it('gol', () => {
    expect(checkReviewLink('   ').ok).toBe(false);
  });
});

describe('checkReviewLink — normalizare', () => {
  it('taie spațiile din jur', () => {
    const result = checkReviewLink('  https://g.page/r/CQabc/review  ');
    expect(result.ok).toBe(true);
    expect(result.normalized).toBe('https://g.page/r/CQabc/review');
  });

  it('scoate parametrii de urmărire adăugați de aplicația Maps', () => {
    const result = checkReviewLink(
      'https://maps.app.goo.gl/aBcDeFgH?utm_source=mstt_1&utm_medium=share'
    );
    expect(result.ok).toBe(true);
    expect(result.normalized).not.toContain('utm_');
  });
});
