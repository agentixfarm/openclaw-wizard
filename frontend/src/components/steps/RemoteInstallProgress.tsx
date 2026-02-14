import { useEffect, useRef } from 'react';
import { useWizard } from '../wizard/WizardProvider';
import { useRemoteSetup } from '../../hooks/useRemoteSetup';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import type { RemoteSetupProgress } from '../../types/RemoteSetupProgress';

export function RemoteInstallProgress() {
  const { formData, nextStep } = useWizard();
  const { progress, error, status, isConnected, connect, startRemoteSetup } =
    useRemoteSetup();
  const hasStarted = useRef(false);

  // Connect WebSocket and start installation on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Start installation once WebSocket is connected (only once)
  useEffect(() => {
    if (isConnected && !hasStarted.current) {
      const { host, username } = formData.sshCredentials || {};
      if (host && username) {
        hasStarted.current = true;
        startRemoteSetup(host, username);
      }
    }
  }, [isConnected, startRemoteSetup, formData.sshCredentials]);

  const getStageIcon = (progressItem: RemoteSetupProgress) => {
    if (progressItem.status === 'completed') {
      return (
        <svg
          className="w-6 h-6 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    } else if (progressItem.status === 'failed') {
      return (
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-6 h-6 text-sky-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }
  };

  return (
    <WizardStep
      title="Installing OpenClaw"
      description="Setting up OpenClaw on your remote VPS"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Waiting State */}
        {status === 'idle' && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="animate-spin h-12 w-12 text-sky-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connecting to remote server...
              </p>
            </div>
          </div>
        )}

        {/* Progress Stages */}
        <div className="space-y-3">
          {progress.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 border rounded-lg"
            >
              <div className="flex-shrink-0 mt-1">{getStageIcon(item)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{item.stage}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(Number(item.timestamp) * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.message}
                </p>
                {item.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Error: {item.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 font-medium">
              Installation Failed
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              {error}
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300 font-medium">
              Remote installation complete!
            </p>
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">
              OpenClaw is now running on your VPS.
            </p>
          </div>
        )}

        {/* Navigation (only show when complete) */}
        {status === 'completed' && <WizardNavigation onNext={nextStep} />}
      </div>
    </WizardStep>
  );
}
