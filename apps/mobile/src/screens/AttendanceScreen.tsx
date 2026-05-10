import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

const CATEGORIES = [
  { key: 'PRESENCE', label: 'Presencia', color: '#3b82f6', emoji: '🏢' },
  { key: 'BREAK', label: 'Descanso', color: '#f59e0b', emoji: '☕' },
  { key: 'LUNCH', label: 'Almuerzo', color: '#10b981', emoji: '🍽️' },
];

export default function AttendanceScreen({ navigation }: any) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [step, setStep] = useState<'code' | 'category'>('code');
  const [observation, setObservation] = useState('');

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'Attendance',
    endpoint: '/attendance',
    successMessage: 'Asistencia registrada',
    onSuccess: () => { setStep('code'); setEmployeeCode(''); setObservation(''); },
  });

  const handleMark = (category: string, action: string) => {
    submit({ employeeCode, eventCategory: category, eventAction: action, observation: observation || undefined });
  };

  if (step === 'code') {
    return (
      <ScreenWrapper title="Asistencia" onBack={() => navigation.goBack()}>
        <View style={styles.form}>
          <FormInput label="Código de Empleado" required value={employeeCode} onChangeText={setEmployeeCode} placeholder="Ej: EMP01" />
          <FormInput label="Observación" value={observation} onChangeText={setObservation} />
          <SubmitButton title="Continuar" onPress={() => employeeCode && setStep('category')} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title={`Asistencia: ${employeeCode}`} onBack={() => setStep('code')}>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.catCard}>
            <Text style={styles.catTitle}>{cat.emoji} {cat.label}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: cat.color }]} onPress={() => handleMark(cat.key, 'IN')} disabled={loading}>
                <Text style={styles.actionText}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6b7280' }]} onPress={() => handleMark(cat.key, 'OUT')} disabled={loading}>
                <Text style={styles.actionText}>Salida</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  grid: { gap: 12 },
  catCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  catTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
