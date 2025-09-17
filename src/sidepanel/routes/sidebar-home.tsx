import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type: 'voice' | 'text'
}

interface PersonalitySettings {
  mode: 'sage' | 'interviewer'
  sageRevelation: boolean
}

export const SidebarHome = () => {
  const navigate = useNavigate()
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [textInput, setTextInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [personalitySettings, setPersonalitySettings] = useState<PersonalitySettings>({
    mode: 'interviewer',
    sageRevelation: false
  })
  const [isExpanded, setIsExpanded] = useState(true)

  // Load settings and conversation from storage
  useEffect(() => {
    chrome.storage.sync.get(['textMode', 'personalityMode', 'sageRevelation'], (result) => {
      setTextMode(result.textMode || false)
      setPersonalitySettings({
        mode: result.personalityMode || 'interviewer',
        sageRevelation: result.sageRevelation || false
      })
    })

    // Load current conversation from storage
    chrome.storage.local.get(['currentConversation'], (result) => {
      if (result.currentConversation) {
        setConversation(result.currentConversation.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      }
    })
  }, [])

  // Listen for new messages from the content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === 'aiResponse') {
        const newMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: message.content,
          timestamp: new Date(),
          type: textMode ? 'text' : 'voice'
        }
        setConversation(prev => {
          const updated = [...prev, newMessage]
          // Save to storage
          chrome.storage.local.set({ currentConversation: updated })
          return updated
        })
      }
      
      if (message.action === 'userMessage') {
        const newMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: message.content,
          timestamp: new Date(),
          type: textMode ? 'text' : 'voice'
        }
        setConversation(prev => {
          const updated = [...prev, newMessage]
          // Save to storage
          chrome.storage.local.set({ currentConversation: updated })
          return updated
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [textMode])

  // Save conversation to history when it gets substantial
  useEffect(() => {
    if (conversation.length >= 4) { // Save after 4+ messages (2 exchanges)
      const saveConversation = () => {
        const session = {
          id: Date.now().toString(),
          title: `${personalitySettings.mode === 'sage' ? 'Sage' : 'Interview'} Session - ${new Date().toLocaleDateString()}`,
          timestamp: new Date(),
          mode: textMode ? 'text' as const : 'voice' as const,
          personalityMode: personalitySettings.mode,
          messageCount: conversation.length,
          lastMessage: conversation[conversation.length - 1]?.content.substring(0, 100) + '...' || '',
          messages: conversation
        }

        chrome.storage.local.get(['conversationHistory'], (result) => {
          const history = result.conversationHistory || []
          const existingIndex = history.findIndex((s: any) => s.id === session.id)
          
          if (existingIndex >= 0) {
            history[existingIndex] = session
          } else {
            history.push(session)
          }
          
          // Keep only last 50 conversations
          const trimmedHistory = history.slice(-50)
          chrome.storage.local.set({ conversationHistory: trimmedHistory })
        })
      }

      // Debounce saving to avoid too frequent updates
      const timeoutId = setTimeout(saveConversation, 2000)
      return () => clearTimeout(timeoutId)
    }
  }, [conversation, personalitySettings.mode, textMode])

  const handleSendText = () => {
    if (!textInput.trim()) return

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textInput,
      timestamp: new Date(),
      type: 'text'
    }
    
    setConversation(prev => {
      const updated = [...prev, userMessage]
      chrome.storage.local.set({ currentConversation: updated })
      return updated
    })

    // Send to content script for processing
    chrome.runtime.sendMessage({
      action: 'processUserInput',
      content: textInput
    })

    setTextInput('')
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    chrome.runtime.sendMessage({ action: 'startRecording' })
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    chrome.runtime.sendMessage({ action: 'stopRecording' })
  }

  const getPersonalityDisplay = () => {
    const emoji = personalitySettings.mode === 'sage' ? '🧙‍♂️' : '💪'
    const name = personalitySettings.mode === 'sage' ? 'Sage' : 'Interviewer'
    const revelation = personalitySettings.mode === 'sage' 
      ? ` (${personalitySettings.sageRevelation ? 'Full Solutions' : 'Hints Only'})` 
      : ''
    return `${emoji} ${name}${revelation}`
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="sidebar-home">
      {/* Header with Navigation */}
      <div className="sidebar-header">
        <div className="header-left">
          <h2>DuckCode Chat</h2>
          <span className="personality-indicator">{getPersonalityDisplay()}</span>
        </div>
        <div className="header-buttons">
          <button
            className="icon-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isExpanded ? (
                <polyline points="18,15 12,9 6,15"/>
              ) : (
                <polyline points="6,9 12,15 18,9"/>
              )}
            </svg>
          </button>
          <Link to="/history" className="icon-button" title="History">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </Link>
          <Link to="/settings" className="icon-button" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
              <path d="m1 12 6 0m6 0 6 0"/>
            </svg>
          </Link>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Conversation Area */}
          <div className="conversation-area">
            {conversation.length === 0 ? (
              <div className="empty-state">
                <div className="duck-icon">🦆</div>
                <h3>Ready to help with coding!</h3>
                <p>
                  {textMode 
                    ? "Type your question below to get started." 
                    : "Click the record button to start a voice conversation."
                  }
                </p>
                <p className="mode-indicator">
                  Mode: {textMode ? '💬 Text' : '🎤 Voice'} | {getPersonalityDisplay()}
                </p>
              </div>
            ) : (
              <div className="messages">
                {conversation.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.role}`}
                  >
                    <div className="message-header">
                      <span className="sender">
                        {message.role === 'user' ? 'You' : getPersonalityDisplay()}
                      </span>
                      <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                      <span className="type-indicator">
                        {message.type === 'voice' ? '🎤' : '💬'}
                      </span>
                    </div>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="input-area">
            {textMode ? (
              <div className="text-input-container">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Ask a coding question..."
                  className="text-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendText()
                    }
                  }}
                />
                <button 
                  onClick={handleSendText}
                  disabled={!textInput.trim()}
                  className="send-button"
                  title="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="voice-input-container">
                <button
                  className={`record-button ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isRecording ? (
                      <rect x="6" y="4" width="12" height="16" rx="2"/>
                    ) : (
                      <>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </>
                    )}
                  </svg>
                  <span>{isRecording ? 'Stop Recording' : 'Hold to Record'}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .sidebar-home {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8f9fa;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #e1e5e9;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .header-left h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .personality-indicator {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }

        .header-buttons {
          display: flex;
          gap: 8px;
        }

        .icon-button {
          background: none;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          color: #666;
          transition: all 0.2s ease;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-button:hover {
          background: #f0f0f0;
          color: #333;
        }

        .conversation-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .duck-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #333;
        }

        .empty-state p {
          margin: 8px 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .mode-indicator {
          font-size: 12px;
          font-weight: 600;
          color: #007bff;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          background: white;
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid #e1e5e9;
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

        .type-indicator {
          font-size: 10px;
        }

        .message-content {
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          white-space: pre-wrap;
        }

        .input-area {
          padding: 16px;
          background: white;
          border-top: 1px solid #e1e5e9;
        }

        .text-input-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .text-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e1e5e9;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          resize: none;
        }

        .text-input:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }

        .send-button {
          background: #007bff;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s ease;
        }

        .send-button:hover:not(:disabled) {
          background: #0056b3;
          transform: scale(1.05);
        }

        .send-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .voice-input-container {
          display: flex;
          justify-content: center;
        }

        .record-button {
          background: #28a745;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .record-button.recording {
          background: #dc3545;
          animation: pulse 2s infinite;
        }

        .record-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
        }

        .record-button.recording:hover {
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
