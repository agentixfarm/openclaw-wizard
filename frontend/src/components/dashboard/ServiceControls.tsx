import { Play, Square, RefreshCw, Loader2 } from 'lucide-react';
import type { ServicesStatus } from '../../types/ServicesStatus';

interface ActionLoading {
  gateway: string | null;
  daemon: string | null;
}

interface ServiceControlsProps {
  services: ServicesStatus | null;
  actionLoading: ActionLoading;
  onStartGateway: () => void;
  onStopGateway: () => void;
  onRestartGateway: () => void;
  onStartDaemon: () => void;
  onStopDaemon: () => void;
  onRestartDaemon: () => void;
}

/**
 * Two side-by-side panels for independent gateway and daemon control.
 */
export function ServiceControls({
  services,
  actionLoading,
  onStartGateway,
  onStopGateway,
  onRestartGateway,
  onStartDaemon,
  onStopDaemon,
  onRestartDaemon,
}: ServiceControlsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ServicePanel
        name="Gateway"
        running={services?.gateway?.running ?? false}
        loading={actionLoading.gateway}
        onStart={onStartGateway}
        onStop={onStopGateway}
        onRestart={onRestartGateway}
      />
      <ServicePanel
        name="Daemon"
        running={services?.daemon?.running ?? false}
        loading={actionLoading.daemon}
        onStart={onStartDaemon}
        onStop={onStopDaemon}
        onRestart={onRestartDaemon}
      />
    </div>
  );
}

interface ServicePanelProps {
  name: string;
  running: boolean;
  loading: string | null;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}

function ServicePanel({ name, running, loading, onStart, onStop, onRestart }: ServicePanelProps) {
  const isLoading = loading !== null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            running
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
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

      <div className="flex gap-2">
        <button
          onClick={onStart}
          disabled={running || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'start' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Start
        </button>

        <button
          onClick={onStop}
          disabled={!running || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'stop' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          Stop
        </button>

        <button
          onClick={onRestart}
          disabled={!running || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
