import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chrome Extension Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="plasmo-w-full plasmo-h-screen plasmo-flex plasmo-items-center plasmo-justify-center plasmo-bg-gray-50">
          <div className="plasmo-max-w-md plasmo-p-6 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-lg plasmo-text-center">
            <div className="plasmo-mb-4">
              <div className="plasmo-w-12 plasmo-h-12 plasmo-mx-auto plasmo-bg-red-100 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
                <span className="plasmo-text-red-600 plasmo-text-xl">⚠️</span>
              </div>
            </div>
            <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 plasmo-mb-2">
              Oops! Something went wrong
            </h2>
            <p className="plasmo-text-sm plasmo-text-gray-600 plasmo-mb-4">
              The extension encountered an unexpected error. This usually happens during navigation.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.hash = '#/'
                window.location.reload()
              }}
              className="plasmo-px-4 plasmo-py-2 plasmo-bg-blue-600 plasmo-text-white plasmo-rounded plasmo-hover:bg-blue-700 plasmo-transition-colors"
            >
              Reload Extension
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 