import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { gatewayConfigSchema } from '../../schemas/wizardSchemas';
import clsx from 'clsx';
import { z } from 'zod';

// Use Zod's input type which has optional fields with defaults
type GatewayConfigInput = z.input<typeof gatewayConfigSchema>;

export function GatewayConfig() {
  const { formData, updateFormData, nextStep } = useWizard();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GatewayConfigInput>({
    resolver: zodResolver(gatewayConfigSchema),
    defaultValues: formData.gatewayConfig || {
      port: 18789,
      bind: 'loopback',
      authMode: 'token',
      authCredential: '',
    },
  });

  const authMode = watch('authMode');
  const authCredential = watch('authCredential');

  // Auto-generate token if auth mode is token and credential is empty
  useEffect(() => {
    if (authMode === 'token' && !authCredential) {
      const token = crypto.randomUUID();
      setValue('authCredential', token);
    }
  }, [authMode, authCredential, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    updateFormData('gatewayConfig', data);
    nextStep();
  });

  return (
    <WizardStep
      title="Gateway Configuration"
      description="Configure OpenClaw gateway network and authentication settings"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Port Configuration */}
        <div>
          <label
            htmlFor="port"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Gateway Port
          </label>
          <input
            id="port"
            type="number"
            {...register('port', { valueAsNumber: true })}
            className={clsx(
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              {
                'border-gray-300': !errors.port,
                'border-red-300 bg-red-50': errors.port,
              }
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            The port OpenClaw's gateway will listen on. Default is 18789.
          </p>
          {errors.port && (
            <p className="mt-1 text-sm text-red-600">{errors.port.message}</p>
          )}
        </div>

        {/* Bind Mode Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Network Access
          </label>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="bind-loopback"
                  type="radio"
                  {...register('bind')}
                  value="loopback"
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="bind-loopback" className="font-medium text-gray-900">
                  Local only (127.0.0.1)
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Only accessible from this machine. Recommended for security.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="bind-lan"
                  type="radio"
                  {...register('bind')}
                  value="lan"
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="bind-lan" className="font-medium text-gray-900">
                  LAN (0.0.0.0)
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Accessible from other devices on your network. Use if you need remote access.
                </p>
              </div>
            </div>
          </div>
          {errors.bind && (
            <p className="mt-1 text-sm text-red-600">{errors.bind.message}</p>
          )}
        </div>

        {/* Auth Mode Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Authentication Mode
          </label>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auth-token"
                  type="radio"
                  {...register('authMode')}
                  value="token"
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="auth-token" className="font-medium text-gray-900">
                  Token
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated token for API authentication.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auth-password"
                  type="radio"
                  {...register('authMode')}
                  value="password"
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="auth-password" className="font-medium text-gray-900">
                  Password
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Set a password for API authentication.
                </p>
              </div>
            </div>
          </div>
          {errors.authMode && (
            <p className="mt-1 text-sm text-red-600">{errors.authMode.message}</p>
          )}
        </div>

        {/* Auth Credential Input */}
        <div>
          <label
            htmlFor="authCredential"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {authMode === 'token' ? 'Auth Token' : 'Password'}
          </label>
          <input
            id="authCredential"
            type={authMode === 'token' ? 'text' : 'password'}
            {...register('authCredential')}
            className={clsx(
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              {
                'border-gray-300': !errors.authCredential,
                'border-red-300 bg-red-50': errors.authCredential,
              }
            )}
            readOnly={authMode === 'token'}
          />
          <p className="mt-1 text-xs text-gray-500">
            {authMode === 'token'
              ? 'Auto-generated secure token. You can copy this for API access.'
              : 'Enter a password for authenticating API requests.'}
          </p>
          {errors.authCredential && (
            <p className="mt-1 text-sm text-red-600">{errors.authCredential.message}</p>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Safe Defaults Selected</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  We've pre-selected secure defaults: local-only access on port 18789 with
                  token-based authentication. You can proceed with these settings or customize
                  them for your needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <WizardNavigation onNext={onSubmit} />
      </form>
    </WizardStep>
  );
}
