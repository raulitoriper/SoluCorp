'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api, formatDateTime } from '@solucorp/shared';
import { RiAddLine, RiEditLine, RiUserLine } from 'react-icons/ri';

interface User { id: string; email: string; firstName: string; lastName: string; phone: string | null; role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string; }

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'FIELD_WORKER' });

  const loadData = () => api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const data: any = { firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined, role: form.role };
      if (form.password) data.password = form.password;
      await api.patch(`/users/${editing.id}`, data);
    } else {
      await api.post('/users', form);
    }
    setShowForm(false); setEditing(null);
    setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'FIELD_WORKER' });
    loadData();
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, phone: u.phone || '', role: u.role });
    setShowForm(true);
  };

  const toggleActive = async (u: User) => {
    await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
    loadData();
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Equipo de Trabajo</h1>
          <button onClick={() => { setEditing(null); setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'FIELD_WORKER' }); setShowForm(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"><RiAddLine /> Nuevo Trabajador</button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800">{editing ? 'Editar' : 'Nuevo'} Trabajador</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700">Nombre *</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-gray-800" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Apellido *</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-gray-800" required /></div>
                </div>
                {!editing && <div><label className="block text-sm font-medium text-gray-700">Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-gray-800" required /></div>}
                <div><label className="block text-sm font-medium text-gray-700">Contraseña {editing && '(dejar vacío para no cambiar)'}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-gray-800" {...(!editing ? { required: true, minLength: 6 } : {})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Teléfono</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-gray-800" placeholder="+595..." /></div>
                <div><label className="block text-sm font-medium text-gray-700">Rol</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-gray-800">
                    <option value="FIELD_WORKER">Trabajador de Campo</option>
                    <option value="COMPANY_ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-gray-600">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Nombre</th>
                <th className="text-left p-3 text-gray-600">Email</th>
                <th className="text-left p-3 text-gray-600">Teléfono</th>
                <th className="text-left p-3 text-gray-600">Rol</th>
                <th className="text-left p-3 text-gray-600">Último Login</th>
                <th className="text-center p-3 text-gray-600">Estado</th>
                <th className="text-center p-3 text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 flex items-center gap-2"><div className="bg-green-100 p-1.5 rounded-full"><RiUserLine className="text-green-600" size={14} /></div><span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span></td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3 text-gray-600">{u.phone || '-'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'COMPANY_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role === 'COMPANY_ADMIN' ? 'Admin' : 'Campo'}</span></td>
                  <td className="p-3 text-gray-500 text-xs">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Nunca'}</td>
                  <td className="p-3 text-center"><button onClick={() => toggleActive(u)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Activo' : 'Inactivo'}</button></td>
                  <td className="p-3 text-center"><button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800"><RiEditLine size={16} /></button></td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No hay trabajadores registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
