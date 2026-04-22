import { create } from 'zustand';
import api from '@/lib/api';
import axios from 'axios';

export interface Notification {
  id: number;
  customer_id: number | null;
  category: 'PERSONAL' | 'STORE' | 'PUBLIC';
  type: 'ORDER' | 'POINTS' | 'PRODUCT' | 'VOUCHER' | 'REVIEW' | 'SYSTEM';
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (customerId: number) => Promise<void>;
  clearNotifications: (customerId: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (customerId) => {
    try {
      const res = await api.get(`/web/customers/${customerId}/notifications`);
      if (res.data.success) {
        // Renamed 'notifs' to 'fetchedNotifications' to satisfy the spell checker
        const fetchedNotifications = res.data.notifications || [];
        const unread = fetchedNotifications.filter((n: Notification) => !n.is_read).length;
        set({ notifications: fetchedNotifications, unreadCount: unread });
      }
    } catch (error: unknown) {
      // Strictly typed error handling
      if (axios.isAxiosError(error)) {
        console.error("🔥 Failed to fetch notifications:", error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error("🔥 Failed to fetch notifications:", error.message);
      }
    }
  },

  clearNotifications: async (customerId) => {
    try {
      await api.put(`/web/customers/${customerId}/notifications/clear`);
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error: unknown) {
      // Strictly typed error handling
      if (axios.isAxiosError(error)) {
        console.error("🔥 Failed to clear notifications:", error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error("🔥 Failed to clear notifications:", error.message);
      }
    }
  }
}));