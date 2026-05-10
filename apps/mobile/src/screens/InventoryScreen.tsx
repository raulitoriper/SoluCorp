import React, { useState } from 'react';
import { View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

export default function InventoryScreen({ navigation }: any) {
  const [depositCode, setDepositCode] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [observation, setObservation] = useState('');

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'Inventory',
    endpoint: '/inventory',
    successMessage: 'Inventario registrado',
    onSuccess: () => { setDepositCode(''); setProductCode(''); setQuantity(''); setObservation(''); },
  });

  return (
    <ScreenWrapper title="Inventario" onBack={() => navigation.goBack()}>
      <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20 }}>
        <FormInput label="Código de Depósito" required value={depositCode} onChangeText={setDepositCode} placeholder="Ej: DEP01" />
        <FormInput label="Código de Producto" required value={productCode} onChangeText={setProductCode} placeholder="Ej: PROD01" />
        <FormInput label="Cantidad" required value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        <FormInput label="Observación" value={observation} onChangeText={setObservation} multiline />
        <SubmitButton title="Registrar" loading={loading} color="#f59e0b" onPress={() => submit({ depositCode, productCode, quantity: Number(quantity), observation })} />
      </View>
    </ScreenWrapper>
  );
}
