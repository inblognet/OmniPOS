export interface MobileUser {
  id: number;
  name: string;
  email: string;
  user_type: 'customer' | 'staff';
  points?: number;
  role?: string;
}

export const saveMobileToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mobile_token', token);
  }
};

export const getMobileToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('mobile_token');
  }
  return null;
};

export const saveMobileUser = (user: MobileUser): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mobile_user', JSON.stringify(user));
  }
};

export const getMobileUser = (): MobileUser | null => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('mobile_user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const clearMobileAuth = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_user');
  }
};

export const isAuthenticated = (): boolean => {
  return !!getMobileToken();
};

// Generate or get device ID
export const getDeviceId = (): string => {
  if (typeof window !== 'undefined') {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
  return '';
};
