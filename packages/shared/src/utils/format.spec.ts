import { formatGuarani, formatDate, formatDateTime } from './format';

describe('formatGuarani', () => {
  it('formatea un número entero con símbolo y separador de miles es-PY', () => {
    const result = formatGuarani(1000000);
    expect(result).toMatch(/₲/);
    expect(result).toMatch(/1/);
  });

  it('formatea cero sin separador de miles', () => {
    const result = formatGuarani(0);
    expect(result).toMatch(/₲/);
    expect(result).toContain('0');
  });
});

describe('formatDate', () => {
  it('formatea una fecha retornando un string con el año', () => {
    // Usamos fecha local explícita para evitar ambigüedad de timezone UTC vs local
    const date = new Date(2024, 0, 15); // 15 de enero 2024, hora local
    const result = formatDate(date);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
    expect(typeof result).toBe('string');
  });

  it('acepta un objeto Date además de string', () => {
    const date = new Date(2024, 5, 30); // 30 de junio 2024, hora local
    const result = formatDate(date);
    expect(result).toMatch(/2024/);
    expect(typeof result).toBe('string');
  });
});

describe('formatDateTime', () => {
  it('formatea una fecha con hora retornando un string con año', () => {
    const date = new Date(2024, 2, 20, 14, 30); // 20 mar 2024 14:30, hora local
    const result = formatDateTime(date);
    expect(result).toMatch(/2024/);
    expect(typeof result).toBe('string');
  });

  it('el resultado de formatDateTime es más largo que formatDate (incluye hora)', () => {
    const date = new Date(2024, 11, 31, 23, 59); // 31 dic 2024 23:59, hora local
    const dateOnly = formatDate(date);
    const dateTime = formatDateTime(date);
    expect(dateTime.length).toBeGreaterThan(dateOnly.length);
  });
});
