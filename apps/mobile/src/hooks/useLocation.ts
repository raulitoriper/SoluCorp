import { useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export function useLocation() {
  const [loading, setLoading] = useState(false);

  const acquireLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS', 'Se necesita permiso de ubicación para continuar.');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000 });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      Alert.alert('GPS', 'No se pudo obtener la ubicación. Verifique que el GPS esté activado.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { acquireLocation, loading };
}
