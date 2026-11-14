import { sanitizeForAudit } from './sanitize';

describe('sanitizeForAudit', () => {
  it('elimina contraseñas y tokens a cualquier profundidad', () => {
    const out = sanitizeForAudit({
      email: 'a@b.c',
      password: 'x',
      nested: { refresh_token: 'y', passwordHash: 'z', keep: 1 },
      list: [{ accessToken: 't', ok: true }],
    });
    expect(out).toEqual({
      email: 'a@b.c',
      nested: { keep: 1 },
      list: [{ ok: true }],
    });
  });

  it('serializa BigInt y Date', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(sanitizeForAudit({ id: BigInt(5), at: d })).toEqual({
      id: '5',
      at: d.toISOString(),
    });
  });

  it('null/undefined → null', () => {
    expect(sanitizeForAudit(undefined)).toBeNull();
    expect(sanitizeForAudit(null)).toBeNull();
  });
});
