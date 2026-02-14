import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { advancedConfigSchema } from '../../schemas/wizardSchemas';
import type { z } from 'zod';

type AdvancedConfigForm = z.infer<typeof advancedConfigSchema>;

export function AdvancedConfig() {
  const { updateFormData, nextStep, formData } = useWizard();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AdvancedConfigForm>({
    resolver: zodResolver(advancedConfigSchema),
    defaultValues: formData.advancedConfig || {
      bindMode: 'localhost',
      authMode: 'none',
      tailscaleEnabled: false,
    },
  });

  const authMode = watch('authMode');
  const tailscaleEnabled = watch('tailscaleEnabled');

  const onSubmit = (data: AdvancedConfigForm) => {
    updateFormData('advancedConfig', data);
    nextStep();
  };

  return (
    <WizardStep
      title="Advanced Configuration"
      description="Configure gateway bind mode, authentication, and optional Tailscale integration"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-8">
        {/* Gateway Bind Mode */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Gateway Bind Mode</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
              <input
                type="radio"
                value="localhost"
                {...register('bindMode')}
                className="mt-1 text-sky-400 focus:ring-sky-400"
              />
              <div>
                <div className="font-medium">Localhost only (127.0.0.1)</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gateway only accessible from this machine (recommended for security)
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
              <input
                type="radio"
                value="all"
                {...register('bindMode')}
                className="mt-1 text-sky-400 focus:ring-sky-400"
              />
              <div>
                <div className="font-medium">All interfaces (0.0.0.0)</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gateway accessible from your network (less secure, use with auth)
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Gateway Authentication */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Gateway Authentication</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
              <input
                type="radio"
                value="none"
                {...register('authMode')}
                className="mt-1 text-sky-400 focus:ring-sky-400"
              />
              <div>
                <div className="font-medium">No authentication</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gateway has no access control (use only for local testing)
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
              <input
                type="radio"
                value="basic"
                {...register('authMode')}
                className="mt-1 text-sky-400 focus:ring-sky-400"
              />
              <div>
                <div className="font-medium">Basic authentication</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Protect gateway with username and password
                </div>
              </div>
            </label>
          </div>

          {authMode === 'basic' && (
            <div className="ml-6 mt-4 space-y-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  {...register('authUsername')}
                  className="w-full px-3 py-2 border rounded-md focus:ring-sky-400 focus:border-sky-400"
                  placeholder="admin"
                />
                {errors.authUsername && (
                  <p className="text-red-600 text-sm mt-1">{errors.authUsername.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  {...register('authPassword')}
                  className="w-full px-3 py-2 border rounded-md focus:ring-sky-400 focus:border-sky-400"
                  placeholder="Secure password"
                />
                {errors.authPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.authPassword.message}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Tailscale (Optional) */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Tailscale (Optional)</h3>
          <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
            <input
              type="checkbox"
              {...register('tailscaleEnabled')}
              className="mt-1 text-sky-400 rounded focus:ring-sky-400"
            />
            <div>
              <div className="font-medium">Enable Tailscale</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Connect via Tailscale for secure remote access without port forwarding
              </div>
            </div>
          </label>

          {tailscaleEnabled && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <label className="block text-sm font-medium mb-1">Tailscale Auth Key</label>
              <input
                type="text"
                {...register('tailscaleAuthKey')}
                className="w-full px-3 py-2 border rounded-md focus:ring-sky-400 focus:border-sky-400"
                placeholder="tskey-auth-..."
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get this from the Tailscale admin console (Settings → Keys)
              </p>
              {errors.tailscaleAuthKey && (
                <p className="text-red-600 text-sm mt-1">{errors.tailscaleAuthKey.message}</p>
              )}
            </div>
          )}
        </section>

        <WizardNavigation onNext={handleSubmit(onSubmit)} />
      </form>
    </WizardStep>
  );
}
