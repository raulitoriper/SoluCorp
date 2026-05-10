import { useState } from 'react';
import { Alert } from 'react-native';
import api from '../lib/api';

interface Options {
  entityType: string;
  endpoint: string;
  successMessage?: string;
  onSuccess?: () => void;
}

export function useOfflineServiceMark({ entityType, endpoint, successMessage = 'Registrado', onSuccess }: Options) {
  const [loading, setLoading] = useState(false);

  const submit = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      // 1. Intentar obtener GPS (no bloquea si falla)
      let location = { latitude: 0, longitude: 0 };
      try {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000 });
          location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch {}

      const payload = { ...data, ...location };

      // 2. Enviar al backend
      try {
        await api.post(endpoint, payload);
        Alert.alert('Éxito', successMessage);
        onSuccess?.();
        return true;
      } catch (error: any) {
        // Si falla, intentar encolar offline
        try {
          const { enqueueOperation } = require('../db/sync-queue');
          await enqueueOperation(entityType, endpoint, payload, location);
          Alert.alert('Guardado Offline', 'Se guardó localmente y se enviará cuando haya conexión.');
          onSuccess?.();
          return true;
        } catch {
          // Si SQLite también falla, mostrar error real
          let msg = 'Error desconocido';
          if (error?.response) {
            msg = 'HTTP ' + error.response.status + ': ' + JSON.stringify(error.response.data?.message || error.response.data);
          } else if (error?.request) {
            msg = 'Sin respuesta del servidor. Verifique que el backend esté corriendo.';
          } else {
            msg = error?.message || String(error);
          }
          Alert.alert('Error', msg);
          return false;
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Error al procesar la operación');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading };
}
