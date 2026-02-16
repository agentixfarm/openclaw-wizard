import { useState } from 'react';
import { DollarSign, TrendingDown, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { CostAnalysis } from '../../types/CostAnalysis';
import type { LlmPricingResponse } from '../../types/LlmPricingResponse';

interface CostOptimizerProps {
  costAnalysis: CostAnalysis | null;
  pricing: LlmPricingResponse | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
  onLoadPricing: () => void;
}

/**
 * Cost optimization UI with AI-generated recommendations, savings estimates,
 * and LLM pricing reference table.
 */
export function CostOptimizer({
  costAnalysis,
  pricing,
  loading,
  error,
  onAnalyze,
  onLoadPricing,
}: CostOptimizerProps) {
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const toggleRec = (index: number) => {
    setExpandedRec(expandedRec === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Header with Analyze button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cost Optimization</h3>
          <p className="text-sm text-gray-600">
            AI-powered analysis of your configuration for cost savings opportunities.
          </p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4" />
              Analyze Configuration
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {costAnalysis && (
        <>
          {/* Summary card */}
          {costAnalysis.total_savings_monthly > 0 ? (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-6 h-6 text-green-600" />
                <span className="text-2xl font-bold text-green-700">
                  Save ${costAnalysis.total_savings_monthly.toFixed(2)}/month
                </span>
              </div>
              <p className="text-sm text-green-700">
                Current: ${costAnalysis.total_current_monthly.toFixed(2)}/mo
                {' -> '}Recommended: ${costAnalysis.total_recommended_monthly.toFixed(2)}/mo
              </p>
              {costAnalysis.summary && (
                <p className="text-sm text-green-600 mt-2">{costAnalysis.summary}</p>
              )}
            </div>
          ) : (
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 font-medium">
                Your configuration is already cost-optimized. No recommendations at this time.
              </p>
            </div>
          )}

          {/* Recommendations */}
          {costAnalysis.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Recommendations</h4>
              {costAnalysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleRec(index)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">
                        {rec.use_case}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                        Save ${rec.savings_monthly.toFixed(2)}/mo ({rec.savings_percent.toFixed(0)}%)
                      </span>
                    </div>
                    {expandedRec === index ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedRec === index && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 pt-3">
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 font-medium mb-1">Current</p>
                          <p className="font-semibold text-red-800">{rec.current_model}</p>
                          <p className="text-sm text-red-600">${rec.current_cost_monthly.toFixed(2)}/mo</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-600 font-medium mb-1">Recommended</p>
                          <p className="font-semibold text-green-800">{rec.recommended_model}</p>
                          <p className="text-sm text-green-600">${rec.recommended_cost_monthly.toFixed(2)}/mo</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{rec.rationale}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">Analysis date: {costAnalysis.analysis_date}</p>
        </>
      )}

      {/* Pricing Reference */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => {
            if (!showPricing && !pricing) onLoadPricing();
            setShowPricing(!showPricing);
          }}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {showPricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Pricing Reference
        </button>
        {showPricing && pricing && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Provider</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Model</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Input/1M</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Output/1M</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {pricing.models.map((model, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-700">{model.provider}</td>
                    <td className="py-2 px-3 font-mono text-gray-900">{model.model}</td>
                    <td className="py-2 px-3 text-right text-gray-700">${model.input_per_million.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-gray-700">${model.output_per_million.toFixed(2)}</td>
                    <td className="py-2 px-3 text-gray-500">{model.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">Last updated: {pricing.last_updated}</p>
          </div>
        )}
      </div>
    </div>
  );
}
