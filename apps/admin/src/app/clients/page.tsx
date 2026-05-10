'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { RiAddLine, RiSearchLine, RiEyeLine } from 'react-icons/ri';

interface Company {
  id: string; name: string; ruc: string; city: string | null; isActive: boolean;
  subscription: { planType: string; status: string; trialEndsAt: string | null } | null;
  _count: { users: number; modules: number };
}

const STATUS_COLORS: Record<string, string> = {
  DEMO: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function ClientsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    api.get('/companies', { params: { search: search || undefined, status: statusFilter || undefined } })
      .then((r) => setCompanies(r.data)).catch(() => {});
  }, [search, statusFilter]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Empresas</h1>
          <button onClick={() => router.push('/clients/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <RiAddLine /> Nueva Empresa
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-800" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-4 py-2.5 text-gray-800">
            <option value="">Todos los estados</option>
            <option value="DEMO">Demo</option>
            <option value="ACTIVE">Activo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Empresa</th>
                <th className="text-left p-3 text-gray-600">RUC</th>
                <th className="text-left p-3 text-gray-600">Ciudad</th>
                <th className="text-left p-3 text-gray-600">Plan</th>
                <th className="text-center p-3 text-gray-600">Estado</th>
                <th className="text-right p-3 text-gray-600">Usuarios</th>
                <th className="text-right p-3 text-gray-600">Módulos</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/clients/${c.id}`)}>
                  <td className="p-3 font-medium text-gray-800">{c.name}</td>
                  <td className="p-3 font-mono text-gray-600">{c.ruc}</td>
                  <td className="p-3 text-gray-600">{c.city || '-'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{c.subscription?.planType || 'N/A'}</span></td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.subscription?.status || ''] || 'bg-gray-100'}`}>
                      {c.subscription?.status || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3 text-right">{c._count.users}</td>
                  <td className="p-3 text-right">{c._count.modules}</td>
                  <td className="p-3"><RiEyeLine className="text-blue-600" /></td>
                </tr>
              ))}
              {companies.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400">No hay empresas registradas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
