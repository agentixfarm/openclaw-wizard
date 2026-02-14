import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { providerConfigSchema, type ProviderConfigData } from '../../schemas/wizardSchemas';
import { api } from '../../api/client';
import clsx from 'clsx';

export function ProviderConfig() {
  const { formData, updateFormData, nextStep } = useWizard();
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingFromConfig, setLoadingFromConfig] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProviderConfigData>({
    resolver: zodResolver(providerConfigSchema),
    defaultValues: formData.providerConfig || {
      provider: 'anthropic',
      authType: 'api-key',
      apiKey: '',
    },
  });

  const handleLoadFromConfig = async () => {
    setLoadingFromConfig(true);
    try {
      const config = await api.getConfig();
      if (config?.ai?.api_key) {
        setValue('apiKey', config.ai.api_key);
      }
      if (config?.ai?.provider) {
        setValue('provider', config.ai.provider);
      }
      if (config?.ai?.auth_type) {
        setValue('authType', config.ai.auth_type === 'token' ? 'setup-token' : 'api-key');
      }
    } catch {
      // Config not available, ignore
    } finally {
      setLoadingFromConfig(false);
    }
  };

  const selectedProvider = watch('provider');
  const selectedAuthType = watch('authType');

  const getApiKeyPlaceholder = () => {
    if (selectedProvider === 'openai') return 'sk-...';
    if (selectedAuthType === 'setup-token') return 'sk-ant-oat01-...';
    return 'sk-ant-api03-...';
  };

  const getApiKeyLabel = () => {
    if (selectedAuthType === 'setup-token') return 'Setup Token';
    return 'API Key';
  };

  const handleSkipValidation = async (data: ProviderConfigData) => {
    updateFormData('providerConfig', data);
    nextStep();
  };

  const onSubmit = handleSubmit(async (data) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await api.validateApiKey({
        provider: data.provider,
        api_key: data.apiKey,
        auth_type: data.authType || 'api-key',
      });

      if (response.valid) {
        setIsValidated(true);
        updateFormData('providerConfig', data);
        nextStep();
      } else {
        setValidationError(response.error || 'API key validation failed');
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Network error during validation'
      );
    } finally {
      setIsValidating(false);
    }
  });

  return (
    <WizardStep
      title="AI Provider Configuration"
      description="Select your AI provider and enter your API key"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Provider Selection */}
        <div>
          <label
            htmlFor="provider"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            AI Provider
          </label>
          <select
            id="provider"
            {...register('provider')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isValidating}
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
          </select>
          {errors.provider && (
            <p className="mt-1 text-sm text-red-600">{errors.provider.message}</p>
          )}
        </div>

        {/* Auth Type Selection (Anthropic only) */}
        {selectedProvider === 'anthropic' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Method
            </label>
            <div className="flex gap-4">
              <label className={clsx(
                'flex-1 relative flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                {
                  'border-blue-500 bg-blue-50': selectedAuthType === 'api-key',
                  'border-gray-300 hover:border-gray-400': selectedAuthType !== 'api-key',
                }
              )}>
                <input
                  type="radio"
                  {...register('authType')}
                  value="api-key"
                  className="sr-only"
                  disabled={isValidating}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">API Key</p>
                  <p className="text-xs text-gray-500">Standard Anthropic API key</p>
                </div>
              </label>
              <label className={clsx(
                'flex-1 relative flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                {
                  'border-blue-500 bg-blue-50': selectedAuthType === 'setup-token',
                  'border-gray-300 hover:border-gray-400': selectedAuthType !== 'setup-token',
                }
              )}>
                <input
                  type="radio"
                  {...register('authType')}
                  value="setup-token"
                  className="sr-only"
                  disabled={isValidating}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Setup Token</p>
                  <p className="text-xs text-gray-500">From <code className="text-xs bg-gray-100 px-1 rounded">claude setup-token</code></p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* API Key / Token Input */}
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {getApiKeyLabel()}
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              {...register('apiKey')}
              placeholder={getApiKeyPlaceholder()}
              className={clsx(
                'w-full px-3 py-2 pr-20 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
                {
                  'border-gray-300': !errors.apiKey && !validationError,
                  'border-red-300 bg-red-50': errors.apiKey || validationError,
                  'border-green-300 bg-green-50': isValidated,
                }
              )}
              disabled={isValidating}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              disabled={isValidating}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.apiKey && (
            <p className="mt-1 text-sm text-red-600">{errors.apiKey.message}</p>
          )}
          {validationError && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-red-600">{validationError}</p>
              <button
                type="button"
                onClick={handleSubmit((data) => handleSkipValidation(data))}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Skip validation (not recommended)
              </button>
            </div>
          )}
          {isValidated && (
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
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
              <span>API key validated successfully</span>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Your API key will be securely stored in your configuration file.
          </p>
          {/* Load from saved config */}
          {!watch('apiKey') && (
            <button
              type="button"
              onClick={handleLoadFromConfig}
              disabled={loadingFromConfig}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            >
              {loadingFromConfig ? 'Loading...' : 'Load from saved configuration'}
            </button>
          )}
        </div>

        {/* Help Text */}
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
              <h3 className="text-sm font-medium text-blue-800">
                {selectedAuthType === 'setup-token' ? 'How to get a setup token' : 'Where to find your API key'}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                {selectedProvider === 'anthropic' && selectedAuthType === 'setup-token' ? (
                  <p>
                    Run <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">claude setup-token</code> in
                    your terminal to generate a setup token. It will start with <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">sk-ant-oat01-</code>.
                  </p>
                ) : selectedProvider === 'anthropic' ? (
                  <p>
                    Visit{' '}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-900"
                    >
                      Anthropic Console
                    </a>{' '}
                    to generate an API key for Claude.
                  </p>
                ) : (
                  <p>
                    Visit{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-900"
                    >
                      OpenAI Platform
                    </a>{' '}
                    to generate an API key for GPT models.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <WizardNavigation
          onNext={onSubmit}
          isSubmitting={isValidating}
          nextLabel={isValidating ? 'Validating...' : 'Validate & Continue'}
        />
      </form>
    </WizardStep>
  );
}
