import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
// Removed Clerk authentication - no auth needed

export const Settings = () => {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState('')
  const [savedApiKey, setSavedApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [gptModel, setGptModel] = useState('gpt-4')
  const [personalityMode, setPersonalityMode] = useState<'sage' | 'interviewer'>('interviewer')
  const [sageRevelation, setSageRevelation] = useState(false) // true = full solutions, false = hints only

  // Load settings from storage
  useEffect(() => {
    chrome.storage.sync.get(['openaiApiKey', 'textMode', 'personalityMode', 'sageRevelation'], (result) => {      
      if (result.openaiApiKey) {
        setSavedApiKey('••••••••••••••••••••••••••••••••••••••••••••••••••••')
        setApiKey(result.openaiApiKey)
      }
      
      setTextMode(result.textMode || false)
      setPersonalityMode(result.personalityMode || 'interviewer')
      setSageRevelation(result.sageRevelation || false)
    })
  }, [])

  const handleToggle = (setting: string, value: boolean) => {
    chrome.storage.sync.set({ [setting]: value }, () => {
      console.log(`${setting} saved:`, value)
    })
    if (setting === 'textMode') {
      setTextMode(value)
    }
  }

  const handlePersonalityModeChange = (mode: 'sage' | 'interviewer') => {
    setPersonalityMode(mode)
    chrome.storage.sync.set({ personalityMode: mode }, () => {
      console.log('Personality mode saved:', mode)
    })
  }

  const handleSageRevelationChange = (value: boolean) => {
    setSageRevelation(value)
    chrome.storage.sync.set({ sageRevelation: value }, () => {
      console.log('Sage revelation level saved:', value)
    })
  }

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      // Show temporary feedback
      const originalStatus = saveStatus
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(originalStatus), 1000)
    } catch (error) {
      console.error('Failed to copy API key:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 1000)
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


  return (
    <>
        {/* Settings Header */}
        <div className="settings-header">
          <Link to="/" className="back-button">
            ← Back to Chat
          </Link>
          <h2>Settings</h2>
        </div>
        
        <div className="settings-content">
          {/* No authentication required - open source version */}

          {/* OpenAI Configuration Section */}
          <div className="settings-section">
            <h3>OpenAI Configuration</h3>
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
                   {savedApiKey && (
                     <>
                       <button onClick={handleCopyApiKey} className="copy-btn" title="Copy API Key">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                           <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                         </svg>
                       </button>
                       <button onClick={handleClearApiKey} className="delete-btn" title="Delete API Key">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <polyline points="3,6 5,6 21,6"/>
                           <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                           <line x1="10" y1="11" x2="10" y2="17"/>
                           <line x1="14" y1="11" x2="14" y2="17"/>
                         </svg>
                       </button>
                     </>
                   )}
                   {!savedApiKey && (
                     <button 
                       onClick={handleSaveApiKey}
                       disabled={saveStatus === 'saving' || !apiKey.trim()}
                       className={`save-btn ${saveStatus}`}
                     >
                       {saveStatus === 'saving' && '⏳'}
                       {saveStatus === 'saved' && '✅'}
                       {saveStatus === 'error' && '❌'}
                       {saveStatus === 'idle' && '💾'}
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Interview Mode Settings Section */}
          <div className="settings-section">
            <h3>Input/Output Mode</h3>
            <div className="setting-item">
              <div className="setting-content">
                {/* <label>Input Method</label> */}
                <p className="setting-description">
                  Choose how you want to interact
                </p> 
              </div>
              <div className="mode-selector">
                <button 
                  className={`mode-button ${!textMode ? 'active' : ''}`}
                  onClick={() => handleToggle('textMode', false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                  Voice
                </button>
                <button 
                  className={`mode-button ${textMode ? 'active' : ''}`}
                  onClick={() => handleToggle('textMode', true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Text
                </button>
              </div>
            </div>
          </div>

          {/* Personality Mode Settings Section */}
          <div className="settings-section">
            <h3>Personality</h3>
            <div className="setting-item">
              <div className="setting-content">
{/*               
                <p className="setting-description">
                  Choose how the AI should behave during coding sessions
                </p> */}
              </div>
              <div className="mode-selector">
                <button 
                  className={`mode-button ${personalityMode === 'sage' ? 'active' : ''}`}
                  onClick={() => handlePersonalityModeChange('sage')}
                >
                  <span style={{ marginRight: '8px', fontSize: '16px' }}>🧙‍♂️</span>
                  Sage Mode
                </button>
                <button 
                  className={`mode-button ${personalityMode === 'interviewer' ? 'active' : ''}`}
                  onClick={() => handlePersonalityModeChange('interviewer')}
                >
                  <span style={{ marginRight: '8px', fontSize: '16px' }}>💪</span>
                  Interview Mode
                </button>
              </div>
              <div className="personality-description">
                {personalityMode === 'sage' ? (
                  <p><strong>Sage Mode:</strong> Acts like a helpful pair programmer. Provides guidance, hints, and can reveal solutions based on your settings.</p>
                ) : (
                  <p><strong>Interviewer Mode:</strong> Acts like a technical interviewer. Only answers syntax questions and clarifies problems without revealing solutions.</p>
                )}
              </div>
            </div>

            {personalityMode === 'sage' && (
              <div className="setting-item">
                <div className="setting-content">
                  {/* <label>Solution Revelation Level</label> */}
                  {/* <p className="setting-description">
                    How much should the Sage reveal when helping?
                  </p> */}
                </div>
                <div className="mode-selector">
                  <button 
                    className={`mode-button ${!sageRevelation ? 'active' : ''}`}
                    onClick={() => handleSageRevelationChange(false)}
                  >
                    <span style={{ marginRight: '8px', fontSize: '16px' }}>💡</span>
                    Hints Only
                  </button>
                  <button 
                    className={`mode-button ${sageRevelation ? 'active' : ''}`}
                    onClick={() => handleSageRevelationChange(true)}
                  >
                    <span style={{ marginRight: '8px', fontSize: '16px' }}>🎯</span>
                    Full Solutions
                  </button>
                </div>
              </div>
            )}
          </div>

          


        </div>

      <style>{`
        .settings-page {
          width: 100%;
        }

        .settings-header {
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

        .settings-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
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
          align-items: flex-start;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f3f4;
          flex-wrap: wrap;
          gap: 12px;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-item label {
          font-size: 13px;
          font-weight: 500;
          color: #333;
        }

        .setting-content {
          flex: 1;
        }

        .setting-content label {
          display: block;
          margin-bottom: 4px;
        }

        .setting-description {
          font-size: 12px;
          color: #666;
          margin: 0;
          line-height: 1.3;
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

        :global(.dark-mode) .setting-description {
          color: #d1d5db;
        }

        .mode-selector {
          display: flex;
          gap: 8px;
          border-radius: 8px;
          background: #f3f4f6;
          padding: 4px;
        }

        .mode-button {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-button:hover {
          background: #e5e7eb;
        }

        .mode-button.active {
          background: #3b82f6;
          color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        :global(.dark-mode) .mode-selector {
          background: #374151;
        }

        :global(.dark-mode) .mode-button {
          color: #d1d5db;
        }

        :global(.dark-mode) .mode-button:hover {
          background: #4b5563;
        }

        :global(.dark-mode) .mode-button.active {
          background: #3b82f6;
          color: white;
        }

        .copy-btn, .delete-btn {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-btn:hover {
          background: #e3f2fd;
          border-color: #2196f3;
          color: #2196f3;
        }

        .delete-btn:hover {
          background: #ffebee;
          border-color: #f44336;
          color: #f44336;
        }

        .personality-description {
          margin-top: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          width: 100%;
          box-sizing: border-box;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }

        .personality-description p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #495057;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .slider-container {
          width: 100%;
          margin-top: 8px;
        }

        .revelation-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #e5e7eb;
          outline: none;
          -webkit-appearance: none;
          cursor: pointer;
        }

        .revelation-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .revelation-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .slider-value {
          font-weight: 600;
          color: #3b82f6;
          font-size: 14px;
        }

      `}</style>
    </>
  )
} 