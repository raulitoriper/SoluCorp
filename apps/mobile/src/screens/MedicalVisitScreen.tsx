import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

const EVENTS = [
  { key: 'CLINIC_START', label: 'Inicio Clínica', emoji: '🏥', color: '#3b82f6' },
  { key: 'CLINIC_END', label: 'Fin Clínica', emoji: '🏥', color: '#6b7280' },
  { key: 'MEDIC_START', label: 'Inicio Médico', emoji: '👨‍⚕️', color: '#10b981' },
  { key: 'MEDIC_END', label: 'Fin Médico', emoji: '👨‍⚕️', color: '#6b7280' },
  { key: 'CLINIC_QUICK', label: 'Visita Rápida', emoji: '⚡', color: '#f59e0b' },
  { key: 'PRODUCT_REGISTER', label: 'Registro Producto', emoji: '💊', color: '#ec4899' },
];

export default function MedicalVisitScreen({ navigation }: any) {
  const [mode, setMode] = useState<string | null>(null);
  const [clinicCode, setClinicCode] = useState('');
  const [medicCode, setMedicCode] = useState('');
  const [motiveCode, setMotiveCode] = useState('');
  const [observation, setObservation] = useState('');
  const [initialKm, setInitialKm] = useState('');

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'MedicalVisit',
    endpoint: '/medical-visits',
    successMessage: 'Visita médica registrada',
    onSuccess: () => { setMode(null); setClinicCode(''); setMedicCode(''); setMotiveCode(''); setObservation(''); setInitialKm(''); },
  });

  if (!mode) {
    return (
      <ScreenWrapper title="Visita Médica" onBack={() => navigation.goBack()}>
        <View style={styles.grid}>
          {EVENTS.map((ev) => (
            <TouchableOpacity key={ev.key} style={[styles.menuBtn, { backgroundColor: ev.color }]} onPress={() => setMode(ev.key)}>
              <Text style={styles.menuEmoji}>{ev.emoji}</Text>
              <Text style={styles.menuText}>{ev.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScreenWrapper>
    );
  }

  const showClinic = ['CLINIC_START', 'CLINIC_END', 'CLINIC_QUICK'].includes(mode);
  const showMedic = ['MEDIC_START', 'MEDIC_END', 'CLINIC_QUICK'].includes(mode);
  const showMotive = ['MEDIC_END', 'CLINIC_QUICK'].includes(mode);

  return (
    <ScreenWrapper title={EVENTS.find((e) => e.key === mode)?.label || mode} onBack={() => setMode(null)}>
      <View style={styles.form}>
        {showClinic && <FormInput label="Código de Clínica" required value={clinicCode} onChangeText={setClinicCode} />}
        {showMedic && <FormInput label="Código de Médico" required value={medicCode} onChangeText={setMedicCode} />}
        {showMotive && <FormInput label="Código de Motivo" value={motiveCode} onChangeText={setMotiveCode} />}
        {mode === 'CLINIC_START' && <FormInput label="Km Inicial" value={initialKm} onChangeText={setInitialKm} keyboardType="numeric" />}
        <FormInput label="Observación" value={observation} onChangeText={setObservation} multiline />
        <SubmitButton title="Registrar" loading={loading} color="#ec4899" onPress={() => submit({
          eventType: mode, clinicCode: clinicCode || undefined, medicCode: medicCode || undefined,
          motiveCode: motiveCode || undefined, initialKm: initialKm ? Number(initialKm) : undefined,
          observation: observation || undefined,
        })} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  menuBtn: { borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuEmoji: { fontSize: 24 },
  menuText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
});
