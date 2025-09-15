import React from 'react'

import '../style.css'

import { createMemoryRouter, RouterProvider } from 'react-router'

import { ErrorBoundary } from './components/error-boundary'
import { RootLayout } from './layouts/root-layout'
import { Home } from './routes/home'
import { Settings } from './routes/settings'
// Removed sign-in and sign-up imports - no auth needed

// Error component for route-level errors
const RouteErrorComponent = () => (
  <div className="plasmo-p-4 plasmo-text-center">
    <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-red-600 plasmo-mb-2">
      Navigation Error
    </h3>
    <p className="plasmo-text-sm plasmo-text-gray-600 plasmo-mb-4">
      There was an error navigating to this page.
    </p>
    <button 
      onClick={() => window.location.hash = '#/'}
      className="plasmo-px-4 plasmo-py-2 plasmo-bg-blue-600 plasmo-text-white plasmo-rounded plasmo-hover:bg-blue-700"
    >
      Go Home
    </button>
  </div>
)

const router = createMemoryRouter([
  {
    // Wraps the entire app in the root layout
    element: <RootLayout />,
    errorElement: <RouteErrorComponent />,
    // Mounted where the <Outlet /> component is inside the root layout
    children: [
      { 
        path: '/', 
        element: <Home />,
        errorElement: <RouteErrorComponent />
      },
      { 
        path: '/settings', 
        element: <Settings />,
        errorElement: <RouteErrorComponent />
      },
      // Catch-all route for any unmatched paths
      {
        path: '*',
        element: <Home />,
        errorElement: <RouteErrorComponent />
      }
    ],
  },
], {
  initialEntries: ['/'],
  initialIndex: 0,
})

export default function SidepanelIndex() {
  React.useEffect(() => {
    // Listen for navigation messages from content script
    const handleMessage = (message: any) => {
      if (message.action === 'navigate' && message.route) {
        router.navigate(message.route)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
} 