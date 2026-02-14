import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import type { SystemRequirements } from '../../types/SystemRequirements';
import type { RequirementCheck } from '../../types/RequirementCheck';

export function SystemCheck() {
  const { updateFormData, nextStep } = useWizard();
  const [requirements, setRequirements] = useState<SystemRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequirements() {
      try {
        setLoading(true);
        const data = await api.getSystemRequirements();
        setRequirements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check system requirements');
      } finally {
        setLoading(false);
      }
    }

    fetchRequirements();
  }, []);

  const handleNext = () => {
    updateFormData('systemCheck', { acknowledged: true });
    nextStep();
  };

  if (loading) {
    return (
      <WizardStep
        title="System Check"
        description="Checking your system requirements..."
      >
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin h-12 w-12 text-blue-600"
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
            <p className="text-sm text-gray-600">Checking system requirements...</p>
          </div>
        </div>
      </WizardStep>
    );
  }

  if (error) {
    return (
      <WizardStep title="System Check" description="Error checking requirements">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
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
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </WizardStep>
    );
  }

  if (!requirements) {
    return null;
  }

  const nodeNotInstalled = requirements.checks.find(
    (check) => check.name === 'Node.js' && !check.passed
  );

  return (
    <WizardStep
      title="System Check"
      description="Verifying your system meets the requirements for OpenClaw"
    >
      {/* Requirements list */}
      <div className="space-y-3">
        {requirements.checks.map((check: RequirementCheck, index: number) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${
              check.passed
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                {check.passed ? (
                  <svg
                    className="h-6 w-6 text-green-600"
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
                ) : (
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    check.passed ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {check.name}
                </p>

                <div className="mt-1 text-xs space-y-1">
                  {check.required && (
                    <p
                      className={
                        check.passed ? 'text-green-700' : 'text-red-700'
                      }
                    >
                      <span className="font-medium">Required:</span> {check.required}
                    </p>
                  )}
                  {check.actual && (
                    <p
                      className={
                        check.passed ? 'text-green-700' : 'text-red-700'
                      }
                    >
                      <span className="font-medium">Found:</span> {check.actual}
                    </p>
                  )}
                  {!check.passed && check.help_text && (
                    <p className="text-red-700 mt-2 font-medium">
                      {check.help_text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Node.js not installed message */}
      {nodeNotInstalled && (
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
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
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Node.js Installation Required
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Node.js 22+ is required but not installed. The wizard can
                  install it for you in a later step.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall status */}
      {requirements.all_passed ? (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
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
                All requirements met!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your system is ready to install OpenClaw.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Some requirements not met
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Don't worry! The wizard will help you install missing
                  components.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation onNext={handleNext} />
    </WizardStep>
  );
}
