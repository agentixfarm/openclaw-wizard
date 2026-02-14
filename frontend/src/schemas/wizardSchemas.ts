import { z } from 'zod';

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
 */
export const providerConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai']),
  apiKey: z.string().min(10, 'API key must be at least 10 characters'),
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
});

/**
 * Inferred TypeScript type for wizard form data
 */
export type WizardFormData = z.infer<typeof wizardSchema>;

/**
 * Individual step data types
 */
export type SystemCheckData = z.infer<typeof systemCheckSchema>;
export type ProviderConfigData = z.infer<typeof providerConfigSchema>;
export type GatewayConfigData = z.infer<typeof gatewayConfigSchema>;
