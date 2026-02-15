import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { DockerStatusResponse } from '../types/DockerStatusResponse';
import type { ContainerInfo } from '../types/ContainerInfo';

/**
 * Hook managing Docker sandbox lifecycle:
 * check availability, create/stop/remove containers, view logs
 */
export function useDockerSandbox() {
  const [status, setStatus] = useState<DockerStatusResponse | null>(null);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsContainerId, setLogsContainerId] = useState<string | null>(null);

  const checkDocker = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDockerStatus();
      setStatus(result);
      if (result.available && result.containers) {
        setContainers(result.containers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Docker status');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshContainers = useCallback(async () => {
    try {
      const result = await api.listContainers();
      setContainers(result);
    } catch (err) {
      // Silently fail on refresh -- containers list may be stale but not critical
      console.error('Failed to refresh containers:', err);
    }
  }, []);

  const createSandbox = useCallback(async (name?: string) => {
    setCreating(true);
    setError(null);
    try {
      const result = await api.createSandbox({
        name: name || 'openclaw-sandbox',
        image: null,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create sandbox');
      }
      await refreshContainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sandbox');
    } finally {
      setCreating(false);
    }
  }, [refreshContainers]);

  const stopContainer = useCallback(async (id: string) => {
    setError(null);
    try {
      await api.stopContainer(id);
      await refreshContainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop container');
    }
  }, [refreshContainers]);

  const removeContainer = useCallback(async (id: string) => {
    setError(null);
    try {
      await api.removeContainer(id);
      // Clear logs if viewing removed container
      if (logsContainerId === id) {
        setLogs([]);
        setLogsContainerId(null);
      }
      await refreshContainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove container');
    }
  }, [refreshContainers, logsContainerId]);

  const viewLogs = useCallback(async (id: string) => {
    try {
      const result = await api.getContainerLogs(id, 100);
      setLogs(result.logs);
      setLogsContainerId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    }
  }, []);

  const closeLogs = useCallback(() => {
    setLogs([]);
    setLogsContainerId(null);
  }, []);

  // Check Docker availability on mount
  useEffect(() => {
    checkDocker();
  }, [checkDocker]);

  return {
    status,
    containers,
    loading,
    creating,
    error,
    logs,
    logsContainerId,
    dockerAvailable: status?.available ?? false,
    checkDocker,
    createSandbox,
    stopContainer,
    removeContainer,
    refreshContainers,
    viewLogs,
    closeLogs,
  };
}
