'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@solucorp/shared';

const ALL_MODULES = [
  { key: 'VISITS', label: 'Visitas' }, { key: 'ORDERS', label: 'Pedidos' },
  { key: 'GPS_TRACKING', label: 'Rastreo GPS' }, { key: 'INVENTORY', label: 'Inventario' },
  { key: 'ATTENDANCE', label: 'Asistencia' }, { key: 'GUARD_SECURITY', label: 'Guardia' },
  { key: 'MEDICAL_VISITS', label: 'Visita Médica' }, { key: 'COURIER', label: 'Courier' },
  { key: 'METADATA_CRUD', label: 'Datos Maestros' },
];

export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos empresa
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [address, setAddress] = useState('');

  // Datos admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Módulos
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(ALL_MODULES.map((m) => m.key)));

  const toggleModule = (key: string) => {
    const next = new Set(selectedModules);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedModules(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/companies', {
        name, ruc, phone: phone || undefined, email: email || undefined,
        city: city || undefined, department: department || undefined, address: address || undefined,
        adminEmail, adminFirstName, adminLastName, adminPassword,
        enabledModules: Array.from(selectedModules),
      });
      router.push('/clients');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Empresa</h1>

        {/* Stepper */}
        <div className="flex gap-2">
          {['Datos Empresa', 'Admin de Empresa', 'Módulos'].map((label, i) => (
            <div key={label} className={`flex-1 text-center py-2 rounded-lg text-sm font-medium ${step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}. {label}</div>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {/* Step 1: Datos empresa */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Nombre *</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" required /></div>
              <div><label className="block text-sm font-medium text-gray-700">RUC *</label><input value={ruc} onChange={(e) => setRuc(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" placeholder="80012345-6" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Teléfono</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" placeholder="+595..." /></div>
              <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Ciudad</label><input value={city} onChange={(e) => setCity(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Departamento</label><input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Dirección</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" /></div>
            <div className="flex justify-end"><button onClick={() => name && ruc ? setStep(2) : setError('Nombre y RUC son obligatorios')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Siguiente</button></div>
          </div>
        )}

        {/* Step 2: Admin */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <p className="text-sm text-gray-500">Este será el administrador de la empresa. Podrá acceder al Portal Cliente.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Nombre *</label><input value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" required /></div>
              <div><label className="block text-sm font-medium text-gray-700">Apellido *</label><input value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" required /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Email *</label><input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Contraseña *</label><input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800" minLength={6} required /></div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-2 border rounded-lg text-gray-600">Anterior</button>
              <button onClick={() => adminEmail && adminFirstName && adminPassword ? setStep(3) : setError('Complete todos los campos')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Siguiente</button>
            </div>
          </div>
        )}

        {/* Step 3: Módulos */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <p className="text-sm text-gray-500">Seleccione los módulos que esta empresa tendrá habilitados:</p>
            <div className="grid grid-cols-3 gap-3">
              {ALL_MODULES.map((mod) => (
                <button key={mod.key} onClick={() => toggleModule(mod.key)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${selectedModules.has(mod.key) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {mod.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">{selectedModules.size} módulos seleccionados. La empresa iniciará con plan DEMO (30 días de prueba).</p>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-2 border rounded-lg text-gray-600">Anterior</button>
              <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Creando...' : 'Crear Empresa'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
