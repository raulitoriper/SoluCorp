'use client';
import ReportPage from '@/components/ReportPage';

export default function CourierReportsPage() {
  return (
    <ReportPage
      title="Reporte de Entregas"
      endpoint="/courier"
      filters={[
        { key: 'status', label: 'Estado', type: 'select', options: [
          { value: 'DELIVERED', label: 'Entregado' }, { value: 'NOT_DELIVERED', label: 'No Entregado' },
        ]},
      ]}
      columns={[
        { key: 'markedAt', label: 'Fecha', render: (v) => new Date(v).toLocaleString('es-PY') },
        { key: 'status', label: 'Estado', render: (v) => v === 'DELIVERED' ? 'Entregado' : 'No Entregado' },
        { key: 'receiverName', label: 'Receptor' },
        { key: 'motiveCode', label: 'Motivo' },
        { key: 'items', label: 'Paquetes', render: (v) => Array.isArray(v) ? v.length : 0 },
        { key: 'observation', label: 'Observación' },
      ]}
    />
  );
}
