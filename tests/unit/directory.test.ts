import { describe, it, expect } from 'vitest';
import { formatWorkingHours } from '@/lib/services/directory';

describe('formatWorkingHours', () => {
  it('grupează zilele consecutive cu același program', () => {
    // Șapte rânduri identice pe o fișă publică sunt zgomot, nu informație.
    const hours = {
      '1': [['08:00', '16:00']],
      '2': [['08:00', '16:00']],
      '3': [['08:00', '16:00']],
      '4': [['08:00', '16:00']],
      '5': [['08:00', '16:00']],
      '6': [],
      '7': [],
    };

    expect(formatWorkingHours(hours)).toEqual(['Luni–Vineri: 08:00-16:00']);
  });

  it('separă ziua cu program diferit', () => {
    const hours = {
      '1': [['08:00', '16:00']],
      '2': [['08:00', '16:00']],
      '3': [['08:00', '16:00']],
      '4': [['08:00', '16:00']],
      '5': [['08:00', '14:00']],
      '6': [],
      '7': [],
    };

    expect(formatWorkingHours(hours)).toEqual([
      'Luni–Joi: 08:00-16:00',
      'Vineri: 08:00-14:00',
    ]);
  });

  it('arată pauza ca două intervale, nu ca o coloană separată', () => {
    const hours = { '1': [['08:00', '12:00'], ['13:00', '17:00']] };
    expect(formatWorkingHours(hours)).toEqual(['Luni: 08:00-12:00, 13:00-17:00']);
  });

  it('o singură zi nu se scrie ca interval', () => {
    expect(formatWorkingHours({ '6': [['09:00', '13:00']] })).toEqual([
      'Sâmbătă: 09:00-13:00',
    ]);
  });

  it('zilele închise nu apar deloc', () => {
    const lines = formatWorkingHours({ '1': [['08:00', '16:00']], '6': [], '7': [] });
    expect(lines.join(' ')).not.toContain('Duminică');
  });

  it('nu se plânge de date stricate din jsonb', () => {
    // Coloana e `jsonb`: poate conține orice a scris cineva prin SQL.
    expect(formatWorkingHours(null)).toEqual([]);
    expect(formatWorkingHours({ '1': [['16:00', '08:00']] })).toEqual([]);
    expect(formatWorkingHours('luni-vineri')).toEqual([]);
  });
});
