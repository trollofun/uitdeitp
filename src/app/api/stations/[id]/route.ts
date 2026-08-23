import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkReviewLink } from '@/lib/services/review-link';
import { ROMANIAN_COUNTIES } from '@/lib/services/plate';

const StationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  logo_url: z.string().url().optional().nullable(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  station_phone: z.string().optional().nullable(), // Fixed: was contact_phone
  station_address: z.string().optional().nullable(), // Fixed: was contact_email
  // Directorul public. `public_listed` e opt-in, iar baza refuză activarea
  // fără oraș, județ și adresă — o fișă publică fără ele e mai rea decât
  // niciuna. Codul de județ se validează cu aceeași listă ca plăcuțele.
  public_listed: z.boolean().optional(),
  city: z.string().trim().min(2).max(80).optional().nullable(),
  county_code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v in ROMANIAN_COUNTIES, 'Cod de județ invalid (ex. CT)')
    .optional()
    .nullable(),
  public_description: z.string().trim().max(400).optional().nullable(),
  pricing: z
    .array(z.object({ label: z.string().trim().min(2).max(60), price_lei: z.number().int().min(0).max(10000) }))
    .max(12)
    .optional(),
  // Programările: pornirea lor e ce face butonul din fișa publică util.
  booking_enabled: z.boolean().optional(),
  slot_minutes: z.number().int().min(10).max(240).optional(),
  slot_capacity: z.number().int().min(1).max(20).optional(),
  // SMS templates for different intervals
  sms_template_5d: z.string().min(10).optional().nullable(),
  sms_template_3d: z.string().min(10).optional().nullable(),
  sms_template_1d: z.string().min(10).optional().nullable(),
  // Email templates (to be added to DB)
  email_template_5d: z.string().optional().nullable(),
  email_template_3d: z.string().optional().nullable(),
  email_template_1d: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  rar_code: z.string().min(2).max(16).optional(),
  default_intervals: z.array(z.number().int().min(1).max(60)).min(1).max(4).optional(),
  ingest_enabled: z.boolean().optional(),
  hmac_mode: z.enum(['log', 'enforce']).optional(),
  // Post-inspection review request (F2.5). Owner-editable: the station's own
  // Google link and wording. Sending stays gated on REVIEW_SMS_ENABLED.
  // `z.string().url()` accepta orice URL — inclusiv un link de căutare Google
  // sau un shortener care expiră. Linkul „mergea" la salvare și eșua tăcut la
  // fiecare client, luni la rând. Acum se validează forma și se normalizează.
  review_link: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null))
    .superRefine((value, ctx) => {
      if (value === null) return;
      const check = checkReviewLink(value);
      if (!check.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error });
      }
    })
    .transform((value) => (value === null ? null : (checkReviewLink(value).normalized ?? value))),
  review_sms_enabled: z.boolean().optional(),
  review_delay_days: z.number().int().min(1).max(30).optional(),
  sms_template_review: z.string().min(10).max(320).optional().nullable(),
  /**
   * Admin-only: hands the station to an existing account by email. Resolved to
   * owner_id server-side — the caller never supplies a user id, and an unknown
   * email is an error rather than a silent no-op. Without this, every new
   * station needed a hand-written UPDATE before its owner could sign in.
   */
  owner_email: z.string().email().optional().nullable(),
});

/**
 * Fields that decide identity, ecosystem wiring or security posture. The RLS
 * policy on kiosk_stations grants UPDATE to the owner for the whole row, so
 * without this list a station owner could rename their own slug, flip
 * hmac_mode to 'log', enable ingest, or claim another station's RAR code.
 * Editing branding and message wording is theirs; this is not.
 */
const ADMIN_ONLY_FIELDS = [
  'slug',
  'is_active',
  'rar_code',
  'ingest_enabled',
  'hmac_mode',
  'owner_email',
] as const;

/**
 * PATCH /api/stations/[id]
 * Update station branding, SMS templates, contact info
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validation = StationUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Reject admin-only fields for non-admins instead of silently dropping
    // them: a station owner who tries to change their RAR code should be told
    // no, not left believing it saved.
    const attemptedAdminFields = ADMIN_ONLY_FIELDS.filter((field) => field in updateData);

    if (attemptedAdminFields.length > 0) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          {
            error: 'Aceste setări pot fi schimbate doar de administrator',
            fields: attemptedAdminFields,
          },
          { status: 403 }
        );
      }
    }

    // Handing over ownership: resolve the email to a real account and set both
    // owner_id (what RLS uses) and owner_email (the denormalised copy the cron
    // reads for alerts) together, so the two can never drift apart.
    if ('owner_email' in updateData) {
      const email = updateData.owner_email?.trim().toLowerCase() ?? null;

      if (email) {
        const admin = createAdminClient();
        const { data: ownerId, error: lookupError } = await admin.rpc('find_user_id_by_email', {
          p_email: email,
        });

        if (lookupError) {
          console.error('[Stations] owner lookup failed:', lookupError);
          return NextResponse.json({ error: 'Eroare la căutarea contului' }, { status: 500 });
        }

        if (!ownerId) {
          // Fără cont încă? Nu mai e o eroare: emailul rămâne pe stație ca
          // promisiune, iar auto-claim-ul (src/lib/stations/claim.ts) o ține
          // singur la primul login al persoanei. Adio „înregistrează-te întâi,
          // apoi roagă adminul să reia legarea".
          (updateData as Record<string, unknown>).owner_id = null;
          (updateData as Record<string, unknown>).owner_email = email;
        } else {
          (updateData as Record<string, unknown>).owner_id = ownerId;
          (updateData as Record<string, unknown>).owner_email = email;
        }
      } else {
        (updateData as Record<string, unknown>).owner_id = null;
      }
    }

    // If updating slug, check for conflicts
    if (updateData.slug) {
      const { data: existingStation } = await supabase
        .from('kiosk_stations')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', id)
        .single();

      if (existingStation) {
        return NextResponse.json(
          { error: 'Station with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update station (RLS will ensure user owns this station)
    const { data, error } = await supabase
      .from('kiosk_stations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating station:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Station not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in PATCH /api/stations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stations/[id]
 * Soft delete station (set is_active = false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Dezactivarea e admin-only, ca PATCH-ul pe is_active (ADMIN_ONLY_FIELDS):
    // ruta asta lăsa un patron să-și stingă singur stația prin RLS, în timp ce
    // PATCH-ul îi refuza explicit exact aceeași operație.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Doar administratorul platformei poate dezactiva stații' },
        { status: 403 }
      );
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('kiosk_stations')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting station:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Station not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Station deactivated successfully',
      data
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/stations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
