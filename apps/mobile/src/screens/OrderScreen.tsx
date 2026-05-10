import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import FormInput from '../components/FormInput';
import SubmitButton from '../components/SubmitButton';
import { useOfflineServiceMark } from '../hooks/useOfflineServiceMark';

interface OrderItem { productCode: string; quantity: string; unitPriceGs: string; discountPct: string; }

export default function OrderScreen({ navigation }: any) {
  const [clientCode, setClientCode] = useState('');
  const [priceList, setPriceList] = useState('');
  const [saleCondition, setSaleCondition] = useState('');
  const [observation, setObservation] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ productCode: '', quantity: '1', unitPriceGs: '0', discountPct: '0' }]);

  const { submit, loading } = useOfflineServiceMark({
    entityType: 'Order',
    endpoint: '/orders',
    successMessage: 'Pedido registrado',
    onSuccess: () => { setClientCode(''); setItems([{ productCode: '', quantity: '1', unitPriceGs: '0', discountPct: '0' }]); },
  });

  const addItem = () => setItems([...items, { productCode: '', quantity: '1', unitPriceGs: '0', discountPct: '0' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  return (
    <ScreenWrapper title="Nuevo Pedido" onBack={() => navigation.goBack()}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <FormInput label="Código de Cliente" required value={clientCode} onChangeText={setClientCode} />
        <FormInput label="Lista de Precios" value={priceList} onChangeText={setPriceList} />
        <FormInput label="Condición de Venta" value={saleCondition} onChangeText={setSaleCondition} />

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>Productos</Text>
          <TouchableOpacity onPress={addItem}><Text style={styles.addBtn}>+ Agregar</Text></TouchableOpacity>
        </View>

        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <FormInput label={`Producto ${i + 1}`} required value={item.productCode} onChangeText={(v) => updateItem(i, 'productCode', v)} placeholder="Código" />
            <View style={styles.itemFields}>
              <View style={{ flex: 1 }}><FormInput label="Cant." value={item.quantity} onChangeText={(v) => updateItem(i, 'quantity', v)} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><FormInput label="Precio ₲" value={item.unitPriceGs} onChangeText={(v) => updateItem(i, 'unitPriceGs', v)} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><FormInput label="Desc %" value={item.discountPct} onChangeText={(v) => updateItem(i, 'discountPct', v)} keyboardType="numeric" /></View>
            </View>
            {items.length > 1 && <TouchableOpacity onPress={() => removeItem(i)}><Text style={styles.removeBtn}>Eliminar</Text></TouchableOpacity>}
          </View>
        ))}

        <FormInput label="Observación" value={observation} onChangeText={setObservation} multiline />
        <SubmitButton title="Registrar Pedido" loading={loading} color="#10b981" onPress={() => submit({
          clientCode, priceList, saleCondition, observation,
          items: items.map((it) => ({ productCode: it.productCode, quantity: Number(it.quantity), unitPriceGs: Number(it.unitPriceGs), discountPct: Number(it.discountPct) })),
        })} />
      </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  itemsTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  addBtn: { color: '#3b82f6', fontWeight: '600' },
  itemRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 },
  itemFields: { flexDirection: 'row', gap: 8 },
  removeBtn: { color: '#ef4444', fontSize: 12, textAlign: 'right', marginTop: 4 },
});
