import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';

const TASK_NAME = 'SOLUCORP_GPS_TRACKING';
const BATCH_SIZE = 50;

// Registrar tarea de background de forma segura
// (solo si TaskManager está disponible — evita crash en Expo Go)
try {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }: any) => {
    if (error) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    let batteryLevel: number | null = null;
    try {
      const Battery = require('expo-battery');
      batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
    } catch {}

    try {
      const { getDatabase } = require('../db/database');
      const db = await getDatabase();

      for (const loc of locations) {
        await db.runAsync(
          `INSERT INTO gps_buffer (latitude, longitude, accuracy, altitude, speed, heading, battery_level, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy, loc.coords.altitude,
          loc.coords.speed, loc.coords.heading, batteryLevel, new Date(loc.timestamp).toISOString(),
        );
      }

      await syncGpsBatch();
    } catch {}
  });
} catch {
  // TaskManager no disponible (Expo Go puede no soportar defineTask)
}

async function syncGpsBatch() {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    const { getDatabase } = require('../db/database');
    const db = await getDatabase();
    const unsyncedRows: any[] = await db.getAllAsync(
      `SELECT * FROM gps_buffer WHERE synced = 0 ORDER BY recorded_at ASC LIMIT ?`, BATCH_SIZE,
    );

    if (unsyncedRows.length === 0) return;

    const api = require('../lib/api').default;
    const points = unsyncedRows.map((r: any) => ({
      latitude: r.latitude, longitude: r.longitude, accuracy: r.accuracy,
      altitude: r.altitude, speed: r.speed, heading: r.heading,
      batteryLevel: r.battery_level, recordedAt: r.recorded_at,
    }));

    await api.post('/gps/batch', { points });
    const ids = unsyncedRows.map((r: any) => r.id);
    await db.runAsync(`UPDATE gps_buffer SET synced = 1 WHERE id IN (${ids.join(',')})`);
  } catch {}
}

export async function startBackgroundTracking(intervalMs = 300000) {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return false;

    const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
    if (isRunning) return true;

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: intervalMs,
      distanceInterval: 0,
      deferredUpdatesInterval: intervalMs,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'SoluCorp',
        notificationBody: 'Rastreo GPS activo',
        notificationColor: '#3b82f6',
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundTracking() {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
    if (isRunning) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}
}

export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
}

export { syncGpsBatch };
