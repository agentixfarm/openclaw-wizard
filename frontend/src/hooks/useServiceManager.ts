import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { ServicesStatus } from '../types/ServicesStatus';
import type { DoctorReport } from '../types/DoctorReport';

interface ActionLoading {
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

  // Gateway actions
  const startGateway = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, gateway: 'start' }));
    try {
      await api.startGateway();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to start gateway:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, gateway: null }));
    }
  }, [refreshStatus]);

  const stopGateway = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, gateway: 'stop' }));
    try {
      await api.stopGateway();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to stop gateway:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, gateway: null }));
    }
  }, [refreshStatus]);

  const restartGateway = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, gateway: 'restart' }));
    try {
      await api.restartGateway();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to restart gateway:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, gateway: null }));
    }
  }, [refreshStatus]);

  // Daemon actions
  const startDaemon = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, daemon: 'start' }));
    try {
      await api.startServiceDaemon();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to start daemon:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, daemon: null }));
    }
  }, [refreshStatus]);

  const stopDaemon = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, daemon: 'stop' }));
    try {
      await api.stopServiceDaemon();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to stop daemon:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, daemon: null }));
    }
  }, [refreshStatus]);

  const restartDaemon = useCallback(async () => {
    setActionLoading(prev => ({ ...prev, daemon: 'restart' }));
    try {
      await api.restartServiceDaemon();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to restart daemon:', error);
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
