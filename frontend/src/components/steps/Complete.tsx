import { useEffect } from 'react';
import { WizardStep } from '../wizard/WizardStep';
import { useWizard } from '../wizard/WizardProvider';

interface CompleteProps {
  onGoToDashboard?: () => void;
}

/**
 * Setup completion step with next steps guidance
 */
export function Complete({ onGoToDashboard }: CompleteProps) {
  const { resetWizard } = useWizard();

  // Clean up wizard state from localStorage on completion
  useEffect(() => {
    // We keep the state for now in case user wants to review
    // It will be cleared if they click "Start Fresh"
  }, []);

  const handleStartFresh = () => {
    resetWizard();
  };

  // Determine config path based on platform
  const configPath =
    navigator.platform.toLowerCase().includes('mac') ||
    navigator.platform.toLowerCase().includes('darwin')
      ? '~/Library/Application Support/openclaw-wizard/openclaw.json'
      : navigator.platform.toLowerCase().includes('win')
      ? '%APPDATA%\\openclaw-wizard\\openclaw.json'
      : '~/.config/openclaw-wizard/openclaw.json';

  return (
    <WizardStep
      title="Setup Complete!"
      description="Your OpenClaw installation is ready"
    >
      <div className="space-y-6">
        {/* Success celebration */}
        <div className="rounded-md bg-green-50 p-8 border-2 border-green-200 text-center">
          <div className="flex justify-center">
            <svg
              className="h-16 w-16 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-green-800">
            Setup Complete!
          </h2>
          <p className="mt-2 text-green-700">
            OpenClaw has been installed and configured successfully.
          </p>
        </div>

        {/* Next steps */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Next Steps
          </h3>

          <div className="space-y-4">
            {/* Step 1: Start OpenClaw */}
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                  1
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Start OpenClaw
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  Run <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">openclaw start</code> in your terminal,
                  or use the management dashboard to control your instance.
                </p>
              </div>
            </div>

            {/* Step 2: Configure channels */}
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                  2
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Configure Channels
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  Set up WhatsApp, Telegram, Discord, or Slack to connect your AI
                  assistant to your favorite messaging platforms.
                </p>
              </div>
            </div>

            {/* Step 3: View dashboard */}
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                  3
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Monitor Dashboard
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  Keep track of your OpenClaw instance health, uptime, and channel
                  connectivity from the management dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration file location */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Configuration File
          </h4>
          <p className="text-sm text-gray-600">
            Your configuration has been saved to:
          </p>
          <code className="mt-2 block px-3 py-2 bg-white border border-gray-200 rounded font-mono text-xs text-gray-800">
            {configPath}
          </code>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 pt-4">
          {onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Go to Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={handleStartFresh}
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Start Fresh Setup
          </button>
        </div>
      </div>
    </WizardStep>
  );
}
