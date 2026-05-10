import React, { useState } from 'react';
import { View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

export default function GuardScreen({ navigation }: any) {
  const [guardCode, setGuardCode] = useState('');
  const [place, setPlace] = useState('');
  const [observation, setObservation] = useState('');

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'Guard',
    endpoint: '/guard-shifts',
    successMessage: 'Marca de guardia registrada',
    onSuccess: () => { setGuardCode(''); setPlace(''); setObservation(''); },
  });

  return (
    <ScreenWrapper title="Guardia / Seguridad" onBack={() => navigation.goBack()}>
      <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20 }}>
        <FormInput label="Código de Guardia" required value={guardCode} onChangeText={setGuardCode} placeholder="Ej: G001" />
        <FormInput label="Lugar / Punto de Control" value={place} onChangeText={setPlace} placeholder="Opcional" />
        <FormInput label="Observación" value={observation} onChangeText={setObservation} multiline />
        <SubmitButton title="Registrar Marca" loading={loading} color="#6366f1" onPress={() => submit({ guardCode, eventType: 'MARK', place: place || undefined, observation: observation || undefined })} />
      </View>
    </ScreenWrapper>
  );
}
