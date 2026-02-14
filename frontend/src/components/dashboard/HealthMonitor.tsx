import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { HealthSnapshot } from '../../types/HealthSnapshot';

interface HealthMonitorProps {
  health: HealthSnapshot | null;
}

/**
 * Gateway health and channel status monitor
 */
export function HealthMonitor({ health }: HealthMonitorProps) {
  if (!health) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading health data...</span>
      </div>
    );
  }

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
                <div className="text-right">
                  <p className="text-xs text-gray-600 capitalize">{channel.status}</p>
                  {channel.last_active && (
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(channel.last_active), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
