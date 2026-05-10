'use client';
import ReportPage from '@/components/ReportPage';

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
        { key: 'markedAt', label: 'Fecha', render: (v) => new Date(v).toLocaleString('es-PY') },
        { key: 'depositCode', label: 'Depósito' },
        { key: 'productCode', label: 'Producto' },
        { key: 'quantity', label: 'Cantidad' },
        { key: 'observation', label: 'Observación' },
      ]}
    />
  );
}
