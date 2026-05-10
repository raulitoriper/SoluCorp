// Tipos de datos maestros del APK original (MetaNames.java)
export const META_TYPES = {
  CLIENT: { code: 'CLIENT', name: 'Cliente' },
  PRODUCT: { code: 'PRODUCT', name: 'Producto' },
  MOTIVE: { code: 'MOTIVE', name: 'Motivo' },
  GUARD: { code: 'GUARD', name: 'Guardia' },
  DELIVERER: { code: 'DELIVERER', name: 'Repartidor' },
  INVOICE_TYPE: { code: 'INVOICE_TYPE', name: 'Tipo de Factura' },
  EMPLOYEE: { code: 'EMPLOYEE', name: 'Empleado' },
  VEHICLE: { code: 'VEHICLE', name: 'Vehículo' },
  BANK: { code: 'BANK', name: 'Banco' },
  DEPOSIT: { code: 'DEPOSIT', name: 'Depósito' },
  CLINIC: { code: 'CLINIC', name: 'Clínica' },
  MEDIC: { code: 'MEDIC', name: 'Médico' },
  CONTACT: { code: 'CONTACT', name: 'Contacto' },
  TICKET_USER: { code: 'TICKET_USER', name: 'Usuario Ticket' },
} as const;

export const DEFAULT_META_TYPES = Object.values(META_TYPES);
