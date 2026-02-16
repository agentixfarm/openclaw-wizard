import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { providerConfigSchema, gatewayConfigSchema, advancedConfigSchema } from '../../schemas/wizardSchemas';
import type { ProviderConfigData } from '../../schemas/wizardSchemas';
import { api } from '../../api/client';
import clsx from 'clsx';
import { z } from 'zod';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PROVIDERS, getProvider } from '../../data/providers';
import type { ProviderDef } from '../../data/providers';

type GatewayConfigInput = z.input<typeof gatewayConfigSchema>;
type AdvancedConfigForm = z.infer<typeof advancedConfigSchema>;

export function ConfigureStep() {
  const { formData, updateFormData, nextStep } = useWizard();
  const [expandedSection, setExpandedSection] = useState<'provider' | 'network' | 'advanced'>('provider');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingFromConfig, setLoadingFromConfig] = useState(false);

  // Provider form
  const providerForm = useForm<ProviderConfigData>({
    resolver: zodResolver(providerConfigSchema),
    defaultValues: formData.providerConfig || {
      provider: 'anthropic',
      authType: 'api-key',
      apiKey: '',
    },
  });

  // Gateway form
  const gatewayForm = useForm<GatewayConfigInput>({
    resolver: zodResolver(gatewayConfigSchema),
    defaultValues: formData.gatewayConfig || {
      port: 18789,
      bind: 'loopback',
      authMode: 'token',
      authCredential: '',
    },
  });

  // Advanced form
  const advancedForm = useForm<AdvancedConfigForm>({
    resolver: zodResolver(advancedConfigSchema),
    defaultValues: formData.advancedConfig || {
      bindMode: 'localhost',
      authMode: 'none',
      tailscaleEnabled: false,
    },
  });

  const selectedProvider = providerForm.watch('provider');
  const selectedAuthType = providerForm.watch('authType');
  const gatewayAuthMode = gatewayForm.watch('authMode');
  const gatewayAuthCredential = gatewayForm.watch('authCredential');
  const advAuthMode = advancedForm.watch('authMode');
  const tailscaleEnabled = advancedForm.watch('tailscaleEnabled');

  // Auto-generate token for gateway
  useEffect(() => {
    if (gatewayAuthMode === 'token' && !gatewayAuthCredential) {
      gatewayForm.setValue('authCredential', crypto.randomUUID());
    }
  }, [gatewayAuthMode, gatewayAuthCredential, gatewayForm]);

  const handleLoadFromConfig = async () => {
    setLoadingFromConfig(true);
    try {
      const config = await api.getConfig();
      if (config?.ai?.api_key) providerForm.setValue('apiKey', config.ai.api_key);
      if (config?.ai?.provider) providerForm.setValue('provider', config.ai.provider);
      if (config?.ai?.auth_type) {
        providerForm.setValue('authType', config.ai.auth_type === 'token' ? 'setup-token' : 'api-key');
      }
    } catch {
      // Config not available
    } finally {
      setLoadingFromConfig(false);
    }
  };

  const providerDef = getProvider(selectedProvider) as ProviderDef | undefined;

  const getApiKeyPlaceholder = () => {
    if (selectedAuthType === 'setup-token') return 'sk-ant-oat01-...';
    return providerDef?.keyPlaceholder || 'sk-...';
  };

  const getApiKeyLabel = () => {
    if (selectedAuthType === 'setup-token') return 'Setup Token';
    return 'API Key';
  };

  const showKeyInput = providerDef?.needsKey !== false && providerDef?.category !== 'oauth' && selectedProvider !== 'skip';
  const isOAuth = providerDef?.category === 'oauth';
  const isSkip = selectedProvider === 'skip';
  const extraFields = providerDef?.extraFields || [];
  // Custom provider has optional API key
  const showOptionalKeyInput = selectedProvider === 'custom';

  // Gateway summary for collapsed state
  const gatewayPort = gatewayForm.watch('port');
  const gatewayBind = gatewayForm.watch('bind');
  const gatewaySummary = `Port ${gatewayPort || 18789}, ${gatewayBind === 'loopback' ? 'loopback' : 'LAN'}, ${gatewayAuthMode} auth`;

  // Advanced summary for collapsed state
  const advBindMode = advancedForm.watch('bindMode');
  const advancedSummary = `${advBindMode === 'localhost' ? 'Localhost' : 'All interfaces'}, ${advAuthMode === 'none' ? 'no auth' : 'basic auth'}${tailscaleEnabled ? ', Tailscale' : ''}`;

  const handleValidateAndNext = async () => {
    // Validate provider form
    const providerValid = await providerForm.trigger();
    if (!providerValid) {
      setExpandedSection('provider');
      return;
    }

    const providerData = providerForm.getValues();
    const currentProvider = getProvider(providerData.provider);

    // Always save form data so review screen shows what was entered
    const saveAllData = () => {
      updateFormData('providerConfig', providerForm.getValues());
      updateFormData('gatewayConfig', gatewayForm.getValues());
      updateFormData('advancedConfig', advancedForm.getValues());
    };

    // OAuth and Skip providers don't need key validation
    const skipValidation = currentProvider?.category === 'oauth' || providerData.provider === 'skip';
    // Providers without needsKey that aren't custom also skip (like vLLM)
    const noKeyNeeded = currentProvider?.needsKey === false && providerData.provider !== 'custom';

    if (!skipValidation && !noKeyNeeded) {
      // Validate API key
      setIsValidating(true);
      setValidationError(null);

      try {
        const response = await api.validateApiKey({
          provider: providerData.provider,
          api_key: providerData.apiKey || '',
          auth_type: providerData.authType || 'api-key',
        });

        if (!response.valid) {
          setValidationError(response.error || 'API key validation failed');
          setExpandedSection('provider');
          setIsValidating(false);
          saveAllData();
          return;
        }

        setIsValidated(true);
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : 'Network error during validation'
        );
        setExpandedSection('provider');
        setIsValidating(false);
        saveAllData();
        return;
      } finally {
        setIsValidating(false);
      }
    }

    // Validate extra fields for advanced providers
    if (currentProvider?.extraFields) {
      for (const field of currentProvider.extraFields) {
        if (field.required) {
          const val = providerData[field.name as keyof typeof providerData] as string | undefined;
          if (!val || val.trim() === '') {
            setValidationError(`${field.label} is required`);
            setExpandedSection('provider');
            saveAllData();
            return;
          }
        }
      }
    }

    // Validate gateway form
    const gatewayValid = await gatewayForm.trigger();
    if (!gatewayValid) {
      setExpandedSection('network');
      saveAllData();
      return;
    }

    // Save all data
    saveAllData();

    nextStep();
  };

  const handleSkipValidation = () => {
    updateFormData('providerConfig', providerForm.getValues());
    updateFormData('gatewayConfig', gatewayForm.getValues());
    updateFormData('advancedConfig', advancedForm.getValues());
    nextStep();
  };

  const toggleSection = (section: 'provider' | 'network' | 'advanced') => {
    setExpandedSection(expandedSection === section ? section : section);
  };

  return (
    <WizardStep title="Configure" description="Set up your AI provider and network settings">
      <div className="space-y-4">
        {/* Section 1: AI Provider (expanded by default) */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('provider')}
            className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Provider</h3>
                {expandedSection !== 'provider' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {providerDef?.label || selectedProvider}{isSkip ? '' : ` — ${selectedAuthType === 'setup-token' ? 'Setup Token' : selectedAuthType === 'oauth' ? 'OAuth' : 'API Key'}`}
                  </p>
                )}
              </div>
            </div>
            {expandedSection === 'provider' ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'provider' && (
            <div className="px-5 pb-5 bg-white dark:bg-zinc-800 space-y-5">
              {/* Provider Selection */}
              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model / Auth Provider
                </label>
                <select
                  id="provider"
                  {...providerForm.register('provider', {
                    onChange: () => {
                      // Reset validation state when provider changes
                      setIsValidated(false);
                      setValidationError(null);
                    },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-700 dark:text-gray-100"
                  disabled={isValidating}
                >
                  <optgroup label="Popular">
                    {PROVIDERS.filter((p) => p.category === 'popular').map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="API Key">
                    {PROVIDERS.filter((p) => p.category === 'api-key').map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="OAuth">
                    {PROVIDERS.filter((p) => p.category === 'oauth').map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Advanced">
                    {PROVIDERS.filter((p) => p.category === 'advanced').map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Auth Type (Anthropic only) */}
              {providerDef?.authTypes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Authentication Method
                  </label>
                  <div className="flex gap-3">
                    {providerDef.authTypes.map((at) => (
                      <label
                        key={at.value}
                        className={clsx(
                          'flex-1 relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          selectedAuthType === at.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                        )}
                      >
                        <input type="radio" {...providerForm.register('authType')} value={at.value} className="sr-only" disabled={isValidating} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{at.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{at.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* OAuth info */}
              {isOAuth && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                  <p>This provider uses OAuth authentication. After installation, complete setup by running:</p>
                  <code className="block mt-1 bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded text-xs font-mono">openclaw onboard --auth-choice {providerDef?.authChoice}</code>
                </div>
              )}

              {/* Skip warning */}
              {isSkip && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                  <p>No AI provider will be configured. You can set one up later via <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs font-mono">openclaw onboard</code>.</p>
                </div>
              )}

              {/* API Key Input (for providers that need it) */}
              {(showKeyInput || showOptionalKeyInput) && (
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {getApiKeyLabel()}{showOptionalKeyInput && !showKeyInput ? ' (optional)' : ''}
                  </label>
                  <div className="relative">
                    <input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      {...providerForm.register('apiKey')}
                      placeholder={getApiKeyPlaceholder()}
                      className={clsx(
                        'w-full px-3 py-2 pr-20 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100',
                        {
                          'border-gray-300 dark:border-zinc-600': !providerForm.formState.errors.apiKey && !validationError,
                          'border-red-300 bg-red-50 dark:bg-red-950/30': providerForm.formState.errors.apiKey || validationError,
                          'border-green-300 bg-green-50 dark:bg-green-950/30': isValidated,
                        }
                      )}
                      disabled={isValidating}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {providerForm.formState.errors.apiKey && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{providerForm.formState.errors.apiKey.message}</p>
                  )}
                  {validationError && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
                      <button
                        type="button"
                        onClick={handleSkipValidation}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
                      >
                        Skip validation (not recommended)
                      </button>
                    </div>
                  )}
                  {isValidated && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Validated</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Securely stored in your configuration file.
                  </p>
                  {!providerForm.watch('apiKey') && selectedProvider === 'anthropic' && (
                    <button
                      type="button"
                      onClick={handleLoadFromConfig}
                      disabled={loadingFromConfig}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline disabled:opacity-50"
                    >
                      {loadingFromConfig ? 'Loading...' : 'Load from saved configuration'}
                    </button>
                  )}
                </div>
              )}

              {/* Extra fields for advanced providers */}
              {extraFields.length > 0 && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg border border-gray-200 dark:border-zinc-600">
                  {extraFields.map((field) => (
                    <div key={field.name}>
                      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={field.name}
                          {...providerForm.register(field.name as keyof ProviderConfigData)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-700 dark:text-gray-100"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={field.name}
                          type="text"
                          {...providerForm.register(field.name as keyof ProviderConfigData)}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Help text */}
              {providerDef?.helpText && !isOAuth && !isSkip && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                  {selectedProvider === 'anthropic' && selectedAuthType === 'setup-token' ? (
                    <p>Run <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs font-mono">claude setup-token</code> in your terminal to generate a setup token.</p>
                  ) : (
                    <p>
                      {providerDef.helpText}
                      {providerDef.helpUrl && (
                        <>
                          {' '}<a href={providerDef.helpUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 dark:hover:text-blue-200">Get your key here.</a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Network (collapsed, summary shown) */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('network')}
            className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Network</h3>
                {expandedSection !== 'network' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{gatewaySummary}</p>
                )}
              </div>
            </div>
            {expandedSection === 'network' ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'network' && (
            <div className="px-5 pb-5 bg-white dark:bg-zinc-800 space-y-5">
              {/* Port */}
              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gateway Port
                </label>
                <input
                  id="port"
                  type="number"
                  {...gatewayForm.register('port', { valueAsNumber: true })}
                  className={clsx(
                    'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100',
                    gatewayForm.formState.errors.port ? 'border-red-300' : 'border-gray-300 dark:border-zinc-600'
                  )}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Default: 18789</p>
              </div>

              {/* Bind Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Network Access
                </label>
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors text-center',
                    gatewayBind === 'loopback'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" {...gatewayForm.register('bind')} value="loopback" className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Local only</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">127.0.0.1</div>
                  </label>
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors text-center',
                    gatewayBind === 'lan'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" {...gatewayForm.register('bind')} value="lan" className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">LAN</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">0.0.0.0</div>
                  </label>
                </div>
              </div>

              {/* Auth Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authentication
                </label>
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors text-center',
                    gatewayAuthMode === 'token'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" {...gatewayForm.register('authMode')} value="token" className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Token</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Auto-generated</div>
                  </label>
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors text-center',
                    gatewayAuthMode === 'password'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" {...gatewayForm.register('authMode')} value="password" className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Password</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Custom password</div>
                  </label>
                </div>
              </div>

              {/* Auth Credential */}
              <div>
                <label htmlFor="authCredential" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {gatewayAuthMode === 'token' ? 'Auth Token' : 'Password'}
                </label>
                <input
                  id="authCredential"
                  type={gatewayAuthMode === 'token' ? 'text' : 'password'}
                  {...gatewayForm.register('authCredential')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-gray-100"
                  readOnly={gatewayAuthMode === 'token'}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {gatewayAuthMode === 'token' ? 'Auto-generated secure token.' : 'Enter a password for API requests.'}
                </p>
              </div>

              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                Safe defaults selected. Most users don't need to change these.
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Advanced (collapsed) */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('advanced')}
            className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Advanced</h3>
                {expandedSection !== 'advanced' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{advancedSummary}</p>
                )}
              </div>
            </div>
            {expandedSection === 'advanced' ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'advanced' && (
            <div className="px-5 pb-5 bg-white dark:bg-zinc-800 space-y-5">
              {/* Bind Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gateway Bind Mode
                </label>
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors',
                    advBindMode === 'localhost'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" value="localhost" {...advancedForm.register('bindMode')} className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Localhost only</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">127.0.0.1 — most secure</div>
                  </label>
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors',
                    advBindMode === 'all'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" value="all" {...advancedForm.register('bindMode')} className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">All interfaces</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">0.0.0.0 — network access</div>
                  </label>
                </div>
              </div>

              {/* Auth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gateway Authentication
                </label>
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors text-center',
                    advAuthMode === 'none'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" value="none" {...advancedForm.register('authMode')} className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">None</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Local testing only</div>
                  </label>
                  <label className={clsx(
                    'flex-1 p-3 border rounded-lg cursor-pointer transition-colors text-center',
                    advAuthMode === 'basic'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                  )}>
                    <input type="radio" value="basic" {...advancedForm.register('authMode')} className="sr-only" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Basic Auth</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Username + password</div>
                  </label>
                </div>

                {advAuthMode === 'basic' && (
                  <div className="mt-3 space-y-3 p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">Username</label>
                      <input
                        type="text"
                        {...advancedForm.register('authUsername')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-600 dark:text-gray-100"
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">Password</label>
                      <input
                        type="password"
                        {...advancedForm.register('authPassword')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-600 dark:text-gray-100"
                        placeholder="Secure password"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tailscale */}
              <div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors">
                  <input
                    type="checkbox"
                    {...advancedForm.register('tailscaleEnabled')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable Tailscale</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Secure remote access without port forwarding</div>
                  </div>
                </label>

                {tailscaleEnabled && (
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tailscale Auth Key</label>
                    <input
                      type="text"
                      {...advancedForm.register('tailscaleAuthKey')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-600 dark:text-gray-100"
                      placeholder="tskey-auth-..."
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get this from Tailscale admin console (Settings &rarr; Keys)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <WizardNavigation
        onNext={handleValidateAndNext}
        isSubmitting={isValidating}
        nextLabel={isValidating ? 'Validating...' : 'Validate & Continue'}
      />
    </WizardStep>
  );
}
