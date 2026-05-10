import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

export default function CourierScreen({ navigation }: any) {
  const [mode, setMode] = useState<'menu' | 'DELIVERED' | 'NOT_DELIVERED'>('menu');
  const [receiverName, setReceiverName] = useState('');
  const [motiveCode, setMotiveCode] = useState('');
  const [observation, setObservation] = useState('');
  const [barcodes, setBarcodes] = useState<string[]>(['']);

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'Courier',
    endpoint: '/courier',
    successMessage: 'Entrega registrada',
    onSuccess: () => { setMode('menu'); setReceiverName(''); setMotiveCode(''); setObservation(''); setBarcodes(['']); },
  });

  const addBarcode = () => setBarcodes([...barcodes, '']);
  const updateBarcode = (i: number, val: string) => { const u = [...barcodes]; u[i] = val; setBarcodes(u); };
  const removeBarcode = (i: number) => setBarcodes(barcodes.filter((_, idx) => idx !== i));

  if (mode === 'menu') {
    return (
      <ScreenWrapper title="Courier / Entregas" onBack={() => navigation.goBack()}>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#10b981' }]} onPress={() => setMode('DELIVERED')}>
            <Text style={styles.menuEmoji}>✅</Text><Text style={styles.menuText}>Entregado</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#ef4444' }]} onPress={() => setMode('NOT_DELIVERED')}>
            <Text style={styles.menuEmoji}>❌</Text><Text style={styles.menuText}>No Entregado</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title={mode === 'DELIVERED' ? 'Entrega Exitosa' : 'No Entregado'} onBack={() => setMode('menu')}>
      <View style={styles.form}>
        {mode === 'DELIVERED' && <FormInput label="Nombre del Receptor" required value={receiverName} onChangeText={setReceiverName} />}
        {mode === 'NOT_DELIVERED' && <FormInput label="Código de Motivo" required value={motiveCode} onChangeText={setMotiveCode} />}

        <View style={styles.barcodeHeader}>
          <Text style={styles.barcodeTitle}>Paquetes</Text>
          <TouchableOpacity onPress={addBarcode}><Text style={styles.addBtn}>+ Agregar</Text></TouchableOpacity>
        </View>
        {barcodes.map((bc, i) => (
          <View key={i} style={styles.barcodeRow}>
            <View style={{ flex: 1 }}><FormInput label={`Código ${i + 1}`} value={bc} onChangeText={(v) => updateBarcode(i, v)} placeholder="Código de barra" /></View>
            {barcodes.length > 1 && <TouchableOpacity onPress={() => removeBarcode(i)} style={styles.removeBtn}><Text style={{ color: '#ef4444' }}>✕</Text></TouchableOpacity>}
          </View>
        ))}

        <FormInput label="Observación" value={observation} onChangeText={setObservation} multiline />
        <SubmitButton title="Registrar" loading={loading} color="#14b8a6" onPress={() => submit({
          status: mode, receiverName: receiverName || undefined, motiveCode: motiveCode || undefined,
          observation: observation || undefined, items: barcodes.filter(Boolean).map((b) => ({ barcode: b })),
        })} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  menuContainer: { gap: 12, paddingTop: 20 },
  menuBtn: { borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuEmoji: { fontSize: 24 },
  menuText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  barcodeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  barcodeTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  addBtn: { color: '#3b82f6', fontWeight: '600' },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn: { paddingTop: 20 },
});
