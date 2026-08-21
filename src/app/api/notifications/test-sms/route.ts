import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { notifyHub } from '@/lib/services/notifyhub';
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

    const testMessage = `Test SMS de la uitdeITP. Serviciul de notificări funcționează corect! Trimis la ${new Date().toLocaleTimeString('ro-RO')}`;

    const smsResult = await notifyHub.sendSms({
      to: phone_number,
      message: testMessage,
      metadata: {
        type: 'test',
        sent_by: user.id,
        sent_at: new Date().toISOString(),
      },
    }, {
      // Găleată pe minut: un dublu-click sau un retry de rețea nu plătește
      // două SMS-uri; un test nou peste un minut trece.
      idempotencyKey: `test:${user.id}:${Math.floor(Date.now() / 60000)}`,
    });

    // The canonical client resolves instead of throwing; keep this route's
    // original error surface.
    if (!smsResult.success) {
      console.error('NotifyHub error:', smsResult.error);
      throw new Error('Eroare la trimiterea SMS-ului de test');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'SMS de test trimis cu succes',
        message_id: smsResult.messageId,
        sent_to: phone_number,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
