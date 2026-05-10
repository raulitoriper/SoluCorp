import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  color?: string;
}

export default function SubmitButton({ title, onPress, loading, color = '#3b82f6' }: Props) {
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: color }, loading && styles.disabled]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
