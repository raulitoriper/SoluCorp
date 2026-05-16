import { SERVICE_CODES, SERVICE_MODULES, SERVICE_LABELS } from './service-codes';

describe('SERVICE_CODES', () => {
  it('no es undefined', () => {
    expect(SERVICE_CODES).toBeDefined();
  });

  it('contiene al menos una clave', () => {
    expect(Object.keys(SERVICE_CODES).length).toBeGreaterThan(0);
  });

  it('VISITS tiene valor numérico 1', () => {
    expect(SERVICE_CODES.VISITS).toBe(1);
  });

  it('INVENTORY tiene valor numérico 10', () => {
    expect(SERVICE_CODES.INVENTORY).toBe(10);
  });

  it('todos los valores son números', () => {
    for (const value of Object.values(SERVICE_CODES)) {
      expect(typeof value).toBe('number');
    }
  });
});

describe('SERVICE_MODULES', () => {
  it('es un array no vacío', () => {
    expect(Array.isArray(SERVICE_MODULES)).toBe(true);
    expect(SERVICE_MODULES.length).toBeGreaterThan(0);
  });

  it('todos los elementos son strings', () => {
    for (const item of SERVICE_MODULES) {
      expect(typeof item).toBe('string');
    }
  });

  it('contiene VISITS', () => {
    expect(SERVICE_MODULES).toContain('VISITS');
  });
});

describe('SERVICE_LABELS', () => {
  it('no es undefined', () => {
    expect(SERVICE_LABELS).toBeDefined();
  });

  it('contiene label para VISITS', () => {
    expect(SERVICE_LABELS.VISITS).toBe('Visitas');
  });

  it('contiene label para ATTENDANCE', () => {
    expect(SERVICE_LABELS.ATTENDANCE).toBe('Asistencia');
  });
});
