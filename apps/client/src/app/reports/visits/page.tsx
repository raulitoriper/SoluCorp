'use client';
import ReportPage from '@/components/ReportPage';
import { formatDateTime } from '@solucorp/shared';

export default function VisitReportsPage() {
  return (
    <ReportPage
      title="Reporte de Visitas"
      endpoint="/visits"
      filters={[
        { key: 'clientCode', label: 'Código Cliente' },
        { key: 'from', label: 'Desde', type: 'date' },
        { key: 'to', label: 'Hasta', type: 'date' },
      ]}
      columns={[
        { key: 'markedAt', label: 'Fecha/Hora', render: (v) => formatDateTime(v) },
        { key: 'clientCode', label: 'Cliente' },
        { key: 'eventType', label: 'Tipo', render: (v) => ({ START: 'Inicio', END: 'Fin', QUICK: 'Rápida' }[v as string] || v) },
        { key: 'motiveCode', label: 'Motivo' },
        { key: 'observation', label: 'Observación' },
        { key: 'latitude', label: 'GPS', render: (v, row) => v ? `${Number(v).toFixed(4)}, ${Number(row.longitude).toFixed(4)}` : '-' },
      ]}
    />
  );
}
