import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuthStore } from '../stores/auth-store';
import { useSyncStore } from '../stores/sync-store';
import { startBackgroundTracking, stopBackgroundTracking, isTrackingActive, syncGpsBatch } from '../services/background-tracking';
import { processQueue } from '../services/sync-engine';
import { clearSent } from '../db/sync-queue';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const { pendingCount, failedCount, sentCount, refreshCounts } = useSyncStore();
  const [gpsActive, setGpsActive] = useState(false);

  useEffect(() => {
    isTrackingActive().then(setGpsActive);
    refreshCounts();
  }, []);

  const toggleGps = async (value: boolean) => {
    if (value) {
      const ok = await startBackgroundTracking();
      if (!ok) Alert.alert('Error', 'No se pudieron obtener permisos de GPS en background.');
      else setGpsActive(true);
    } else {
      await stopBackgroundTracking();
      setGpsActive(false);
    }
  };

  const forcSync = async () => {
    const count = await processQueue();
    await syncGpsBatch();
    await refreshCounts();
    Alert.alert('Sincronización', count > 0 ? `${count} operación(es) sincronizada(s)` : 'No hay operaciones pendientes');
  };

  const clearHistory = async () => {
    await clearSent();
    await refreshCounts();
    Alert.alert('Limpieza', 'Historial de operaciones enviadas eliminado');
  };

  return (
    <ScreenWrapper title="Configuración" onBack={() => navigation.goBack()}>
      {/* Perfil */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Perfil</Text>
        <View style={styles.row}><Text style={styles.label}>Nombre</Text><Text style={styles.value}>{user?.firstName} {user?.lastName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Empresa</Text><Text style={styles.value}>{user?.companyName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Rol</Text><Text style={styles.value}>{user?.role === 'FIELD_WORKER' ? 'Trabajador de Campo' : 'Administrador'}</Text></View>
      </View>

      {/* GPS Tracking */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rastreo GPS</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Tracking en Background</Text>
            <Text style={styles.switchDesc}>{gpsActive ? 'Enviando ubicación cada 5 minutos' : 'Desactivado'}</Text>
          </View>
          <Switch value={gpsActive} onValueChange={toggleGps} trackColor={{ true: '#3b82f6' }} />
        </View>
      </View>

      {/* Sincronización */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sincronización Offline</Text>
        <View style={styles.row}><Text style={styles.label}>Pendientes</Text><Text style={[styles.value, pendingCount > 0 && { color: '#f59e0b', fontWeight: 'bold' }]}>{pendingCount}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Fallidas</Text><Text style={[styles.value, failedCount > 0 && { color: '#ef4444', fontWeight: 'bold' }]}>{failedCount}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Enviadas</Text><Text style={styles.value}>{sentCount}</Text></View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: '#3b82f6' }]} onPress={forcSync}>
          <Text style={styles.btnText}>Forzar Sincronización</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#6b7280' }]} onPress={clearHistory}>
          <Text style={styles.btnText}>Limpiar Historial Enviados</Text>
        </TouchableOpacity>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444', marginTop: 20 }]} onPress={logout}>
        <Text style={styles.btnText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { color: '#6b7280', fontSize: 14 },
  value: { color: '#1f2937', fontSize: 14, fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  switchDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
