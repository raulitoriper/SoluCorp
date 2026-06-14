'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@solucorp/shared';
import { RiRefreshLine, RiMapPinLine } from 'react-icons/ri';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-[600px] bg-gray-200 rounded-xl animate-pulse" /> });

export default function LiveMapPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/gps/last-positions');
      setPositions(Array.isArray(data) ? data : []);
    } catch { setPositions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPositions(); }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><RiMapPinLine className="text-green-600" /> Mapa en Vivo</h1>
          <button onClick={loadPositions} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500">Trabajadores en Mapa</p>
            <p className="text-2xl font-bold text-green-600">{positions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500">Última Actualización</p>
            <p className="text-sm font-medium text-gray-800">{new Date().toLocaleTimeString('es-PY')}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500">Auto-refresh</p>
            <p className="text-sm font-medium text-gray-800">Cada 30 segundos</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <MapView positions={positions} height="600px" />
        </div>

        {positions.length === 0 && (
          <div className="text-center text-gray-400 py-4">No hay posiciones GPS registradas aún. Los trabajadores deben usar la app móvil con el módulo de GPS activo.</div>
        )}
      </div>
    </AppLayout>
  );
}
