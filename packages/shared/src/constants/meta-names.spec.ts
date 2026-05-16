import { META_TYPES, DEFAULT_META_TYPES } from './meta-names';

describe('META_TYPES', () => {
  it('no es undefined', () => {
    expect(META_TYPES).toBeDefined();
  });

  it('contiene al menos una clave', () => {
    expect(Object.keys(META_TYPES).length).toBeGreaterThan(0);
  });

  it('CLIENT tiene code y name correctos', () => {
    expect(META_TYPES.CLIENT.code).toBe('CLIENT');
    expect(META_TYPES.CLIENT.name).toBe('Cliente');
  });

  it('PRODUCT tiene code y name correctos', () => {
    expect(META_TYPES.PRODUCT.code).toBe('PRODUCT');
    expect(META_TYPES.PRODUCT.name).toBe('Producto');
  });

  it('MOTIVE existe con code MOTIVE', () => {
    expect(META_TYPES.MOTIVE.code).toBe('MOTIVE');
  });

  it('todos los valores tienen propiedades code y name de tipo string', () => {
    for (const entry of Object.values(META_TYPES)) {
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.name).toBe('string');
    }
  });
});

describe('DEFAULT_META_TYPES', () => {
  it('es un array no vacío', () => {
    expect(Array.isArray(DEFAULT_META_TYPES)).toBe(true);
    expect(DEFAULT_META_TYPES.length).toBeGreaterThan(0);
  });

  it('contiene la misma cantidad de elementos que META_TYPES', () => {
    expect(DEFAULT_META_TYPES.length).toBe(Object.keys(META_TYPES).length);
  });

  it('cada elemento tiene code y name', () => {
    for (const item of DEFAULT_META_TYPES) {
      expect(item).toHaveProperty('code');
      expect(item).toHaveProperty('name');
    }
  });
});
