import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizard } from './WizardProvider';
import { WizardStep } from './WizardStep';
import { api } from '../../api/client';
import { sshCredentialsSchema } from '../../schemas/wizardSchemas';
import type { z } from 'zod';

type SshCredentialsForm = z.infer<typeof sshCredentialsSchema>;

export function RemoteSetup() {
  const { updateFormData, nextStep, formData } = useWizard();
  const [isTesting, setIsTesting] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

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
      setConnectionError(
        error instanceof Error ? error.message : 'Unknown error'
      );
      setConnectionTested(false);
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = (data: SshCredentialsForm) => {
    // Store host and username in wizard state for later use
    // SSH key path is stored in backend keychain, not in wizard state/localStorage
    updateFormData('sshCredentials', {
      host: data.host,
      username: data.username,
      keyPath: '', // Don't persist key path in localStorage
    });
    nextStep();
  };

  return (
    <WizardStep
      title="SSH Credentials"
      description="Enter your VPS connection details for remote installation"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Hostname */}
        <div>
          <label className="block text-sm font-medium mb-1">
            VPS Hostname or IP
          </label>
          <input
            type="text"
            {...register('host')}
            className="w-full px-3 py-2 border rounded-md focus:ring-sky-400 focus:border-sky-400"
            placeholder="example.com or 192.168.1.100"
          />
          {errors.host && (
            <p className="text-red-600 text-sm mt-1">{errors.host.message}</p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Domain name or IP address of your VPS
          </p>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium mb-1">
            SSH Username
          </label>
          <input
            type="text"
            {...register('username')}
            className="w-full px-3 py-2 border rounded-md focus:ring-sky-400 focus:border-sky-400"
            placeholder="root or your username"
          />
          {errors.username && (
            <p className="text-red-600 text-sm mt-1">
              {errors.username.message}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            SSH user with sudo privileges
          </p>
        </div>

        {/* SSH Key Path */}
        <div>
          <label className="block text-sm font-medium mb-1">
            SSH Private Key Path
          </label>
          <input
            type="text"
            {...register('keyPath')}
            className="w-full px-3 py-2 border rounded-md focus:ring-sky-400 focus:border-sky-400"
            placeholder="~/.ssh/id_rsa or ~/.ssh/id_ed25519"
          />
          {errors.keyPath && (
            <p className="text-red-600 text-sm mt-1">
              {errors.keyPath.message}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Absolute path to your private key file
          </p>
        </div>

        {/* Info Callout */}
        <div className="bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your SSH key path will be stored securely in your system keychain.
            The private key file itself never leaves your machine.
          </p>
        </div>

        {/* Connection Status */}
        {connectionStatus === 'success' && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300 font-medium">
              SSH connection successful!
            </p>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 font-medium">
              Connection failed
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              {connectionError}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!isValid || isTesting}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="submit"
            disabled={!connectionTested || !isValid}
            className="px-6 py-2 bg-sky-400 text-white rounded-md hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </form>
    </WizardStep>
  );
}
