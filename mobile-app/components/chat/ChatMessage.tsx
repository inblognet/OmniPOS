"use client";

import React, { useState } from 'react';
import { Download, Trash2, Check, CheckCheck, File, Image as ImageIcon, Mic, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: 'customer' | 'staff' | 'system';
  sender_id: number;
  message: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  created_at: string;
}

interface ChatMessageProps {
  message: ChatMessage;
  isOwn: boolean;
  onDelete?: (id: number) => void;
  onDownload?: (url: string, name: string) => void;
}

export default function ChatMessageComponent({ message, isOwn, onDelete, onDownload }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="mt-2">
            {!imageLoaded && <div className="w-48 h-48 bg-gray-200 rounded-lg animate-pulse" />}
            <img
              src={message.file_url}
              alt="Shared"
              className={`max-w-[200px] max-h-[200px] rounded-lg cursor-pointer ${!imageLoaded ? 'hidden' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onClick={() => window.open(message.file_url, '_blank')}
            />
          </div>
        );
      case 'file':
        return (
          <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg cursor-pointer" onClick={() => onDownload?.(message.file_url!, message.file_name!)}>
            <File size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.file_name}</p>
              <p className="text-xs text-gray-500">{message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'File'}</p>
            </div>
            <Download size={16} className="text-gray-500" />
          </div>
        );
      case 'voice':
        return (
          <div className="mt-2">
            <audio controls className="w-full max-w-[200px]">
              <source src={message.file_url} />
            </audio>
          </div>
        );
      case 'url':
        return (
          <a href={message.message} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
            {message.message}
          </a>
        );
      default:
        return <p className="whitespace-pre-wrap break-words">{message.message}</p>;
    }
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[75%] ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2 shadow-sm`}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-1 opacity-75">
            {message.sender_type === 'staff' ? 'Support Team' : 'Customer'}
          </p>
        )}
        
        <div className="flex-1">{renderContent()}</div>
        
        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
          {isOwn && (
            message.is_read ? <CheckCheck size={12} /> : <Check size={12} />
          )}
        </div>
      </div>
      
      {showActions && isOwn && onDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
