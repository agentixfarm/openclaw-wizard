import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../api/client';
import type { HealthSnapshot } from '../../types/HealthSnapshot';

interface HealthMonitorProps {
  health: HealthSnapshot | null;
  onRefresh?: () => void;
}

/**
 * Gateway health and channel status monitor
 */
export function HealthMonitor({ health, onRefresh }: HealthMonitorProps) {
  const [reconnecting, setReconnecting] = useState(false);

  if (!health) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading health data...</span>
      </div>
    );
  }

  // Collect channels with errors or disconnected status
  const errorChannels = health.channels.filter(
    (ch) => ch.status === 'error' || ch.status === 'disconnected'
  );

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api.restartDaemon();
      // Wait a moment for daemon to restart, then refresh health
      setTimeout(() => {
        onRefresh?.();
        setReconnecting(false);
      }, 3000);
    } catch {
      setReconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gateway Status Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gateway Status</h3>
        <div className="flex items-center gap-4">
          {health.gateway_reachable ? (
            <>
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Gateway Reachable</p>
                <p className="text-xs text-gray-600">
                  Mode: {health.gateway_mode} | Sessions: {health.session_count}
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Gateway Unreachable</p>
                <p className="text-xs text-gray-600">Daemon may not be running</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Errors Section */}
      {errorChannels.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-red-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
            </div>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={reconnecting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconnecting ? 'animate-spin' : ''}`} />
              {reconnecting ? 'Reconnecting...' : 'Reconnect All'}
            </button>
          </div>
          <div className="space-y-2">
            {errorChannels.map((channel) => (
              <div
                key={`error-${channel.platform}`}
                className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
              >
                <div
                  className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${
                    channel.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {channel.platform} — {channel.status}
                  </p>
                  {channel.error_message && (
                    <p className="text-xs text-red-700 mt-0.5">{channel.error_message}</p>
                  )}
                  {channel.last_active && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Last active {formatDistanceToNow(new Date(channel.last_active), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Channels</h3>
        {health.channels.length === 0 ? (
          <p className="text-sm text-gray-600">No channels configured</p>
        ) : (
          <div className="space-y-3">
            {health.channels.map((channel) => (
              <div
                key={channel.platform}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      channel.status === 'connected'
                        ? 'bg-green-500'
                        : channel.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {channel.platform}
                    </p>
                    {channel.error_message && (
                      <p className="text-xs text-red-600 mt-1">{channel.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {channel.status !== 'connected' && (
                    <button
                      type="button"
                      onClick={handleReconnect}
                      disabled={reconnecting}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${reconnecting ? 'animate-spin' : ''}`} />
                      Reconnect
                    </button>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-gray-600 capitalize">{channel.status}</p>
                    {channel.last_active && (
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(channel.last_active), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
