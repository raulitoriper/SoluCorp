import { ROLES, ROLE_PLATFORM, PLAN_TYPES, SUBSCRIPTION_STATUSES } from './roles';

describe('ROLES', () => {
  it('no es undefined', () => {
    expect(ROLES).toBeDefined();
  });

  it('contiene SUPER_ADMIN', () => {
    expect(ROLES.SUPER_ADMIN).toBe('SUPER_ADMIN');
  });

  it('contiene COMPANY_ADMIN', () => {
    expect(ROLES.COMPANY_ADMIN).toBe('COMPANY_ADMIN');
  });

  it('contiene FIELD_WORKER', () => {
    expect(ROLES.FIELD_WORKER).toBe('FIELD_WORKER');
  });

  it('todos los valores son strings', () => {
    for (const value of Object.values(ROLES)) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('ROLE_PLATFORM', () => {
  it('no es undefined', () => {
    expect(ROLE_PLATFORM).toBeDefined();
  });

  it('SUPER_ADMIN tiene plataforma Portal Admin', () => {
    expect(ROLE_PLATFORM.SUPER_ADMIN).toBe('Portal Admin');
  });

  it('FIELD_WORKER tiene plataforma App Móvil', () => {
    expect(ROLE_PLATFORM.FIELD_WORKER).toBe('App Móvil');
  });
});

describe('PLAN_TYPES', () => {
  it('es un array no vacío', () => {
    expect(Array.isArray(PLAN_TYPES)).toBe(true);
    expect(PLAN_TYPES.length).toBeGreaterThan(0);
  });

  it('contiene STANDARD', () => {
    expect(PLAN_TYPES).toContain('STANDARD');
  });
});

describe('SUBSCRIPTION_STATUSES', () => {
  it('es un array no vacío', () => {
    expect(Array.isArray(SUBSCRIPTION_STATUSES)).toBe(true);
    expect(SUBSCRIPTION_STATUSES.length).toBeGreaterThan(0);
  });

  it('contiene ACTIVE', () => {
    expect(SUBSCRIPTION_STATUSES).toContain('ACTIVE');
  });
});
