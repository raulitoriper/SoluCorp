import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

interface Props {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  scroll?: boolean;
}

export default function ScreenWrapper({ title, children, onBack, scroll = true }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Volver</Text></TouchableOpacity>}
        <Text style={styles.title}>{title}</Text>
      </View>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#1a1a2e', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#93c5fd', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 16 },
});
