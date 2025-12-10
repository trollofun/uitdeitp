/**
 * Test data fixtures for E2E tests
 */

export const validPhoneNumbers = [
  '+40712345678',
  '0712345678',
  '40712345678',
  '712345678',
];

export const invalidPhoneNumbers = [
  '123',
  'abc',
  '+1234567890',
  '07123',
  '',
];

export const validPlateNumbers = [
  'B-123-ABC',
  'CT-456-DEF',
  'IF-789-GHI',
  'TM-012-JKL',
];

export const invalidPlateNumbers = [
  '123',
  'ABCDEF',
  'B-12-A',
  'B-1234-ABC',
];

export const testStation = {
  id: 'test-station',
  name: 'Test Station ITP',
  primaryColor: '#3B82F6',
  logo: '/test-logo.png',
  address: 'Str. Test, Nr. 123, București',
};

export const testVerificationCodes = {
  valid: '123456',
  invalid: '000000',
  expired: '999999',
};

export const testUsers = {
  validUser: {
    name: 'Ion Popescu',
    phone: '+40712345678',
    email: 'ion.popescu@test.com',
    plateNumber: 'B-123-ABC',
  },
  withoutPhone: {
    name: 'Maria Ionescu',
    phone: '',
    email: 'maria.ionescu@test.com',
    plateNumber: 'CT-456-DEF',
  },
  withoutEmail: {
    name: 'Andrei Marin',
    phone: '+40723456789',
    email: '',
    plateNumber: 'IF-789-GHI',
  },
};

export const getFutureDate = (monthsFromNow: number = 6): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toISOString().split('T')[0];
};

export const getPastDate = (monthsAgo: number = 1): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return date.toISOString().split('T')[0];
};
