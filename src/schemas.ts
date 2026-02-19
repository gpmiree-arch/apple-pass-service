import { z } from 'zod';

export const CardSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  customer_email: z.string().nullable().optional(),
  stamp_count: z.number().int().min(0).default(0),
  qr_code_data: z.string().min(1),
  auth_token: z.string().nullable().optional(),
  pass_serial_number: z.string().nullable().optional(),
});

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  campaign_name: z.string(),
  brand_color: z.string().nullable().optional(),
  reward_text: z.string(),
  stamp_goal: z.number().int().min(1).default(10),
}).nullable().optional();

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  store_name: z.string(),
  reward_text: z.string(),
  background_color: z.string().optional(),
  background_type: z.string().nullable().optional(),
  gradient_start: z.string().nullable().optional(),
  text_color: z.string().optional(),
  accent_color: z.string().optional(),
  logo_url: z.string().url().nullable().optional(),
  background_image_url: z.string().url().nullable().optional(),
  wallet_stamp_icon: z.string().nullable().optional(),
  wallet_stamp_goal: z.number().nullable().optional(),
}).nullable().optional();

export const GeneratePassRequestSchema = z.object({
  card: CardSchema,
  campaign: CampaignSchema,
  template: TemplateSchema,
});

export type GeneratePassRequest = z.infer<typeof GeneratePassRequestSchema>;
