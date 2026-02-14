import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { discordConfigSchema, type DiscordConfigData, type ConfiguredChannel } from '../../../schemas/channelSchemas';
import { api } from '../../../api/client';
import clsx from 'clsx';

interface DiscordSetupProps {
  onComplete: (config: ConfiguredChannel) => void;
  onCancel: () => void;
  existingConfig?: ConfiguredChannel;
}

export function DiscordSetup({ onComplete, onCancel, existingConfig }: DiscordSetupProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [botName, setBotName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<DiscordConfigData>({
    resolver: zodResolver(discordConfigSchema),
    defaultValues: existingConfig?.config as DiscordConfigData | undefined || {
      platform: 'discord',
      botToken: '',
      userId: '',
    },
  });

  const handleValidate = async () => {
    const data = getValues();
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await api.validateChannelToken({
        platform: 'discord',
        token: data.botToken,
      });

      if (response.valid) {
        setIsValidated(true);
        setBotName(response.bot_name || null);
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
      platform: 'discord',
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
      platform: 'discord',
      enabled: true,
      configured: true,
      botName: botName || undefined,
      botUsername: undefined,
      config: data,
    };
    onComplete(configuredChannel);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect Discord Bot</h2>

      {/* Warning */}
      <div className="mb-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800 font-medium">
              You MUST enable "Message Content Intent" in the Discord Developer Portal or your bot won't be able to read messages.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Go to the{' '}
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Discord Developer Portal
            </a>
          </li>
          <li>Create a new application and add a bot</li>
          <li>Enable "Message Content Intent" in the Bot settings</li>
          <li>Copy the bot token</li>
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
            placeholder="MTIzNDU2..."
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

        {/* User ID (optional) */}
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            User ID <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="userId"
            type="text"
            {...register('userId')}
            placeholder="234567890123456789"
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
            Numeric user ID for allowed users (DM policy)
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
        {isValidated && botName && (
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
              Connected as <span className="font-semibold">{botName}</span>
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
