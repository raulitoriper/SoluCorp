// Formateo para mercado paraguayo

export function formatGuarani(amount: number): string {
  return '₲ ' + amount.toLocaleString('es-PY');
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
