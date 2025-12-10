'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Car, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const formatPlateNumber = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
};

const validatePlate = (plate: string): boolean => {
  const plateWithDashes = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;
  const plateWithoutDashes = /^[A-Z]{1,2}\d{2,3}[A-Z]{2,3}$/;
  return plateWithDashes.test(plate) || plateWithoutDashes.test(plate);
};

export default function AddVehiclePage() {
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [plateError, setPlateError] = useState('');

  const handlePlateChange = (value: string) => {
    const formatted = formatPlateNumber(value);
    setPlateNumber(formatted);

    if (formatted.length > 0 && !validatePlate(formatted) && formatted.length >= 5) {
      setPlateError('Format invalid (ex: B-123-ABC sau CT90BTC)');
    } else {
      setPlateError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePlate(plateNumber)) {
      setPlateError('Format invalid');
      return;
    }

    if (!expiryDate) {
      setError('Data expirării este obligatorie');
      return;
    }

    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry <= today) {
      setError('Data trebuie să fie în viitor');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reminders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_number: plateNumber,
          itp_expiry_date: expiryDate,
          sms_notifications_enabled: smsNotifications,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Eroare la salvare');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Add vehicle error:', err);
      setError(err instanceof Error ? err.message : 'Eroare la adăugare vehicul');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi la Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-card border rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Adaugă Vehicul Nou</h1>
            <p className="text-muted-foreground">
              Completează datele vehiculului pentru a primi reminder-e ITP
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plate Number */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Număr de Înmatriculare *
              </label>
              <Input
                type="text"
                value={plateNumber}
                onChange={(e) => handlePlateChange(e.target.value)}
                placeholder="B-123-ABC sau CT90BTC"
                className={`text-center text-lg tracking-wider ${
                  plateError ? 'border-red-500' : ''
                }`}
                maxLength={10}
                required
              />
              {plateError && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{plateError}</span>
                </div>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Data Expirării ITP *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="sms-notifications"
                checked={smsNotifications}
                onCheckedChange={(checked) => setSmsNotifications(checked as boolean)}
              />
              <label
                htmlFor="sms-notifications"
                className="text-sm cursor-pointer flex-1"
              >
                <span className="font-medium block mb-1">
                  Activează notificări SMS
                </span>
                <span className="text-muted-foreground">
                  Vei primi un SMS cu 5 zile înainte de expirarea ITP-ului
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting || !!plateError}
            >
              {isSubmitting ? 'Se adaugă...' : 'Adaugă Vehicul'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
