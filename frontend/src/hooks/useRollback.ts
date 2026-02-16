import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { RollbackResult } from '../types/RollbackResult';

export function useRollback() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RollbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rollback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.rollbackInstallation();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, result, error, rollback, reset };
}
