import { createClerkClient } from '@clerk/chrome-extension/background'

const publishableKey = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

console.log("Background script loaded")

// Use `createClerkClient()` to create a new Clerk instance
// and use `getToken()` to get a fresh token for the user
async function getToken() {
  const clerk = await createClerkClient({
    publishableKey,
  })

  // If there is no valid session, then return null. Otherwise proceed.
  if (!clerk.session) {
    return null
  }

  // Return the user's session
  return await clerk.session?.getToken()
}

// Create a listener to listen for messages from content scripts
// It must return true, in order to keep the connection open and send a response later.
// NOTE: A runtime listener cannot be async.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle sidepanel opening request
  if (request.action === 'openSidepanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
          .then(() => {
            // Send navigation message to sidepanel after a short delay
            setTimeout(() => {
              chrome.runtime.sendMessage({ 
                action: 'navigate', 
                route: request.route || '/settings' 
              })
            }, 100)
            sendResponse({ success: true })
          })
          .catch((error) => {
            console.error('Failed to open sidepanel:', error)
            sendResponse({ success: false, error: error.message })
          })
      }
    })
    return true
  }

  // Handle token requests (existing functionality)
  if (request.action !== 'openSidepanel') {
    getToken()
      .then((token) => sendResponse({ token }))
      .catch((error) => {
        console.error('[Background service worker] Error:', JSON.stringify(error))
        // If there is no token then send a null response
        sendResponse({ token: null })
      })
    return true
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