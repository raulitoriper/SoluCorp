import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import api from '../lib/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('campo@demo.solucorp.com.py');
  const [password, setPassword] = useState('campo123');
  const [apiUrl, setApiUrl] = useState('');
  const { login, isLoading } = useAuthStore();

  useEffect(() => {
    setApiUrl(api.defaults.baseURL || '?');
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Complete todos los campos'); return; }
    try {
      await login(email, password);
    } catch (error: any) {
      let msg = 'Error desconocido';
      if (error?.response) {
        msg = 'HTTP ' + error.response.status + ': ' + JSON.stringify(error.response.data?.message || error.response.data);
      } else if (error?.request) {
        msg = 'Sin respuesta del servidor.\n\nVerifique:\n1. Backend corriendo (npm run start:dev)\n2. URL: ' + apiUrl;
      } else {
        msg = error?.message || String(error);
      }
      Alert.alert('Error de Login', msg);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.form}>
        <Text style={styles.title}>SoluCorp</Text>
        <Text style={styles.subtitle}>Soluciones Corporativas</Text>

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? 'Conectando...' : 'Ingresar'}</Text>
        </TouchableOpacity>

        <Text style={styles.apiInfo}>API: {apiUrl}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', padding: 20 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 30 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12, color: '#333' },
  button: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  apiInfo: { textAlign: 'center', fontSize: 10, color: '#aaa', marginTop: 16 },
});
