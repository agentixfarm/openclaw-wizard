import { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StreamingOutput } from '../ui/StreamingOutput';

type UninstallStatus = 'idle' | 'confirming' | 'uninstalling' | 'completed' | 'failed';

export function UninstallPanel() {
  const [status, setStatus] = useState<UninstallStatus>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [progressPct, setProgressPct] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startUninstall = useCallback(() => {
    setStatus('uninstalling');
    setOutput([]);
    setError(null);
    setCurrentMessage('Starting uninstall...');
    setProgressPct(0);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        msg_type: 'start-uninstall',
        payload: {},
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.msg_type === 'uninstall-progress') {
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
            setError(progress.error || progress.message || 'Uninstall failed');
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

  const handleConfirm = () => {
    if (confirmText === 'UNINSTALL') {
      startUninstall();
    }
  };

  if (status === 'uninstalling' || status === 'completed' || status === 'failed') {
    return (
      <div className="mt-8 border-t-2 border-red-300 dark:border-red-800 pt-6">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">
          {status === 'completed' ? 'Uninstall Complete' : status === 'failed' ? 'Uninstall Failed' : 'Uninstalling...'}
        </h3>

        <div className="mb-4">
          <StreamingOutput
            output={output}
            stage="uninstall"
            message={currentMessage}
            progressPct={progressPct}
          />
        </div>

        {status === 'completed' && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              OpenClaw has been completely removed. You can close this window.
            </p>
          </div>
        )}

        {status === 'failed' && error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => { setStatus('idle'); setConfirmText(''); }}
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
    <div className="mt-8 border-t-2 border-red-300 dark:border-red-800 pt-6">
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        Danger Zone
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Completely remove OpenClaw, including the gateway service, all configuration,
        state data, and the npm package. This action cannot be undone.
      </p>

      {status === 'idle' && (
        <button
          onClick={() => setStatus('confirming')}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Uninstall OpenClaw
        </button>
      )}

      {status === 'confirming' && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800 max-w-md">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Type <strong>UNINSTALL</strong> to confirm removal:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="UNINSTALL"
              className="flex-1 px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            />
            <button
              onClick={handleConfirm}
              disabled={confirmText !== 'UNINSTALL'}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => { setStatus('idle'); setConfirmText(''); }}
              className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
