-- Migration: 005_cleanup_and_utilities
-- Description: Drop old vehicles table and add utility functions
-- Created: 2025-11-05

-- Drop old vehicles table if it exists (migration from old schema)
DROP TABLE IF EXISTS public.vehicles CASCADE;

-- Create function to get pending notifications
CREATE OR REPLACE FUNCTION get_pending_notifications()
RETURNS TABLE (
    reminder_id UUID,
    reminder_type reminder_type,
    plate_number TEXT,
    expiry_date DATE,
    next_notification_date DATE,
    days_until_expiry INTEGER,
    notification_channels JSONB,
    recipient_phone TEXT,
    recipient_email TEXT,
    recipient_name TEXT,
    station_id UUID,
    station_name TEXT,
    station_phone TEXT,
    sms_template TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id as reminder_id,
        r.reminder_type,
        r.plate_number,
        r.expiry_date,
        r.next_notification_date,
        (r.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
        r.notification_channels,
        COALESCE(r.guest_phone, u.phone) as recipient_phone,
        u.email as recipient_email,
        COALESCE(r.guest_name, u.raw_user_meta_data->>'full_name') as recipient_name,
        r.station_id,
        k.name as station_name,
        k.station_phone,
        CASE
            WHEN (r.expiry_date - CURRENT_DATE) <= 1 THEN k.sms_template_1d
            WHEN (r.expiry_date - CURRENT_DATE) <= 3 THEN k.sms_template_3d
            WHEN (r.expiry_date - CURRENT_DATE) <= 7 THEN k.sms_template_5d
            ELSE k.sms_template_5d
        END as sms_template
    FROM public.reminders r
    LEFT JOIN auth.users u ON r.user_id = u.id
    LEFT JOIN public.kiosk_stations k ON r.station_id = k.id
    WHERE
        r.deleted_at IS NULL
        AND r.opt_out = false
        AND r.next_notification_date = CURRENT_DATE
        AND r.expiry_date > CURRENT_DATE
        AND (k.is_active = true OR k.is_active IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to soft delete expired reminders
CREATE OR REPLACE FUNCTION cleanup_expired_reminders(days_after_expiry INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE public.reminders
    SET deleted_at = now()
    WHERE
        deleted_at IS NULL
        AND expiry_date < CURRENT_DATE - days_after_expiry;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get station statistics
CREATE OR REPLACE FUNCTION get_station_statistics(station_uuid UUID)
RETURNS TABLE (
    total_reminders BIGINT,
    active_reminders BIGINT,
    expired_reminders BIGINT,
    notifications_sent BIGINT,
    notifications_delivered BIGINT,
    notifications_failed BIGINT,
    total_notification_cost DECIMAL,
    avg_delivery_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT r.id) as total_reminders,
        COUNT(DISTINCT r.id) FILTER (WHERE r.expiry_date >= CURRENT_DATE AND r.deleted_at IS NULL) as active_reminders,
        COUNT(DISTINCT r.id) FILTER (WHERE r.expiry_date < CURRENT_DATE) as expired_reminders,
        COUNT(nl.id) FILTER (WHERE nl.status IN ('sent', 'delivered')) as notifications_sent,
        COUNT(nl.id) FILTER (WHERE nl.status = 'delivered') as notifications_delivered,
        COUNT(nl.id) FILTER (WHERE nl.status = 'failed') as notifications_failed,
        COALESCE(SUM(nl.estimated_cost), 0) as total_notification_cost,
        CASE
            WHEN COUNT(nl.id) FILTER (WHERE nl.status IN ('sent', 'delivered')) > 0
            THEN ROUND(
                COUNT(nl.id) FILTER (WHERE nl.status = 'delivered')::NUMERIC /
                COUNT(nl.id) FILTER (WHERE nl.status IN ('sent', 'delivered'))::NUMERIC * 100,
                2
            )
            ELSE 0
        END as avg_delivery_rate
    FROM public.reminders r
    LEFT JOIN public.notification_log nl ON r.id = nl.reminder_id
    WHERE r.station_id = station_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to anonymize guest data (GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_guest_reminder(reminder_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.reminders
    SET
        guest_phone = 'ANONYMIZED',
        guest_name = 'ANONYMIZED',
        deleted_at = now(),
        opt_out = true,
        opt_out_timestamp = now()
    WHERE id = reminder_uuid
    AND user_id IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to bulk import reminders
CREATE OR REPLACE FUNCTION bulk_import_reminders(
    import_data JSONB,
    import_station_id UUID,
    import_source reminder_source DEFAULT 'import'
)
RETURNS TABLE (
    success_count INTEGER,
    error_count INTEGER,
    errors JSONB
) AS $$
DECLARE
    reminder_record JSONB;
    success_cnt INTEGER := 0;
    error_cnt INTEGER := 0;
    error_list JSONB := '[]'::JSONB;
BEGIN
    FOR reminder_record IN SELECT * FROM jsonb_array_elements(import_data)
    LOOP
        BEGIN
            INSERT INTO public.reminders (
                guest_phone,
                guest_name,
                plate_number,
                reminder_type,
                expiry_date,
                station_id,
                source,
                consent_given,
                consent_timestamp
            ) VALUES (
                reminder_record->>'phone',
                reminder_record->>'name',
                reminder_record->>'plate_number',
                (reminder_record->>'reminder_type')::reminder_type,
                (reminder_record->>'expiry_date')::DATE,
                import_station_id,
                import_source,
                true,
                now()
            );
            success_cnt := success_cnt + 1;
        EXCEPTION WHEN OTHERS THEN
            error_cnt := error_cnt + 1;
            error_list := error_list || jsonb_build_object(
                'record', reminder_record,
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN QUERY SELECT success_cnt, error_cnt, error_list;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_notifications() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_reminders(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_station_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_guest_reminder(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_import_reminders(JSONB, UUID, reminder_source) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_pending_notifications() IS 'Returns all reminders that need notification today';
COMMENT ON FUNCTION cleanup_expired_reminders(INTEGER) IS 'Soft deletes reminders expired for more than N days (default 30)';
COMMENT ON FUNCTION get_station_statistics(UUID) IS 'Returns comprehensive statistics for a kiosk station';
COMMENT ON FUNCTION anonymize_guest_reminder(UUID) IS 'GDPR: Anonymize guest user data';
COMMENT ON FUNCTION bulk_import_reminders(JSONB, UUID, reminder_source) IS 'Bulk import reminders from JSON data';
