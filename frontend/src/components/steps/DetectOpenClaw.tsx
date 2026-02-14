import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import type { OpenClawDetection } from '../../types/OpenClawDetection';

export function DetectOpenClaw() {
  const { updateFormData, nextStep } = useWizard();
  const [detection, setDetection] = useState<OpenClawDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useExisting, setUseExisting] = useState<boolean | null>(null);

  useEffect(() => {
    async function detectInstallation() {
      try {
        setLoading(true);
        const data = await api.detectOpenClaw();
        setDetection(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to detect OpenClaw installation'
        );
      } finally {
        setLoading(false);
      }
    }

    detectInstallation();
  }, []);

  const handleNext = () => {
    if (detection?.installed && detection.config_found && useExisting === true) {
      // Pre-populate wizard data from detected existing_config
      if (detection.existing_config) {
        // Map detected existing_config to wizard schema
        // Note: We don't have the actual structure of detection.existing_config yet,
        // but this is where we'd extract and map the values
        try {
          const existing_config = detection.existing_config as any;

          // Example mapping (adjust based on actual existing_config structure):
          if (existing_config.ai?.provider) {
            updateFormData('providerConfig', {
              provider: existing_config.ai.provider,
              apiKey: '', // Don't pre-populate API key for security
            });
          }

          if (existing_config.gateway) {
            updateFormData('gatewayConfig', {
              port: existing_config.gateway.port || 18789,
              bind: existing_config.gateway.bind || 'loopback',
              authMode: existing_config.gateway.auth?.mode || 'token',
              authCredential: '', // Don't pre-populate credentials
            });
          }
        } catch (err) {
          console.error('Failed to parse existing existing_config:', err);
        }
      }
    }

    nextStep();
  };

  if (loading) {
    return (
      <WizardStep
        title="Detect OpenClaw"
        description="Checking for existing installation..."
      >
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin h-12 w-12 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-gray-600">
              Searching for existing OpenClaw installation...
            </p>
          </div>
        </div>
      </WizardStep>
    );
  }

  if (error) {
    return (
      <WizardStep title="Detect OpenClaw" description="Error during detection">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
        <WizardNavigation onNext={handleNext} />
      </WizardStep>
    );
  }

  if (!detection) {
    return null;
  }

  // OpenClaw NOT found
  if (!detection.installed) {
    return (
      <WizardStep
        title="Detect OpenClaw"
        description="Checking for existing installation"
      >
        <div className="rounded-md bg-blue-50 p-6 border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                No existing installation detected
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  No existing OpenClaw installation was found. We'll set
                  everything up fresh for you.
                </p>
              </div>
            </div>
          </div>
        </div>

        <WizardNavigation onNext={handleNext} />
      </WizardStep>
    );
  }

  // OpenClaw FOUND
  return (
    <WizardStep
      title="Detect OpenClaw"
      description="Existing installation found"
    >
      {/* Installation details */}
      <div className="rounded-md bg-green-50 p-6 border border-green-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-400"
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
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-green-800">
              OpenClaw installation detected
            </h3>
            <div className="mt-2 text-sm text-green-700 space-y-1">
              {detection.version && (
                <p>
                  <span className="font-medium">Version:</span>{' '}
                  {detection.version}
                </p>
              )}
              {detection.install_path && (
                <p>
                  <span className="font-medium">Location:</span>{' '}
                  <code className="text-xs bg-green-100 px-1 py-0.5 rounded">
                    {detection.install_path}
                  </code>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Config found */}
      {detection.config_found && detection.existing_config && (
        <div className="rounded-md bg-blue-50 p-6 border border-blue-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Existing existing_configuration found
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>We found an existing OpenClaw existing_configuration file.</p>
                  <div className="mt-3 text-xs space-y-1 bg-blue-100 p-3 rounded">
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(detection.existing_config, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Choice: Use existing or start fresh */}
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-blue-800">
                What would you like to do?
              </p>

              <div className="space-y-2">
                <label className="flex items-start p-3 border rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="radio"
                    name="existing_config-choice"
                    value="existing"
                    checked={useExisting === true}
                    onChange={() => setUseExisting(true)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-blue-900">
                    <span className="font-medium block">
                      Use existing existing_configuration
                    </span>
                    <span className="text-blue-700">
                      Pre-populate the wizard with detected values
                    </span>
                  </span>
                </label>

                <label className="flex items-start p-3 border rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="radio"
                    name="existing_config-choice"
                    value="fresh"
                    checked={useExisting === false}
                    onChange={() => setUseExisting(false)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-blue-900">
                    <span className="font-medium block">Start fresh</span>
                    <span className="text-blue-700">
                      Set up a new existing_configuration from scratch
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config NOT found */}
      {detection.config_found === false && (
        <div className="rounded-md bg-yellow-50 p-6 border border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No existing_configuration found
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  OpenClaw is installed but no existing_configuration file was found.
                  We'll help you create a new one.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        onNext={handleNext}
        isSubmitting={false}
      />
    </WizardStep>
  );
}
