// Códigos de servicio del APK original (csTigoAndroid)
export const SERVICE_CODES = {
  VISITS: 1,
  ORDERS: 2,
  GPS_TRACKING: 4,
  GUARD: 6,
  INVENTORY: 10,
  ATTENDANCE: 11,
  SHIFT_GUARD: 15,
  MEDICAL_VISITS: 17,
  COURIER: 18,
  METADATA_CRUD: 99,
} as const;

export const SERVICE_MODULES = [
  'VISITS',
  'ORDERS',
  'GPS_TRACKING',
  'INVENTORY',
  'ATTENDANCE',
  'GUARD_SECURITY',
  'MEDICAL_VISITS',
  'COURIER',
  'METADATA_CRUD',
] as const;

export type ServiceModule = (typeof SERVICE_MODULES)[number];

// Labels en español para la UI
export const SERVICE_LABELS: Record<ServiceModule, string> = {
  VISITS: 'Visitas',
  ORDERS: 'Pedidos',
  GPS_TRACKING: 'Rastreo GPS',
  INVENTORY: 'Inventario',
  ATTENDANCE: 'Asistencia',
  GUARD_SECURITY: 'Guardia / Seguridad',
  MEDICAL_VISITS: 'Visita Médica',
  COURIER: 'Courier / Entregas',
  METADATA_CRUD: 'Datos Maestros',
};
