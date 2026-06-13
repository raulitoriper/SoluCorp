'use client';
import ReportPage from '@/components/ReportPage';
import { formatDateTime } from '@solucorp/shared';

export default function GuardReportsPage() {
  return (
    <ReportPage
      title="Reporte de Guardia"
      endpoint="/guard-shifts"
      filters={[
        { key: 'guardCode', label: 'Código Guardia' },
        { key: 'from', label: 'Desde', type: 'date' },
        { key: 'to', label: 'Hasta', type: 'date' },
      ]}
      columns={[
        { key: 'markedAt', label: 'Fecha/Hora', render: (v) => formatDateTime(v) },
        { key: 'guardCode', label: 'Guardia' },
        { key: 'eventType', label: 'Tipo', render: (v) => ({ SHIFT_START: 'Inicio Turno', SHIFT_END: 'Fin Turno', MARK: 'Ronda' }[v as string] || v) },
        { key: 'place', label: 'Lugar' },
        { key: 'observation', label: 'Observación' },
        { key: 'latitude', label: 'GPS', render: (v, row) => v ? `${Number(v).toFixed(4)}, ${Number(row.longitude).toFixed(4)}` : '-' },
      ]}
    />
  );
}
