import { Play, Square, RefreshCw, Loader2, X } from 'lucide-react';
import type { ServicesStatus } from '../../types/ServicesStatus';

interface ActionLoading {
  gateway: string | null;
  daemon: string | null;
}

interface ActionError {
  gateway: string | null;
  daemon: string | null;
}

interface ServiceControlsProps {
  services: ServicesStatus | null;
  actionLoading: ActionLoading;
  actionError: ActionError;
  onClearError: (service: 'gateway' | 'daemon') => void;
  onStartGateway: () => void;
  onStopGateway: () => void;
  onRestartGateway: () => void;
  onStartDaemon: () => void;
  onStopDaemon: () => void;
  onRestartDaemon: () => void;
}

/**
 * Gateway service control panel.
 * Note: "daemon" is a legacy alias for "gateway" in OpenClaw - there is only one service.
 */
export function ServiceControls({
  services,
  actionLoading,
  actionError,
  onClearError,
  onStartGateway,
  onStopGateway,
  onRestartGateway,
}: ServiceControlsProps) {
  const running = services?.gateway?.running ?? false;
  const loading = actionLoading.gateway;
  const error = actionError.gateway;
  const isLoading = loading !== null;

  return (
    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Gateway</h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            running
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              running ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {running ? 'Running' : 'Stopped'}
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400 flex-1">{error}</p>
          <button onClick={() => onClearError('gateway')} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onStartGateway}
          disabled={running || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'start' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Start
        </button>

        <button
          onClick={onStopGateway}
          disabled={!running || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'stop' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          Stop
        </button>

        <button
          onClick={onRestartGateway}
          disabled={!running || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 disabled:bg-gray-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'restart' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Restart
        </button>
      </div>
    </div>
  );
}
