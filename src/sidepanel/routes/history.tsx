import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type: 'voice' | 'text'
}

interface ConversationSession {
  id: string
  title: string
  timestamp: Date
  mode: 'voice' | 'text'
  personalityMode: 'sage' | 'interviewer'
  messageCount: number
  lastMessage: string
  messages: ConversationMessage[]
}

export const History = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load conversation history from storage
  useEffect(() => {
    chrome.storage.local.get(['conversationHistory'], (result) => {
      if (result.conversationHistory) {
        const sessions = result.conversationHistory.map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
        setSessions(sessions.sort((a: ConversationSession, b: ConversationSession) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ))
      }
      setIsLoading(false)
    })
  }, [])

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSessionSelect = (session: ConversationSession) => {
    setSelectedSession(session)
  }

  const handleResumeSession = (session: ConversationSession) => {
    // Set this session as the current conversation
    chrome.storage.local.set({ currentConversation: session.messages }, () => {
      // Navigate back to home
      navigate('/')
    })
  }

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId)
    setSessions(updatedSessions)
    
    // Update storage
    chrome.storage.local.set({ conversationHistory: updatedSessions })
    
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getPersonalityEmoji = (mode: 'sage' | 'interviewer') => {
    return mode === 'sage' ? '🧙‍♂️' : '💪'
  }

  const getModeEmoji = (mode: 'voice' | 'text') => {
    return mode === 'voice' ? '🎤' : '💬'
  }

  if (selectedSession) {
    return (
      <div className="history-detail">
        {/* Header */}
        <div className="detail-header">
          <button 
            className="back-button"
            onClick={() => setSelectedSession(null)}
          >
            ← Back to History
          </button>
          <div className="session-info">
            <h2>{selectedSession.title}</h2>
            <div className="session-meta">
              <span>{getModeEmoji(selectedSession.mode)} {selectedSession.mode}</span>
              <span>{getPersonalityEmoji(selectedSession.personalityMode)} {selectedSession.personalityMode}</span>
              <span>{formatDate(selectedSession.timestamp)}</span>
            </div>
          </div>
          <div className="actions">
            <button 
              className="resume-button"
              onClick={() => handleResumeSession(selectedSession)}
            >
              Resume
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="conversation-detail">
          {selectedSession.messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}`}
            >
              <div className="message-header">
                <span className="sender">
                  {message.role === 'user' ? 'You' : `${getPersonalityEmoji(selectedSession.personalityMode)} ${selectedSession.personalityMode}`}
                </span>
                <span className="timestamp">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <style>{`
          .history-detail {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #f8f9fa;
          }

          .detail-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 16px;
            background: white;
            border-bottom: 1px solid #e1e5e9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          .back-button {
            background: none;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            color: #666;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .back-button:hover {
            background: #f0f0f0;
            color: #333;
          }

          .session-info {
            flex: 1;
          }

          .session-info h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
          }

          .session-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          }

          .resume-button {
            background: #007bff;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .resume-button:hover {
            background: #0056b3;
            transform: translateY(-1px);
          }

          .conversation-detail {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }

          .message {
            background: white;
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border: 1px solid #e1e5e9;
            margin-bottom: 12px;
          }

          .message.user {
            background: #e3f2fd;
            border-color: #bbdefb;
            margin-left: 20px;
          }

          .message.assistant {
            background: #f3e5f5;
            border-color: #e1bee7;
            margin-right: 20px;
          }

          .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
          }

          .sender {
            font-weight: 600;
            color: #333;
          }

          .timestamp {
            color: #666;
          }

          .message-content {
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            white-space: pre-wrap;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="history">
      {/* Header */}
      <div className="history-header">
        <Link to="/" className="back-button">
          ← Back to Chat
        </Link>
        <h2>Conversation History</h2>
      </div>

      {/* Search */}
      <div className="search-section">
        <div className="search-container">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="sessions-list">
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading conversations...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <div className="search-icon">🔍</div>
                <h3>No conversations found</h3>
                <p>Try adjusting your search terms</p>
              </>
            ) : (
              <>
                <div className="duck-icon">🦆</div>
                <h3>No conversation history</h3>
                <p>Your past conversations will appear here</p>
              </>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className="session-item"
              onClick={() => handleSessionSelect(session)}
            >
              <div className="session-content">
                <div className="session-header">
                  <h3>{session.title}</h3>
                  <div className="session-badges">
                    <span className="mode-badge">
                      {getModeEmoji(session.mode)} {session.mode}
                    </span>
                    <span className="personality-badge">
                      {getPersonalityEmoji(session.personalityMode)}
                    </span>
                  </div>
                </div>
                <p className="last-message">{session.lastMessage}</p>
                <div className="session-footer">
                  <span className="message-count">{session.messageCount} messages</span>
                  <span className="timestamp">{formatDate(session.timestamp)}</span>
                </div>
              </div>
              <div className="session-actions">
                <button
                  className="action-button resume"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleResumeSession(session)
                  }}
                  title="Resume conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21 5,3"/>
                  </svg>
                </button>
                <button
                  className="action-button delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSession(session.id)
                  }}
                  title="Delete conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .history {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8f9fa;
        }

        .history-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #e1e5e9;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .back-button {
          background: none;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          color: #666;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: #f0f0f0;
          color: #333;
        }

        .history-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .search-section {
          padding: 16px;
          background: white;
          border-bottom: 1px solid #e1e5e9;
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-container svg {
          position: absolute;
          left: 12px;
          color: #666;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          padding: 10px 16px 10px 40px;
          border: 1px solid #e1e5e9;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
        }

        .search-input:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }

        .sessions-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #666;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 2px solid #e1e5e9;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }

        .duck-icon, .search-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #333;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .session-item {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid #e1e5e9;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .session-item:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }

        .session-content {
          flex: 1;
          min-width: 0;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .session-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .session-badges {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .mode-badge, .personality-badge {
          background: #f0f0f0;
          color: #666;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .last-message {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .session-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #999;
        }

        .session-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-left: 12px;
        }

        .action-button {
          background: none;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-button.resume {
          color: #28a745;
        }

        .action-button.resume:hover {
          background: #d4edda;
        }

        .action-button.delete {
          color: #dc3545;
        }

        .action-button.delete:hover {
          background: #f8d7da;
        }
      `}</style>
    </div>
  )
}
