import { useState, useEffect, useCallback, useRef } from 'react';
import type { RemoteSetupProgress } from '../types/RemoteSetupProgress';
import type { WsMessage } from '../types/WsMessage';

type RemoteSetupStatus = 'idle' | 'in_progress' | 'completed' | 'failed';

/**
 * Hook for managing remote OpenClaw installation via WebSocket.
 *
 * Connects to WS /ws/remote/install and streams RemoteSetupProgress
 * messages during the multi-stage installation process.
 */
export function useRemoteSetup() {
  const [progress, setProgress] = useState<RemoteSetupProgress[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RemoteSetupStatus>('idle');
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/remote/install`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        if (message.msg_type === 'remote-install-progress') {
          const progressData = message.payload as RemoteSetupProgress;

          setProgress((prev) => [...prev, progressData]);

          if (progressData.status === 'completed') {
            setStatus('completed');
          } else if (progressData.status === 'failed') {
            setStatus('failed');
            setError(progressData.error || 'Installation failed');
          } else {
            setStatus('in_progress');
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.current.onerror = () => {
      setError('WebSocket connection error');
      setStatus('failed');
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };
  }, []);

  const startRemoteSetup = useCallback(
    (host: string, username: string) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        setError('WebSocket not connected');
        return;
      }

      const message: WsMessage = {
        msg_type: 'start-remote-install',
        payload: { host, username },
      };

      ws.current.send(JSON.stringify(message));
      setStatus('in_progress');
      setProgress([]);
      setError(null);
    },
    []
  );

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    progress,
    isConnected,
    error,
    status,
    connect,
    startRemoteSetup,
    disconnect,
  };
}
