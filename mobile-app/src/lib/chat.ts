import api from './api';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: string;
  sender_id: number;
  message: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  is_read: boolean;
}

export interface ChatConversation {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  product_id?: number;
  product_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  status: string;
}

export interface ChatTemplate {
  id: number;
  title: string;
  message: string;
  category: string;
}

// Get all conversations for staff
export const getStaffConversations = async (): Promise<ChatConversation[]> => {
  const res = await api.get('/chat/staff/conversations');
  return res.data.conversations;
};

// Get messages for a conversation
export const getMessages = async (conversationId: number): Promise<ChatMessage[]> => {
  const res = await api.get(`/chat/messages/${conversationId}`);
  return res.data.messages;
};

// Send a message
export const sendMessage = async (
  conversationId: number,
  senderType: string,
  senderId: number,
  message: string,
  messageType: string = 'text',
  file?: File
): Promise<ChatMessage> => {
  const formData = new FormData();
  formData.append('conversation_id', conversationId.toString());
  formData.append('sender_type', senderType);
  formData.append('sender_id', senderId.toString());
  formData.append('message', message);
  formData.append('message_type', messageType);
  if (file) formData.append('file', file);
  
  const res = await api.post('/chat/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data.message;
};

// Create a new conversation
export const createConversation = async (data: {
  customer_id: number;
  product_id?: number;
  product_name?: string;
  product_price?: number;
}): Promise<ChatConversation> => {
  const res = await api.post('/chat/conversations', data);
  return res.data.conversation;
};

// Get message templates
export const getTemplates = async (): Promise<ChatTemplate[]> => {
  const res = await api.get('/chat/templates');
  return res.data.templates;
};
