import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { sshCredentialsSchema } from '../../schemas/wizardSchemas';
import { api } from '../../api/client';
import type { z } from 'zod';

type SshCredentialsForm = z.infer<typeof sshCredentialsSchema>;

export function ConnectStep() {
  const { updateFormData, nextStep, formData } = useWizard();
  const [isTesting, setIsTesting] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(
    formData.securityAck?.acknowledged || false
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<SshCredentialsForm>({
    resolver: zodResolver(sshCredentialsSchema),
    mode: 'onChange',
    defaultValues: formData.sshCredentials || {
      host: '',
      username: '',
      keyPath: '~/.ssh/id_rsa',
    },
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionError(null);

    try {
      const credentials = getValues();
      const response = await api.testSshConnection(credentials);
      if (response.success) {
        setConnectionStatus('success');
        setConnectionTested(true);
      } else {
        setConnectionStatus('error');
        setConnectionError(response.message || 'Connection failed');
        setConnectionTested(false);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      setConnectionTested(false);
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = (data: SshCredentialsForm) => {
    if (!acknowledged || !connectionTested) return;

    updateFormData('sshCredentials', {
      host: data.host,
      username: data.username,
      keyPath: '',
    });
    updateFormData('securityAck', {
      acknowledged: true,
      timestamp: Date.now(),
    });
    nextStep();
  };

  return (
    <WizardStep title="Connect" description="SSH credentials and security acknowledgement">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SSH Credentials */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              VPS Hostname or IP
            </label>
            <input
              type="text"
              {...register('host')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100"
              placeholder="example.com or 192.168.1.100"
            />
            {errors.host && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.host.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SSH Username
            </label>
            <input
              type="text"
              {...register('username')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100"
              placeholder="root"
            />
            {errors.username && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SSH Private Key Path
            </label>
            <input
              type="text"
              {...register('keyPath')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100"
              placeholder="~/.ssh/id_ed25519"
            />
            {errors.keyPath && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.keyPath.message}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Stored securely in your system keychain. Never leaves your machine.
            </p>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={!isValid || isTesting}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-750 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            {connectionStatus === 'success' && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </span>
            )}

            {connectionStatus === 'error' && (
              <span className="text-sm text-red-600 dark:text-red-400">{connectionError}</span>
            )}
          </div>
        </div>

        {/* Security Ack (inline) */}
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
                OpenClaw will have shell access on the remote server. Only connect trusted channels.
              </p>
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

        <WizardNavigation
          onNext={handleSubmit(onSubmit)}
          nextLabel="Continue"
        />
      </form>
    </WizardStep>
  );
}
