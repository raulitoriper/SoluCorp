'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { RiBuildingLine, RiGroupLine, RiGlobalLine, RiAlertLine } from 'react-icons/ri';

export default function DashboardPage() {
  const [stats, setStats] = useState({ companies: 0, users: 0, activeWorkers: 0, trialExpiring: 0 });
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    api.get('/companies').then((r) => {
      const data = r.data;
      setCompanies(data.slice(0, 10));
      setStats({
        companies: data.length,
        users: data.reduce((s: number, c: any) => s + (c._count?.users || 0), 0),
        activeWorkers: 0,
        trialExpiring: data.filter((c: any) => c.subscription?.status === 'DEMO').length,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { title: 'Empresas', value: stats.companies, icon: RiBuildingLine, color: 'bg-blue-500' },
    { title: 'Usuarios Totales', value: stats.users, icon: RiGroupLine, color: 'bg-green-500' },
    { title: 'Workers Activos', value: stats.activeWorkers, icon: RiGlobalLine, color: 'bg-purple-500' },
    { title: 'Trials por Vencer', value: stats.trialExpiring, icon: RiAlertLine, color: stats.trialExpiring > 0 ? 'bg-red-500' : 'bg-gray-400' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard - SoluCorp</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}><card.icon className="text-white" size={24} /></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold p-4 text-gray-800">Empresas Recientes</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Empresa</th>
                <th className="text-left p-3 text-gray-600">RUC</th>
                <th className="text-left p-3 text-gray-600">Plan</th>
                <th className="text-left p-3 text-gray-600">Estado</th>
                <th className="text-right p-3 text-gray-600">Usuarios</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c: any) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{c.name}</td>
                  <td className="p-3 text-gray-600">{c.ruc}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{c.subscription?.planType || 'N/A'}</span></td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.subscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : c.subscription?.status === 'DEMO' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {c.subscription?.status || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3 text-right">{c._count?.users || 0}</td>
                </tr>
              ))}
              {companies.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay empresas registradas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
