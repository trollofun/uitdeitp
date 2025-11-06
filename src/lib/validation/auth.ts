import { z } from 'zod';

// Password validation schema - min 8 chars, 1 uppercase, 1 number
export const passwordSchema = z
  .string()
  .min(8, 'Parola trebuie să aibă minim 8 caractere')
  .regex(/[A-Z]/, 'Parola trebuie să conțină cel puțin o literă mare')
  .regex(/[0-9]/, 'Parola trebuie să conțină cel puțin o cifră');

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Email invalid'),
  password: z.string().min(1, 'Parola este obligatorie'),
  remember: z.boolean().default(false),
});

// Phone number validation - Romanian format
export const phoneSchema = z
  .string()
  .regex(/^\+40[0-9]{9}$/, 'Numărul de telefon trebuie să fie în format +40XXXXXXXXX (10 cifre)');

// Register schema with phone and location
export const registerSchema = z
  .object({
    email: z.string().email('Email invalid'),
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere'),
    phone: phoneSchema.optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Trebuie să accepți termenii și condițiile' }),
    }),
    smsNotifications: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolele nu coincid',
    path: ['confirmPassword'],
  });

// Reset password request schema
export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Email invalid'),
});

// Reset password schema
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolele nu coincid',
    path: ['confirmPassword'],
  });

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Parola curentă este obligatorie'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Parolele nu coincid',
    path: ['confirmPassword'],
  });

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
