'use client';
import ReportPage from '@/components/ReportPage';

export default function AttendanceReportsPage() {
  return (
    <ReportPage
      title="Reporte de Asistencia"
      endpoint="/attendance"
      filters={[
        { key: 'employeeCode', label: 'Código Empleado' },
        { key: 'from', label: 'Desde', type: 'date' },
        { key: 'to', label: 'Hasta', type: 'date' },
      ]}
      columns={[
        { key: 'markedAt', label: 'Fecha/Hora', render: (v) => new Date(v).toLocaleString('es-PY') },
        { key: 'employeeCode', label: 'Empleado' },
        { key: 'eventCategory', label: 'Categoría', render: (v) => ({ PRESENCE: 'Presencia', BREAK: 'Descanso', LUNCH: 'Almuerzo' }[v as string] || v) },
        { key: 'eventAction', label: 'Acción', render: (v) => v === 'IN' ? 'Entrada' : 'Salida' },
        { key: 'observation', label: 'Observación' },
      ]}
    />
  );
}
