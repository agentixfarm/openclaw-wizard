import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { StreamingOutput } from '../ui/StreamingOutput';

type UpgradeStatus = 'idle' | 'upgrading' | 'completed' | 'failed';

export function UpgradePanel() {
  const [status, setStatus] = useState<UpgradeStatus>('idle');
  const [output, setOutput] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [progressPct, setProgressPct] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  return (
    <div className="mb-6 border-t border-gray-200 dark:border-zinc-700 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <ArrowUpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Upgrade OpenClaw
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Update OpenClaw to the latest version. This will briefly stop the gateway,
        update the package, run diagnostics, and restart.
      </p>

      <button
        onClick={startUpgrade}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        Upgrade Now
      </button>
    </div>
  );
}
