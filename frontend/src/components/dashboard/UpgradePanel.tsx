import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUpCircle, RefreshCw, Loader2 } from 'lucide-react';
import { StreamingOutput } from '../ui/StreamingOutput';
import { api } from '../../api/client';

type UpgradeStatus = 'idle' | 'checking' | 'update-available' | 'upgrading' | 'completed' | 'failed';

interface VersionInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
}

export function UpgradePanel() {
  const [status, setStatus] = useState<UpgradeStatus>('idle');
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [progressPct, setProgressPct] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      const response = await api.getVersionInfo();
      if (response.success && response.data) {
        setVersionInfo(response.data);
        setStatus(response.data.update_available ? 'update-available' : 'idle');
      } else {
        throw new Error(response.error || 'Failed to check version');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      setStatus('idle');
    }
  }, []);

  const startUpgrade = useCallback(() => {
    setStatus('upgrading');
    setOutput([]);
    setError(null);
    setCurrentMessage('Starting upgrade...');
    setProgressPct(0);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        msg_type: 'start-upgrade',
        payload: {},
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.msg_type === 'upgrade-progress') {
          const progress = msg.payload;
          setCurrentMessage(progress.message || '');
          setProgressPct(progress.progress_pct ?? undefined);

          if (progress.output_line) {
            setOutput((prev) => [...prev, progress.output_line]);
          }

          if (progress.status === 'completed') {
            setStatus('completed');
            ws.close();
          } else if (progress.status === 'failed') {
            setError(progress.error || progress.message || 'Upgrade failed');
            setStatus('failed');
            ws.close();
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed');
      setStatus('failed');
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  if (status === 'upgrading' || status === 'completed' || status === 'failed') {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
          {status === 'completed' ? 'Upgrade Complete' : status === 'failed' ? 'Upgrade Failed' : 'Upgrading...'}
        </h3>

        <div className="mb-4">
          <StreamingOutput
            output={output}
            stage="upgrade"
            message={currentMessage}
            progressPct={progressPct}
          />
        </div>

        {status === 'completed' && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              OpenClaw has been updated and the gateway is running.
            </p>
          </div>
        )}

        {status === 'failed' && error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show check for updates state
  if (status === 'checking') {
    return (
      <div className="mb-6 border-t border-gray-200 dark:border-zinc-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Checking for Updates
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking for latest version...
        </div>
      </div>
    );
  }

  // Show update available state
  if (status === 'update-available' && versionInfo) {
    return (
      <div className="mb-6 border-t border-gray-200 dark:border-zinc-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          Update Available!
        </h3>

        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Version</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {versionInfo.current_version}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Latest Version</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                {versionInfo.latest_version}
                <ArrowUpCircle className="w-4 h-4" />
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            A new version is available. Upgrading will briefly stop the gateway,
            update the package, run diagnostics, and restart.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startUpgrade}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            Upgrade Now
          </button>
          <button
            onClick={() => setStatus('idle')}
            className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    );
  }

  // Default idle state
  return (
    <div className="mb-6 border-t border-gray-200 dark:border-zinc-700 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <ArrowUpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Updates
      </h3>

      {versionInfo && !versionInfo.update_available && (
        <div className="mb-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <ArrowUpCircle className="w-4 h-4" />
          You're running the latest version ({versionInfo.current_version})
        </div>
      )}

      {!versionInfo && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Check if a newer version of OpenClaw is available.
        </p>
      )}

      <button
        onClick={checkForUpdates}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Check for Updates
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
