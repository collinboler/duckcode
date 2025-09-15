import { Link, Outlet, useNavigate, useLocation } from 'react-router'
import { useEffect, useRef, useState } from 'react'

import logoUrl from "data-base64:~assets/duck_128.png"

// Removed Clerk environment variables - no auth needed

export const RootLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const EXTENSION_URL = chrome.runtime.getURL('.')
  
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousPath, setPreviousPath] = useState('/')
  const [darkMode, setDarkMode] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  // No authentication routes needed anymore

  // Enhanced navigation with sliding animation
  const navigateWithSlide = (to: string) => {
    if (to === location.pathname) return
    
    setIsTransitioning(true)
    setPreviousPath(location.pathname)
    
    setTimeout(() => {
      navigate(to)
      setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
    }, 50)
  }

  // Detect page transitions for sliding animations
  useEffect(() => {
    const currentPath = location.pathname
    
    // No authentication routes to skip anymore
    
    if (currentPath !== previousPath && pageRef.current) {
      // Determine slide direction
      const isGoingToSettings = currentPath === '/settings'
      const isLeavingSettings = previousPath === '/settings' && currentPath === '/'
      
      if (isGoingToSettings || isLeavingSettings) {
        pageRef.current.classList.add('page-transition')
        
        setTimeout(() => {
          if (pageRef.current) {
            pageRef.current.classList.remove('page-transition')
          }
        }, 300)
      }
    }
    
    setPreviousPath(currentPath)
  }, [location.pathname, previousPath])

  // Dark mode management
  useEffect(() => {
    // Load dark mode setting from storage
    chrome.storage.sync.get(['darkMode'], (result) => {
      const isDarkMode = result.darkMode || false
      console.log('Loading dark mode from storage:', isDarkMode)
      setDarkMode(isDarkMode)
      toggleDarkModeClass(isDarkMode)
    })

    // Listen for dark mode changes from settings
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.darkMode) {
        const newDarkMode = changes.darkMode.newValue
        console.log('Dark mode changed in storage:', newDarkMode)
        setDarkMode(newDarkMode)
        toggleDarkModeClass(newDarkMode)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const toggleDarkModeClass = (isDark: boolean) => {
    if (isDark) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }

  return (
    <>
        <div className={`sidepanel-container ${darkMode ? 'dark-mode' : ''}`}>
          {/* Header with auth controls */}
          <header className="header">
            <div className="header-left">
              <img src={logoUrl} alt="DuckCode" className="header-logo" />
              <h1><i>DuckCode</i></h1>
            </div>
            <div className="header-right">
              {/* Removed UserButton - no auth needed */}
              <button 
                onClick={() => navigateWithSlide('/settings')} 
                className="settings-button"
                style={{ border: 'none', background: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </header>

          {/* Main content area with sliding animation */}
                          <main 
                  className={`main-content ${isTransitioning ? 'transitioning' : ''} ${location.pathname === '/settings' ? 'settings-active' : 'home-active'}`}
                  ref={pageRef}
                >
                  <div className={`page-container ${location.pathname === '/' ? 'main-page' : 'settings-page'}`}>
                    <Outlet />
                  </div>
                </main>
        </div>

        <style jsx="true" global="true">{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f9fa;
            color: #333;
            width: 100%;
            min-height: 100vh;
            overflow-x: hidden;
          }

          .sidepanel-container {
            padding: 20px;
            max-width: 100%;
            position: relative;
            overflow-x: hidden;
            min-height: 100vh;
            background-color: #f8f9fa;
          }

          .header {
            margin-bottom: 24px;
            border-bottom: 1px solid #e1e5e9;
            padding-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .header-logo {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s ease;
          }

          .header-logo:hover {
            transform: scale(1.1);
          }

          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            letter-spacing: -0.5px;
          }

          .settings-button {
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

          .settings-button:hover {
            background-color: rgba(0, 0, 0, 0.1);
            color: #333;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }

          .sign-in-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
          }

          .sign-in-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }

          .user-avatar {
            width: 32px !important;
            height: 32px !important;
            border-radius: 6px !important;
          }

          .main-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
            min-height: calc(100vh - 100px);
          }

          /* Page transition animations */
          .page-container {
            width: 100%;
            min-height: 100%;
            position: relative;
            transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
          }

          .main-content.transitioning .page-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            min-height: 100%;
          }

          .main-content.settings-active .page-container.main-page {
            transform: translateX(-100%);
          }

          .main-content.home-active .page-container.settings-page {
            transform: translateX(100%);
          }

          .main-content.page-transition .page-container {
            transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
          }

          /* Enhanced page sliding animations */
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
              opacity: 0.8;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes slideOutToLeft {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(-100%);
              opacity: 0.8;
            }
          }

          @keyframes slideInFromLeft {
            from {
              transform: translateX(-100%);
              opacity: 0.8;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes slideOutToRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0.8;
            }
          }

          /* Dark mode styles */
          body.dark-mode {
            background-color: #1a1a1a;
            color: #e5e5e5;
          }

          .dark-mode .sidepanel-container {
            background-color: #1a1a1a;
            color: #e5e5e5;
          }

          .dark-mode .header {
            border-bottom-color: #374151;
          }

          .dark-mode .header h1 {
            color: #e5e5e5;
          }

          .dark-mode .settings-button {
            color: #d1d5db;
          }

          .dark-mode .settings-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          }

          .dark-mode .sign-in-button {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
            color: #e5e5e5;
          }

          .dark-mode .sign-in-button:hover {
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          }

          /* Automatic dark mode detection */
          @media (prefers-color-scheme: dark) {
            body:not(.dark-mode-override) {
              background-color: #1a1a1a;
              color: #e5e5e5;
            }
            
            body:not(.dark-mode-override) .sidepanel-container {
              background-color: #1a1a1a;
              color: #e5e5e5;
            }
            
            body:not(.dark-mode-override) .header {
              border-bottom-color: #374151;
            }
            
            body:not(.dark-mode-override) .header h1 {
              color: #e5e5e5;
            }
            
            body:not(.dark-mode-override) .settings-button {
              color: #d1d5db;
            }
            
            body:not(.dark-mode-override) .settings-button:hover {
              background-color: rgba(255, 255, 255, 0.1);
              color: #fff;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }
          }
        `}</style>
    </>
  )
} 