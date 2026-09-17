import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { Writable } from 'node:stream';

describe('Logger Redaction (Onda 18)', () => {
  it('redige campos sensíveis e headers de autorização/cookie/senhas no logger Pino', () => {
    let loggedOutput = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        loggedOutput += chunk.toString();
        callback();
      },
    });

    const testLogger = pino(
      {
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'password',
            'token',
            'accessToken',
            'refreshToken',
            'secret',
            'authorization',
            'cookie',
            '*.password',
            '*.token',
            '*.secret',
            '*.authorization',
            '*.cookie',
            '*.apiKey',
            '*.api_key',
          ],
          censor: '[REDACTED]',
        },
      },
      destination,
    );

    testLogger.info(
      {
        level: 30,
        route: '/api/login',
        method: 'POST',
        status: 200,
        duration: 45,
        requestId: 'req-123',
        password: 'super-secret-password-123',
        user: {
          password: 'nested-password',
          token: 'nested-token-xyz',
          apiKey: 'secret-api-key',
        },
        req: {
          headers: {
            authorization: 'Bearer secret-jwt-token',
            cookie: 'session=123456',
            'x-api-key': 'header-api-key',
          },
        },
      },
      'Test log message',
    );

    const parsed = JSON.parse(loggedOutput);

    // Campos operacionais devem estar preservados
    expect(parsed.route).toBe('/api/login');
    expect(parsed.method).toBe('POST');
    expect(parsed.status).toBe(200);
    expect(parsed.duration).toBe(45);
    expect(parsed.requestId).toBe('req-123');

    // Campos sensíveis devem estar redigidos
    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.user.password).toBe('[REDACTED]');
    expect(parsed.user.token).toBe('[REDACTED]');
    expect(parsed.user.apiKey).toBe('[REDACTED]');
    expect(parsed.req.headers.authorization).toBe('[REDACTED]');
    expect(parsed.req.headers.cookie).toBe('[REDACTED]');
    expect(parsed.req.headers['x-api-key']).toBe('[REDACTED]');

    // Confirmar que o texto cru das senhas e tokens não existe na string logada
    expect(loggedOutput).not.toContain('super-secret-password-123');
    expect(loggedOutput).not.toContain('nested-password');
    expect(loggedOutput).not.toContain('secret-jwt-token');
    expect(loggedOutput).not.toContain('header-api-key');
  });
});
