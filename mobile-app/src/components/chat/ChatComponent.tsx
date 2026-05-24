"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, CheckCheck } from 'lucide-react';
import api from '@/lib/api';
import { useUserStore } from '@/store/useUserStore';
import toast from 'react-hot-toast';

interface Message {
  id: number;
  sender_id: number;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatProps {
  conversationId?: number;
  orderId?: number;
  customerId?: number;
}

export default function ChatComponent({ conversationId, orderId, customerId }: ChatProps) {
  const { user } = useUserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    fetchMessages();
    connectWebSocket();
    
    return () => {
      if (ws) ws.close();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    const token = localStorage.getItem('mobile_token');
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    const socket = new WebSocket(`${wsUrl}/ws/chat?token=${token}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message]);
      }
    };
    
    setWs(socket);
  };

  const fetchMessages = async () => {
    try {
      let url = '';
      if (conversationId) {
        url = `/mobile/chat/messages/${conversationId}`;
      } else if (orderId) {
        url = `/mobile/chat/order/${orderId}`;
      } else if (customerId) {
        url = `/mobile/chat/customer/${customerId}`;
      }
      
      if (url) {
        const res = await api.get(url);
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const res = await api.post('/mobile/chat/send', {
        conversation_id: conversationId,
        order_id: orderId,
        customer_id: customerId,
        message: newMessage,
        sender_type: user?.user_type === 'staff' ? 'staff' : 'customer'
      });
      
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.message]);
        setNewMessage('');
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'message_sent', message: res.data.message }));
        }
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStaff = msg.sender_type === 'staff';
            const isCurrentUser = (isStaff && user?.user_type === 'staff') || 
                                  (!isStaff && user?.user_type === 'customer');
            
            return (
              <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2`}>
                  <p className="text-sm">{msg.message}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${isCurrentUser ? 'text-blue-200' : 'text-gray-400'}`}>
                    <Clock size={10} />
                    <span>{formatTime(msg.created_at)}</span>
                    {isCurrentUser && msg.is_read && <CheckCheck size={12} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-100 p-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
