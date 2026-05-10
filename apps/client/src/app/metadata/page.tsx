'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { RiDatabase2Line, RiAddLine, RiEditLine, RiDeleteBinLine } from 'react-icons/ri';

interface MetaType { id: string; code: string; name: string; _count: { items: number }; }
interface MetaItem { id: string; code: string; value: string; }

export default function MetadataPage() {
  const [types, setTypes] = useState<MetaType[]>([]);
  const [selectedType, setSelectedType] = useState<MetaType | null>(null);
  const [items, setItems] = useState<MetaItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MetaItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formValue, setFormValue] = useState('');

  useEffect(() => { api.get('/metadata/types').then((r) => setTypes(r.data)).catch(() => {}); }, []);

  const loadItems = (type: MetaType) => {
    setSelectedType(type);
    api.get(`/metadata/${type.code}/items`).then((r) => setItems(r.data)).catch(() => setItems([]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await api.patch(`/metadata/items/${editingItem.id}`, { value: formValue });
    } else {
      await api.post(`/metadata/${selectedType!.code}/items`, { code: formCode, value: formValue });
    }
    setShowForm(false); setEditingItem(null); setFormCode(''); setFormValue('');
    loadItems(selectedType!);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Desactivar este registro?')) {
      await api.delete(`/metadata/items/${id}`);
      loadItems(selectedType!);
    }
  };

  if (!selectedType) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">Datos Maestros</h1>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {types.map((t) => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadItems(t)}>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg"><RiDatabase2Line className="text-indigo-600" size={20} /></div>
                  <div>
                    <p className="font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{t._count.items} registros</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedType(null)} className="text-blue-600 hover:text-blue-800">← Volver</button>
            <h1 className="text-2xl font-bold text-gray-800">{selectedType.name}</h1>
          </div>
          <button onClick={() => { setEditingItem(null); setFormCode(''); setFormValue(''); setShowForm(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
            <RiAddLine /> Nuevo
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800">{editingItem ? 'Editar' : 'Nuevo'} {selectedType.name}</h2>
              <form onSubmit={handleSave} className="space-y-3">
                {!editingItem && <div><label className="block text-sm font-medium text-gray-700">Código *</label><input value={formCode} onChange={(e) => setFormCode(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-800" required /></div>}
                <div><label className="block text-sm font-medium text-gray-700">Valor / Nombre *</label><input value={formValue} onChange={(e) => setFormValue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-800" required /></div>
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-gray-600">Cancelar</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Guardar</button></div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Código</th>
                <th className="text-left p-3 text-gray-600">Valor</th>
                <th className="text-center p-3 text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-gray-600">{item.code}</td>
                  <td className="p-3 font-medium text-gray-800">{item.value}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setEditingItem(item); setFormValue(item.value); setShowForm(true); }} className="text-blue-600 mr-2"><RiEditLine size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500"><RiDeleteBinLine size={16} /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-gray-400">Sin registros</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
