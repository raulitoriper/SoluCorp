'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { RiMapPinLine, RiRefreshLine } from 'react-icons/ri';
import dynamic from 'next/dynamic';

// Leaflet requiere import dinámico sin SSR
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-96 bg-gray-200 rounded-xl animate-pulse" /> });

interface WorkerPosition {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: string;
}

export default function MonitoringPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [positions, setPositions] = useState<WorkerPosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/companies').then((r) => setCompanies(r.data)).catch(() => {});
  }, []);

  const loadPositions = async (companyId: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Para monitoreo global necesitaríamos un endpoint admin específico
      // Por ahora mostramos el mapa con las empresas disponibles
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedCompany) loadPositions(selectedCompany); }, [selectedCompany]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Monitoreo Global</h1>
          <div className="flex gap-3">
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="border rounded-lg px-4 py-2 text-gray-800">
              <option value="">Seleccionar empresa...</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => loadPositions(selectedCompany)} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
              <RiRefreshLine className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Empresas Activas</p>
            <p className="text-3xl font-bold text-gray-800">{companies.filter((c: any) => c.subscription?.status === 'ACTIVE' || c.subscription?.status === 'DEMO').length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Workers con GPS</p>
            <p className="text-3xl font-bold text-blue-600">{positions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Total Empresas</p>
            <p className="text-3xl font-bold text-gray-800">{companies.length}</p>
          </div>
        </div>

        {/* Mapa */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <RiMapPinLine className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Mapa de Trabajadores</h2>
          </div>
          <MapView positions={positions} height="500px" />
        </div>

        {!selectedCompany && (
          <div className="text-center text-gray-400 py-8">Seleccione una empresa para ver las posiciones GPS de sus trabajadores en el mapa.</div>
        )}
      </div>
    </AppLayout>
  );
}
