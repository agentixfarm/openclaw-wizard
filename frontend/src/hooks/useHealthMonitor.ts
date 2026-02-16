import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { HealthSnapshot } from '../types/HealthSnapshot';

/**
 * Hook for polling gateway health status
 */
export function useHealthMonitor() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const newHealth = await api.getHealth();
      setHealth(newHealth);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      setLoading(false);
      // Keep previous health on error
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return { health, loading, refresh };
}
