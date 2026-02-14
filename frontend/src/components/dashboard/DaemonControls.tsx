import { Play, Square, RotateCw, Loader2 } from 'lucide-react';

interface DaemonControlsProps {
  running: boolean;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRestart: () => Promise<void>;
  loading?: boolean;
}

/**
 * Daemon control buttons: Start, Stop, Restart
 */
export function DaemonControls({ running, onStart, onStop, onRestart, loading = false }: DaemonControlsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onStart}
        disabled={running || loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        Start
      </button>

      <button
        onClick={onStop}
        disabled={!running || loading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
        Stop
      </button>

      <button
        onClick={onRestart}
        disabled={!running || loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
        Restart
      </button>
    </div>
  );
}
