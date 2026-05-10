import NetInfo from '@react-native-community/netinfo';
import api from '../lib/api';
import { getPendingItems, markSent, markFailed } from '../db/sync-queue';

let isProcessing = false;
let unsubscribe: (() => void) | null = null;

// Procesar cola de items pendientes
export async function processQueue(): Promise<number> {
  if (isProcessing) return 0;
  isProcessing = true;

  let processed = 0;
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return 0;

    const items = await getPendingItems();
    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload);
        await api.post(item.endpoint, payload);
        await markSent(item.id);
        processed++;
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Error desconocido';
        await markFailed(item.id, typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    }
  } finally {
    isProcessing = false;
  }
  return processed;
}

// Iniciar listener de conectividad — sincroniza cuando vuelve la conexión
export function startSyncListener() {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      processQueue();
    }
  });
}

export function stopSyncListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
