import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { slackConfigSchema, type SlackConfigData, type ConfiguredChannel } from '../../../schemas/channelSchemas';
import { api } from '../../../api/client';
import clsx from 'clsx';

interface SlackSetupProps {
  onComplete: (config: ConfiguredChannel) => void;
  onCancel: () => void;
  existingConfig?: ConfiguredChannel;
}

export function SlackSetup({ onComplete, onCancel, existingConfig }: SlackSetupProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SlackConfigData>({
    resolver: zodResolver(slackConfigSchema),
    defaultValues: existingConfig?.config as SlackConfigData | undefined || {
      platform: 'slack',
      botToken: '',
      appToken: '',
      userId: '',
    },
  });

  const handleValidate = async () => {
    const data = getValues();
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await api.validateChannelToken({
        platform: 'slack',
        token: data.botToken,
        app_token: data.appToken || undefined,
      });

      if (response.valid) {
        setIsValidated(true);
        setWorkspaceName(response.bot_name || 'workspace');
      } else {
        setValidationError(response.error || 'Token validation failed');
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Network error during validation'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkipValidation = handleSubmit((data) => {
    const configuredChannel: ConfiguredChannel = {
      platform: 'slack',
      enabled: true,
      configured: true,
      botName: undefined,
      botUsername: undefined,
      config: data,
    };
    onComplete(configuredChannel);
  });

  const onSubmit = handleSubmit((data) => {
    const configuredChannel: ConfiguredChannel = {
      platform: 'slack',
      enabled: true,
      configured: true,
      botName: workspaceName || undefined,
      botUsername: undefined,
      config: data,
    };
    onComplete(configuredChannel);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect Slack Bot</h2>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Go to{' '}
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              api.slack.com/apps
            </a>
          </li>
          <li>Create a new app (from scratch or manifest)</li>
          <li>Add OAuth scopes: <span className="font-mono text-xs bg-gray-100 px-1 rounded">chat:write</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">channels:read</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">im:read</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">im:write</span></li>
          <li>Install the app to your workspace</li>
          <li>Copy the Bot User OAuth Token</li>
        </ol>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Bot Token */}
        <div>
          <label htmlFor="botToken" className="block text-sm font-medium text-gray-700 mb-1">
            Bot Token
          </label>
          <input
            id="botToken"
            type="text"
            {...register('botToken')}
            placeholder="xoxb-..."
            className={clsx(
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              {
                'border-gray-300': !errors.botToken && !validationError,
                'border-red-300 bg-red-50': errors.botToken || validationError,
                'border-green-300 bg-green-50': isValidated,
              }
            )}
            disabled={isValidating}
          />
          {errors.botToken && (
            <p className="mt-1 text-sm text-red-600">{errors.botToken.message}</p>
          )}
        </div>

        {/* App Token (optional) */}
        <div>
          <label htmlFor="appToken" className="block text-sm font-medium text-gray-700 mb-1">
            App Token <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="appToken"
            type="text"
            {...register('appToken')}
            placeholder="xapp-..."
            className={clsx(
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              {
                'border-gray-300': !errors.appToken,
                'border-red-300 bg-red-50': errors.appToken,
              }
            )}
            disabled={isValidating}
          />
          {errors.appToken && (
            <p className="mt-1 text-sm text-red-600">{errors.appToken.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Required for Socket Mode (real-time events without webhooks)
          </p>
        </div>

        {/* User ID (optional) */}
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            User ID <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="userId"
            type="text"
            {...register('userId')}
            placeholder="U1234ABCD"
            className={clsx(
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              {
                'border-gray-300': !errors.userId,
                'border-red-300 bg-red-50': errors.userId,
              }
            )}
            disabled={isValidating}
          />
          {errors.userId && (
            <p className="mt-1 text-sm text-red-600">{errors.userId.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Slack user ID for allowed users (DM policy)
          </p>
        </div>

        {/* Validation Button */}
        {!isValidated && (
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? 'Validating...' : 'Validate Token'}
          </button>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{validationError}</p>
            <button
              type="button"
              onClick={handleSkipValidation}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Skip validation (not recommended)
            </button>
          </div>
        )}

        {/* Validation Success */}
        {isValidated && workspaceName && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
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
            <span className="text-sm text-green-700">
              Connected to workspace
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValidated && !validationError}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save Channel
          </button>
        </div>
      </form>
    </div>
  );
}
