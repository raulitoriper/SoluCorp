export type PlanType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'CUSTOM';
export type SubscriptionStatus = 'DEMO' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface Company {
  id: string;
  name: string;
  ruc: string;
  legalName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  department?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  subscription?: Subscription;
  _count?: { users: number };
}

export interface Subscription {
  id: string;
  planType: PlanType;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  activatedAt?: string;
  maxUsers: number;
  maxFieldWorkers: number;
  monthlyPriceGs: number;
}

export interface CompanyModule {
  id: string;
  module: string;
  isEnabled: boolean;
  configJson?: Record<string, any>;
}

export interface CompanySettings {
  timezone: string;
  locale: string;
  currency: string;
  gpsTrackingIntervalMs: number;
  allowOfflineMode: boolean;
  requireGpsForMarks: boolean;
}
