import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { whatsappConfigSchema, type WhatsAppConfigData, type ConfiguredChannel } from '../../../schemas/channelSchemas';
import clsx from 'clsx';

interface WhatsAppSetupProps {
  onComplete: (config: ConfiguredChannel) => void;
  onCancel: () => void;
  existingConfig?: ConfiguredChannel;
}

export function WhatsAppSetup({ onComplete, onCancel, existingConfig }: WhatsAppSetupProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WhatsAppConfigData>({
    resolver: zodResolver(whatsappConfigSchema),
    defaultValues: existingConfig?.config as WhatsAppConfigData | undefined || {
      platform: 'whatsapp',
      phoneNumber: '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    const configuredChannel: ConfiguredChannel = {
      platform: 'whatsapp',
      enabled: true,
      configured: true,
      botName: 'WhatsApp',
      botUsername: undefined,
      config: data,
    };
    onComplete(configuredChannel);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect WhatsApp</h2>

      {/* Informational Notice */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
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
            <h3 className="text-sm font-medium text-blue-800">WhatsApp QR Code Authentication</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                WhatsApp authentication requires scanning a QR code when the OpenClaw gateway is running.
                The QR code will appear after you complete setup and start the gateway.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Steps */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Setup Process</h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Complete the wizard setup</li>
          <li>Start the OpenClaw gateway</li>
          <li>A QR code will appear in the gateway logs or dashboard</li>
          <li>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</li>
          <li>Scan the QR code to authenticate</li>
        </ol>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Phone Number (optional) */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Allowed Phone Number <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="phoneNumber"
            type="text"
            {...register('phoneNumber')}
            placeholder="+15555550123"
            className={clsx(
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              {
                'border-gray-300': !errors.phoneNumber,
                'border-red-300 bg-red-50': errors.phoneNumber,
              }
            )}
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Phone number in E.164 format (e.g., +15555550123). Leave empty to allow all users, or add specific numbers to restrict access.
          </p>
        </div>

        {/* Info about QR scan */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Note:</span> WhatsApp doesn't use a bot token.
            Authentication happens through QR code scanning when the gateway starts.
            You can configure this channel now and scan the QR code later.
          </p>
        </div>

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
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Mark as Configured
          </button>
        </div>
      </form>
    </div>
  );
}
