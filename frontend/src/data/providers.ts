/**
 * Static provider registry matching `openclaw onboard` auth choices.
 * Each provider defines how it maps to onboard CLI flags and what UI fields to show.
 */

export interface ExtraFieldDef {
  name: string;
  label: string;
  type: 'text' | 'url' | 'select';
  placeholder?: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ProviderDef {
  id: string;
  label: string;
  category: 'popular' | 'api-key' | 'oauth' | 'advanced';
  /** Value for `openclaw onboard --auth-choice` */
  authChoice: string;
  /** CLI flag for the API key, e.g. "--xai-api-key" */
  keyFlag?: string;
  keyPlaceholder?: string;
  helpUrl?: string;
  helpText?: string;
  /** Whether this provider needs an API key input */
  needsKey: boolean;
  /** Extra config fields beyond API key */
  extraFields?: ExtraFieldDef[];
  /** Auth type options (only Anthropic has multiple) */
  authTypes?: Array<{ value: string; label: string; description: string }>;
}

export const PROVIDERS: ProviderDef[] = [
  // ── Popular ──
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    category: 'popular',
    authChoice: 'anthropic-api-key',
    keyFlag: '--anthropic-api-key',
    keyPlaceholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'Visit Anthropic Console to generate an API key.',
    needsKey: true,
    authTypes: [
      { value: 'api-key', label: 'API Key', description: 'Standard API key' },
      { value: 'setup-token', label: 'Setup Token', description: 'From `claude setup-token`' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT / Codex)',
    category: 'popular',
    authChoice: 'openai-api-key',
    keyFlag: '--openai-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Visit OpenAI Platform to generate an API key.',
    needsKey: true,
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    category: 'popular',
    authChoice: 'gemini-api-key',
    keyFlag: '--gemini-api-key',
    keyPlaceholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'Visit Google AI Studio to create a Gemini API key.',
    needsKey: true,
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    category: 'popular',
    authChoice: 'xai-api-key',
    keyFlag: '--xai-api-key',
    keyPlaceholder: 'xai-...',
    helpUrl: 'https://console.x.ai/',
    helpText: 'Visit xAI Console to generate an API key.',
    needsKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    category: 'popular',
    authChoice: 'openrouter-api-key',
    keyFlag: '--openrouter-api-key',
    keyPlaceholder: 'sk-or-...',
    helpUrl: 'https://openrouter.ai/keys',
    helpText: 'Visit OpenRouter to generate an API key.',
    needsKey: true,
  },

  // ── API Key Providers ──
  {
    id: 'chutes',
    label: 'Chutes',
    category: 'api-key',
    authChoice: 'chutes',
    keyFlag: undefined,
    needsKey: false,
    helpText: 'Chutes uses OAuth authentication. Complete setup after installation via `openclaw onboard`.',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    category: 'api-key',
    authChoice: 'minimax-api-key-cn',
    keyFlag: '--minimax-api-key',
    keyPlaceholder: 'eyJ...',
    helpUrl: 'https://intl.minimaxi.com/',
    helpText: 'Visit MiniMax to obtain an API key.',
    needsKey: true,
  },
  {
    id: 'moonshot',
    label: 'Moonshot AI (Kimi K2.5)',
    category: 'api-key',
    authChoice: 'moonshot-api-key',
    keyFlag: '--moonshot-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://platform.moonshot.cn/console/api-keys',
    helpText: 'Visit Moonshot AI platform to generate an API key.',
    needsKey: true,
  },
  {
    id: 'qwen',
    label: 'Qwen',
    category: 'oauth',
    authChoice: 'qwen-portal',
    needsKey: false,
    helpText: 'Qwen uses OAuth. Complete setup after installation via `openclaw onboard`.',
  },
  {
    id: 'zai',
    label: 'Z.AI',
    category: 'api-key',
    authChoice: 'zai-api-key',
    keyFlag: '--zai-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://z.ai/',
    helpText: 'Visit Z.AI to generate an API key.',
    needsKey: true,
  },
  {
    id: 'qianfan',
    label: 'Qianfan (Baidu)',
    category: 'api-key',
    authChoice: 'qianfan-api-key',
    keyFlag: '--qianfan-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://cloud.baidu.com/',
    helpText: 'Visit Baidu Cloud to obtain a Qianfan API key.',
    needsKey: true,
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot',
    category: 'oauth',
    authChoice: 'github-copilot',
    needsKey: false,
    helpText: 'GitHub Copilot uses OAuth. Complete setup after installation via `openclaw onboard`.',
  },
  {
    id: 'xiaomi',
    label: 'Xiaomi',
    category: 'api-key',
    authChoice: 'xiaomi-api-key',
    keyFlag: '--xiaomi-api-key',
    keyPlaceholder: 'sk-...',
    helpText: 'Enter your Xiaomi AI API key.',
    needsKey: true,
  },
  {
    id: 'opencode-zen',
    label: 'OpenCode Zen',
    category: 'api-key',
    authChoice: 'opencode-zen',
    keyFlag: '--opencode-zen-api-key',
    keyPlaceholder: 'sk-...',
    helpText: 'Enter your OpenCode Zen API key.',
    needsKey: true,
  },
  {
    id: 'synthetic',
    label: 'Synthetic',
    category: 'api-key',
    authChoice: 'synthetic-api-key',
    keyFlag: '--synthetic-api-key',
    keyPlaceholder: 'sk-...',
    helpText: 'Enter your Synthetic API key.',
    needsKey: true,
  },
  {
    id: 'together',
    label: 'Together AI',
    category: 'api-key',
    authChoice: 'together-api-key',
    keyFlag: '--together-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://api.together.xyz/settings/api-keys',
    helpText: 'Visit Together AI to generate an API key.',
    needsKey: true,
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    category: 'api-key',
    authChoice: 'huggingface-api-key',
    keyFlag: '--huggingface-api-key',
    keyPlaceholder: 'hf_...',
    helpUrl: 'https://huggingface.co/settings/tokens',
    helpText: 'Visit Hugging Face to create an access token.',
    needsKey: true,
  },
  {
    id: 'venice',
    label: 'Venice AI',
    category: 'api-key',
    authChoice: 'venice-api-key',
    keyFlag: '--venice-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://venice.ai/',
    helpText: 'Visit Venice AI to obtain an API key.',
    needsKey: true,
  },
  {
    id: 'litellm',
    label: 'LiteLLM',
    category: 'api-key',
    authChoice: 'litellm-api-key',
    keyFlag: '--litellm-api-key',
    keyPlaceholder: 'sk-...',
    helpText: 'Enter your LiteLLM proxy API key.',
    needsKey: true,
  },
  {
    id: 'vercel-ai-gateway',
    label: 'Vercel AI Gateway',
    category: 'api-key',
    authChoice: 'ai-gateway-api-key',
    keyFlag: '--ai-gateway-api-key',
    keyPlaceholder: 'sk-...',
    helpText: 'Enter your Vercel AI Gateway API key.',
    needsKey: true,
  },

  // ── Advanced ──
  {
    id: 'cloudflare',
    label: 'Cloudflare AI Gateway',
    category: 'advanced',
    authChoice: 'cloudflare-ai-gateway-api-key',
    keyFlag: '--cloudflare-ai-gateway-api-key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://dash.cloudflare.com/',
    helpText: 'Enter your Cloudflare AI Gateway credentials.',
    needsKey: true,
    extraFields: [
      { name: 'accountId', label: 'Account ID', type: 'text', placeholder: 'Your Cloudflare account ID', required: true },
      { name: 'gatewayId', label: 'Gateway ID', type: 'text', placeholder: 'Your AI Gateway ID', required: true },
    ],
  },
  {
    id: 'vllm',
    label: 'vLLM (Self-hosted)',
    category: 'advanced',
    authChoice: 'vllm',
    needsKey: false,
    helpText: 'Connect to a self-hosted vLLM instance.',
    extraFields: [
      { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'http://localhost:8000/v1', required: true },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Provider',
    category: 'advanced',
    authChoice: 'custom-api-key',
    keyFlag: '--custom-api-key',
    keyPlaceholder: 'Optional API key',
    helpText: 'Connect to any OpenAI-compatible or Anthropic-compatible API endpoint.',
    needsKey: false, // key is optional for custom
    extraFields: [
      { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'http://localhost:11434/v1', required: true },
      { name: 'modelId', label: 'Model ID', type: 'text', placeholder: 'e.g. llama3, gpt-4', required: true },
      {
        name: 'compatibility',
        label: 'API Compatibility',
        type: 'select',
        required: true,
        options: [
          { value: 'openai', label: 'OpenAI-compatible' },
          { value: 'anthropic', label: 'Anthropic-compatible' },
        ],
      },
    ],
  },

  // ── Skip ──
  {
    id: 'skip',
    label: 'Skip for now',
    category: 'advanced',
    authChoice: 'skip',
    needsKey: false,
    helpText: 'You can configure an AI provider later via `openclaw onboard`.',
  },
];

/** Get a provider definition by id */
export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Check if a provider uses OAuth (no key input in wizard) */
export function isOAuthProvider(id: string): boolean {
  const p = getProvider(id);
  return p?.category === 'oauth';
}

/** Check if a provider needs extra fields beyond API key */
export function hasExtraFields(id: string): boolean {
  const p = getProvider(id);
  return (p?.extraFields?.length ?? 0) > 0;
}
