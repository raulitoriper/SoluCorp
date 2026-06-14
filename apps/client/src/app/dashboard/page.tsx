'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api, formatDateTime } from '@solucorp/shared';
import { RiWalkLine, RiShoppingCartLine, RiTimeLine, RiMapPinLine, RiTruckLine, RiArchiveLine } from 'react-icons/ri';

export default function DashboardPage() {
  const [stats, setStats] = useState({ visits: 0, orders: 0, attendance: 0, gpsActive: 0, courier: 0, inventory: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      api.get('/visits', { params: { from: today } }).catch(() => ({ data: [] })),
      api.get('/orders', { params: { from: today } }).catch(() => ({ data: [] })),
      api.get('/attendance', { params: { from: today } }).catch(() => ({ data: [] })),
      api.get('/courier').catch(() => ({ data: [] })),
      api.get('/inventory').catch(() => ({ data: [] })),
    ]).then(([visits, orders, attendance, courier, inventory]) => {
      setStats({
        visits: visits.data.length,
        orders: orders.data.length,
        attendance: attendance.data.length,
        gpsActive: 0,
        courier: courier.data.length,
        inventory: inventory.data.length,
      });
      setRecentVisits(visits.data.slice(0, 5));
    });
  }, []);

  const cards = [
    { title: 'Visitas Hoy', value: stats.visits, icon: RiWalkLine, color: 'bg-blue-500' },
    { title: 'Pedidos Hoy', value: stats.orders, icon: RiShoppingCartLine, color: 'bg-green-500' },
    { title: 'Asistencia Hoy', value: stats.attendance, icon: RiTimeLine, color: 'bg-purple-500' },
    { title: 'Entregas', value: stats.courier, icon: RiTruckLine, color: 'bg-orange-500' },
    { title: 'Inventarios', value: stats.inventory, icon: RiArchiveLine, color: 'bg-yellow-500' },
    { title: 'GPS Activos', value: stats.gpsActive, icon: RiMapPinLine, color: 'bg-indigo-500' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-2 rounded-lg`}><card.icon className="text-white" size={20} /></div>
              </div>
            </div>
          ))}
        </div>

        {recentVisits.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h2 className="text-lg font-semibold p-4 text-gray-800">Visitas Recientes</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-gray-600">Cliente</th>
                  <th className="text-left p-3 text-gray-600">Tipo</th>
                  <th className="text-left p-3 text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((v: any) => (
                  <tr key={v.id} className="border-b">
                    <td className="p-3 font-medium text-gray-800">{v.clientCode}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{v.eventType}</span></td>
                    <td className="p-3 text-gray-600">{formatDateTime(v.markedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentVisits.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-400">Los datos del dashboard se llenarán cuando los trabajadores usen la app móvil.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
