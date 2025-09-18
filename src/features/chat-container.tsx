import React, { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  replyToId?: string
}

interface ChatContainerProps {
  messages: ConversationMessage[]
  onReply: (messageId: string, replyText: string) => Promise<void>
  isTextMode?: boolean
  className?: string
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  messages, 
  onReply, 
  isTextMode = false,
  className = '' 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Helper function to find the message being replied to
  const findReplyToMessage = (replyToId?: string): ConversationMessage | undefined => {
    if (!replyToId) return undefined
    return messages.find(msg => msg.id === replyToId)
  }

  if (messages.length === 0) {
    return (
      <div className={`chat-container empty ${className}`}>
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No messages yet</p>
          <p className="empty-subtitle">Start a conversation to see messages here</p>
        </div>

        <style jsx>{`
          .chat-container.empty {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            background: white;
            border-radius: 12px;
            border: 1px solid #e1e5e9;
          }

          .empty-state {
            text-align: center;
            color: #666;
          }

          .empty-state svg {
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .empty-state p {
            margin: 0;
            font-size: 14px;
          }

          .empty-subtitle {
            font-size: 12px !important;
            opacity: 0.7;
            margin-top: 4px !important;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`chat-container ${className}`}>
      <div className="chat-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Conversation ({messages.length} messages)</span>
      </div>
      
      <div className="chat-messages" ref={scrollRef}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onReply={onReply}
            isTextMode={isTextMode}
            replyToMessage={findReplyToMessage(message.replyToId)}
          />
        ))}
      </div>

      <style jsx>{`
        .chat-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e1e5e9;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .chat-header {
          background: #f8f9fa;
          padding: 12px 16px;
          border-bottom: 1px solid #e1e5e9;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #495057;
          font-size: 14px;
        }

        .chat-messages {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
          min-height: 100px;
        }

        .chat-messages::-webkit-scrollbar {
          width: 8px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  )
}
