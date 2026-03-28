import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok', () => {
    const c = new HealthController();
    expect(c.health().status).toBe('ok');
  });
});
