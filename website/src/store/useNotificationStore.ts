import { create } from 'zustand';
import api from '@/lib/api';

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
        const notifs = res.data.notifications;
        const unread = notifs.filter((n: Notification) => !n.is_read).length;
        set({ notifications: notifs, unreadCount: unread });
      }
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  },

  clearNotifications: async (customerId) => {
    try {
      await api.put(`/web/customers/${customerId}/notifications/clear`);
      // Update local state to mark all as read instantly
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error("Failed to clear notifications");
    }
  }
}));