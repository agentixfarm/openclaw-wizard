import { z } from 'zod';

// Phone number in E.164 format: +[country code][number]
const e164PhoneSchema = z.string().regex(
  /^\+[1-9]\d{1,14}$/,
  'Phone number must be in E.164 format (e.g., +15555550123)'
);

// Telegram channel config
export const telegramConfigSchema = z.object({
  platform: z.literal('telegram'),
  botToken: z.string().min(20, 'Telegram bot token is too short'),
  userId: z.string().regex(/^\d+$/, 'Telegram user ID must be numeric (not @username)').optional(),
});

// Discord channel config
export const discordConfigSchema = z.object({
  platform: z.literal('discord'),
  botToken: z.string().min(50, 'Discord bot token is too short'),
  userId: z.string().regex(/^\d+$/, 'Discord user ID must be numeric').optional(),
});

// WhatsApp channel config
export const whatsappConfigSchema = z.object({
  platform: z.literal('whatsapp'),
  phoneNumber: e164PhoneSchema.optional(),
});

// Slack channel config
export const slackConfigSchema = z.object({
  platform: z.literal('slack'),
  botToken: z.string().regex(/^xoxb-/, 'Slack bot token must start with xoxb-'),
  appToken: z.string().regex(/^xapp-/, 'Slack app token must start with xapp-').optional(),
  userId: z.string().regex(/^U[A-Z0-9]+$/, 'Slack user ID must start with U').optional(),
});

// Union schema for any channel
export const channelConfigSchema = z.discriminatedUnion('platform', [
  telegramConfigSchema,
  discordConfigSchema,
  whatsappConfigSchema,
  slackConfigSchema,
]);

// Configured channel with metadata
export const configuredChannelSchema = z.object({
  platform: z.enum(['telegram', 'discord', 'whatsapp', 'slack']),
  enabled: z.boolean().default(true),
  configured: z.boolean().default(false),
  botName: z.string().optional(),
  botUsername: z.string().optional(),
  config: channelConfigSchema.optional(),
});

// All channels config for wizard
export const channelsConfigSchema = z.object({
  channels: z.array(configuredChannelSchema).default([]),
});

// Export types
export type TelegramConfigData = z.infer<typeof telegramConfigSchema>;
export type DiscordConfigData = z.infer<typeof discordConfigSchema>;
export type WhatsAppConfigData = z.infer<typeof whatsappConfigSchema>;
export type SlackConfigData = z.infer<typeof slackConfigSchema>;
export type ChannelConfigData = z.infer<typeof channelConfigSchema>;
export type ConfiguredChannel = z.infer<typeof configuredChannelSchema>;
export type ChannelsConfigData = z.infer<typeof channelsConfigSchema>;
