import { SignIn } from '@clerk/chrome-extension'

export const SignInPage = () => {
  return (
    <div className="plasmo-space-y-4">
      <div className="plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded-lg plasmo-p-4">
        <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 plasmo-mb-4">
          Sign In
        </h2>
        <p className="plasmo-text-sm plasmo-text-gray-600 plasmo-mb-4">
          Sign in to your account to access all GeoChrome features.
        </p>
        <SignIn 
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