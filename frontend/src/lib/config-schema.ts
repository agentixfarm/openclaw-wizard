import { z } from 'zod';

/**
 * Zod schema for OpenClaw channel configuration
 */
export const channelConfigSchema = z.object({
  platform: z.enum(['telegram', 'discord', 'slack', 'whatsapp']),
  enabled: z.boolean(),
  bot_token: z.string().optional(),
  app_token: z.string().optional(),
  dm_policy: z.enum(['pairing', 'allowlist', 'open', 'disabled']).default('allowlist'),
  allowed_users: z.array(z.string()).default([]),
});

/**
 * Zod schema for OpenClaw configuration (openclaw.json)
 */
export const openClawConfigSchema = z.object({
  gateway: z.object({
    mode: z.string().optional(),
    port: z.number().min(1024).max(65535).default(18789),
    bind: z.string().default('127.0.0.1'),
    auth: z.object({
      type: z.enum(['api-key', 'setup-token']),
      credential: z.string().min(1),
    }).optional(),
  }).optional(),
  channels: z.record(z.string(), channelConfigSchema).optional(),
  provider: z.object({
    name: z.string(),
    api_key: z.string(),
  }).optional(),
}).passthrough(); // passthrough() preserves unknown fields

/**
 * TypeScript type inferred from schema
 */
export type OpenClawConfig = z.infer<typeof openClawConfigSchema>;
export type ChannelConfig = z.infer<typeof channelConfigSchema>;
