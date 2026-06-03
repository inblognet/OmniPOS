"use client";

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Download, File, Image as ImageIcon } from 'lucide-react';
import { ChatMessage } from '@/lib/chat';

interface ChatMessageProps {
  message: ChatMessage;
  isOwn: boolean;
  onDownload?: (url: string, name: string) => void;
}

export default function ChatMessageComponent({ message, isOwn, onDownload }: ChatMessageProps) {
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
          <div 
            className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
            onClick={() => onDownload?.(message.file_url!, message.file_name!)}
          >
            <File size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.file_name}</p>
            </div>
            <Download size={16} className="text-gray-500" />
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap break-words">{message.message}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2 shadow-sm`}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-1 opacity-75">Support Team</p>
        )}
        {renderContent()}
        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
