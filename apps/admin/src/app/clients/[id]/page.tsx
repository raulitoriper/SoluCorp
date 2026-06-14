'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@solucorp/shared';
import { RiArrowLeftLine, RiEditLine, RiCheckLine } from 'react-icons/ri';

const ALL_MODULES = [
  { key: 'VISITS', label: 'Visitas' }, { key: 'ORDERS', label: 'Pedidos' },
  { key: 'GPS_TRACKING', label: 'Rastreo GPS' }, { key: 'INVENTORY', label: 'Inventario' },
  { key: 'ATTENDANCE', label: 'Asistencia' }, { key: 'GUARD_SECURITY', label: 'Guardia' },
  { key: 'MEDICAL_VISITS', label: 'Visita Médica' }, { key: 'COURIER', label: 'Courier' },
  { key: 'METADATA_CRUD', label: 'Datos Maestros' },
];

const PLANS = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];
const STATUSES = ['DEMO', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
const STATUS_COLORS: Record<string, string> = { DEMO: 'bg-yellow-100 text-yellow-700', ACTIVE: 'bg-green-100 text-green-700', SUSPENDED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500' };

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'info' | 'subscription' | 'modules' | 'users'>('info');
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/companies/${id}`),
    ]).then(([compRes]) => {
      setCompany(compRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const updateSubscription = async (field: string, value: string) => {
    await api.patch(`/companies/${id}/subscription`, { [field]: value });
    loadData();
  };

  const toggleModule = async (module: string, isEnabled: boolean) => {
    await api.post(`/companies/${id}/modules/${module}`, { isEnabled });
    loadData();
  };

  if (loading || !company) {
    return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div></AppLayout>;
  }

  const enabledModules = new Set(company.modules?.filter((m: any) => m.isEnabled).map((m: any) => m.module) || []);

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/clients')} className="p-2 hover:bg-gray-200 rounded-lg"><RiArrowLeftLine size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{company.name}</h1>
            <p className="text-sm text-gray-500">RUC: {company.ruc} | {company.city || 'Sin ciudad'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ml-auto ${STATUS_COLORS[company.subscription?.status] || 'bg-gray-100'}`}>
            {company.subscription?.status}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
          {[
            { key: 'info', label: 'Información' },
            { key: 'subscription', label: 'Suscripción' },
            { key: 'modules', label: `Módulos (${enabledModules.size})` },
            { key: 'users', label: `Usuarios (${company._count?.users || 0})` },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>{t.label}</button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === 'info' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium text-gray-800 ml-2">{company.name}</span></div>
              <div><span className="text-gray-500">RUC:</span> <span className="font-medium text-gray-800 ml-2">{company.ruc}</span></div>
              <div><span className="text-gray-500">Teléfono:</span> <span className="font-medium text-gray-800 ml-2">{company.phone || '-'}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-800 ml-2">{company.email || '-'}</span></div>
              <div><span className="text-gray-500">Ciudad:</span> <span className="font-medium text-gray-800 ml-2">{company.city || '-'}</span></div>
              <div><span className="text-gray-500">Departamento:</span> <span className="font-medium text-gray-800 ml-2">{company.department || '-'}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Dirección:</span> <span className="font-medium text-gray-800 ml-2">{company.address || '-'}</span></div>
            </div>
          </div>
        )}

        {/* Tab: Suscripción */}
        {tab === 'subscription' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                <div className="flex gap-2">
                  {PLANS.map((plan) => (
                    <button key={plan} onClick={() => updateSubscription('planType', plan)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${company.subscription?.planType === plan ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{plan}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <div className="flex gap-2">
                  {STATUSES.map((st) => (
                    <button key={st} onClick={() => updateSubscription('status', st)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${company.subscription?.status === st ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{st}</button>
                  ))}
                </div>
              </div>
            </div>
            {company.subscription?.trialEndsAt && (
              <p className="text-sm text-gray-500">Trial vence: <span className="font-medium text-gray-800">{new Date(company.subscription.trialEndsAt).toLocaleDateString('es-PY')}</span></p>
            )}
          </div>
        )}

        {/* Tab: Módulos */}
        {tab === 'modules' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-3 gap-3">
              {ALL_MODULES.map((mod) => {
                const enabled = enabledModules.has(mod.key);
                return (
                  <button key={mod.key} onClick={() => toggleModule(mod.key, !enabled)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${enabled ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm ${enabled ? 'text-green-700' : 'text-gray-500'}`}>{mod.label}</span>
                      {enabled && <RiCheckLine className="text-green-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4">Haga clic en un módulo para habilitarlo o deshabilitarlo. Los cambios se aplican inmediatamente.</p>
          </div>
        )}

        {/* Tab: Usuarios */}
        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-4">Los usuarios de esta empresa se gestionan desde el Portal Cliente por el administrador de la empresa.</p>
            <p className="text-sm text-gray-400">Total de usuarios: <span className="font-bold text-gray-800">{company._count?.users || 0}</span></p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
