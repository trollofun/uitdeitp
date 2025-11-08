'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneVerificationStep } from '@/components/kiosk/PhoneVerificationStep';
import { PlateNumberStep } from '@/components/kiosk/PlateNumberStep';
import { ExpiryDateStep } from '@/components/kiosk/ExpiryDateStep';
import { ConsentStep } from '@/components/kiosk/ConsentStep';
import { ConfirmationStep } from '@/components/kiosk/ConfirmationStep';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

type Step = 'phone' | 'plate' | 'expiry' | 'consent' | 'confirmation';

interface KioskStation {
  id: string;
  name: string;
  slug: string;
  address: string;
  active: boolean;
}

export default function KioskPage({
  params,
}: {
  params: { companySlug: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<KioskStation | null>(null);
  const [error, setError] = useState<string>('');

  // Form data
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');

  const supabase = createBrowserClient();

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
          setError('Această stație nu este activă momentan');
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

  const handlePhoneVerified = (verifiedPhone: string) => {
    setPhone(verifiedPhone);
    setStep('plate');
  };

  const handlePlateSubmit = (plate: string) => {
    setPlateNumber(plate);
    setStep('expiry');
  };

  const handleExpirySubmit = (date: Date) => {
    setExpiryDate(date);
    setStep('consent');
  };

  const handleConsentAccepted = async () => {
    if (!expiryDate) return;

    try {
      // Generate confirmation code
      const code = 'ITP' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setConfirmationCode(code);

      // Save to database
      const { error: insertError } = await supabase.from('reminders').insert({
        phone_number: phone,
        plate_number: plateNumber,
        itp_expiry_date: expiryDate.toISOString(),
        station_slug: params.companySlug,
        reminder_type: 'itp',
        consent_given: true,
        source: 'kiosk',
        confirmation_code: code,
        status: 'active',
      });

      if (insertError) {
        console.error('Error saving reminder:', insertError);
        setError('Eroare la salvarea datelor. Te rugăm să încerci din nou.');
        return;
      }

      // Success - move to confirmation
      setStep('confirmation');
    } catch (err) {
      console.error('Error in consent handler:', err);
      setError('Eroare la procesarea datelor. Te rugăm să încerci din nou.');
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'plate':
        setStep('phone');
        break;
      case 'expiry':
        setStep('plate');
        break;
      case 'consent':
        setStep('expiry');
        break;
      default:
        router.back();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold">Stație Indisponibilă</h2>
          <p className="text-muted-foreground">
            {error || 'Această stație nu a fost găsită sau nu este activă.'}
          </p>
          <button
            onClick={() => router.push('/kiosk')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Înapoi la Lista de Stații
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">uitdeITP</h1>
              <p className="text-sm text-muted-foreground">{station.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Kiosk Mode</p>
              <div className="flex items-center gap-1 mt-1">
                {(['phone', 'plate', 'expiry', 'consent', 'confirmation'] as Step[]).map(
                  (s, index) => (
                    <div
                      key={s}
                      className={`h-1 w-8 rounded-full transition-all ${
                        ['phone', 'plate', 'expiry', 'consent', 'confirmation'].indexOf(
                          step
                        ) >= index
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-card border rounded-xl shadow-lg p-6">
          {step === 'phone' && (
            <PhoneVerificationStep
              stationSlug={params.companySlug}
              onVerified={handlePhoneVerified}
              onBack={handleBack}
            />
          )}

          {step === 'plate' && (
            <PlateNumberStep onNext={handlePlateSubmit} onBack={handleBack} />
          )}

          {step === 'expiry' && (
            <ExpiryDateStep onNext={handleExpirySubmit} onBack={handleBack} />
          )}

          {step === 'consent' && (
            <ConsentStep onNext={handleConsentAccepted} onBack={handleBack} />
          )}

          {step === 'confirmation' && expiryDate && (
            <ConfirmationStep
              phone={phone}
              plateNumber={plateNumber}
              expiryDate={expiryDate}
              stationName={station.name}
              confirmationCode={confirmationCode}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-sm py-3">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground">
            © 2025 uitdeITP - Reminder-e ITP Inteligente
            {station.address && (
              <>
                {' '}
                | <span className="font-medium">{station.address}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
