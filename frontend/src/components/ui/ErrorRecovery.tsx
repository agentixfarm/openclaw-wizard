import { CheckCircle, XCircle, MinusCircle, Loader2 } from 'lucide-react';
import { useRollback } from '../../hooks/useRollback';
import type { RollbackStage } from '../../types/RollbackStage';

interface ErrorRecoveryProps {
  error: string;
  context: 'node-install' | 'openclaw-install' | 'config-write' | 'api-validation';
  onRetry: () => void;
  onSkip?: () => void;
  onRollback?: () => void;
}

/**
 * Provides guided error message based on common error patterns
 */
function getGuidedMessage(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('npm not found') || lower.includes('node not found') || lower.includes('command not found: npm')) {
    return 'Node.js is not installed. Go back to System Check to install it.';
  }
  if (lower.includes('eacces') || lower.includes('permission denied')) {
    return 'Permission denied. Try running with sudo or fix directory permissions.';
  }
  if (lower.includes('enospc') || lower.includes('no space')) {
    return 'Disk full. Free up space and try again.';
  }
  if (lower.includes('etimedout') || lower.includes('timeout') || lower.includes('timed out')) {
    return 'Network timeout. Check your internet connection and try again.';
  }
  return 'Installation failed. You can rollback and try again.';
}

function StageIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'skipped':
      return <MinusCircle className="w-4 h-4 text-gray-400" />;
    default:
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
  }
}

function RollbackStageList({ stages }: { stages: RollbackStage[] }) {
  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Rollback Progress:</h4>
      <ul className="space-y-1">
        {stages.map((stage) => (
          <li key={stage.name} className="flex items-center gap-2 text-sm">
            <StageIcon status={stage.status} />
            <span className="font-mono text-gray-700 dark:text-gray-300">{stage.name}</span>
            {stage.message && (
              <span className="text-gray-500 dark:text-gray-400">- {stage.message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Context-aware error recovery suggestions with rollback support
 */
export function ErrorRecovery({ error, context, onRetry, onSkip, onRollback }: ErrorRecoveryProps) {
  const { loading: rollbackLoading, result: rollbackResult, rollback } = useRollback();

  const suggestions: Record<typeof context, string[]> = {
    'node-install': [
      'Check your internet connection',
      'Ensure you have administrator/sudo privileges',
      'Try installing Node.js manually from nodejs.org',
      'Check if antivirus is blocking the download',
    ],
    'openclaw-install': [
      'Check your internet connection',
      "Try running 'npm install -g openclaw' manually in a terminal",
      'Check npm permissions (may need --unsafe-perm flag)',
      'If sharp/libvips fails, install build tools for your platform',
    ],
    'config-write': [
      'Check write permissions to the config directory',
      'Ensure disk is not full',
      'Close programs that might be using the config file',
    ],
    'api-validation': [
      'Verify your API key is correct',
      'Check if the key is active in your provider dashboard',
      'Ensure you have sufficient API credits',
      'Try again in a few minutes (rate limit may be temporary)',
    ],
  };

  const guidedMessage = getGuidedMessage(error);

  const handleRollback = async () => {
    await rollback();
    onRollback?.();
  };

  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 border border-red-200 dark:border-red-800">
      {/* Error icon and title */}
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircle className="h-6 w-6 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Installation Failed</h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-400">
            <p className="font-mono bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">{error}</p>
          </div>

          {/* Guided message */}
          <p className="mt-2 text-sm text-red-700 dark:text-red-400 font-medium">
            {guidedMessage}
          </p>

          {/* Recovery suggestions */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Suggestions:</h4>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-400">
              {suggestions[context].map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          {/* Rollback result display */}
          {rollbackResult && <RollbackStageList stages={rollbackResult.stages} />}

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
            {!rollbackResult && (
              <button
                type="button"
                onClick={handleRollback}
                disabled={rollbackLoading}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-700 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {rollbackLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rolling back...
                  </>
                ) : (
                  'Rollback Installation'
                )}
              </button>
            )}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Skip This Step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
