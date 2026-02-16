import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { ServicesStatus } from '../types/ServicesStatus';
import type { DoctorReport } from '../types/DoctorReport';

interface ActionLoading {
  gateway: string | null;
  daemon: string | null;
}

interface ActionError {
  gateway: string | null;
  daemon: string | null;
}

/**
 * Hook for service status polling, independent gateway/daemon lifecycle
 * actions, and doctor diagnostics.
 *
 * Polls service status every 5 seconds.
 */
export function useServiceManager() {
  const [services, setServices] = useState<ServicesStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionLoading>({
    gateway: null,
    daemon: null,
  });
  const [actionError, setActionError] = useState<ActionError>({
    gateway: null,
    daemon: null,
  });
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api.getServicesStatus();
      setServices(status);
    } catch (error) {
      console.error('Failed to fetch services status:', error);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const clearError = useCallback((service: 'gateway' | 'daemon') => {
    setActionError(prev => ({ ...prev, [service]: null }));
  }, []);

  // Gateway actions
  const startGateway = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, gateway: 'start' }));
    setActionError(prev => ({ ...prev, gateway: null }));
    try {
      const result = await api.startGateway();
      if (!result.success) {
        setActionError(prev => ({ ...prev, gateway: result.message }));
      }
      await refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start gateway';
      setActionError(prev => ({ ...prev, gateway: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, gateway: null }));
    }
  }, [refreshStatus]);

  const stopGateway = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, gateway: 'stop' }));
    setActionError(prev => ({ ...prev, gateway: null }));
    try {
      const result = await api.stopGateway();
      if (!result.success) {
        setActionError(prev => ({ ...prev, gateway: result.message }));
      }
      await refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to stop gateway';
      setActionError(prev => ({ ...prev, gateway: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, gateway: null }));
    }
  }, [refreshStatus]);

  const restartGateway = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, gateway: 'restart' }));
    setActionError(prev => ({ ...prev, gateway: null }));
    try {
      const result = await api.restartGateway();
      if (!result.success) {
        setActionError(prev => ({ ...prev, gateway: result.message }));
      }
      await refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to restart gateway';
      setActionError(prev => ({ ...prev, gateway: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, gateway: null }));
    }
  }, [refreshStatus]);

  // Daemon actions
  const startDaemon = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, daemon: 'start' }));
    setActionError(prev => ({ ...prev, daemon: null }));
    try {
      const result = await api.startServiceDaemon();
      if (!result.success) {
        setActionError(prev => ({ ...prev, daemon: result.message }));
      }
      await refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start daemon';
      setActionError(prev => ({ ...prev, daemon: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, daemon: null }));
    }
  }, [refreshStatus]);

  const stopDaemon = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, daemon: 'stop' }));
    setActionError(prev => ({ ...prev, daemon: null }));
    try {
      const result = await api.stopServiceDaemon();
      if (!result.success) {
        setActionError(prev => ({ ...prev, daemon: result.message }));
      }
      await refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to stop daemon';
      setActionError(prev => ({ ...prev, daemon: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, daemon: null }));
    }
  }, [refreshStatus]);

  const restartDaemon = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, daemon: 'restart' }));
    setActionError(prev => ({ ...prev, daemon: null }));
    try {
      const result = await api.restartServiceDaemon();
      if (!result.success) {
        setActionError(prev => ({ ...prev, daemon: result.message }));
      }
      await refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to restart daemon';
      setActionError(prev => ({ ...prev, daemon: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, daemon: null }));
    }
  }, [refreshStatus]);

  // Doctor diagnostics
  const runDoctor = useCallback(async () => {
    setDoctorLoading(true);
    try {
      const report = await api.runDoctor();
      setDoctorReport(report);
    } catch (error) {
      console.error('Failed to run doctor:', error);
    } finally {
      setDoctorLoading(false);
    }
  }, []);

  return {
    services,
    actionLoading,
    actionError,
    clearError,
    startGateway,
    stopGateway,
    restartGateway,
    startDaemon,
    stopDaemon,
    restartDaemon,
    doctorReport,
    doctorLoading,
    runDoctor,
  };
}
