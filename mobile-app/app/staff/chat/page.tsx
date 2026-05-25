"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Users, Send, Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { getStaffConversations, getTemplates, deleteTemplate, ChatConversation, ChatTemplate } from '@/lib/chat';
import Chat from '@/components/chat/Chat';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import toast from 'react-hot-toast';

type TabType = 'conversations' | 'templates' | 'scheduled';

export default function StaffChatPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: '', message: '', category: '' });

  useEffect(() => {
    if (user?.user_type !== 'staff') {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [convs, temps] = await Promise.all([
        getStaffConversations(),
        getTemplates()
      ]);
      setConversations(convs);
      setTemplates(temps);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.title || !templateForm.message) {
      toast.error('Title and message are required');
      return;
    }
    
    try {
      const res = await fetch('/api/chat/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateForm,
          created_by: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Template created');
        setShowTemplateModal(false);
        setTemplateForm({ title: '', message: '', category: '' });
        loadData();
      }
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      toast.success('Template deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const getUnreadCount = (conv: ChatConversation) => {
    return conv.staff_unread || 0;
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
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'scheduled'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Clock size={18} />
            Scheduled
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
                  customerId={selectedConversation.customer_id}
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Quick Reply Templates</h3>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Add Template
              </button>
            </div>
            
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{template.title}</h4>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {template.category || 'General'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{template.message}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(template.message);
                      toast.success('Copied to clipboard');
                    }}
                    className="mt-2 text-xs text-blue-600"
                  >
                    Copy to clipboard
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="flex-1 overflow-y-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-800">
                📅 Scheduled messages will be sent to customers based on their segments.
              </p>
            </div>
            
            <div className="text-center text-gray-400 py-8">
              No scheduled messages yet
            </div>
          </div>
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">New Template</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Template Title"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Message Content"
                  value={templateForm.message}
                  onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <input
                  type="text"
                  placeholder="Category (e.g., greeting, shipping)"
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="flex-1 py-2 bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffMobileLayout>
  );
}
