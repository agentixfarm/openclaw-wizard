import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { telegramConfigSchema, type TelegramConfigData, type ConfiguredChannel } from '../../../schemas/channelSchemas';
import { api } from '../../../api/client';
import clsx from 'clsx';

interface TelegramSetupProps {
  onComplete: (config: ConfiguredChannel) => void;
  onCancel: () => void;
  existingConfig?: ConfiguredChannel;
}

export function TelegramSetup({ onComplete, onCancel, existingConfig }: TelegramSetupProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<TelegramConfigData>({
    resolver: zodResolver(telegramConfigSchema),
    defaultValues: existingConfig?.config as TelegramConfigData | undefined || {
      platform: 'telegram',
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
        platform: 'telegram',
        token: data.botToken,
      });

      if (response.valid) {
        setIsValidated(true);
        setBotUsername(response.bot_name || null);
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
      platform: 'telegram',
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
      platform: 'telegram',
      enabled: true,
      configured: true,
      botName: botUsername || undefined,
      botUsername: botUsername || undefined,
      config: data,
    };
    onComplete(configuredChannel);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect Telegram Bot</h2>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Search for <span className="font-mono bg-gray-100 px-1 rounded">@BotFather</span> in Telegram</li>
          <li>Send the command <span className="font-mono bg-gray-100 px-1 rounded">/newbot</span></li>
          <li>Follow the prompts to create your bot</li>
          <li>Copy the bot token provided by BotFather</li>
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
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
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
            placeholder="123456789"
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
            Get your user ID from{' '}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @userinfobot
            </a>{' '}
            (numeric ID, not @username)
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
        {isValidated && botUsername && (
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
              Connected as <span className="font-semibold">@{botUsername}</span>
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
