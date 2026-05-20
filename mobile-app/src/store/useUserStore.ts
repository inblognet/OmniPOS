import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MobileUser, saveMobileUser, getMobileUser, clearMobileAuth } from '@/lib/auth';

interface UserState {
  user: MobileUser | null;
  setUser: (user: MobileUser) => void;
  logout: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

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
