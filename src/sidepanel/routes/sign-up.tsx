import { SignUp } from '@clerk/chrome-extension'

export const SignUpPage = () => {
  return (
    <div className="plasmo-space-y-4">
      <div className="plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded-lg plasmo-p-4">
        <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 plasmo-mb-4">
          Sign Up
        </h2>
        <p className="plasmo-text-sm plasmo-text-gray-600 plasmo-mb-4">
          Create your account to get started with GeoChrome.
        </p>
        <SignUp 
          routing="virtual"
          appearance={{
            elements: {
              card: "plasmo-shadow-none plasmo-border-0 plasmo-w-full",
              socialButtonsRoot: 'plasmo-hidden',
              dividerRow: 'plasmo-hidden',
              rootBox: "plasmo-w-full",
              formButtonPrimary: "plasmo-w-full"
            }
          }}
        />
      </div>
    </div>
  )
} 