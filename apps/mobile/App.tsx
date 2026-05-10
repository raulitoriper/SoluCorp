import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuthStore } from './src/stores/auth-store';
import OfflineBanner from './src/components/OfflineBanner';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import VisitScreen from './src/screens/VisitScreen';
import OrderScreen from './src/screens/OrderScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import GuardScreen from './src/screens/GuardScreen';
import MedicalVisitScreen from './src/screens/MedicalVisitScreen';
import CourierScreen from './src/screens/CourierScreen';
import MetadataScreen from './src/screens/MetadataScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, isReady, loadFromStorage } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage()
      .catch((e: any) => setError('Error cargando sesión: ' + e?.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      try {
        const { startSyncListener, processQueue } = require('./src/services/sync-engine');
        startSyncListener();
        processQueue().catch(() => {});
      } catch {}
    }
  }, [user]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 20 }}>
        <Text style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#6b7280', marginTop: 16 }}>Cargando SoluCorp...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      {user && <OfflineBanner />}
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Visit" component={VisitScreen} />
              <Stack.Screen name="Order" component={OrderScreen} />
              <Stack.Screen name="Inventory" component={InventoryScreen} />
              <Stack.Screen name="Attendance" component={AttendanceScreen} />
              <Stack.Screen name="Guard" component={GuardScreen} />
              <Stack.Screen name="MedicalVisit" component={MedicalVisitScreen} />
              <Stack.Screen name="Courier" component={CourierScreen} />
              <Stack.Screen name="Metadata" component={MetadataScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
