import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save, RotateCw, Download, Upload, Loader2 } from 'lucide-react';
import { openClawConfigSchema, type OpenClawConfigInput, type ChannelConfigInput } from '../../lib/config-schema';
import { api } from '../../api/client';
import { ChannelManager } from './ChannelManager';

/**
 * Form-based configuration editor with validation, save, import, and export
 */
export function ConfigEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<OpenClawConfigInput>({
    resolver: zodResolver(openClawConfigSchema),
    defaultValues: {
      gateway: {
        port: 18789,
        bind: '127.0.0.1',
        auth: {
          type: 'api-key',
          credential: '',
        },
      },
      channels: {},
      provider: {
        name: '',
        api_key: '',
      },
    },
  });

  // Watch channels for ChannelManager
  const channels = watch('channels') || {};

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        reset(config);
        toast.success('Configuration loaded');
      } catch (error) {
        console.error('Failed to load config:', error);
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [reset]);

  // Save configuration
  const onSubmit = async (data: OpenClawConfigInput) => {
    setSaving(true);
    try {
      await api.saveDashboardConfig(data);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Export configuration as JSON file
  const handleExport = () => {
    try {
      const config = watch();
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openclaw-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported');
    } catch (error) {
      console.error('Failed to export config:', error);
      toast.error('Failed to export configuration');
    }
  };

  // Import configuration from JSON file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const validated = openClawConfigSchema.parse(json);
        reset(validated);
        toast.success('Configuration imported successfully');
      } catch (error) {
        console.error('Failed to import config:', error);
        toast.error('Invalid configuration file');
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be imported again
    event.target.value = '';
  };

  // Handle channel changes from ChannelManager
  const handleChannelsChange = (newChannels: Record<string, ChannelConfigInput>) => {
    setValue('channels', newChannels, { shouldValidate: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading configuration...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Gateway Settings Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gateway Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Port */}
          <div>
            <label htmlFor="gateway-port" className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <input
              id="gateway-port"
              type="number"
              {...register('gateway.port', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.gateway?.port && (
              <p className="mt-1 text-sm text-red-600">{errors.gateway.port.message}</p>
            )}
          </div>

          {/* Bind Address */}
          <div>
            <label htmlFor="gateway-bind" className="block text-sm font-medium text-gray-700 mb-1">
              Bind Address
            </label>
            <input
              id="gateway-bind"
              type="text"
              {...register('gateway.bind')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.gateway?.bind && (
              <p className="mt-1 text-sm text-red-600">{errors.gateway.bind.message}</p>
            )}
          </div>

          {/* Auth Type */}
          <div>
            <label htmlFor="auth-type" className="block text-sm font-medium text-gray-700 mb-1">
              Auth Type
            </label>
            <select
              id="auth-type"
              {...register('gateway.auth.type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="api-key">API Key</option>
              <option value="setup-token">Setup Token</option>
            </select>
            {errors.gateway?.auth?.type && (
              <p className="mt-1 text-sm text-red-600">{errors.gateway.auth.type.message}</p>
            )}
          </div>

          {/* Auth Credential */}
          <div>
            <label htmlFor="auth-credential" className="block text-sm font-medium text-gray-700 mb-1">
              Auth Credential
            </label>
            <input
              id="auth-credential"
              type="password"
              {...register('gateway.auth.credential')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.gateway?.auth?.credential && (
              <p className="mt-1 text-sm text-red-600">{errors.gateway.auth.credential.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Provider Settings Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider Name */}
          <div>
            <label htmlFor="provider-name" className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name
            </label>
            <input
              id="provider-name"
              type="text"
              {...register('provider.name')}
              placeholder="e.g., openai, anthropic"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.provider?.name && (
              <p className="mt-1 text-sm text-red-600">{errors.provider.name.message}</p>
            )}
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="provider-key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              id="provider-key"
              type="password"
              {...register('provider.api_key')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.provider?.api_key && (
              <p className="mt-1 text-sm text-red-600">{errors.provider.api_key.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Channels Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Channels</h3>
        <ChannelManager channels={channels} onChange={handleChannelsChange} />
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        {/* Save */}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          Reset
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Config
        </button>

        {/* Import */}
        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          Import Config
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>
    </form>
  );
}
