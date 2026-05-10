import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { useNavigation } from '@react-navigation/native';

const SERVICE_ICONS: Record<string, { label: string; emoji: string; color: string; screen: string }> = {
  VISITS:          { label: 'Visitas',        emoji: '📍', color: '#3b82f6', screen: 'Visit' },
  ORDERS:          { label: 'Pedidos',        emoji: '📋', color: '#10b981', screen: 'Order' },
  GPS_TRACKING:    { label: 'Rastreo GPS',    emoji: '🛰️', color: '#8b5cf6', screen: '' },
  INVENTORY:       { label: 'Inventario',     emoji: '📦', color: '#f59e0b', screen: 'Inventory' },
  ATTENDANCE:      { label: 'Asistencia',     emoji: '⏰', color: '#ef4444', screen: 'Attendance' },
  GUARD_SECURITY:  { label: 'Guardia',        emoji: '🛡️', color: '#6366f1', screen: 'Guard' },
  MEDICAL_VISITS:  { label: 'Visita Médica',  emoji: '🏥', color: '#ec4899', screen: 'MedicalVisit' },
  COURIER:         { label: 'Courier',        emoji: '🚚', color: '#14b8a6', screen: 'Courier' },
  METADATA_CRUD:   { label: 'Datos Maestros', emoji: '📊', color: '#64748b', screen: 'Metadata' },
};

export default function HomeScreen() {
  const { user, enabledModules, logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const handleModulePress = (module: string) => {
    const svc = SERVICE_ICONS[module];
    if (svc?.screen) navigation.navigate(svc.screen);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.firstName}!</Text>
          <Text style={styles.company}>{user?.companyName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Text style={styles.settingsText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de servicios */}
      <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
      <FlatList
        data={enabledModules}
        numColumns={3}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const svc = SERVICE_ICONS[item];
          if (!svc) return null;
          return (
            <TouchableOpacity style={[styles.tile, { borderColor: svc.color }]} onPress={() => handleModulePress(item)}>
              <Text style={styles.emoji}>{svc.emoji}</Text>
              <Text style={styles.tileLabel}>{svc.label}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No hay módulos habilitados para su empresa.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  company: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  settingsBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  settingsText: { fontSize: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  grid: { paddingHorizontal: 12 },
  tile: { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, minHeight: 100, justifyContent: 'center' },
  emoji: { fontSize: 32, marginBottom: 8 },
  tileLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 },
});
