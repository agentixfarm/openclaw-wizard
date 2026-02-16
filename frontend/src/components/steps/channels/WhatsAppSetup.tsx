import { type ConfiguredChannel } from '../../../schemas/channelSchemas';

interface WhatsAppSetupProps {
  onComplete: (config: ConfiguredChannel) => void;
  onCancel: () => void;
  existingConfig?: ConfiguredChannel;
}

export function WhatsAppSetup({ onComplete, onCancel }: WhatsAppSetupProps) {
  const handleComplete = () => {
    const configuredChannel: ConfiguredChannel = {
      platform: 'whatsapp',
      enabled: true,
      configured: true,
      botName: 'WhatsApp',
      botUsername: undefined,
      config: {
        platform: 'whatsapp',
        phoneNumber: '',
      },
    };
    onComplete(configuredChannel);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect WhatsApp</h2>

      {/* How It Works */}
      <div className="mb-5 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How It Works</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            OpenClaw connects to WhatsApp using the <strong>Linked Devices</strong> feature
            (the same way WhatsApp Web works). Once linked, your AI agent can read and
            respond to messages sent to the connected WhatsApp number.
          </p>
          <p>
            When someone sends a message to the connected number, the agent processes it
            and replies automatically through WhatsApp &mdash; like a normal chat conversation.
          </p>
        </div>
      </div>

      {/* Safety Warning */}
      <div className="mb-5 p-4 bg-amber-50 rounded-md border border-amber-200">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Use a Dedicated Number</h3>
        <div className="text-sm text-amber-700 space-y-2">
          <p>
            <strong>We strongly recommend using a spare or dedicated WhatsApp account</strong>,
            not your personal one. When linked, the agent can see and respond to messages
            from anyone who contacts that number.
          </p>
          <p>
            Using a dedicated number keeps your personal conversations private and gives
            you a clean channel for your agent. A prepaid SIM or VoIP number that supports
            WhatsApp works well for this.
          </p>
        </div>
      </div>

      {/* Access Control */}
      <div className="mb-5 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Access Control</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            By default, the agent uses an <strong>allowlist</strong> policy &mdash; it will only respond
            to phone numbers you explicitly permit. You can configure this in the dashboard
            after setup:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li><strong>Allowlist</strong> (default) &mdash; Only respond to approved numbers</li>
            <li><strong>Pairing</strong> &mdash; Require a pairing step before conversations</li>
            <li><strong>Open</strong> &mdash; Respond to anyone who messages the number</li>
            <li><strong>Disabled</strong> &mdash; Agent won't respond to direct messages</li>
          </ul>
        </div>
      </div>

      {/* Setup Steps */}
      <div className="mb-5 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Setup Process</h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Complete the wizard setup and start the gateway</li>
          <li>Open the Dashboard and click <strong>Connect WhatsApp</strong></li>
          <li>A QR code will appear in the modal</li>
          <li>Open WhatsApp on your phone &rarr; Settings &rarr; Linked Devices &rarr; Link a Device</li>
          <li>Scan the QR code to link your agent</li>
          <li>Configure allowed numbers in Settings &rarr; Channels</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleComplete}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Enable WhatsApp Channel
        </button>
      </div>
    </div>
  );
}
