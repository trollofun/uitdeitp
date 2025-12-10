'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Car, Phone, Calendar, User, Building, AlertCircle, CheckCircle } from 'lucide-react';

interface Station {
  id: string;
  name: string;
  slug: string;
}

interface AddReminderFormProps {
  stations: Station[];
}

const formatPlateNumber = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
};

const formatPhone = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  return clean.slice(0, 10);
};

const validatePlate = (plate: string): boolean => {
  const plateWithDashes = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;
  const plateWithoutDashes = /^[A-Z]{1,2}\d{2,3}[A-Z]{2,3}$/;
  return plateWithDashes.test(plate) || plateWithoutDashes.test(plate);
};

const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (phone.length !== 10) return { valid: false, error: 'Trebuie să aibă 10 cifre' };
  if (!phone.startsWith('07')) return { valid: false, error: 'Trebuie să înceapă cu 07' };
  return { valid: true };
};

export function AddReminderForm({ stations }: AddReminderFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    plate_number: '',
    expiry_date: '',
    phone_number: '',
    guest_name: '',
    station_slug: stations[0]?.slug || '',
    sms_notifications_enabled: true,
  });

  const [errors, setErrors] = useState({
    plate_number: '',
    phone_number: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePlateChange = (value: string) => {
    const formatted = formatPlateNumber(value);
    setFormData({ ...formData, plate_number: formatted });

    if (formatted.length > 0 && !validatePlate(formatted) && formatted.length >= 5) {
      setErrors({ ...errors, plate_number: 'Format invalid' });
    } else {
      setErrors({ ...errors, plate_number: '' });
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData({ ...formData, phone_number: formatted });

    if (formatted.length > 0) {
      const validation = validatePhone(formatted);
      setErrors({ ...errors, phone_number: validation.error || '' });
    } else {
      setErrors({ ...errors, phone_number: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSuccess(false);

    // Validate
    if (!validatePlate(formData.plate_number)) {
      setErrors({ ...errors, plate_number: 'Format invalid' });
      return;
    }

    const phoneValidation = validatePhone(formData.phone_number);
    if (!phoneValidation.valid) {
      setErrors({ ...errors, phone_number: phoneValidation.error || '' });
      return;
    }

    if (!formData.expiry_date) {
      setSubmitError('Data expirării este obligatorie');
      return;
    }

    const expiry = new Date(formData.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry <= today) {
      setSubmitError('Data trebuie să fie în viitor');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/stations/add-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Eroare la salvare');
      }

      setSuccess(true);
      // Reset form
      setFormData({
        plate_number: '',
        expiry_date: '',
        phone_number: '',
        guest_name: '',
        station_slug: stations[0]?.slug || '',
        sms_notifications_enabled: true,
      });

      // Refresh after 2 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Add reminder error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Eroare la adăugare reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Date Client</h2>
        <p className="text-muted-foreground">
          Completează datele clientului pentru înregistrare
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <User className="inline w-4 h-4 mr-1" />
            Nume Client
          </label>
          <Input
            type="text"
            value={formData.guest_name}
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            placeholder="Ion Popescu"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Opțional - pentru identificare mai ușoară
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Phone className="inline w-4 h-4 mr-1" />
            Număr de Telefon *
          </label>
          <Input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="0712345678"
            className={errors.phone_number ? 'border-red-500' : ''}
            maxLength={10}
            required
          />
          {errors.phone_number && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.phone_number}</span>
            </div>
          )}
        </div>

        {/* Plate Number */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Car className="inline w-4 h-4 mr-1" />
            Număr de Înmatriculare *
          </label>
          <Input
            type="text"
            value={formData.plate_number}
            onChange={(e) => handlePlateChange(e.target.value)}
            placeholder="B-123-ABC sau CT90BTC"
            className={`text-center text-lg tracking-wider ${
              errors.plate_number ? 'border-red-500' : ''
            }`}
            maxLength={10}
            required
          />
          {errors.plate_number && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.plate_number}</span>
            </div>
          )}
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            Data Expirării ITP *
          </label>
          <Input
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        {/* Station */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Building className="inline w-4 h-4 mr-1" />
            Stație ITP *
          </label>
          <select
            value={formData.station_slug}
            onChange={(e) => setFormData({ ...formData, station_slug: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            required
          >
            {stations.map((station) => (
              <option key={station.id} value={station.slug}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        {/* SMS Notifications */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <Checkbox
            id="sms-notifications"
            checked={formData.sms_notifications_enabled}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, sms_notifications_enabled: checked as boolean })
            }
          />
          <label
            htmlFor="sms-notifications"
            className="text-sm cursor-pointer flex-1"
          >
            <span className="font-medium block mb-1">
              Activează notificări SMS
            </span>
            <span className="text-muted-foreground">
              Clientul va primi SMS cu 5 zile înainte de expirare
            </span>
          </label>
        </div>

        {submitError && (
          <div className="flex items-center gap-2 p-4 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{submitError}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Reminder adăugat cu succes!
            </span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12"
          disabled={isSubmitting || !!errors.plate_number || !!errors.phone_number}
        >
          {isSubmitting ? 'Se adaugă...' : 'Adaugă Reminder'}
        </Button>
      </form>
    </div>
  );
}
