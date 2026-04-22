"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStore, Notification } from "@/store/useNotificationStore";
import { Bell, Package, Award, Tag, Ticket, MessageSquare, Star, Info, CheckCircle2, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
}

type TabType = 'PERSONAL' | 'STORE' | 'PUBLIC';

export default function NotificationDropdown({ isOpen, onClose, customerId }: Props) {
  const router = useRouter();
  const { notifications, clearNotifications } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<TabType>('PERSONAL');

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter(n => n.category === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER': return <Package className="text-blue-500" size={20} />;
      case 'POINTS': return <Award className="text-amber-500" size={20} />;
      case 'PRODUCT': return <Tag className="text-green-500" size={20} />;
      case 'VOUCHER': return <Ticket className="text-orange-500" size={20} />;
      case 'REVIEW': return <Star className="text-yellow-400" size={20} />;
      case 'SYSTEM': return <CheckCircle2 className="text-indigo-500" size={20} />;
      default: return <Info className="text-gray-500" size={20} />;
    }
  };

  const handleAction = (url: string | null) => {
    if (url) {
      router.push(url);
      onClose();
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">

      {/* Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-black text-gray-900 flex items-center gap-2">
          <Bell size={18} className="text-blue-600"/> Notifications
        </h3>
        <button
          onClick={() => clearNotifications(customerId)}
          className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <Trash2 size={14}/> Clear All
        </button>
      </div>

      {/* 3-Column Tabs */}
      <div className="flex border-b border-gray-100">
        {['PERSONAL', 'STORE', 'PUBLIC'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabType)}
            className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
              activeTab === tab ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
        {filteredNotifs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto opacity-20 mb-3" />
            <p className="text-sm font-medium">No notifications here yet.</p>
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border-b border-gray-50 last:border-0 transition-colors ${notif.is_read ? 'opacity-70' : 'bg-blue-50/30'}`}
            >
              <div className="flex gap-3">
                <div className="shrink-0 mt-1">{getIcon(notif.type)}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{notif.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{notif.message}</p>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                    {notif.action_url && (
                      <button
                        onClick={() => handleAction(notif.action_url)}
                        className="text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}