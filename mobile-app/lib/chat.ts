import api from './api';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: 'customer' | 'staff' | 'system';
  sender_id: number;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'url' | 'product' | 'invoice';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  staff_id?: number;
  staff_name?: string;
  product_id?: number;
  product_name?: string;
  product_price?: number;
  product_image?: string;
  status: string;
  last_message?: string;
  last_message_at?: string;
  customer_unread: number;
  staff_unread: number;
  unread_count?: number;
  created_at: string;
}

export interface ChatTemplate {
  id: number;
  title: string;
  message: string;
  category: string;
  is_active: boolean;
}

// Conversations
export const getStaffConversations = async (): Promise<ChatConversation[]> => {
  const res = await api.get('/chat/staff/conversations');
  return res.data.conversations;
};

export const getCustomerConversations = async (customerId: number): Promise<ChatConversation[]> => {
  const res = await api.get(`/chat/customer/conversations/${customerId}`);
  return res.data.conversations;
};

export const createConversation = async (data: {
  customer_id: number;
  staff_id?: number;
  product_id?: number;
  product_name?: string;
  product_price?: number;
  product_image?: string;
}): Promise<ChatConversation> => {
  const res = await api.post('/chat/conversations', data);
  return res.data.conversation;
};

// Messages
export const getMessages = async (conversationId: number, limit?: number, offset?: number): Promise<ChatMessage[]> => {
  const params: any = {};
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  const res = await api.get(`/chat/messages/${conversationId}`, { params });
  return res.data.messages;
};

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

export const deleteMessage = async (messageId: number, deletedBy: number): Promise<void> => {
  await api.delete(`/chat/messages/${messageId}`, { data: { deleted_by: deletedBy } });
};

// Templates
export const getTemplates = async (): Promise<ChatTemplate[]> => {
  const res = await api.get('/chat/templates');
  return res.data.templates;
};

export const createTemplate = async (data: { title: string; message: string; category: string; created_by: number }): Promise<ChatTemplate> => {
  const res = await api.post('/chat/templates', data);
  return res.data.template;
};

export const updateTemplate = async (id: number, data: { title?: string; message?: string; category?: string; is_active?: boolean }): Promise<void> => {
  await api.put(`/chat/templates/${id}`, data);
};

export const deleteTemplate = async (id: number): Promise<void> => {
  await api.delete(`/chat/templates/${id}`);
};

// Scheduled Messages
export const createScheduledMessage = async (data: {
  title: string;
  message: string;
  send_to: string;
  scheduled_for: string;
  created_by: number;
}): Promise<any> => {
  const res = await api.post('/chat/scheduled-messages', data);
  return res.data.scheduled;
};

export const getScheduledMessages = async (): Promise<any[]> => {
  const res = await api.get('/chat/scheduled-messages');
  return res.data.scheduled;
};

// Customer Segments
export const getCustomerSegments = async (): Promise<any[]> => {
  const res = await api.get('/chat/customer-segments');
  return res.data.segments;
};
