import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocation } from './useLocation';
import api from '../lib/api';

interface ServiceMarkOptions {
  endpoint: string;
  successMessage?: string;
  onSuccess?: () => void;
}

export function useServiceMark({ endpoint, successMessage = 'Registrado correctamente', onSuccess }: ServiceMarkOptions) {
  const { acquireLocation, loading: gpsLoading } = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (data: Record<string, any>) => {
    setSubmitting(true);
    try {
      // 1. Obtener GPS
      const location = await acquireLocation();
      if (!location) { setSubmitting(false); return false; }

      // 2. Enviar al backend con GPS
      await api.post(endpoint, { ...data, ...location });

      // 3. Éxito
      Alert.alert('Éxito', successMessage);
      onSuccess?.();
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al registrar. Intente nuevamente.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, loading: submitting || gpsLoading };
}
