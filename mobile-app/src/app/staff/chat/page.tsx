"use client";

import React, { useEffect, useState } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { getStaffConversations, getTemplates, ChatConversation } from '@/lib/chat';
import Chat from '@/components/chat/Chat';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import toast from 'react-hot-toast';

type TabType = 'conversations' | 'templates';

export default function StaffChatPage() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const convs = await getStaffConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  const getUnreadCount = (conv: ChatConversation) => {
    return conv.unread_count || 0;
  };

  if (loading) {
    return (
      <StaffMobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </StaffMobileLayout>
    );
  }

  return (
    <StaffMobileLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'conversations'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            <MessageCircle size={18} />
            Conversations
            {conversations.filter(c => getUnreadCount(c) > 0).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {conversations.filter(c => getUnreadCount(c) > 0).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'templates'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Users size={18} />
            Templates
          </button>
        </div>

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Conversation List */}
            <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-100 pr-2">
              {conversations.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-3 rounded-xl mb-2 cursor-pointer transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{conv.customer_name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                      {getUnreadCount(conv) > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {getUnreadCount(conv)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : 'New'}
                    </p>
                    {conv.product_name && (
                      <div className="mt-1 text-xs text-blue-600 truncate">
                        🛒 {conv.product_name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 overflow-hidden">
              {selectedConversation ? (
                <Chat
                  conversationId={selectedConversation.id}
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <MessageCircle size={48} className="mb-2 opacity-30" />
                  <p>Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="flex-1 overflow-y-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-800">
                💬 Quick reply templates will appear here. Add them from the Templates section.
              </p>
            </div>
            <div className="text-center text-gray-400 py-8">
              No templates available yet
            </div>
          </div>
        )}
      </div>
    </StaffMobileLayout>
  );
}
