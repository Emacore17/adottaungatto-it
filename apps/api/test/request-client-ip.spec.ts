import { resolveClientIp } from '../src/security/request-client-ip';

describe('resolveClientIp', () => {
  it('ignores forwarded headers when trusted proxy is disabled', () => {
    const clientIp = resolveClientIp(
      {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '198.51.100.10, 198.51.100.20',
          'x-real-ip': '198.51.100.30',
        },
      },
      false,
    );

    expect(clientIp).toBe('127.0.0.1');
  });

  it('uses the first forwarded IP when trusted proxy is enabled', () => {
    const clientIp = resolveClientIp(
      {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '198.51.100.10, 198.51.100.20',
        },
      },
      true,
    );

    expect(clientIp).toBe('198.51.100.10');
  });

  it('falls back to x-real-ip for trusted proxy requests when needed', () => {
    const clientIp = resolveClientIp(
      {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': ' , ',
          'x-real-ip': '198.51.100.30',
        },
      },
      true,
    );

    expect(clientIp).toBe('198.51.100.30');
  });

  it('returns null when no client IP is available', () => {
    const clientIp = resolveClientIp(
      {
        headers: {},
      },
      false,
    );

    expect(clientIp).toBeNull();
  });
});
