'use client';
import ReportPage from '@/components/ReportPage';
import { formatDateTime, formatGuarani } from '@solucorp/shared';

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
        { key: 'markedAt', label: 'Fecha', render: (v) => formatDateTime(v) },
        { key: 'clientCode', label: 'Cliente' },
        { key: 'status', label: 'Estado' },
        { key: 'totalAmountGs', label: 'Total (₲)', render: (v) => formatGuarani(v || 0) },
        { key: 'items', label: 'Items', render: (v) => Array.isArray(v) ? v.length : 0 },
        { key: 'observation', label: 'Observación' },
      ]}
    />
  );
}
