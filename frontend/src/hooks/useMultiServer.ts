import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { ServerTarget } from '../types/ServerTarget';
import type { MultiServerProgress } from '../types/MultiServerProgress';
import type { ServerDeployResult } from '../types/ServerDeployResult';

/**
 * Hook for multi-server operations: server CRUD, WebSocket deployment
 * with per-server progress tracking, and rollback.
 */
export function useMultiServer() {
  const [servers, setServers] = useState<ServerTarget[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState<Record<string, MultiServerProgress>>({});
  const [results, setResults] = useState<ServerDeployResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    try {
      const serverList = await api.getServers();
      setServers(serverList);
    } catch (err) {
      console.error('Failed to load servers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    }
  }, []);

  const addServer = useCallback(async (server: ServerTarget) => {
    try {
      setError(null);
      await api.addServer(server);
      await loadServers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add server';
      setError(message);
      throw err;
    }
  }, [loadServers]);

  const removeServer = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.removeServer(id);
      await loadServers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove server';
      setError(message);
    }
  }, [loadServers]);

  const testServer = useCallback(async (id: string) => {
    try {
      setError(null);
      const result = await api.testServer(id);
      // Update local server status
      setServers(prev =>
        prev.map(s =>
          s.id === id
            ? { ...s, status: result.success ? 'connected' : 'failed' }
            : s
        )
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test server';
      setError(message);
      return null;
    }
  }, []);

  const testAllServers = useCallback(async () => {
    const untested = servers.filter(s => s.status === 'pending' || s.status === 'failed');
    for (const server of untested) {
      await testServer(server.id);
    }
  }, [servers, testServer]);

  const deployToServers = useCallback(async (serverIds: string[]) => {
    setDeploying(true);
    setProgress({});
    setResults([]);
    setError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/multi-server/deploy`);

      ws.onopen = () => {
        // Send deployment request
        ws.send(JSON.stringify({
          msg_type: 'start-multi-server-deploy',
          payload: { server_ids: serverIds },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const wsMsg = JSON.parse(event.data);
          if (wsMsg.msg_type === 'multi-server-progress') {
            const serverProgress = wsMsg.payload as MultiServerProgress;
            setProgress(prev => ({
              ...prev,
              [serverProgress.server_id]: serverProgress,
            }));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setDeploying(false);
        // Reload servers to get updated statuses
        loadServers();
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection failed');
        setDeploying(false);
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deployment failed';
      setError(message);
      setDeploying(false);
    }
  }, [loadServers]);

  const rollbackServer = useCallback(async (id: string) => {
    try {
      setError(null);
      const result = await api.rollbackServer(id);
      // Update local server status
      setServers(prev =>
        prev.map(s =>
          s.id === id ? { ...s, status: 'pending' } : s
        )
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rollback failed';
      setError(message);
      return null;
    }
  }, []);

  const rollbackAll = useCallback(async () => {
    const deployed = servers.filter(s => s.status === 'deployed');
    for (const server of deployed) {
      await rollbackServer(server.id);
    }
  }, [servers, rollbackServer]);

  return {
    servers,
    deploying,
    progress,
    results,
    error,
    loadServers,
    addServer,
    removeServer,
    testServer,
    testAllServers,
    deployToServers,
    rollbackServer,
    rollbackAll,
  };
}
