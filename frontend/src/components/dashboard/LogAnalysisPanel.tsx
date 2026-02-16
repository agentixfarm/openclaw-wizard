import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Wrench,
  Loader2,
  Lock,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
} from 'lucide-react';
import type { LogAnalysis } from '../../types/LogAnalysis';

interface LogAnalysisPanelProps {
  analysis: LogAnalysis | null;
  analyzing: boolean;
  error: string | null;
  logContext: string;
  onDismiss: () => void;
}

/**
 * Slide-over panel showing AI-powered log error analysis results.
 * Displays error summary, likely cause, fix steps, and confidence level.
 */
export function LogAnalysisPanel({
  analysis,
  analyzing,
  error,
  logContext,
  onDismiss,
}: LogAnalysisPanelProps) {
  const [showContext, setShowContext] = useState(false);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onDismiss}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-zinc-900 text-gray-200 z-50 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Error Analysis</h2>
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Analyzing state */}
          {analyzing && (
            <div className="flex flex-col items-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-gray-400">Analyzing error with AI...</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                <span>Log context is redacted. API keys are never sent to the AI provider.</span>
              </div>
            </div>
          )}

          {/* Error: Not configured */}
          {error && error.toLowerCase().includes('not configured') && (
            <div className="flex items-start gap-3 p-4 bg-zinc-800 rounded-lg">
              <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-300">
                  AI analysis requires a configured AI provider. Set up an AI provider in the wizard to enable this feature.
                </p>
              </div>
            </div>
          )}

          {/* Error: Rate limited */}
          {error && error.toLowerCase().includes('rate') && (
            <div className="flex items-start gap-3 p-4 bg-zinc-800 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-300">
                  Please wait before requesting another analysis.
                </p>
              </div>
            </div>
          )}

          {/* Error: General failure */}
          {error && !error.toLowerCase().includes('not configured') && !error.toLowerCase().includes('rate') && (
            <div className="flex items-start gap-3 p-4 bg-red-950/50 border border-red-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Analysis results */}
          {analysis && !analyzing && (
            <>
              {/* Error Summary */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-amber-300">Error Summary</h3>
                </div>
                <div className="p-3 bg-amber-950/50 border border-amber-700 rounded-lg">
                  <p className="text-sm text-amber-200">{analysis.error_summary}</p>
                </div>
              </div>

              {/* Likely Cause */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Likely Cause</h3>
                <p className="text-sm text-gray-400">{analysis.cause}</p>
              </div>

              {/* Fix Steps */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-sky-400" />
                  <h3 className="font-semibold text-gray-300">Fix Steps</h3>
                </div>
                <ol className="list-decimal list-inside space-y-2">
                  {analysis.fix_steps.map((step, index) => (
                    <li key={index} className="text-sm text-gray-400">
                      <span className="ml-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Confidence badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Confidence:</span>
                <ConfidenceBadge confidence={analysis.confidence} />
              </div>
            </>
          )}

          {/* Log context (collapsible) */}
          {logContext && (
            <div className="border-t border-zinc-800 pt-4">
              <button
                onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showContext ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Show log context
              </button>
              {showContext && (
                <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-xs text-gray-500 overflow-x-auto max-h-60 overflow-y-auto">
                  {logContext}
                </pre>
              )}
            </div>
          )}

          {/* Security indicator */}
          <div className="flex items-center gap-1.5 pt-4 border-t border-zinc-800">
            <Lock className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-600">
              Log context is redacted before analysis. API keys and tokens are never sent to the AI provider.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: 'bg-emerald-900 text-emerald-300',
    medium: 'bg-yellow-900 text-yellow-300',
    low: 'bg-zinc-700 text-gray-300',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[confidence.toLowerCase()] || styles.low
      }`}
    >
      {confidence.toUpperCase()}
    </span>
  );
}
