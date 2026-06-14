'use client';
import ReportPage from '@/components/ReportPage';
import { formatDateTime } from '@solucorp/shared';

export default function InventoryReportsPage() {
  return (
    <ReportPage
      title="Reporte de Inventario"
      endpoint="/inventory"
      filters={[
        { key: 'depositCode', label: 'Código Depósito' },
        { key: 'productCode', label: 'Código Producto' },
      ]}
      columns={[
        { key: 'markedAt', label: 'Fecha', render: (v) => formatDateTime(v) },
        { key: 'depositCode', label: 'Depósito' },
        { key: 'productCode', label: 'Producto' },
        { key: 'quantity', label: 'Cantidad' },
        { key: 'observation', label: 'Observación' },
      ]}
    />
  );
}
