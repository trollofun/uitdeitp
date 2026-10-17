import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncOptOutToEam } from '@/lib/services/eam-sync';

describe('syncOptOutToEam — calea spre EAM', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}), text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    process.env.EAM_API_KEY = 'test-key';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EAM_API_URL;
    delete process.env.EAM_API_KEY;
  });

  it.each([
    'https://eam.example.ro',
    'https://eam.example.ro/',
    'https://eam.example.ro/api/v1',
    'https://eam.example.ro/api/v1/',
  ])('cheamă /api/v1/clients/... o singură dată pentru %s', async (url) => {
    process.env.EAM_API_URL = url;
    await syncOptOutToEam('+40712000000');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://eam.example.ro/api/v1/clients/%2B40712000000/consents'
    );
  });

  it('trimite un User-Agent propriu și cheia Bearer', async () => {
    process.env.EAM_API_URL = 'https://eam.example.ro/api/v1';
    await syncOptOutToEam('+40712000000');
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('PATCH');
    expect(init.headers['User-Agent']).toBe('uitdeITP-ContractB/1.0');
    expect(init.headers['Authorization']).toBe('Bearer test-key');
  });

  it('fără variabile nu apelează EAM', async () => {
    delete process.env.EAM_API_KEY;
    await syncOptOutToEam('+40712000000');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
