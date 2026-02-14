import { useState } from 'react';
import { Plus, Trash2, MessageCircle } from 'lucide-react';
import type { ChannelConfigInput } from '../../lib/config-schema';

interface ChannelManagerProps {
  channels: Record<string, ChannelConfigInput>;
  onChange: (channels: Record<string, ChannelConfigInput>) => void;
}

type Platform = 'telegram' | 'discord' | 'slack' | 'whatsapp';

/**
 * Channel management interface - add, remove, and toggle channels
 */
export function ChannelManager({ channels, onChange }: ChannelManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannelPlatform, setNewChannelPlatform] = useState<Platform>('telegram');
  const [newChannelToken, setNewChannelToken] = useState('');

  const channelEntries = Object.entries(channels);

  // Add a new channel
  const handleAddChannel = () => {
    if (!newChannelToken.trim()) {
      return;
    }

    const channelId = `${newChannelPlatform}-${Date.now()}`;
    const newChannel: ChannelConfigInput = {
      platform: newChannelPlatform,
      enabled: true,
      bot_token: newChannelToken,
    };

    onChange({
      ...channels,
      [channelId]: newChannel,
    });

    // Reset form
    setNewChannelToken('');
    setShowAddForm(false);
  };

  // Remove a channel
  const handleRemoveChannel = (channelId: string) => {
    const newChannels = { ...channels };
    delete newChannels[channelId];
    onChange(newChannels);
  };

  // Toggle channel enabled state
  const handleToggleEnabled = (channelId: string) => {
    const channel = channels[channelId];
    if (!channel) return;

    onChange({
      ...channels,
      [channelId]: {
        ...channel,
        enabled: !channel.enabled,
      },
    });
  };

  // Platform label formatter
  const getPlatformLabel = (platform: Platform): string => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  // Platform icon/color
  const getPlatformColor = (platform: Platform): string => {
    switch (platform) {
      case 'telegram':
        return 'text-blue-600';
      case 'discord':
        return 'text-indigo-600';
      case 'slack':
        return 'text-purple-600';
      case 'whatsapp':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Channel List */}
      {channelEntries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No channels configured</p>
          <p className="text-sm text-gray-500 mt-1">Click "Add Channel" to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channelEntries.map(([channelId, channel]) => (
            <div
              key={channelId}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className={`w-5 h-5 ${getPlatformColor(channel.platform)}`} />
                <div>
                  <p className="font-medium text-gray-900">
                    {getPlatformLabel(channel.platform)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {channel.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Enable/Disable Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleEnabled(channelId)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    channel.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      channel.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveChannel(channelId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove channel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Channel Form */}
      {showAddForm ? (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Channel</h4>
          <div className="space-y-3">
            {/* Platform Selector */}
            <div>
              <label htmlFor="new-platform" className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                id="new-platform"
                value={newChannelPlatform}
                onChange={(e) => setNewChannelPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="slack">Slack</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            {/* Bot Token Input */}
            <div>
              <label htmlFor="new-token" className="block text-sm font-medium text-gray-700 mb-1">
                Bot Token
              </label>
              <input
                id="new-token"
                type="text"
                value={newChannelToken}
                onChange={(e) => setNewChannelToken(e.target.value)}
                placeholder="Enter bot token..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddChannel}
                disabled={!newChannelToken.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Channel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewChannelToken('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Channel
        </button>
      )}
    </div>
  );
}
