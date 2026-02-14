import { useState, useEffect, useRef } from 'react';
import { WebSocketClient } from '../api/websocket';
import type { InstallRequest } from '../types/InstallRequest';
import type { InstallProgress } from '../types/InstallProgress';
import type { WsMessage } from '../types/WsMessage';

type InstallStatus = 'idle' | 'running' | 'completed' | 'failed';

interface StreamingOutputState {
  output: string[];
  currentStage: string;
  status: InstallStatus;
  error: string | null;
  progressPct: number | null;
  isConnected: boolean;
  startInstall: (request: InstallRequest) => void;
}

/**
 * Hook for streaming installation output via WebSocket
 */
export function useStreamingOutput(): StreamingOutputState {
  const [output, setOutput] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // Create WebSocket client
    const client = new WebSocketClient();

    // Subscribe to connection status
    const unsubscribeStatus = client.onStatusChange((status) => {
      setIsConnected(status === 'connected');
    });

    // Subscribe to messages
    const unsubscribeMessages = client.onMessage((data) => {
      try {
        const message = JSON.parse(data) as WsMessage;

        if (message.msg_type === 'install-progress') {
          const progress = message.payload as unknown as InstallProgress;

          // Update stage and status
          setCurrentStage(progress.stage);
          setStatus(progress.status as InstallStatus);
          setProgressPct(progress.progress_pct ?? null);

          // Add output line if present
          if (progress.output_line) {
            setOutput((prev) => {
              // Limit to last 500 lines to prevent memory issues
              const newOutput = [...prev, progress.output_line!];
              return newOutput.slice(-500);
            });
          }

          // Update error if present
          if (progress.error) {
            setError(progress.error);
          }

          // Clear error on new stage success
          if (progress.status === 'running' || progress.status === 'completed') {
            setError(null);
          }
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    });

    // Connect to WebSocket
    client.connect();

    wsClient.current = client;

    // Cleanup
    return () => {
      unsubscribeStatus();
      unsubscribeMessages();
      client.disconnect();
    };
  }, []);

  const startInstall = (request: InstallRequest) => {
    if (!wsClient.current) {
      console.error('WebSocket not connected');
      return;
    }

    // Reset state
    setOutput([]);
    setCurrentStage('');
    setStatus('running');
    setError(null);
    setProgressPct(null);

    // Send install request via WebSocket
    const message: WsMessage = {
      msg_type: 'start-install',
      payload: request as any,
    };

    wsClient.current.send(JSON.stringify(message));
  };

  return {
    output,
    currentStage,
    status,
    error,
    progressPct,
    isConnected,
    startInstall,
  };
}
