import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { CostAnalysis } from '../types/CostAnalysis';
import type { SecurityAudit } from '../types/SecurityAudit';
import type { LlmPricingResponse } from '../types/LlmPricingResponse';

/**
 * Hook for intelligence API calls: cost analysis, security audit, and pricing.
 *
 * Manages loading states, errors, and cached results for each endpoint.
 */
export function useConfigAnalyzer() {
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [securityAudit, setSecurityAudit] = useState<SecurityAudit | null>(null);
  const [pricing, setPricing] = useState<LlmPricingResponse | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCost = useCallback(async () => {
    setCostLoading(true);
    setError(null);
    try {
      const result = await api.analyzeCost();
      setCostAnalysis(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cost analysis failed';
      setError(message);
    } finally {
      setCostLoading(false);
    }
  }, []);

  const runSecurityAudit = useCallback(async () => {
    setAuditLoading(true);
    setError(null);
    try {
      const result = await api.securityAudit();
      setSecurityAudit(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Security audit failed';
      setError(message);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const result = await api.getLlmPricing();
      setPricing(result);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  }, []);

  return {
    costAnalysis,
    securityAudit,
    pricing,
    costLoading,
    auditLoading,
    error,
    analyzeCost,
    runSecurityAudit,
    loadPricing,
  };
}
