'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';
import {
  loginSchema,
  registerSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordRequestInput,
  type ResetPasswordInput,
} from '@/lib/validation/auth';

type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { attempts: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { attempts: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.attempts >= maxAttempts) {
    return false;
  }

  record.attempts++;
  return true;
}

/**
 * Login with email and password
 */
export async function login(data: LoginInput): Promise<ActionResult> {
  try {
    // Validate input
    const validated = loginSchema.parse(data);

    // Rate limiting
    if (!checkRateLimit(`login:${validated.email}`)) {
      return {
        success: false,
        error: 'Prea multe încercări. Vă rugăm să încercați din nou mai târziu.',
      };
    }

    const supabase = createClient();

    // Sign in
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      return {
        success: false,
        error: 'Email sau parolă incorectă',
      };
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
  } catch (error) {
    logger.error('Login error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}

/**
 * Register new user
 */
export async function register(data: RegisterInput): Promise<ActionResult> {
  try {
    // Validate input
    const validated = registerSchema.parse(data);

    // Rate limiting
    if (!checkRateLimit(`register:${validated.email}`)) {
      return {
        success: false,
        error: 'Prea multe încercări. Vă rugăm să încercați din nou mai târziu.',
      };
    }

    const supabase = createClient();

    // Sign up with additional metadata
    const { data: authData, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          full_name: validated.fullName,
          phone: validated.phone,
          city: validated.city,
          country: validated.country,
          sms_notifications: validated.smsNotifications,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message === 'User already registered'
          ? 'Acest email este deja înregistrat'
          : 'A apărut o eroare la înregistrare',
      };
    }

    // If email confirmation is required
    if (authData.user && !authData.session) {
      return {
        success: true,
      };
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
  } catch (error) {
    logger.error('Register error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
  data: ResetPasswordRequestInput
): Promise<ActionResult> {
  try {
    // Validate input
    const validated = resetPasswordRequestSchema.parse(data);

    // Rate limiting
    if (!checkRateLimit(`reset:${validated.email}`)) {
      return {
        success: false,
        error: 'Prea multe încercări. Vă rugăm să încercați din nou mai târziu.',
      };
    }

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      logger.error('Password reset email error', error);
      // Don't reveal if email exists
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Reset password request error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(data: ResetPasswordInput): Promise<ActionResult> {
  try {
    // Validate input
    const validated = resetPasswordSchema.parse(data);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (error) {
      return {
        success: false,
        error: 'Linkul de resetare este invalid sau a expirat',
      };
    }

    revalidatePath('/', 'layout');
    redirect('/login');
  } catch (error) {
    logger.error('Password update error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}

/**
 * Sign out current user
 */
export async function logout(): Promise<ActionResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: 'A apărut o eroare la deconectare',
      };
    }

    revalidatePath('/', 'layout');
    redirect('/login');
  } catch (error) {
    logger.error('Logout error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}

/**
 * OAuth login (Google only)
 * ACTUALIZAT 2025: Scopes și queryParams pentru Google OAuth
 */
export async function oauthLogin(
  provider: 'google'
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
        // Google OAuth: scopes și queryParams pentru access offline și profile data
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile',
      },
    });

    if (error || !data.url) {
      logger.error(`OAuth ${provider} error`, error);
      return {
        success: false,
        error: 'A apărut o eroare la autentificare',
      };
    }

    return {
      success: true,
      data: { url: data.url },
    };
  } catch (error) {
    logger.error('OAuth login error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}
