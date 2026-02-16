import { useState } from 'react';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { StreamingOutput } from '../ui/StreamingOutput';
import { ErrorRecovery } from '../ui/ErrorRecovery';
import { useStreamingOutput } from '../../hooks/useStreamingOutput';
import { api } from '../../api/client';
import type { WizardConfig } from '../../types/WizardConfig';
import clsx from 'clsx';

type InstallPhase = 'review' | 'installing' | 'complete';

interface InstallStepProps {
  onGoToDashboard?: () => void;
}

export function InstallStep({ onGoToDashboard }: InstallStepProps) {
  const { formData, resetWizard, deploymentProfile, goToStep } = useWizard();
  const { output, currentStage, status, error, progressPct, startInstall } =
    useStreamingOutput();
  const [phase, setPhase] = useState<InstallPhase>('review');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { providerConfig, channelsConfig } = formData;
  const hasRemoteCredentials = !!formData.sshCredentials?.host;

  // Apply gateway defaults if not explicitly configured
  const gatewayConfig = formData.gatewayConfig || {
    port: 18789,
    bind: 'loopback' as const,
    authMode: 'token' as const,
    authCredential: '',
  };

  const maskSecret = (secret: string) => {
    if (secret.length <= 12) return '*'.repeat(secret.length);
    return `${secret.slice(0, 8)}...${secret.slice(-4)}`;
  };

  // Compute missing config items for the review screen
  const missingItems: { label: string; step: number }[] = [];
  if (!providerConfig?.provider) missingItems.push({ label: 'AI Provider', step: 1 });
  if (!providerConfig?.apiKey) missingItems.push({ label: 'API Key', step: 1 });

  const handleConfirmAndInstall = async () => {
    if (!providerConfig) {
      setSaveError('Missing AI provider configuration — use the Edit button above to fix.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Build config
      const channels = channelsConfig?.channels?.map((channel) => {
        const config = channel.config as any;
        return {
          platform: channel.platform,
          enabled: true,
          bot_token: config?.botToken || null,
          app_token: config?.appToken || null,
          dm_policy: 'allowlist',
          allowed_users: [config?.userId, config?.phoneNumber].filter(Boolean) as string[],
        };
      }) || null;

      const config: WizardConfig = {
        provider: providerConfig.provider,
        api_key: providerConfig.apiKey,
        auth_type: providerConfig.authType || 'api-key',
        gateway_port: gatewayConfig.port,
        gateway_bind: gatewayConfig.bind === 'loopback' ? '127.0.0.1' : '0.0.0.0',
        auth_mode: gatewayConfig.authMode,
        auth_credential: gatewayConfig.authCredential || null,
        channels: channels,
      };

      await api.saveConfig(config);

      // Transition to installing
      setPhase('installing');

      // Start installation
      startInstall({
        install_node: true,
        install_openclaw: true,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    startInstall({
      install_node: true,
      install_openclaw: true,
    });
  };

  // Auto-transition to complete when install finishes
  if (phase === 'installing' && status === 'completed') {
    // Use setTimeout to avoid state update during render
    setTimeout(() => setPhase('complete'), 0);
  }

  const configPath =
    navigator.platform.toLowerCase().includes('mac') ||
    navigator.platform.toLowerCase().includes('darwin')
      ? '~/Library/Application Support/openclaw-wizard/openclaw.json'
      : navigator.platform.toLowerCase().includes('win')
      ? '%APPDATA%\\openclaw-wizard\\openclaw.json'
      : '~/.config/openclaw-wizard/openclaw.json';

  // ==================== REVIEW PHASE ====================
  if (phase === 'review') {
    return (
      <WizardStep title="Review & Install" description="Confirm your settings and install">
        <div className="space-y-5">
          {/* Missing config warnings */}
          {missingItems.length > 0 && (
            <div className="rounded-lg bg-amber-950/30 p-4 border border-amber-700/50">
              <p className="text-sm font-medium text-amber-300 mb-2">Missing configuration:</p>
              <ul className="space-y-1">
                {missingItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-amber-200/80 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(item.step)}
                      className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-2"
                    >
                      Go to Configure
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Provider Card */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Provider
              </h3>
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <dt className="text-gray-400">Provider</dt>
              <dd className="text-gray-100">{providerConfig?.provider === 'anthropic' ? 'Anthropic (Claude)' : providerConfig?.provider === 'openai' ? 'OpenAI (GPT)' : <span className="text-amber-400">Not set</span>}</dd>
              <dt className="text-gray-400">{providerConfig?.authType === 'setup-token' ? 'Token' : 'API Key'}</dt>
              <dd className={clsx('font-mono text-xs', providerConfig?.apiKey ? 'text-gray-100' : 'text-amber-400')}>
                {providerConfig?.apiKey ? maskSecret(providerConfig.apiKey) : 'Not set'}
              </dd>
            </dl>
          </div>

          {/* Gateway Card */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                Gateway
              </h3>
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <dt className="text-gray-400">Port</dt>
              <dd className="text-gray-100">{gatewayConfig?.port || 18789}</dd>
              <dt className="text-gray-400">Network</dt>
              <dd className="text-gray-100">{gatewayConfig?.bind === 'loopback' ? 'Local only' : 'LAN'}</dd>
              <dt className="text-gray-400">Auth</dt>
              <dd className="text-gray-100">{gatewayConfig?.authMode === 'token' ? 'Token' : 'Password'}</dd>
            </dl>
          </div>

          {/* Channels Card */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Channels
              </h3>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                Edit
              </button>
            </div>
            {channelsConfig?.channels && channelsConfig.channels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {channelsConfig.channels.map((ch) => (
                  <span key={ch.platform} className="inline-flex items-center gap-1 px-3 py-1 bg-green-950/30 text-green-300 text-xs rounded-full border border-green-800">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="capitalize">{ch.platform}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">None configured (can be added later)</p>
            )}
          </div>

          {/* Deploy mode */}
          {deploymentProfile && (
            <div className="text-xs text-gray-400 px-1">
              Deployment: <span className="font-medium capitalize">{deploymentProfile}</span>
              {hasRemoteCredentials && formData.sshCredentials && (
                <span> &mdash; {formData.sshCredentials.host}</span>
              )}
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="rounded-lg bg-red-950/30 p-4 border border-red-800">
              <p className="text-sm text-red-300">{saveError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-5 border-t border-zinc-700 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goToStep(2)}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-750 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmAndInstall}
              disabled={isSaving}
              className={clsx(
                'px-6 py-2.5 text-sm font-medium rounded-md transition-colors',
                isSaving
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Confirm & Install'
              )}
            </button>
          </div>
        </div>
      </WizardStep>
    );
  }

  // ==================== INSTALLING PHASE ====================
  if (phase === 'installing') {
    return (
      <WizardStep title="Installing" description="Setting up OpenClaw...">
        <div className="space-y-6">
          {/* Stage indicators */}
          <div className="flex items-center gap-4 justify-center">
            {['Prepare', 'Install', 'Verify'].map((label, i) => {
              const stages = ['node-install', 'openclaw-install', 'verify'];
              const stageIndex = stages.indexOf(currentStage || '');
              const isActive = stageIndex === i;
              const isDone = stageIndex > i || status === 'completed';

              return (
                <div key={label} className="flex items-center gap-2">
                  {isDone ? (
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : isActive ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-blue-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-zinc-600" />
                  )}
                  <span className={clsx('text-sm font-medium', {
                    'text-green-600 dark:text-green-400': isDone,
                    'text-blue-600 dark:text-blue-400': isActive,
                    'text-gray-400 dark:text-gray-500': !isDone && !isActive,
                  })}>
                    {label}
                  </span>
                  {i < 2 && <div className={clsx('w-8 h-0.5', isDone ? 'bg-green-400' : 'bg-gray-300 dark:bg-zinc-600')} />}
                </div>
              );
            })}
          </div>

          {/* Streaming output */}
          {status !== 'idle' && (
            <StreamingOutput output={output} stage={currentStage} progressPct={progressPct} />
          )}

          {/* Error recovery */}
          {status === 'failed' && error && (
            <ErrorRecovery
              error={error}
              context={currentStage === 'node-install' ? 'node-install' : 'openclaw-install'}
              onRetry={handleRetry}
            />
          )}
        </div>
      </WizardStep>
    );
  }

  // ==================== COMPLETE PHASE ====================
  return (
    <WizardStep title="Setup Complete!" description="OpenClaw is ready">
      <div className="space-y-6">
        {/* Success banner */}
        <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-8 border-2 border-green-200 dark:border-green-800 text-center">
          <svg className="h-16 w-16 text-green-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-green-800 dark:text-green-300">
            Setup Complete!
          </h2>
          <p className="mt-2 text-green-700 dark:text-green-400">
            OpenClaw has been installed and configured successfully.
          </p>
        </div>

        {/* Next steps */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Next Steps</h3>
          <div className="space-y-3">
            {[
              { num: 1, title: 'Start OpenClaw', desc: 'Run openclaw start or use the dashboard' },
              { num: 2, title: 'Configure Channels', desc: 'Connect WhatsApp, Telegram, Discord, or Slack' },
              { num: 3, title: 'Monitor', desc: 'Track health and logs from the dashboard' },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Config path */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Config saved to: <code className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">{configPath}</code>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 pt-2">
          {onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={resetWizard}
            className="px-6 py-2.5 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </WizardStep>
  );
}
