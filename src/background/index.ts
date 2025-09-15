console.log("Background script loaded")

// Create a listener to listen for messages from content scripts
// It must return true, in order to keep the connection open and send a response later.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // Handle sidepanel opening request
    if (request.action === 'openSidepanel') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Tab query error:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
          return
        }
        
        if (tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id })
            .then(() => {
              // Send navigation message to sidepanel after a short delay
              setTimeout(() => {
                chrome.runtime.sendMessage({ 
                  action: 'navigate', 
                  route: request.route || '/settings' 
                }, (response) => {
                  // Handle potential lastError for internal message
                  if (chrome.runtime.lastError) {
                    console.log('Navigation message sent (no listener expected):', chrome.runtime.lastError.message)
                  }
                })
              }, 100)
              sendResponse({ success: true })
            })
            .catch((error) => {
              console.error('Failed to open sidepanel:', error)
              sendResponse({ success: false, error: error.message })
            })
        } else {
          sendResponse({ success: false, error: 'No active tab found' })
        }
      })
      return true // Keep message channel open for async response
    }
    
    // Handle any other messages - no token requests needed anymore
    sendResponse({ success: false, error: 'Unknown action' })
    return false
  } catch (error) {
    console.error('Message listener error:', error)
    sendResponse({ success: false, error: error.message })
    return false
  }
})

// Handle extension icon click to open sidebar
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked, opening sidebar")
  chrome.sidePanel.open({ tabId: tab.id })
})

// Set up side panel behavior on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting up side panel")
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})