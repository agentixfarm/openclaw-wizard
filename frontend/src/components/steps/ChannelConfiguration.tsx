import { useState } from 'react';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { TelegramSetup } from './channels/TelegramSetup';
import { DiscordSetup } from './channels/DiscordSetup';
import { SlackSetup } from './channels/SlackSetup';
import { WhatsAppSetup } from './channels/WhatsAppSetup';
import type { ConfiguredChannel } from '../../schemas/channelSchemas';
import clsx from 'clsx';

type ChannelPlatform = 'telegram' | 'discord' | 'slack' | 'whatsapp';

interface ChannelCard {
  platform: ChannelPlatform;
  name: string;
  emoji: string;
}

const CHANNELS: ChannelCard[] = [
  { platform: 'whatsapp', name: 'WhatsApp', emoji: '💬' },
  { platform: 'telegram', name: 'Telegram', emoji: '✈️' },
  { platform: 'discord', name: 'Discord', emoji: '🎮' },
  { platform: 'slack', name: 'Slack', emoji: '💼' },
];

export function ChannelConfiguration() {
  const { formData, updateFormData, nextStep } = useWizard();
  const [activeSetup, setActiveSetup] = useState<ChannelPlatform | null>(null);
  const [configuredChannels, setConfiguredChannels] = useState<ConfiguredChannel[]>(
    formData.channelsConfig?.channels || []
  );

  const handleChannelComplete = (config: ConfiguredChannel) => {
    // Update or add channel config
    setConfiguredChannels((prev) => {
      const existing = prev.findIndex((c) => c.platform === config.platform);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = config;
        return updated;
      }
      return [...prev, config];
    });
    setActiveSetup(null);
  };

  const handleChannelCancel = () => {
    setActiveSetup(null);
  };

  const handleNext = () => {
    updateFormData('channelsConfig', { channels: configuredChannels });
    nextStep();
  };

  const getChannelStatus = (platform: ChannelPlatform) => {
    const channel = configuredChannels.find((c) => c.platform === platform);
    return channel;
  };

  if (activeSetup) {
    const existingConfig = configuredChannels.find((c) => c.platform === activeSetup);

    return (
      <WizardStep
        title="Configure Channels"
        description="Connect messaging platforms to your OpenClaw assistant"
      >
        <div className="space-y-4">
          <button
            onClick={() => setActiveSetup(null)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to channels
          </button>

          {activeSetup === 'telegram' && (
            <TelegramSetup
              onComplete={handleChannelComplete}
              onCancel={handleChannelCancel}
              existingConfig={existingConfig}
            />
          )}
          {activeSetup === 'discord' && (
            <DiscordSetup
              onComplete={handleChannelComplete}
              onCancel={handleChannelCancel}
              existingConfig={existingConfig}
            />
          )}
          {activeSetup === 'slack' && (
            <SlackSetup
              onComplete={handleChannelComplete}
              onCancel={handleChannelCancel}
              existingConfig={existingConfig}
            />
          )}
          {activeSetup === 'whatsapp' && (
            <WhatsAppSetup
              onComplete={handleChannelComplete}
              onCancel={handleChannelCancel}
              existingConfig={existingConfig}
            />
          )}
        </div>
      </WizardStep>
    );
  }

  return (
    <WizardStep
      title="Configure Channels"
      description="Connect messaging platforms to your OpenClaw assistant. Configure at least one channel, or skip to add channels later."
    >
      <div className="space-y-3">
        {CHANNELS.map((channel) => {
          const status = getChannelStatus(channel.platform);
          const isConfigured = !!status?.configured;

          return (
            <div
              key={channel.platform}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{channel.emoji}</span>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{channel.name}</h3>
                  {isConfigured ? (
                    <div className="flex items-center gap-1 mt-1">
                      <svg
                        className="h-4 w-4 text-green-600"
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
                      <span className="text-xs text-green-600">
                        Configured
                        {status?.botName && ` - ${status.botName}`}
                        {status?.botUsername && ` (@${status.botUsername})`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Not configured</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setActiveSetup(channel.platform)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  {
                    'bg-blue-600 text-white hover:bg-blue-700': !isConfigured,
                    'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300': isConfigured,
                  }
                )}
              >
                {isConfigured ? 'Reconfigure' : 'Configure'}
              </button>
            </div>
          );
        })}
      </div>

      <WizardNavigation
        onNext={handleNext}
        nextLabel={configuredChannels.length > 0 ? 'Continue' : 'Skip Channels'}
      />
    </WizardStep>
  );
}
