import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import api from '../lib/api';

interface MetaType { id: string; code: string; name: string; }
interface MetaItem { id: string; code: string; value: string; }

export default function MetadataScreen({ navigation }: any) {
  const [types, setTypes] = useState<MetaType[]>([]);
  const [selectedType, setSelectedType] = useState<MetaType | null>(null);
  const [items, setItems] = useState<MetaItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/metadata/types').then((r) => setTypes(r.data)).catch(() => {}); }, []);

  const loadItems = (type: MetaType) => {
    setSelectedType(type);
    api.get(`/metadata/${type.code}/items`).then((r) => setItems(r.data)).catch(() => {});
  };

  const handleCreate = async () => {
    if (!newCode || !newValue || !selectedType) return;
    setLoading(true);
    try {
      await api.post(`/metadata/${selectedType.code}/items`, { code: newCode, value: newValue });
      Alert.alert('Éxito', 'Dato maestro creado');
      setNewCode(''); setNewValue(''); setShowCreate(false);
      loadItems(selectedType);
    } catch { Alert.alert('Error', 'No se pudo crear'); }
    finally { setLoading(false); }
  };

  if (!selectedType) {
    return (
      <ScreenWrapper title="Datos Maestros" onBack={() => navigation.goBack()}>
        <FlatList data={types} keyExtractor={(t) => t.id} renderItem={({ item }) => (
          <TouchableOpacity style={styles.typeCard} onPress={() => loadItems(item)}>
            <Text style={styles.typeName}>{item.name}</Text>
            <Text style={styles.typeCode}>{item.code}</Text>
          </TouchableOpacity>
        )} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title={selectedType.name} onBack={() => setSelectedType(null)}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>{showCreate ? '✕ Cancelar' : '+ Crear Nuevo'}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.form}>
          <FormInput label="Código" required value={newCode} onChangeText={setNewCode} />
          <FormInput label="Valor / Nombre" required value={newValue} onChangeText={setNewValue} />
          <SubmitButton title="Crear" loading={loading} onPress={handleCreate} />
        </View>
      )}

      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={styles.itemCard}>
          <Text style={styles.itemCode}>{item.code}</Text>
          <Text style={styles.itemValue}>{item.value}</Text>
        </View>
      )} ListEmptyComponent={<Text style={styles.empty}>Sin datos</Text>} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  typeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  typeCode: { fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' },
  createBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  createBtnText: { color: '#fff', fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  itemCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between' },
  itemCode: { fontFamily: 'monospace', color: '#6b7280', fontSize: 13 },
  itemValue: { fontWeight: '500', color: '#1f2937' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
});
