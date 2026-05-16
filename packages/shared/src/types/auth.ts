import type { UserRole } from '../constants/roles';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  companyName: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
  enabledModules: string[];
  config: {
    gpsTrackingIntervalMs: number;
    timezone: string;
    currency: string;
  };
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}
