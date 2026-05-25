"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, X, File as FileIcon } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { getMessages, sendMessage, deleteMessage } from '@/lib/chat';
import ChatMessageComponent from './ChatMessage';
import toast from 'react-hot-toast';

interface ChatProps {
  conversationId: number;
  customerId?: number;
  onClose?: () => void;
}

export default function Chat({ conversationId, customerId, onClose }: ChatProps) {
  const { user } = useUserStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const senderType = user?.user_type === 'staff' ? 'staff' : 'customer';
  const senderId = user?.id!;

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, senderType, senderId, newMessage, 'text');
      setMessages([...messages, msg]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, senderType, senderId, '', type, file);
      setMessages([...messages, msg]);
      scrollToBottom();
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (messageId: number) => {
    if (confirm('Delete this message?')) {
      await deleteMessage(messageId, senderId);
      setMessages(messages.filter(m => m.id !== messageId));
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Chat Support</h3>
          <p className="text-xs opacity-75">Online</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === senderId && msg.sender_type === senderType}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-100 p-3 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Paperclip size={20} />
          </button>
          
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
          
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt"
          onChange={(e) => handleFileUpload(e, 'file')}
        />
      </div>
    </div>
  );
}
