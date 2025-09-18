import React, { useState } from 'react'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  replyToId?: string
}

interface ChatMessageProps {
  message: ConversationMessage
  onReply: (messageId: string, replyText: string) => void
  isTextMode?: boolean
  replyToMessage?: ConversationMessage // The message this is replying to, if any
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onReply, 
  isTextMode = false,
  replyToMessage 
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReply = async () => {
    if (!replyText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onReply(message.id, replyText.trim())
      setReplyText('')
      setShowReplyInput(false)
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleReply()
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Simple markdown processing for basic formatting
  const processMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="chat-message">
      {/* Show reply reference if this message is replying to another */}
      {replyToMessage && (
        <div className="reply-reference">
          <div className="reply-indicator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            <span>Replying to:</span>
          </div>
          <div className="reply-content">
            <span className="reply-author">{replyToMessage.role === 'user' ? 'You' : 'AI'}:</span>
            <span className="reply-text">
              {replyToMessage.content.length > 100 
                ? `${replyToMessage.content.substring(0, 100)}...` 
                : replyToMessage.content}
            </span>
          </div>
        </div>
      )}

      <div className={`message-container ${message.role}`}>
        <div className="message-header">
          <span className="message-author">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        
        <div className="message-content">
          {isTextMode ? (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: processMarkdown(message.content) 
              }} 
            />
          ) : (
            <div className="message-text">{message.content}</div>
          )}
        </div>

        <div className="message-actions">
          <button 
            className="reply-button"
            onClick={() => setShowReplyInput(!showReplyInput)}
            disabled={isSubmitting}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Reply
          </button>
        </div>

        {showReplyInput && (
          <div className="reply-input-container">
            <textarea
              className="reply-input"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your reply..."
              rows={2}
              disabled={isSubmitting}
            />
            <div className="reply-actions">
              <button 
                className="reply-cancel"
                onClick={() => {
                  setShowReplyInput(false)
                  setReplyText('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="reply-send"
                onClick={handleReply}
                disabled={!replyText.trim() || isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .chat-message {
          margin-bottom: 16px;
        }

        .reply-reference {
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-left: 3px solid #667eea;
          border-radius: 4px;
          font-size: 12px;
        }

        .reply-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #667eea;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .reply-content {
          color: #666;
          line-height: 1.4;
        }

        .reply-author {
          font-weight: 600;
          margin-right: 6px;
        }

        .reply-text {
          font-style: italic;
        }

        .message-container {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .message-container.user {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin-left: 20px;
        }

        .message-container.assistant {
          background: white;
          margin-right: 20px;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .message-author {
          font-weight: 600;
        }

        .message-container.user .message-header {
          color: rgba(255, 255, 255, 0.9);
        }

        .message-container.assistant .message-header {
          color: #666;
        }

        .message-time {
          opacity: 0.7;
        }

        .message-content {
          margin-bottom: 12px;
          line-height: 1.5;
          font-size: 14px;
        }

        .message-text {
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .message-actions {
          display: flex;
          justify-content: flex-end;
        }

        .reply-button {
          background: none;
          border: 1px solid;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .message-container.user .reply-button {
          border-color: rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.9);
        }

        .message-container.user .reply-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .message-container.assistant .reply-button {
          border-color: #e1e5e9;
          color: #666;
        }

        .message-container.assistant .reply-button:hover {
          background: #f8f9fa;
          border-color: #667eea;
          color: #667eea;
        }

        .reply-input-container {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid;
        }

        .message-container.user .reply-input-container {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .message-container.assistant .reply-input-container {
          border-color: #e1e5e9;
        }

        .reply-input {
          width: 100%;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
        }

        .reply-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .reply-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .reply-cancel, .reply-send {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .reply-cancel {
          background: #f8f9fa;
          color: #666;
        }

        .reply-cancel:hover {
          background: #e9ecef;
        }

        .reply-send {
          background: #667eea;
          color: white;
        }

        .reply-send:hover:not(:disabled) {
          background: #5a67d8;
        }

        .reply-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Markdown styling */
        .message-content strong {
          font-weight: bold;
        }

        .message-content em {
          font-style: italic;
        }

        .message-content code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
        }

        .message-container.user .message-content code {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
