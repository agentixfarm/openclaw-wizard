import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import type { SystemRequirements } from '../../types/SystemRequirements';
import type { RequirementCheck } from '../../types/RequirementCheck';
import type { OpenClawDetection } from '../../types/OpenClawDetection';

export function SetupStep() {
  const { updateFormData, nextStep, formData } = useWizard();
  const [requirements, setRequirements] = useState<SystemRequirements | null>(null);
  const [detection, setDetection] = useState<OpenClawDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(
    formData.securityAck?.acknowledged || false
  );
  const [useExisting, setUseExisting] = useState<boolean | null>(null);

  // Run system check + detection in parallel on mount
  useEffect(() => {
    async function runChecks() {
      try {
        setLoading(true);
        const [reqData, detectData] = await Promise.all([
          api.getSystemRequirements(),
          api.detectOpenClaw(),
        ]);
        setRequirements(reqData);
        setDetection(detectData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check system');
      } finally {
        setLoading(false);
      }
    }
    runChecks();
  }, []);

  const handleNext = () => {
    if (!acknowledged) return;

    updateFormData('securityAck', {
      acknowledged: true,
      timestamp: Date.now(),
    });
    updateFormData('systemCheck', { acknowledged: true });

    // Pre-populate from existing config if user chose to
    if (detection?.installed && detection.config_found && useExisting === true && detection.existing_config) {
      try {
        const existing = detection.existing_config as Record<string, Record<string, unknown>>;
        if (existing.ai?.provider) {
          updateFormData('providerConfig', {
            provider: existing.ai.provider,
            apiKey: '',
          });
        }
        if (existing.gateway) {
          updateFormData('gatewayConfig', {
            port: existing.gateway.port || 18789,
            bind: existing.gateway.bind || 'loopback',
            authMode: existing.gateway.auth?.mode || 'token',
            authCredential: '',
          });
        }
      } catch (err) {
        console.error('Failed to parse existing config:', err);
      }
    }

    nextStep();
  };

  if (loading) {
    return (
      <WizardStep title="Setup" description="Checking your system...">
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Running system checks...
            </p>
          </div>
        </div>
      </WizardStep>
    );
  }

  if (error) {
    return (
      <WizardStep title="Setup" description="Error checking system">
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </WizardStep>
    );
  }

  return (
    <WizardStep title="Setup" description="System requirements, detection, and security">
      <div className="space-y-8">
        {/* Section 1: System Requirements */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            System Requirements
          </h3>
          <div className="space-y-2">
            {requirements?.checks.map((check: RequirementCheck, i: number) => (
              <div
                key={i}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border',
                  check.passed
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                )}
              >
                {check.passed ? (
                  <svg className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  <span className={clsx('text-sm font-medium', check.passed ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300')}>
                    {check.name}
                  </span>
                  {check.actual && (
                    <span className={clsx('ml-2 text-xs', check.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      ({check.actual})
                    </span>
                  )}
                </div>
                {!check.passed && check.help_text && (
                  <span className="text-xs text-red-600 dark:text-red-400">{check.help_text}</span>
                )}
              </div>
            ))}
          </div>

          {/* Status summary */}
          {requirements && (
            <div className={clsx(
              'mt-3 px-4 py-2 rounded-lg text-sm',
              requirements.all_passed
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                : 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300'
            )}>
              {requirements.all_passed
                ? 'All requirements met — ready to install.'
                : "Some requirements missing — the wizard will help install them."}
            </div>
          )}
        </section>

        {/* Section 2: Detection */}
        {detection && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Existing Installation
            </h3>
            {!detection.installed ? (
              <div className="px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  No existing installation found. We'll set everything up fresh.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="px-4 py-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    OpenClaw {detection.version} found
                    {detection.install_path && (
                      <span className="font-normal ml-1">
                        at <code className="text-xs bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">{detection.install_path}</code>
                      </span>
                    )}
                  </p>
                </div>

                {detection.config_found && (
                  <div className="flex gap-3">
                    <label className={clsx(
                      'flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      useExisting === true ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                    )}>
                      <input
                        type="radio"
                        name="config-choice"
                        checked={useExisting === true}
                        onChange={() => setUseExisting(true)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Use existing config</span>
                    </label>
                    <label className={clsx(
                      'flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      useExisting === false ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                    )}>
                      <input
                        type="radio"
                        name="config-choice"
                        checked={useExisting === false}
                        onChange={() => setUseExisting(false)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Start fresh</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Section 3: Security Acknowledgement */}
        <section>
          <div className="border-2 border-orange-700 dark:border-orange-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-5">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-orange-700 dark:text-orange-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Security Notice
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  OpenClaw grants AI agents shell access to execute commands on your system.
                  Only connect trusted channels and monitor logs regularly.
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1 mb-4">
                  <li>AI agents can read, write, and execute files</li>
                  <li>Commands run with your user privileges</li>
                  <li>Malicious prompts could harm your system</li>
                </ul>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I understand the security implications and accept the risks
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      <WizardNavigation
        onNext={handleNext}
      />
    </WizardStep>
  );
}

// Helper for conditional class names (inline to avoid extra import)
function clsx(...args: (string | Record<string, boolean> | false | undefined)[]) {
  const classes: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') {
      classes.push(arg);
    } else {
      for (const [key, value] of Object.entries(arg)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}
