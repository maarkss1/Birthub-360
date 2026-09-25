import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInit = vi.fn();
const mockScanStream = vi.fn();

vi.mock('clamscan', () => ({
  default: class FakeNodeClam {
    async init() {
      return mockInit();
    }
  },
}));

import { AntivirusUnavailableError, InfectedFileError, scanBufferForViruses } from './antivirus.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockInit.mockResolvedValue({ scanStream: mockScanStream });
});

describe('scanBufferForViruses', () => {
  it('resolves cleanly for a file with no viruses', async () => {
    mockScanStream.mockResolvedValue({ isInfected: false, viruses: [] });
    await expect(scanBufferForViruses(Buffer.from('hello'), 'doc.pdf')).resolves.toEqual({ clean: true });
  });

  it('rejects with InfectedFileError when the file is infected — never resolves', async () => {
    mockScanStream.mockResolvedValue({ isInfected: true, viruses: ['EICAR-Test-File'] });
    const error = await scanBufferForViruses(Buffer.from('bad'), 'doc.pdf').catch((e) => e);
    expect(error).toBeInstanceOf(InfectedFileError);
    expect(error.viruses).toEqual(['EICAR-Test-File']);
  });

  it('fails closed (AntivirusUnavailableError) when the scanner cannot be initialized', async () => {
    mockInit.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:3310'));
    const error = await scanBufferForViruses(Buffer.from('x'), 'doc.pdf').catch((e) => e);
    expect(error).toBeInstanceOf(AntivirusUnavailableError);
  });

  it('fails closed (AntivirusUnavailableError) when the scan itself throws, not silently accepted', async () => {
    mockScanStream.mockRejectedValue(new Error('socket hang up'));
    const error = await scanBufferForViruses(Buffer.from('x'), 'doc.pdf').catch((e) => e);
    expect(error).toBeInstanceOf(AntivirusUnavailableError);
  });

  it('fails closed when ClamAV returns an inconclusive (null) result instead of treating it as clean', async () => {
    mockScanStream.mockResolvedValue({ isInfected: null, viruses: [] });
    const error = await scanBufferForViruses(Buffer.from('x'), 'doc.pdf').catch((e) => e);
    expect(error).toBeInstanceOf(AntivirusUnavailableError);
  });
});
