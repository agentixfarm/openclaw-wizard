import { useState, useEffect } from 'react';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { StreamingOutput } from '../ui/StreamingOutput';
import { ErrorRecovery } from '../ui/ErrorRecovery';
import { useWizard } from '../wizard/WizardProvider';
import { useStreamingOutput } from '../../hooks/useStreamingOutput';
import { api } from '../../api/client';

/**
 * Installation progress step with streaming output
 */
export function InstallProgress() {
  const { nextStep } = useWizard();
  const { output, currentStage, status, error, progressPct, isConnected, startInstall } =
    useStreamingOutput();

  const [showConfirmation, setShowConfirmation] = useState(true);
  const [installStarted, setInstallStarted] = useState(false);
  const [nodeNeeded, setNodeNeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if Node.js is installed
  useEffect(() => {
    async function checkNodeInstallation() {
      try {
        const requirements = await api.getSystemRequirements();
        setNodeNeeded(!requirements.node_installed);
      } catch (err) {
        console.error('Failed to check Node.js installation:', err);
        setNodeNeeded(true); // Assume needed if check fails
      } finally {
        setLoading(false);
      }
    }
    checkNodeInstallation();
  }, []);

  useEffect(() => {
    // If Node.js is already installed, skip confirmation and auto-start
    if (!loading && !nodeNeeded && !installStarted) {
      setShowConfirmation(false);
      setInstallStarted(true);
      startInstall({
        install_node: false,
        install_openclaw: true,
      });
    }
  }, [loading, nodeNeeded, installStarted, startInstall]);

  const handleConfirmInstall = () => {
    setShowConfirmation(false);
    setInstallStarted(true);

    // Start installation
    startInstall({
      install_node: nodeNeeded,
      install_openclaw: true,
    });
  };

  const handleSkipNodeInstall = () => {
    setShowConfirmation(false);
    setInstallStarted(true);

    // Install only OpenClaw
    startInstall({
      install_node: false,
      install_openclaw: true,
    });
  };

  const handleRetry = () => {
    setInstallStarted(true);
    startInstall({
      install_node: nodeNeeded,
      install_openclaw: true,
    });
  };

  const handleNext = () => {
    nextStep();
  };

  return (
    <WizardStep
      title="Installing OpenClaw"
      description="Setting up your OpenClaw installation"
    >
      <div className="space-y-6">
        {/* Confirmation dialog for Node.js installation */}
        {showConfirmation && nodeNeeded && (
          <div className="rounded-md bg-blue-50 p-6 border border-blue-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Node.js 22+ Required
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Node.js was not detected on your system. Would you like to install it
                    now? This is required for OpenClaw to run.
                  </p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmInstall}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Install Node.js
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipNodeInstall}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Skip (I'll install manually)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Installation stages indicator */}
        {!showConfirmation && !loading && installStarted && (
          <div className="flex items-center justify-between">
            {/* Stage 1: Node.js */}
            {nodeNeeded && (
              <div className="flex-1">
                <div className="flex items-center">
                  {currentStage === 'node-install' && status === 'running' ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  ) : currentStage !== 'node-install' && status !== 'idle' ? (
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="ml-2 text-sm font-medium text-gray-700">Node.js</span>
                </div>
              </div>
            )}

            {/* Stage 2: OpenClaw */}
            <div className="flex-1">
              <div className="flex items-center">
                {currentStage === 'openclaw-install' && status === 'running' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                ) : currentStage === 'verify' || status === 'completed' ? (
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                <span className="ml-2 text-sm font-medium text-gray-700">OpenClaw</span>
              </div>
            </div>

            {/* Stage 3: Verify */}
            <div className="flex-1">
              <div className="flex items-center">
                {currentStage === 'verify' && status === 'running' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                ) : status === 'completed' ? (
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                <span className="ml-2 text-sm font-medium text-gray-700">Verify</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Checking system requirements...</p>
          </div>
        )}

        {/* Connection status */}
        {!showConfirmation && !loading && !isConnected && (
          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
            <p className="text-sm text-yellow-700">Connecting to server...</p>
          </div>
        )}

        {/* Streaming output */}
        {!showConfirmation && installStarted && status !== 'idle' && (
          <StreamingOutput
            output={output}
            stage={currentStage}
            progressPct={progressPct}
          />
        )}

        {/* Error recovery */}
        {status === 'failed' && error && (
          <ErrorRecovery
            error={error}
            context={
              currentStage === 'node-install'
                ? 'node-install'
                : 'openclaw-install'
            }
            onRetry={handleRetry}
          />
        )}

        {/* Success message */}
        {status === 'completed' && (
          <div className="rounded-md bg-green-50 p-6 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Installation Complete!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>OpenClaw has been installed successfully.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {status === 'completed' && (
        <WizardNavigation onNext={handleNext} nextLabel="Continue to Completion" />
      )}
    </WizardStep>
  );
}
