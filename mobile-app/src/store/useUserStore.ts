import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MobileUser {
  id: number;
  name: string;
  email: string;
  user_type: 'customer' | 'staff';
  points?: number;
  role?: string;
}

interface UserState {
  user: MobileUser | null;
  setUser: (user: MobileUser) => void;
  logout: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const saveMobileUser = (user: MobileUser) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mobile_user', JSON.stringify(user));
  }
};

const clearMobileAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_user');
  }
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => {
        saveMobileUser(user);
        set({ user });
      },
      logout: () => {
        clearMobileAuth();
        set({ user: null });
      },
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'omnipos-mobile-user',
    }
  )
);
