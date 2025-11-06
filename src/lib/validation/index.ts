import { z } from 'zod';

// Romanian phone number validation (E.164 format)
export const phoneSchema = z
  .string()
  .regex(/^\+40\d{9}$/, 'Numărul de telefon trebuie să fie în format +40XXXXXXXXX');

// Romanian plate number validation
export const plateNumberSchema = z
  .string()
  .regex(
    /^[A-Z]{1,2}-\d{2,3}-[A-Z]{3}$/,
    'Numărul de înmatriculare trebuie să fie în format XX-123-ABC'
  )
  .transform((val) => val.toUpperCase());

// Email validation
export const emailSchema = z.string().email('Email invalid');

// User profile schemas
export const userProfileSchema = z.object({
  full_name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere').optional(),
  phone: phoneSchema.optional(),
  prefers_sms: z.boolean().default(false),
});

export const userProfileUpdateSchema = userProfileSchema.partial();

// Reminder schemas
export const reminderTypeSchema = z.enum(['itp', 'rca', 'rovinieta']);

export const createReminderSchema = z.object({
  plate_number: plateNumberSchema,
  reminder_type: reminderTypeSchema.default('itp'),
  expiry_date: z.coerce.date().refine(
    (date) => date > new Date(),
    'Data expirării trebuie să fie în viitor'
  ),
  notification_intervals: z.array(z.number().positive()).default([7, 3, 1]),
  notification_channels: z
    .object({
      sms: z.boolean(),
      email: z.boolean(),
    })
    .default({ sms: true, email: false }),
  guest_phone: phoneSchema.optional(),
  guest_name: z.string().min(3).optional(),
});

export const updateReminderSchema = createReminderSchema.partial();

// Kiosk submission schema
export const kioskSubmissionSchema = z.object({
  station_slug: z.string().min(1),
  guest_name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere'),
  guest_phone: phoneSchema,
  plate_number: plateNumberSchema,
  expiry_date: z.coerce.date().refine(
    (date) => date > new Date(),
    'Data expirării trebuie să fie în viitor'
  ),
  consent_given: z.literal(true, {
    errorMap: () => ({ message: 'Trebuie să accepți termenii și condițiile' }),
  }),
});

// SMS Gateway schemas
export const sendSmsSchema = z.object({
  to: phoneSchema,
  body: z.string().min(1).max(1600, 'Mesajul poate avea maxim 1600 caractere'),
  callbackUrl: z.string().url().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

// Station schemas
export const createStationSchema = z.object({
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, 'Slug-ul poate conține doar litere mici, cifre și liniuțe'),
  name: z.string().min(3),
  logo_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  station_phone: phoneSchema.optional(),
  station_address: z.string().optional(),
});

export const updateStationSchema = createStationSchema.partial();

// Export types inferred from schemas
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type CreateReminder = z.infer<typeof createReminderSchema>;
export type UpdateReminder = z.infer<typeof updateReminderSchema>;
export type KioskSubmission = z.infer<typeof kioskSubmissionSchema>;
export type SendSms = z.infer<typeof sendSmsSchema>;
export type CreateStation = z.infer<typeof createStationSchema>;
export type UpdateStation = z.infer<typeof updateStationSchema>;
export type ReminderType = z.infer<typeof reminderTypeSchema>;
