import { z } from 'zod';
import { channelsConfigSchema } from './channelSchemas';

/**
 * System Check step schema
 */
export const systemCheckSchema = z.object({
  acknowledged: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge system requirements',
  }),
});

/**
 * Provider Configuration step schema
 * authType: 'api-key' for standard API keys, 'setup-token' for Anthropic setup tokens (sk-ant-oat01-...)
 */
export const providerConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai']),
  authType: z.enum(['api-key', 'setup-token']).default('api-key'),
  apiKey: z.string().min(10, 'Credential must be at least 10 characters'),
});

/**
 * Gateway Configuration step schema
 */
export const gatewayConfigSchema = z
  .object({
    port: z.number().min(1024).max(65535).default(18789),
    bind: z.enum(['loopback', 'lan']).default('loopback'),
    authMode: z.enum(['token', 'password']).default('token'),
    authCredential: z.string().optional(),
  })
  .refine(
    (data) => {
      // If authMode is selected (not default), authCredential must be non-empty
      if (data.authMode && data.authCredential === undefined || data.authCredential === '') {
        return false;
      }
      return true;
    },
    {
      message: 'Authentication credential is required when auth mode is selected',
      path: ['authCredential'],
    }
  );

/**
 * Combined wizard schema
 */
export const wizardSchema = z.object({
  systemCheck: systemCheckSchema.optional(),
  providerConfig: providerConfigSchema.optional(),
  gatewayConfig: gatewayConfigSchema.optional(),
  channelsConfig: channelsConfigSchema.optional(),
  // Phase 5: SSH & Remote Setup
  sshCredentials: sshCredentialsSchema.optional(),
  securityAck: securityAckSchema.optional(),
  advancedConfig: advancedConfigSchema.optional(),
});

/**
 * SSH Credentials step schema (Phase 5)
 */
export const sshCredentialsSchema = z.object({
  host: z.string()
    .min(1, 'Hostname is required')
    .regex(/^[a-zA-Z0-9.-]+$/, 'Invalid hostname format'),
  username: z.string()
    .min(1, 'Username is required')
    .regex(/^[a-z_][a-z0-9_-]*$/, 'Invalid username format'),
  keyPath: z.string()
    .min(1, 'SSH key path is required'),
});

/**
 * Security Acknowledgement step schema (Phase 5)
 */
export const securityAckSchema = z.object({
  acknowledged: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the security implications to proceed",
  }),
  timestamp: z.number(),
});

/**
 * Advanced Configuration step schema (Phase 5)
 */
export const advancedConfigSchema = z.object({
  bindMode: z.enum(['localhost', 'all']),
  authMode: z.enum(['none', 'basic']),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  tailscaleEnabled: z.boolean(),
  tailscaleAuthKey: z.string().optional(),
}).refine(
  (data) => {
    if (data.authMode === 'basic') {
      return data.authUsername && data.authPassword && data.authUsername.length > 0 && data.authPassword.length > 0;
    }
    return true;
  },
  {
    message: "Username and password are required for basic authentication",
    path: ['authUsername'], // Show error on username field
  }
);

/**
 * Inferred TypeScript type for wizard form data
 */
export type WizardFormData = z.infer<typeof wizardSchema>;

/**
 * Individual step data types
 */
export type SystemCheckData = z.infer<typeof systemCheckSchema>;
export type ProviderConfigData = z.input<typeof providerConfigSchema>;
export type GatewayConfigData = z.input<typeof gatewayConfigSchema>;
export type SshCredentialsData = z.infer<typeof sshCredentialsSchema>;
export type SecurityAckData = z.infer<typeof securityAckSchema>;
export type AdvancedConfigData = z.infer<typeof advancedConfigSchema>;
