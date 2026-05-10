import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

export default function VisitScreen({ navigation }: any) {
  const [mode, setMode] = useState<'menu' | 'START' | 'END' | 'QUICK'>('menu');
  const [clientCode, setClientCode] = useState('');
  const [motiveCode, setMotiveCode] = useState('');
  const [observation, setObservation] = useState('');

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'Visit', endpoint: '/visits',
    successMessage: 'Visita registrada',
    onSuccess: () => { setMode('menu'); setClientCode(''); setMotiveCode(''); setObservation(''); },
  });

  if (mode === 'menu') {
    return (
      <ScreenWrapper title="Visitas" onBack={() => navigation.goBack()}>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#3b82f6' }]} onPress={() => setMode('START')}>
            <Text style={styles.menuEmoji}>▶️</Text><Text style={styles.menuText}>Inicio de Visita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#ef4444' }]} onPress={() => setMode('END')}>
            <Text style={styles.menuEmoji}>⏹️</Text><Text style={styles.menuText}>Fin de Visita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#10b981' }]} onPress={() => setMode('QUICK')}>
            <Text style={styles.menuEmoji}>⚡</Text><Text style={styles.menuText}>Visita Rápida</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const titles = { START: 'Inicio de Visita', END: 'Fin de Visita', QUICK: 'Visita Rápida' };

  return (
    <ScreenWrapper title={titles[mode]} onBack={() => setMode('menu')}>
      <View style={styles.form}>
        {(mode === 'START' || mode === 'QUICK') && (
          <FormInput label="Código de Cliente" required value={clientCode} onChangeText={setClientCode} placeholder="Ej: CLI001" />
        )}
        {(mode === 'END' || mode === 'QUICK') && (
          <FormInput label="Código de Motivo" required value={motiveCode} onChangeText={setMotiveCode} placeholder="Ej: MOT01" />
        )}
        <FormInput label="Observación" value={observation} onChangeText={setObservation} placeholder="Opcional" multiline numberOfLines={3} />
        <SubmitButton title="Registrar" loading={loading} onPress={() => submit({ eventType: mode, clientCode, motiveCode: motiveCode || undefined, observation: observation || undefined })} />
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
});
