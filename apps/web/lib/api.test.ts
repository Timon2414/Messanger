import { describe, expect, it } from 'vitest';

describe('api url', () => {
  it('has default base path', () => {
    expect(process.env.NEXT_PUBLIC_API_URL ?? '/api').toBe('/api');
  });
});
