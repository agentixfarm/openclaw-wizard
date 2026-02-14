interface ErrorRecoveryProps {
  error: string;
  context: 'node-install' | 'openclaw-install' | 'config-write' | 'api-validation';
  onRetry: () => void;
  onSkip?: () => void;
}

/**
 * Context-aware error recovery suggestions
 */
export function ErrorRecovery({ error, context, onRetry, onSkip }: ErrorRecoveryProps) {
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

  return (
    <div className="rounded-md bg-red-50 p-6 border-l-4 border-red-400">
      {/* Error icon and title */}
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Installation Failed</h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="font-mono bg-red-100 px-2 py-1 rounded">{error}</p>
          </div>

          {/* Recovery suggestions */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-red-800">Suggestions:</h4>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-red-700">
              {suggestions[context].map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
