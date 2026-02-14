import { useState } from 'react';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { api } from '../../api/client';
import type { WizardConfig } from '../../types/WizardConfig';
import clsx from 'clsx';

export function ReviewConfig() {
  const { formData, goToStep, nextStep } = useWizard();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { providerConfig, gatewayConfig } = formData;

  // Helper to mask API key/credential
  const maskSecret = (secret: string) => {
    if (secret.length <= 12) {
      return '*'.repeat(secret.length);
    }
    return `${secret.slice(0, 8)}...${secret.slice(-4)}`;
  };

  const handleConfirm = async () => {
    if (!providerConfig || !gatewayConfig) {
      setError('Missing configuration data. Please complete all steps.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Build WizardConfig from formData
      const config: WizardConfig = {
        provider: providerConfig.provider,
        api_key: providerConfig.apiKey,
        auth_type: providerConfig.authType || 'api-key',
        gateway_port: gatewayConfig.port,
        gateway_bind: gatewayConfig.bind === 'loopback' ? '127.0.0.1' : '0.0.0.0',
        auth_mode: gatewayConfig.authMode,
        auth_credential: gatewayConfig.authCredential || null,
      };

      await api.saveConfig(config);
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    // Go back to provider config step (step 2)
    goToStep(2);
  };

  return (
    <WizardStep
      title="Review Configuration"
      description="Review your settings before saving"
    >
      <div className="space-y-6">
        {/* AI Provider Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            AI Provider
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Provider</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {providerConfig?.provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Auth Method</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {providerConfig?.authType === 'setup-token' ? 'Setup Token' : 'API Key'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {providerConfig?.authType === 'setup-token' ? 'Setup Token' : 'API Key'}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {providerConfig?.apiKey ? maskSecret(providerConfig.apiKey) : 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Validated
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Gateway Settings Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            Gateway Settings
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Port</dt>
              <dd className="mt-1 text-sm text-gray-900">{gatewayConfig?.port || 18789}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Network Access</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {gatewayConfig?.bind === 'loopback'
                  ? 'Local only (recommended for security)'
                  : 'LAN - accessible from network'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Authentication</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {gatewayConfig?.authMode === 'token' ? 'Token-based' : 'Password-based'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {gatewayConfig?.authMode === 'token' ? 'Auth Token' : 'Password'}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {gatewayConfig?.authCredential
                  ? maskSecret(gatewayConfig.authCredential)
                  : 'Not provided'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Installation Path Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Installation Path
          </h3>
          <p className="text-sm text-gray-600">
            Configuration will be saved to:
          </p>
          <p className="mt-2 text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
            ~/Library/Application Support/openclaw-wizard/openclaw.json
          </p>
        </div>

        {/* Note */}
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Your configuration will be saved. You can modify it later by editing the
                configuration file or running this wizard again.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleEdit}
              disabled={isSaving}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors border',
                {
                  'bg-white text-gray-700 border-gray-300 hover:bg-gray-50': !isSaving,
                  'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed': isSaving,
                }
              )}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className={clsx(
                'px-6 py-2 text-sm font-medium rounded-md transition-colors',
                {
                  'bg-blue-600 text-white hover:bg-blue-700': !isSaving,
                  'bg-blue-400 text-white cursor-not-allowed': isSaving,
                }
              )}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  <span>Saving...</span>
                </span>
              ) : (
                'Confirm & Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </WizardStep>
  );
}
