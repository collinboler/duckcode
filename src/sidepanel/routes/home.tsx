import React, { useState, useEffect } from 'react'
// Removed Clerk authentication - no auth needed

interface LeetCodeProblem {
  title: string
  difficulty: string
  description: string
  url: string
}

export const Home = () => {
  // Removed auth - now open source and available to everyone
  const [isListening, setIsListening] = useState(false)
  const [currentProblem, setCurrentProblem] = useState<LeetCodeProblem | null>(null)
  const [interviewMode, setInterviewMode] = useState(false)
  const [transcript, setTranscript] = useState('')

  // Detect if user is on a LeetCode page
  useEffect(() => {
    const detectLeetCodeProblem = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab.url?.includes('leetcode.com')) {
          const problemTitle = tab.title?.replace(' - LeetCode', '') || 'LeetCode Page'
          setCurrentProblem({
            title: problemTitle,
            difficulty: 'Medium',
            description: 'Use the floating modal on the LeetCode page',
            url: tab.url
          })
        } else {
          setCurrentProblem(null)
        }
      } catch (error) {
        console.error('Error detecting LeetCode problem:', error)
      }
    }

    detectLeetCodeProblem()
    
    const handleTabUpdate = () => {
      detectLeetCodeProblem()
    }
    
    chrome.tabs.onUpdated.addListener(handleTabUpdate)
    chrome.tabs.onActivated.addListener(handleTabUpdate)
    
    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate)
      chrome.tabs.onActivated.removeListener(handleTabUpdate)
    }
  }, [])

  const startInterview = async () => {
    if (!isSignedIn) {
      setTranscript('Please sign in to start a mock interview. Go to Settings to create an account or sign in.')
      return
    }

    if (!currentProblem) {
      setTranscript('Please navigate to a LeetCode problem page to start the interview.')
      return
    }

    setInterviewMode(true)
    setTranscript('Interview started! The AI interviewer will begin shortly...')
  }

  const stopInterview = () => {
    setInterviewMode(false)
    setIsListening(false)
    setTranscript('Interview ended. Great job practicing!')
  }

  const toggleListening = () => {
    setIsListening(!isListening)
  }

  return (
    <>
      <div className="main-section">
        {!isSignedIn && (
          <div className="welcome-section">
            <div className="welcome-card">
              <h2>Welcome to DuckCode!</h2>
              <p>Practice coding interviews with voice-to-voice AI feedback</p>
              <p>Navigate to a LeetCode problem and start your mock interview</p>
              <div className="sign-in-hint">
                Sign in via Settings to unlock all features
              </div>
            </div>
          </div>
        )}

        {currentProblem ? (
          <div className="problem-detected">
            <div className="problem-card">
              <div className="problem-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                <span>LeetCode Page Detected</span>
              </div>
              <div className="problem-content">
                <div>
                  <h3>Modal Available!</h3>
                  <p style={{margin: '8px 0 0 0', fontSize: '13px', color: '#666'}}>
                    Look for the draggable DuckCode modal on your LeetCode page
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-problem">
            <div className="no-problem-card">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <p>Navigate to a LeetCode problem to start practicing</p>
            </div>
          </div>
        )}

        {!interviewMode ? (
          <button 
            className={`interview-button ${!currentProblem || !isSignedIn ? 'disabled' : ''}`}
            onClick={startInterview}
            disabled={!currentProblem || !isSignedIn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <span>Start Mock Interview</span>
          </button>
        ) : (
          <div className="interview-controls">
            <button 
              className={`listen-button ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              <span>{isListening ? 'Stop Listening' : 'Start Speaking'}</span>
            </button>
            
            <button className="stop-button" onClick={stopInterview}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              <span>End Interview</span>
            </button>
          </div>
        )}

        {transcript && (
          <div className="transcript-area">
            <div className="transcript-card">
              <div className="transcript-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Interview Transcript</span>
              </div>
              <div className="transcript-content">
                {transcript}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx={true}>{`
        .welcome-section {
          padding: 20px 0;
        }
        
        .welcome-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .welcome-card h2 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
        }
        
        .welcome-card p {
          margin: 8px 0;
          opacity: 0.9;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .sign-in-hint {
          background: rgba(255,255,255,0.1);
          padding: 12px;
          border-radius: 8px;
          margin-top: 16px !important;
          font-size: 13px !important;
        }

        .main-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .problem-detected, .no-problem {
          width: 100%;
        }

        .problem-card, .no-problem-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e1e5e9;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .problem-header {
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

        .problem-content {
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .problem-content h3 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }

        .difficulty {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .difficulty.easy {
          background: #d4edda;
          color: #155724;
        }

        .difficulty.medium {
          background: #fff3cd;
          color: #856404;
        }

        .difficulty.hard {
          background: #f8d7da;
          color: #721c24;
        }

        .no-problem-card {
          padding: 40px 20px;
          text-align: center;
          color: #666;
        }

        .no-problem-card svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .no-problem-card p {
          margin: 0;
          font-size: 14px;
        }

        .interview-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          color: white;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .interview-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }

        .interview-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
        }

        .interview-controls {
          display: flex;
          gap: 12px;
        }

        .listen-button, .stop-button {
          flex: 1;
          border: none;
          border-radius: 12px;
          padding: 16px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .listen-button {
          background: #28a745;
          color: white;
        }

        .listen-button.listening {
          background: #dc3545;
          animation: pulse 2s infinite;
        }

        .stop-button {
          background: #6c757d;
          color: white;
        }

        .listen-button:hover, .stop-button:hover {
          transform: translateY(-1px);
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .transcript-area {
          width: 100%;
        }

        .transcript-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e1e5e9;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .transcript-header {
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

        .transcript-content {
          padding: 16px;
          color: #333;
          font-size: 14px;
          line-height: 1.5;
          min-height: 100px;
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>
    </>
  )
}