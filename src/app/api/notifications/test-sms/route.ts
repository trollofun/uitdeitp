import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const TestSMSSchema = z.object({
  phone_number: z
    .string()
    .regex(/^\+40\d{9}$/, 'Număr de telefon invalid (format: +40XXXXXXXXX)'),
});

/**
 * POST /api/notifications/test-sms
 * Send a test SMS to verify NotifyHub integration
 *
 * Request body:
 * {
 *   "phone_number": "+40712345678"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse and validate request
    const body = await req.json();
    const validation = TestSMSSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { phone_number } = validation.data;

    // Check if user has admin or station_manager role for test SMS
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      (profile.role !== 'admin' && profile.role !== 'station_manager')
    ) {
      return NextResponse.json(
        { error: 'Nu ai permisiunea să trimiți SMS-uri de test' },
        { status: 403 }
      );
    }

    // Send test SMS via NotifyHub
    const notifyHubUrl = process.env.NOTIFYHUB_URL;
    const notifyHubApiKey = process.env.NOTIFYHUB_API_KEY;

    if (!notifyHubUrl || !notifyHubApiKey) {
      console.error('NotifyHub credentials not configured');
      throw new Error('Serviciul SMS nu este configurat');
    }

    const testMessage = `Test SMS de la uitdeITP. Serviciul de notificări funcționează corect! Trimis la ${new Date().toLocaleTimeString('ro-RO')}`;

    const smsResponse = await fetch(`${notifyHubUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${notifyHubApiKey}`,
      },
      body: JSON.stringify({
        to: phone_number,
        message: testMessage,
        metadata: {
          type: 'test',
          sent_by: user.id,
          sent_at: new Date().toISOString(),
        },
      }),
    });

    if (!smsResponse.ok) {
      const errorData = await smsResponse.json();
      console.error('NotifyHub error:', errorData);
      throw new Error('Eroare la trimiterea SMS-ului de test');
    }

    const smsData = await smsResponse.json();

    return NextResponse.json(
      {
        success: true,
        message: 'SMS de test trimis cu succes',
        message_id: smsData.message_id,
        sent_to: phone_number,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
