import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { type OpenClawConfigInput } from '../../lib/config-schema';
import { api } from '../../api/client';
import { CostOptimizer } from './CostOptimizer';
import type { CostAnalysis } from '../../types/CostAnalysis';
import type { LlmPricingResponse } from '../../types/LlmPricingResponse';

interface CostOptimizationTabProps {
  costAnalysis: CostAnalysis | null;
  pricing: LlmPricingResponse | null;
  costLoading: boolean;
  error: string | null;
  onAnalyzeCost: () => void;
  onLoadPricing: () => void;
}

/**
 * Cost Optimization tab combining model configuration, heartbeat settings, and cost analysis
 */
export function CostOptimizationTab({
  costAnalysis,
  pricing,
  costLoading,
  error,
  onAnalyzeCost,
  onLoadPricing,
}: CostOptimizationTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fullConfigRef = useRef<OpenClawConfigInput | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OpenClawConfigInput>({
    defaultValues: {
      models: {
        main: 'claude-opus-4-6',
        heartbeat: 'claude-haiku-4-5-20251001',
        agent: 'claude-sonnet-4-5-20250929',
      },
      heartbeat: {
        interval_minutes: 60,
      },
    },
  });

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        fullConfigRef.current = config;
        reset(config);
      } catch (error) {
        console.error('Failed to load config:', error);
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [reset]);

  // Save configuration - merge form values with full config
  const onSubmit = async (data: OpenClawConfigInput) => {
    setSaving(true);
    try {
      const merged = {
        ...fullConfigRef.current,
        models: data.models,
        heartbeat: data.heartbeat,
      };
      await api.saveDashboardConfig(merged);
      fullConfigRef.current = merged;
      toast.success('Model configuration saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cost Analysis Section */}
      <CostOptimizer
        costAnalysis={costAnalysis}
        pricing={pricing}
        loading={costLoading}
        error={error}
        onAnalyze={onAnalyzeCost}
        onLoadPricing={onLoadPricing}
      />

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-zinc-700" />

      {/* Model Configuration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Model Configuration Section */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Model Configuration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure which models to use for different tasks. Using cheaper models for heartbeats and background tasks saves costs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Model */}
            <div>
              <label htmlFor="main-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Main Model
              </label>
              <select
                id="main-model"
                {...register('models.main')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="claude-opus-4-6">Claude Opus 4.6 (Most Capable)</option>
                <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Balanced)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast & Cheap)</option>
                <option value="gpt-4">GPT-4 (OpenAI)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (OpenAI)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Primary model for conversations</p>
            </div>

            {/* Agent Model */}
            <div>
              <label htmlFor="agent-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Agent Model
              </label>
              <select
                id="agent-model"
                {...register('models.agent')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="claude-opus-4-6">Claude Opus 4.6</option>
                <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Recommended)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Model for autonomous agents</p>
            </div>

            {/* Heartbeat Model */}
            <div>
              <label htmlFor="heartbeat-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Heartbeat Model
              </label>
              <select
                id="heartbeat-model"
                {...register('models.heartbeat')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Recommended)</option>
                <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cheap model for health checks</p>
            </div>
          </div>
        </section>

        {/* Heartbeat Settings Section */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Heartbeat Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure how often the system sends periodic health check messages. Longer intervals reduce costs.
          </p>
          <div className="max-w-md">
            <label htmlFor="heartbeat-interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Heartbeat Interval (minutes)
            </label>
            <input
              id="heartbeat-interval"
              type="number"
              min="5"
              max="1440"
              step="5"
              {...register('heartbeat.interval_minutes', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="60"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Recommended: 60 minutes (1 hour). Range: 5 minutes to 1440 minutes (24 hours)
            </p>
            {errors.heartbeat?.interval_minutes && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.heartbeat.interval_minutes.message}</p>
            )}
          </div>
        </section>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
