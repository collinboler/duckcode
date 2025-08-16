import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { UserProfile, SignIn, SignedIn, SignedOut } from '@clerk/chrome-extension'

export const Settings = () => {
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [savedApiKey, setSavedApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [tokensUsed, setTokensUsed] = useState('--')
  const [analysisCost, setAnalysisCost] = useState('$0.00')
  const [sessionCost, setSessionCost] = useState('$0.00')
  const [recordingShortcut, setRecordingShortcut] = useState('ctrl+shift+r')
  const [isCapturingShortcut, setIsCapturingShortcut] = useState(false)

  // Load settings from storage
  useEffect(() => {
    chrome.storage.sync.get(['darkMode', 'openaiApiKey', 'tokensUsed', 'analysisCost', 'sessionCost', 'recordingShortcut'], (result) => {
      const isDarkMode = result.darkMode || false
      setDarkMode(isDarkMode)
      
      if (result.openaiApiKey) {
        setSavedApiKey('••••••••••••••••••••••••••••••••••••••••••••••••••••')
        setApiKey(result.openaiApiKey)
      }
      
      setTokensUsed(result.tokensUsed || '--')
      setAnalysisCost(result.analysisCost || '$0.00')
      setSessionCost(result.sessionCost || '$0.00')
      setRecordingShortcut(result.recordingShortcut || 'ctrl+shift+r')
      
      // Ensure dark mode is applied to body when settings page loads
      if (isDarkMode) {
        document.body.classList.add('dark-mode')
      } else {
        document.body.classList.remove('dark-mode')
      }
    })
  }, [])

  const handleToggle = (setting: string, value: boolean) => {
    chrome.storage.sync.set({ [setting]: value }, () => {
      console.log(`${setting} saved:`, value)
    })
    if (setting === 'darkMode') {
      setDarkMode(value)
      // Immediately apply dark mode class to body
      if (value) {
        document.body.classList.add('dark-mode')
      } else {
        document.body.classList.remove('dark-mode')
      }
    }
  }

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

  const handleResetSessionCost = () => {
    setTokensUsed('--')
    setAnalysisCost('$0.00')
    setSessionCost('$0.00')
    chrome.storage.sync.set({ 
      tokensUsed: '--', 
      analysisCost: '$0.00', 
      sessionCost: '$0.00' 
    })
  }

  const handleShortcutCapture = (e: React.KeyboardEvent) => {
    if (!isCapturingShortcut) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const keys = []
    if (e.ctrlKey) keys.push('ctrl')
    if (e.shiftKey) keys.push('shift')
    if (e.altKey) keys.push('alt')
    if (e.metaKey) keys.push('cmd')
    
    // Add the main key (not modifier keys)
    if (e.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      keys.push(e.key.toLowerCase())
    }
    
    if (keys.length > 1) { // At least one modifier + one key
      const shortcut = keys.join('+')
      setRecordingShortcut(shortcut)
      setIsCapturingShortcut(false)
      
      // Save to storage
      chrome.storage.sync.set({ recordingShortcut: shortcut })
    }
  }

  const startShortcutCapture = () => {
    setIsCapturingShortcut(true)
    setRecordingShortcut('Press keys...')
  }

  const cancelShortcutCapture = () => {
    setIsCapturingShortcut(false)
    // Restore previous shortcut
    chrome.storage.sync.get(['recordingShortcut'], (result) => {
      setRecordingShortcut(result.recordingShortcut || 'ctrl+shift+r')
    })
  }

  return (
    <>
      <div className="settings-page">
        <div className="header">
          <div className="header-left">
            <button 
              onClick={() => navigate('/')} 
              className="back-button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1>DuckCode Settings</h1>
          </div>
        </div>
        
        <div className="settings-content">
          {/* Authentication Section */}
          <div className="settings-section">
            <h3>Account</h3>
            <SignedOut>
              <SignIn 
                routing="virtual"
                appearance={{
                  elements: {
                    card: "auth-card",
                    socialButtonsRoot: 'auth-hidden',
                    dividerRow: 'auth-hidden',
                    rootBox: "auth-root",
                    formButtonPrimary: "auth-button"
                  }
                }}
              />
            </SignedOut>
            <SignedIn>
              <UserProfile 
                appearance={{
                  elements: {
                    card: "profile-card",
                    rootBox: "profile-root"
                  }
                }}
              />
            </SignedIn>
          </div>

          {/* OpenAI Configuration Section */}
          <div className="settings-section">
            <h3>🔑 OpenAI Configuration</h3>
            <div className="setting-item api-key-section">
              <div className="api-key-content">
                <p className="api-description">
                  Configure your OpenAI API key to enable voice interviews. 
                  <a href="https://platform.openai.com/api-keys" target="_blank" className="api-link">Get your API key here</a>
                </p>
                <div className="input-group">
                  <input 
                    type="password" 
                    placeholder="sk-..."
                    value={savedApiKey || apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setSavedApiKey('')
                    }}
                    className="api-key-field"
                  />
                  <button 
                    onClick={handleSaveApiKey}
                    disabled={saveStatus === 'saving'}
                    className={`save-btn ${saveStatus}`}
                  >
                    {saveStatus === 'saving' && '⏳'}
                    {saveStatus === 'saved' && '✅'}
                    {saveStatus === 'error' && '❌'}
                    {saveStatus === 'idle' && '💾'}
                  </button>
                  {savedApiKey && (
                    <button onClick={handleClearApiKey} className="clear-btn">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Display Settings Section */}
          <div className="settings-section">
            <h3>🎨 Display Settings</h3>
            <div className="setting-item">
              <label htmlFor="dark-mode-switch">Dark Mode</label>
              <label className="switch">
                <input 
                  type="checkbox" 
                  id="dark-mode-switch"
                  checked={darkMode}
                  onChange={(e) => handleToggle('darkMode', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {/* Recording Settings Section */}
          <div className="settings-section">
            <h3>🎤 Recording Settings</h3>
            <div className="setting-item shortcut-setting">
              <div className="shortcut-content">
                <label>Recording Shortcut</label>
                <p className="shortcut-description">
                  Hold this key combination to open modal and record your response
                </p>
                <div className="shortcut-input-group">
                  <input 
                    type="text" 
                    value={recordingShortcut}
                    readOnly
                    className="shortcut-display"
                    onKeyDown={handleShortcutCapture}
                    placeholder="Press keys..."
                  />
                  {isCapturingShortcut ? (
                    <button onClick={cancelShortcutCapture} className="shortcut-btn cancel-btn">
                      Cancel
                    </button>
                  ) : (
                    <button onClick={startShortcutCapture} className="shortcut-btn change-btn">
                      Change
                    </button>
                  )}
                </div>
                <div className="shortcut-help">
                  <p>💡 Hold the shortcut keys to open modal and record. Release to stop recording.</p>
                  <p>🖱️ You can also hold the Record button in the modal for the same functionality.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Usage Statistics Section */}
          <div className="pricing-info">
            <h3>📊 Usage Statistics</h3>
            <div className="pricing-details">
              <div className="pricing-item">
                <span className="pricing-label">Tokens used:</span>
                <span className="pricing-value">{tokensUsed}</span>
              </div>
              <div className="pricing-item">
                <span className="pricing-label">Cost:</span>
                <span className="pricing-value">{analysisCost}</span>
              </div>
              <div className="pricing-item">
                <span className="pricing-label">Total session cost:</span>
                <span className="pricing-value">{sessionCost}</span>
              </div>
              <div className="pricing-note">
                * Based on GPT-4o pricing: $2.50 per 1M input tokens
              </div>
              <button onClick={handleResetSessionCost} className="reset-cost-button">
                Reset Session Cost
              </button>
            </div>
          </div>


        </div>
      </div>

      <style jsx="true">{`
        .settings-page {
          width: 100%;
        }

        .header {
          margin-bottom: 24px;
          border-bottom: 1px solid #e1e5e9;
          padding-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;
          text-decoration: none;
        }

        .back-button:hover {
          background-color: rgba(0, 0, 0, 0.1);
          color: #333;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .settings-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .settings-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #e1e5e9;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          margin-bottom: 12px;
        }

        .settings-section h3 {
          margin: 0;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
        }



        :global(.auth-card) {
          box-shadow: none !important;
          border: 1px solid #e1e5e9 !important;
          border-radius: 8px !important;
          padding: 12px !important;
        }

        :global(.auth-hidden) {
          display: none !important;
        }

        :global(.auth-root) {
          width: 100% !important;
        }

        :global(.auth-button) {
          width: 100% !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
        }

        :global(.profile-card) {
          box-shadow: none !important;
          border: 1px solid #e1e5e9 !important;
          border-radius: 8px !important;
          padding: 8px !important;
        }

        :global(.profile-root) {
          width: 100% !important;
        }

        /* Compact profile elements */
        :global(.profile-card h3) {
          font-size: 14px !important;
          margin: 8px 0 !important;
          padding: 0 !important;
        }

        :global(.profile-card p) {
          font-size: 12px !important;
          margin: 4px 0 !important;
          line-height: 1.3 !important;
        }

        :global(.profile-card button) {
          font-size: 12px !important;
          padding: 6px 10px !important;
          margin: 4px 0 !important;
        }

        :global(.profile-card a) {
          font-size: 12px !important;
          padding: 4px 0 !important;
        }

        :global(.profile-card .cl-userProfile-root) {
          padding: 0 !important;
        }

        :global(.profile-card .cl-userProfile-section) {
          margin: 8px 0 !important;
          padding: 0 !important;
        }

        :global(.profile-card .cl-userProfile-sectionHeader) {
          margin: 4px 0 !important;
          padding: 0 !important;
        }

        :global(.profile-card .cl-userProfile-sectionContent) {
          margin: 4px 0 !important;
          padding: 0 !important;
        }

        /* Compact form elements */
        :global(.auth-card input) {
          padding: 8px 10px !important;
          font-size: 13px !important;
        }

        :global(.auth-card button) {
          padding: 8px 12px !important;
          font-size: 13px !important;
        }

        :global(.auth-card label) {
          font-size: 13px !important;
        }

        :global(.auth-card p) {
          font-size: 12px !important;
          margin: 8px 0 !important;
        }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .settings-header:hover {
          background: #f1f3f4;
        }

        .dropdown-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          margin-right: 12px;
        }

        .dropdown-toggle.expanded {
          transform: rotate(180deg);
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f3f4;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-item label {
          font-size: 13px;
          font-weight: 500;
          color: #333;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
        }

        input:checked + .slider {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        .slider.round {
          border-radius: 24px;
        }

        .slider.round:before {
          border-radius: 50%;
        }

        .settings-dropdown {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .settings-dropdown.expanded {
          max-height: 500px;
          opacity: 1;
        }

        .api-key-section {
          flex-direction: column;
          align-items: stretch;
        }

        .api-key-content {
          width: 100%;
        }

        .api-description {
          font-size: 13px;
          color: #666;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .api-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          margin-left: 4px;
        }

        .api-link:hover {
          text-decoration: underline;
        }

        .api-key-field {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .save-btn, .clear-btn {
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .save-btn.saved {
          background: #28a745 !important;
        }

        .save-btn.error {
          background: #dc3545 !important;
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .clear-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-btn:hover {
          background: #5a6268;
          transform: translateY(-1px);
        }

        .input-group {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 300px;
        }

        .input-group input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
        }

        .input-group input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }

        .input-group button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .input-group button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .pricing-info {
          background: white;
          border-radius: 12px;
          border: 1px solid #e1e5e9;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .pricing-info h3 {
          margin: 0;
          padding: 16px 20px;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
        }

        .pricing-details {
          padding: 20px;
        }

        .pricing-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .pricing-label {
          font-size: 14px;
          color: #666;
        }

        .pricing-value {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .pricing-note {
          font-size: 12px;
          color: #888;
          margin: 16px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .reset-cost-button {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-cost-button:hover {
          background: #c82333;
          transform: translateY(-1px);
        }

        .account-section .section-description {
          margin: 0;
          padding: 16px 20px;
          font-size: 14px;
          color: #666;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
        }

        .account-section :global(.clerk-card) {
          box-shadow: none !important;
          border: none !important;
          padding: 20px !important;
        }

        .account-section :global(.clerk-hidden) {
          display: none !important;
        }

        .account-section :global(.clerk-page-scroll) {
          padding: 0 !important;
        }

        .account-section :global(.clerk-page) {
          box-shadow: none !important;
        }

        .account-section :global(.clerk-root) {
          width: 100% !important;
        }

        /* Dark mode styles */
        :global(.dark-mode) .settings-page {
          background-color: #1a1a1a;
          color: #e5e5e5;
        }

        :global(.dark-mode) .header {
          border-bottom-color: #374151;
        }

        :global(.dark-mode) .header h1 {
          color: #e5e5e5;
        }

        :global(.dark-mode) .back-button {
          color: #d1d5db;
        }

        :global(.dark-mode) .back-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fff;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        :global(.dark-mode) .settings-section {
          background-color: #374151;
          border-color: #4b5563;
        }

        :global(.dark-mode) .settings-section h3 {
          background-color: #1f2937;
          color: #e5e5e5;
          border-bottom-color: #4b5563;
        }

        :global(.dark-mode) .settings-header:hover {
          background-color: #4b5563;
        }

        :global(.dark-mode) .setting-item {
          border-bottom-color: #4b5563;
        }

        :global(.dark-mode) .setting-item label {
          color: #d1d5db;
        }

        :global(.dark-mode) .slider {
          background-color: #4b5563;
        }

        :global(.dark-mode) .api-description {
          color: #d1d5db;
        }

        :global(.dark-mode) .api-link {
          color: #60a5fa;
        }

        :global(.dark-mode) .clear-btn {
          background: #6b7280;
        }

        :global(.dark-mode) .clear-btn:hover {
          background: #4b5563;
        }

        :global(.dark-mode) .input-group input {
          background-color: #374151;
          border-color: #4b5563;
          color: #e5e5e5;
        }

        :global(.dark-mode) .input-group input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
        }

        :global(.dark-mode) .pricing-info {
          background-color: #374151;
          border-color: #4b5563;
        }

        :global(.dark-mode) .pricing-info h3 {
          background-color: #1f2937;
          color: #e5e5e5;
          border-bottom-color: #4b5563;
        }

        :global(.dark-mode) .pricing-label {
          color: #d1d5db;
        }

        :global(.dark-mode) .pricing-value {
          color: #e5e5e5;
        }

        :global(.dark-mode) .pricing-note {
          background-color: #1f2937;
          color: #d1d5db;
        }

        :global(.dark-mode) .reset-cost-button:hover {
          background-color: #b91c1c;
        }

        .shortcut-setting {
          flex-direction: column;
          align-items: stretch;
        }

        .shortcut-content {
          width: 100%;
        }

        .shortcut-content label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
          display: block;
        }

        .shortcut-description {
          font-size: 12px;
          color: #666;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .shortcut-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .shortcut-display {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          background: #f8f9fa;
          color: #333;
          text-align: center;
          font-weight: 500;
        }

        .shortcut-display:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
          background: white;
        }

        .shortcut-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .change-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .change-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .cancel-btn {
          background: #6c757d;
          color: white;
        }

        .cancel-btn:hover {
          background: #5a6268;
          transform: translateY(-1px);
        }

        :global(.dark-mode) .shortcut-content label {
          color: #e5e5e5;
        }

        :global(.dark-mode) .shortcut-description {
          color: #d1d5db;
        }

        :global(.dark-mode) .shortcut-display {
          background-color: #374151;
          border-color: #4b5563;
          color: #e5e5e5;
        }

        :global(.dark-mode) .shortcut-display:focus {
          background-color: #1f2937;
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
        }

        :global(.dark-mode) .cancel-btn {
          background: #6b7280;
        }

        :global(.dark-mode) .cancel-btn:hover {
          background: #4b5563;
        }

        .shortcut-help {
          margin-top: 12px;
          padding: 12px;
          background: #f0f8ff;
          border-radius: 6px;
          border-left: 3px solid #667eea;
        }

        .shortcut-help p {
          margin: 4px 0;
          font-size: 12px;
          color: #555;
          line-height: 1.4;
        }

        :global(.dark-mode) .shortcut-help {
          background: #1e3a5f;
          border-left-color: #60a5fa;
        }

        :global(.dark-mode) .shortcut-help p {
          color: #d1d5db;
        }
      `}</style>
    </>
  )
} 