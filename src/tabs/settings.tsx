import React, { useState, useEffect } from 'react'
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from '@clerk/chrome-extension'

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const EXTENSION_URL = chrome.runtime.getURL('.')

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

const SettingsContent = () => {
  const { user } = useUser()
  const [apiKey, setApiKey] = useState('')
  const [savedApiKey, setSavedApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    // Load saved API key
    chrome.storage.sync.get(['openaiApiKey']).then((result) => {
      if (result.openaiApiKey) {
        setSavedApiKey('••••••••••••••••••••••••••••••••••••••••••••••••••••')
        setApiKey(result.openaiApiKey)
      }
    })
  }, [])

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    try {
      await chrome.storage.sync.set({ openaiApiKey: apiKey })
      setSavedApiKey('••••••••••••••••••••••••••••••••••••••••••••••••••••')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save API key:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const handleClearApiKey = async () => {
    try {
      await chrome.storage.sync.remove(['openaiApiKey'])
      setApiKey('')
      setSavedApiKey('')
      setSaveStatus('idle')
    } catch (error) {
      console.error('Failed to clear API key:', error)
    }
  }

  return (
    <div className="settings-container">
      <header className="settings-header">
        <div className="header-content">
          <div className="logo">🦆</div>
          <h1>DuckCode Settings</h1>
        </div>
        <div className="auth-section">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="sign-in-btn">Sign In</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="user-info">
              <span>Welcome, {user?.firstName}!</span>
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </header>

      <main className="settings-main">
        <SignedOut>
          <div className="auth-required">
            <h2>Authentication Required</h2>
            <p>Please sign in to access your settings.</p>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="settings-section">
            <h2>OpenAI Configuration</h2>
            <p className="section-description">
              Configure your OpenAI API key to enable voice interviews. Your API key is stored securely in your browser.
            </p>
            
            <div className="form-group">
              <label htmlFor="apiKey">OpenAI API Key</label>
              <div className="api-key-input">
                <input
                  id="apiKey"
                  type="password"
                  value={savedApiKey || apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setSavedApiKey('')
                  }}
                  placeholder="sk-..."
                  className="api-key-field"
                />
                <div className="api-key-actions">
                  <button
                    onClick={handleSaveApiKey}
                    disabled={saveStatus === 'saving'}
                    className={`save-btn ${saveStatus}`}
                  >
                    {saveStatus === 'saving' && '⏳ Saving...'}
                    {saveStatus === 'saved' && '✅ Saved'}
                    {saveStatus === 'error' && '❌ Error'}
                    {saveStatus === 'idle' && '💾 Save'}
                  </button>
                  {savedApiKey && (
                    <button onClick={handleClearApiKey} className="clear-btn">
                      🗑️ Clear
                    </button>
                  )}
                </div>
              </div>
              <small className="help-text">
                Get your API key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  OpenAI Platform
                </a>
              </small>
            </div>
          </div>

          <div className="settings-section">
            <h2>About DuckCode</h2>
            <p>
              DuckCode is a voice-to-voice mock coding interviewer that helps you practice technical interviews
              on LeetCode problems. It uses OpenAI's GPT-4, Whisper, and TTS models to provide a realistic
              interview experience.
            </p>
            
            <div className="features-list">
              <div className="feature">
                <span className="feature-icon">🎤</span>
                <span>Voice recognition with Whisper</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🤖</span>
                <span>AI interviewer powered by GPT-4</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🔊</span>
                <span>Text-to-speech responses</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📝</span>
                <span>Real-time transcript</span>
              </div>
            </div>
          </div>
        </SignedIn>
      </main>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }

        .settings-container {
          max-width: 800px;
          margin: 0 auto;
          min-height: 100vh;
          background: white;
          box-shadow: 0 0 50px rgba(0, 0, 0, 0.1);
        }

        .settings-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          font-size: 32px;
        }

        .settings-header h1 {
          font-size: 24px;
          font-weight: 600;
        }

        .auth-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sign-in-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .sign-in-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
        }

        .settings-main {
          padding: 32px;
        }

        .auth-required {
          text-align: center;
          padding: 64px 32px;
        }

        .auth-required h2 {
          color: #333;
          margin-bottom: 12px;
        }

        .auth-required p {
          color: #666;
        }

        .settings-section {
          margin-bottom: 48px;
        }

        .settings-section h2 {
          color: #333;
          font-size: 20px;
          margin-bottom: 8px;
        }

        .section-description {
          color: #666;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          color: #333;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .api-key-input {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .api-key-field {
          flex: 1;
          min-width: 300px;
          padding: 12px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .api-key-field:focus {
          outline: none;
          border-color: #667eea;
        }

        .api-key-actions {
          display: flex;
          gap: 8px;
        }

        .save-btn, .clear-btn {
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .save-btn {
          background: #28a745;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .save-btn.saved {
          background: #28a745;
        }

        .save-btn.error {
          background: #dc3545;
        }

        .clear-btn {
          background: #6c757d;
          color: white;
        }

        .clear-btn:hover {
          background: #5a6268;
          transform: translateY(-1px);
        }

        .help-text {
          display: block;
          color: #666;
          font-size: 12px;
          margin-top: 8px;
        }

        .help-text a {
          color: #667eea;
          text-decoration: none;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        .features-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .feature-icon {
          font-size: 20px;
        }

        @media (max-width: 768px) {
          .settings-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .settings-main {
            padding: 24px 16px;
          }

          .api-key-input {
            flex-direction: column;
          }

          .api-key-field {
            min-width: unset;
          }

          .features-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

const SettingsPage = () => {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={`${EXTENSION_URL}/tabs/settings.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/tabs/settings.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/tabs/settings.html`}
    >
      <SettingsContent />
    </ClerkProvider>
  )
}

export default SettingsPage