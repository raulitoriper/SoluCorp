export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  FIELD_WORKER: 'FIELD_WORKER',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// Plataforma permitida por rol
export const ROLE_PLATFORM: Record<UserRole, string> = {
  SUPER_ADMIN: 'Portal Admin',
  COMPANY_ADMIN: 'Portal Cliente',
  FIELD_WORKER: 'App Móvil',
};

export const PLAN_TYPES = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM'] as const;
export const SUBSCRIPTION_STATUSES = ['DEMO', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as const;
