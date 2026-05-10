import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      unsub = NetInfo.addEventListener((state: any) => {
        setIsOnline(!!state.isConnected);
      });
    } catch {}
    return () => { unsub?.(); };
  }, []);

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Sin conexión — Los datos se guardan localmente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#fbbf24', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center', paddingTop: 40 },
  text: { color: '#1f2937', fontSize: 12, fontWeight: '600' },
});
