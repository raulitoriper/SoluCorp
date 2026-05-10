'use client';
import ReportPage from '@/components/ReportPage';

export default function OrderReportsPage() {
  return (
    <ReportPage
      title="Reporte de Pedidos"
      endpoint="/orders"
      filters={[
        { key: 'clientCode', label: 'Código Cliente' },
        { key: 'status', label: 'Estado', type: 'select', options: [
          { value: 'PENDING', label: 'Pendiente' }, { value: 'CONFIRMED', label: 'Confirmado' },
          { value: 'PROCESSING', label: 'En proceso' }, { value: 'DELIVERED', label: 'Entregado' },
          { value: 'CANCELLED', label: 'Cancelado' },
        ]},
      ]}
      columns={[
        { key: 'markedAt', label: 'Fecha', render: (v) => new Date(v).toLocaleString('es-PY') },
        { key: 'clientCode', label: 'Cliente' },
        { key: 'status', label: 'Estado' },
        { key: 'totalAmountGs', label: 'Total (₲)', render: (v) => `₲ ${(v || 0).toLocaleString('es-PY')}` },
        { key: 'items', label: 'Items', render: (v) => Array.isArray(v) ? v.length : 0 },
        { key: 'observation', label: 'Observación' },
      ]}
    />
  );
}
