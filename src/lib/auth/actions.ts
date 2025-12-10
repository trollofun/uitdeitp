'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  smsNotifications: z.boolean().optional(),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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

    const supabase = createServerClient();

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
    console.error('Login error:', error);
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

    const supabase = createServerClient();

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
    console.error('Register error', error);
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

    const supabase = createServerClient();

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset email error:', error);
      // Don't reveal if email exists
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Reset password request error', error);
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

    const supabase = createServerClient();

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
    console.error('Password update error', error);
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
    const supabase = createServerClient();

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
    console.error('Logout error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}

/**
 * OAuth login (Google, GitHub)
 */
export async function oauthLogin(
  provider: 'google' | 'github'
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error || !data.url) {
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
    console.error('OAuth login error', error);
    return {
      success: false,
      error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    };
  }
}
