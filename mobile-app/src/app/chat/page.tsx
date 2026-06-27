"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Package, ShoppingBag, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { getStaffConversations, createConversation, ChatConversation } from '@/lib/chat';
import Chat from '@/components/chat/Chat';
import MobileLayout from '@/components/layout/MobileLayout';
import toast from 'react-hot-toast';

export default function CustomerChatPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      // Get staff conversations (customer ID is in the URL or from user)
      const convs = await getStaffConversations();
      // Filter for this customer
      const customerConvs = convs.filter(c => c.customer_id === user.id);
      setConversations(customerConvs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    try {
      const conv = await createConversation({
        customer_id: user.id,
        staff_id: 1, // Default staff (System Admin)
        product_name: 'General Inquiry'
      });
      setConversations([conv, ...conversations]);
      setSelectedConversation(conv);
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 pt-12 pb-6 rounded-b-3xl">
          <h1 className="text-2xl font-bold">Support Chat</h1>
          <p className="text-white/80 text-sm mt-1">Get help from our support team</p>
        </div>

        <div className="px-4 mt-4">
          {selectedConversation ? (
            <Chat
              conversationId={selectedConversation.id}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <>
              {/* New Chat Button */}
              <button
                onClick={startNewConversation}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 shadow-lg"
              >
                <MessageCircle size={20} />
                Start New Chat
              </button>

              {/* Conversations List */}
              <h2 className="text-lg font-bold text-gray-900 mb-3">Previous Conversations</h2>
              {conversations.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No previous conversations</p>
                  <p className="text-sm text-gray-400 mt-1">Start a new chat to get help</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">Support Chat</p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">
                            {conv.last_message || 'No messages yet'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : 'New'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
