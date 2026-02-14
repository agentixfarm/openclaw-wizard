import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DaemonStatus } from '../types/DaemonStatus';

/**
 * Hook for polling daemon status and providing daemon control actions
 */
export function useDaemonStatus() {
  const [status, setStatus] = useState<DaemonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = async () => {
    try {
      const newStatus = await api.getDaemonStatus();
      setStatus(newStatus);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch daemon status:', error);
      setLoading(false);
      // Keep previous status on error
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const start = async () => {
    setActionLoading(true);
    try {
      await api.startDaemon();
      await refresh();
    } catch (error) {
      console.error('Failed to start daemon:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const stop = async () => {
    setActionLoading(true);
    try {
      await api.stopDaemon();
      await refresh();
    } catch (error) {
      console.error('Failed to stop daemon:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const restart = async () => {
    setActionLoading(true);
    try {
      await api.restartDaemon();
      await refresh();
    } catch (error) {
      console.error('Failed to restart daemon:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  return { status, loading, actionLoading, start, stop, restart, refresh };
}
