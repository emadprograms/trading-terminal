import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage } from './api-utils';

describe('sanitizeErrorMessage', () => {
  it('should strip localhost URLs', () => {
    const error = 'Failed to connect to http://localhost:3000/api/proxy';
    const sanitized = sanitizeErrorMessage(error);
    expect(sanitized).not.toContain('localhost');
    expect(sanitized).not.toContain('http://');
  });

  it('should strip Vercel proxy URLs', () => {
    const error = 'Error from https://tt-proxy-emad.vercel.app/order/v1';
    const sanitized = sanitizeErrorMessage(error);
    expect(sanitized).not.toContain('vercel.app');
  });

  it('should strip generic URLs aggressively', () => {
    const error = 'Internal error at https://api-internal.trading-terminal.internal/v1/resource';
    const sanitized = sanitizeErrorMessage(error);
    expect(sanitized).not.toContain('api-internal');
    expect(sanitized).not.toContain('trading-terminal.internal');
  });

  it('should redact sensitive headers', () => {
    const error = 'Missing header CST: some-token-value';
    const sanitized = sanitizeErrorMessage(error);
    expect(sanitized).toContain('CST: [REDACTED]');
    expect(sanitized).not.toContain('some-token-value');
  });

  it('should handle non-string errors', () => {
    const error = { response: { body: { message: 'API Error' } } };
    expect(sanitizeErrorMessage(error)).toBe('API Error');
  });

  it('should return fallback for empty errors', () => {
    expect(sanitizeErrorMessage({})).toBe('An unexpected error occurred');
  });
});
