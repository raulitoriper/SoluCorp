'use client';
import { useEffect, useState } from 'react';
import AppLayout from './layout/AppLayout';
import api from '@/lib/api';
import { RiSearchLine, RiDownloadLine } from 'react-icons/ri';

interface Column { key: string; label: string; render?: (val: any, row: any) => React.ReactNode; }

interface Props {
  title: string;
  endpoint: string;
  columns: Column[];
  filters?: { key: string; label: string; type?: 'text' | 'date' | 'select'; options?: { value: string; label: string }[] }[];
}

export default function ReportPage({ title, endpoint, columns, filters = [] }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const loadData = () => {
    setLoading(true);
    const params: any = {};
    for (const [k, v] of Object.entries(filterValues)) { if (v) params[k] = v; }
    api.get(endpoint, { params }).then((r) => setData(r.data)).catch(() => setData([])).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filterValues]);

  const exportCSV = () => {
    const headers = columns.map((c) => c.label).join(',');
    const rows = data.map((row) => columns.map((c) => JSON.stringify(row[c.key] ?? '')).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <button onClick={exportCSV} disabled={data.length === 0} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
            <RiDownloadLine /> Exportar CSV
          </button>
        </div>

        {filters.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 flex-wrap">
            {filters.map((f) => (
              <div key={f.key} className="min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select value={filterValues[f.key] || ''} onChange={(e) => setFilterValues({ ...filterValues, [f.key]: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800">
                    <option value="">Todos</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} value={filterValues[f.key] || ''} onChange={(e) => setFilterValues({ ...filterValues, [f.key]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800" placeholder={f.label} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-3 text-sm text-gray-500">
          {loading ? 'Cargando...' : `${data.length} registros encontrados`}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{columns.map((c) => <th key={c.key} className="text-left p-3 text-gray-600">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id || i} className="border-b hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="p-3 text-gray-800">{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '-')}</td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && !loading && <tr><td colSpan={columns.length} className="p-8 text-center text-gray-400">Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
