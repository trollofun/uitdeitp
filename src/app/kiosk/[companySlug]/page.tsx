'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import IdleState from '@/components/kiosk/IdleState';
import VehiclePage from '@/components/kiosk/VehiclePage';
import ContactPage from '@/components/kiosk/ContactPage';
import VerifyPage from '@/components/kiosk/VerifyPage';
import SuccessPage from '@/components/kiosk/SuccessPage';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

type FlowStep = 'idle' | 'vehicle' | 'contact' | 'verify' | 'success';

interface KioskStation {
  id: string;
  name: string;
  slug: string;
  address: string;
  active: boolean;
}

interface FormData {
  plateNumber: string;
  expiryDate: { day: string; month: string; year: string };
  name: string;
  phone: string;
}

const INACTIVITY_TIMEOUT = 45000; // 45 seconds

export default function KioskPage({
  params,
}: {
  params: { companySlug: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('idle');
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<KioskStation | null>(null);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [lastActivity, setLastActivity] = useState(Date.now());

  const supabase = createBrowserClient();

  // Auto-reset on inactivity
  useEffect(() => {
    if (step === 'idle' || step === 'success') return;

    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        resetToIdle();
      }
    }, 1000);

    return () => clearInterval(checkInactivity);
  }, [step, lastActivity]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  const resetToIdle = useCallback(() => {
    setStep('idle');
    setFormData({});
    setError('');
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    async function fetchStation() {
      try {
        const { data, error: fetchError } = await supabase
          .from('kiosk_stations')
          .select('*')
          .eq('slug', params.companySlug)
          .single();

        if (fetchError || !data) {
          setError('Stația nu a fost găsită');
          setLoading(false);
          return;
        }

        if (!data.active) {
          setError('Modul kiosk nu este activat pentru această stație');
          setLoading(false);
          return;
        }

        setStation(data);
        setLoading(false);
      } catch (err) {
        setError('Eroare la încărcarea stației');
        setLoading(false);
      }
    }

    fetchStation();
  }, [params.companySlug, supabase]);

  const handleStart = () => {
    setStep('vehicle');
    setLastActivity(Date.now());
  };

  const handleVehicleNext = (data: { plateNumber: string; expiryDate: { day: string; month: string; year: string } }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep('contact');
    setLastActivity(Date.now());
  };

  const handleContactNext = async (data: { name: string; phone: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setLastActivity(Date.now());

    // Send SMS verification code
    try {
      const response = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone,
          stationSlug: params.companySlug,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      setStep('verify');
    } catch (err) {
      console.error('Error sending verification:', err);
      setError('Eroare la trimiterea codului de verificare');
    }
  };

  const handleVerify = async (code: string): Promise<boolean> => {
    setLastActivity(Date.now());

    if (!formData.phone) return false;

    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          code,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.verified) {
        return false;
      }

      // Save to database
      const confirmCode = 'ITP' + Math.random().toString(36).substring(2, 8).toUpperCase();

      // Format expiry date for database
      const expiryDateStr = `${formData.expiryDate!.year}-${formData.expiryDate!.month.padStart(2, '0')}-${formData.expiryDate!.day.padStart(2, '0')}`;

      const { error: insertError } = await supabase.from('reminders').insert({
        phone_number: formData.phone,
        plate_number: formData.plateNumber,
        itp_expiry_date: expiryDateStr,
        station_slug: params.companySlug,
        reminder_type: 'itp',
        consent_given: true,
        sms_notifications_enabled: true,
        source: 'kiosk',
        confirmation_code: confirmCode,
        status: 'active',
        user_name: formData.name,
      });

      if (insertError) {
        console.error('Error saving reminder:', insertError);
        return false;
      }

      setStep('success');
      return true;
    } catch (err) {
      console.error('Verification error:', err);
      return false;
    }
  };

  const handleResendCode = async () => {
    setLastActivity(Date.now());

    if (!formData.phone) return;

    try {
      const response = await fetch('/api/verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          stationSlug: params.companySlug,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification code');
      }
    } catch (err) {
      console.error('Error resending code:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Stație ITP Indisponibilă</h2>
          <p className="text-gray-600">
            {error || 'Modul kiosk nu este activat pentru această stație.'}
          </p>
          <button
            onClick={() => router.push('/kiosk')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Înapoi la Lista de Stații
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {step === 'idle' && (
        <IdleState
          key="idle"
          onStart={handleStart}
          stationName={station.name}
        />
      )}

      {step === 'vehicle' && (
        <VehiclePage
          key="vehicle"
          onNext={handleVehicleNext}
        />
      )}

      {step === 'contact' && (
        <ContactPage
          key="contact"
          onNext={handleContactNext}
          onBack={() => setStep('vehicle')}
        />
      )}

      {step === 'verify' && formData.phone && (
        <VerifyPage
          key="verify"
          phone={formData.phone}
          onVerify={handleVerify}
          onResend={handleResendCode}
        />
      )}

      {step === 'success' && formData.plateNumber && formData.expiryDate && (
        <SuccessPage
          key="success"
          plateNumber={formData.plateNumber}
          expiryDate={formData.expiryDate}
          onComplete={resetToIdle}
        />
      )}
    </AnimatePresence>
  );
}
