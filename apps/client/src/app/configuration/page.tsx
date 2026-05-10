'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/stores/auth-store';
import { RiSettings3Line } from 'react-icons/ri';

export default function ConfigurationPage() {
  const { user } = useAuthStore();

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><RiSettings3Line /> Perfil de Empresa</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Empresa:</span> <span className="font-medium text-gray-800 ml-2">{user?.companyName || '-'}</span></div>
            <div><span className="text-gray-500">Administrador:</span> <span className="font-medium text-gray-800 ml-2">{user?.firstName} {user?.lastName}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-800 ml-2">{user?.email}</span></div>
            <div><span className="text-gray-500">Rol:</span> <span className="font-medium text-gray-800 ml-2">Administrador de Empresa</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuración General</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b">
              <div><p className="font-medium text-gray-800">Zona horaria</p><p className="text-gray-400">America/Asuncion</p></div>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div><p className="font-medium text-gray-800">Moneda</p><p className="text-gray-400">Guaraníes (PYG)</p></div>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div><p className="font-medium text-gray-800">Intervalo GPS Tracking</p><p className="text-gray-400">5 minutos (300000ms)</p></div>
            </div>
            <div className="flex justify-between items-center py-2">
              <div><p className="font-medium text-gray-800">Modo Offline</p><p className="text-gray-400">Habilitado — los trabajadores pueden operar sin internet</p></div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
