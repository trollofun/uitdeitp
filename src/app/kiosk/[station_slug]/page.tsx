'use client';

/**
 * Kiosk Mode - Guest Registration Flow
 *
 * 7-Step Workflow:
 * 1. Idle Screen
 * 2. Name Input
 * 3. Phone Input
 * 4. Plate Number
 * 5. Expiry Date
 * 6. GDPR Consent
 * 7. Success Screen
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { KioskLayout, type StationConfig } from '@/components/kiosk/KioskLayout';
import { StepIndicator } from '@/components/kiosk/StepIndicator';
import {
  validateName,
  validatePhoneNumber,
  validatePlateNumber,
  validateExpiryDate,
  validateConsent,
  normalizePhoneNumber,
  normalizePlateNumber,
  type KioskFormData
} from '@/lib/kiosk/validation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function KioskPage() {
  const params = useParams();
  const stationSlug = params.station_slug as string;

  const [station, setStation] = useState<StationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<KioskFormData>({
    name: '',
    phone: '',
    plateNumber: '',
    expiryDate: null,
    consent: false
  });
  const [errors, setErrors] = useState<Partial<Record<keyof KioskFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch station config
  useEffect(() => {
    async function fetchStation() {
      try {
        const response = await fetch(`/api/kiosk/station/${stationSlug}`);
        if (response.ok) {
          const data = await response.json();
          setStation(data);
        } else {
          console.error('Station not found or kiosk disabled');
        }
      } catch (error) {
        console.error('Failed to fetch station:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStation();
  }, [stationSlug]);

  // Auto-reset after success (30 seconds)
  useEffect(() => {
    if (step === 7) {
      const timer = setTimeout(() => {
        setStep(1);
        setFormData({
          name: '',
          phone: '',
          plateNumber: '',
          expiryDate: null,
          consent: false
        });
        setErrors({});
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleNext = (field: keyof KioskFormData) => {
    // Validate current field
    let validationResult;

    switch (field) {
      case 'name':
        validationResult = validateName(formData.name);
        break;
      case 'phone':
        validationResult = validatePhoneNumber(formData.phone);
        if (validationResult.valid) {
          // Normalize phone to +40 format
          setFormData(prev => ({
            ...prev,
            phone: normalizePhoneNumber(prev.phone)
          }));
        }
        break;
      case 'plateNumber':
        validationResult = validatePlateNumber(formData.plateNumber);
        if (validationResult.valid) {
          // Normalize plate to uppercase with hyphens
          setFormData(prev => ({
            ...prev,
            plateNumber: normalizePlateNumber(prev.plateNumber)
          }));
        }
        break;
      case 'expiryDate':
        validationResult = validateExpiryDate(formData.expiryDate);
        break;
      case 'consent':
        validationResult = validateConsent(formData.consent);
        break;
      default:
        validationResult = { valid: true };
    }

    if (!validationResult.valid) {
      setErrors(prev => ({ ...prev, [field]: validationResult.error }));
      return;
    }

    // Clear error and advance
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    setStep(prev => (prev + 1) as Step);
  };

  const handleSubmit = async () => {
    if (!station) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/kiosk/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: station.id,
          station_slug: stationSlug,
          guest_name: formData.name,
          guest_phone: formData.phone,
          plate_number: formData.plateNumber,
          expiry_date: formData.expiryDate?.toISOString(),
          consent_given: formData.consent
        })
      });

      if (response.ok) {
        setStep(7);
      } else {
        const error = await response.json();
        alert(`Eroare: ${error.message || 'Nu s-a putut salva reminder-ul'}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Eroare de conexiune. Te rugăm să încerci din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Stație ITP Indisponibilă
          </h1>
          <p className="text-gray-600">
            Modul kiosk nu este activat pentru această stație.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = station.primary_color;

  return (
    <KioskLayout station={station} showHeader={step !== 1 && step !== 7}>
      <div className="bg-white rounded-2xl shadow-2xl p-12">
        {step !== 1 && step !== 7 && (
          <StepIndicator
            currentStep={step}
            totalSteps={7}
            primaryColor={primaryColor}
          />
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Idle Screen */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              {station.logo_url && (
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <img
                    src={station.logo_url}
                    alt={station.station_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {station.station_name}
              </h2>

              <p className="text-xl text-gray-600 mb-12">
                Bine ai venit! Setează-ți reminder-ul ITP acum.
              </p>

              <button
                onClick={() => setStep(2)}
                className="w-full py-8 px-12 text-2xl font-semibold text-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                Setează Reminder ITP
              </button>
            </motion.div>
          )}

          {/* Step 2: Name Input */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Cum te numești?
              </h3>

              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleNext('name')}
                placeholder="Numele tău complet"
                className="w-full px-6 py-6 text-2xl border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-opacity-30 mb-4"
                style={{
                  borderColor: errors.name ? '#ef4444' : '#d1d5db',
                  ...(formData.name && !errors.name && { borderColor: primaryColor })
                }}
                autoFocus
              />

              {errors.name && (
                <p className="text-red-600 text-lg mb-4">{errors.name}</p>
              )}

              <button
                onClick={() => handleNext('name')}
                disabled={!formData.name.trim()}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Continuă
              </button>
            </motion.div>
          )}

          {/* Step 3: Phone Input */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Numărul tău de telefon?
              </h3>

              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-gray-500">
                  +40
                </div>
                <input
                  type="tel"
                  value={formData.phone.replace('+40', '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({
                      ...prev,
                      phone: value.startsWith('7') ? value : `7${value}`
                    }));
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext('phone')}
                  placeholder="712345678"
                  className="w-full pl-20 pr-6 py-6 text-2xl border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-opacity-30 mb-4"
                  style={{
                    borderColor: errors.phone ? '#ef4444' : '#d1d5db',
                    ...(formData.phone && !errors.phone && { borderColor: primaryColor })
                  }}
                  maxLength={9}
                  autoFocus
                />
              </div>

              {errors.phone && (
                <p className="text-red-600 text-lg mb-4">{errors.phone}</p>
              )}

              <button
                onClick={() => handleNext('phone')}
                disabled={!formData.phone}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Continuă
              </button>
            </motion.div>
          )}

          {/* Step 4: Plate Number */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Numărul de înmatriculare?
              </h3>

              <input
                type="text"
                value={formData.plateNumber}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setFormData(prev => ({ ...prev, plateNumber: value }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleNext('plateNumber')}
                placeholder="B-123-ABC"
                className="w-full px-6 py-6 text-2xl text-center font-mono border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-opacity-30 mb-4 uppercase"
                style={{
                  borderColor: errors.plateNumber ? '#ef4444' : '#d1d5db',
                  ...(formData.plateNumber && !errors.plateNumber && { borderColor: primaryColor })
                }}
                maxLength={10}
                autoFocus
              />

              <p className="text-gray-600 text-center mb-4">
                Format: XX-XXX-ABC (ex: B-123-ABC, CJ-45-XYZ)
              </p>

              {errors.plateNumber && (
                <p className="text-red-600 text-lg text-center mb-4">{errors.plateNumber}</p>
              )}

              <button
                onClick={() => handleNext('plateNumber')}
                disabled={!formData.plateNumber}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Continuă
              </button>
            </motion.div>
          )}

          {/* Step 5: Expiry Date */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Când expiră ITP-ul?
              </h3>

              <div className="flex justify-center mb-6">
                <Calendar
                  mode="single"
                  selected={formData.expiryDate || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date || null }))}
                  disabled={(date) => date < new Date()}
                  className="rounded-xl border-2 p-4"
                  classNames={{
                    day_selected: 'bg-blue-600 text-white hover:bg-blue-700'
                  }}
                />
              </div>

              {errors.expiryDate && (
                <p className="text-red-600 text-lg text-center mb-4">{errors.expiryDate}</p>
              )}

              <button
                onClick={() => handleNext('expiryDate')}
                disabled={!formData.expiryDate}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Continuă
              </button>
            </motion.div>
          )}

          {/* Step 6: GDPR Consent */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Consimțământ Prelucrare Date
              </h3>

              <div className="bg-gray-50 p-8 rounded-xl mb-8">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="consent"
                    checked={formData.consent}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, consent: checked as boolean }))
                    }
                    className="mt-1 w-6 h-6"
                  />
                  <Label htmlFor="consent" className="text-lg leading-relaxed cursor-pointer">
                    Accept prelucrarea datelor mele personale (nume, telefon, număr auto)
                    în scopul trimiterii de reminder-uri SMS/Email despre expirarea ITP.
                    Datele vor fi stocate securizat conform GDPR și pot fi șterse oricând
                    la cerere.
                  </Label>
                </div>
              </div>

              {errors.consent && (
                <p className="text-red-600 text-lg text-center mb-4">{errors.consent}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!formData.consent || submitting}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-3"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Se salvează...
                  </>
                ) : (
                  'Salvează Reminder-ul'
                )}
              </button>
            </motion.div>
          )}

          {/* Step 7: Success Screen */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle2 className="w-32 h-32 mx-auto mb-6" style={{ color: primaryColor }} />
                </motion.div>

                <h3 className="text-4xl font-bold text-gray-900 mb-4">
                  Reminder Salvat!
                </h3>

                <p className="text-xl text-gray-600 mb-8">
                  Vei primi SMS/Email cu reminder înainte de expirarea ITP.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl mb-8">
                <p className="text-lg text-gray-700 mb-4">
                  Vrei să gestionezi reminder-ele tale online?
                </p>
                <p className="text-gray-600">
                  Creează cont pe <strong>uitdeITP.ro</strong> și ai acces la:
                </p>
                <ul className="text-left text-gray-600 mt-4 space-y-2 max-w-md mx-auto">
                  <li>✓ Dashboard cu toate mașinile tale</li>
                  <li>✓ Istoric ITP și reminder-e multiple</li>
                  <li>✓ Integrare cu Rovinieta și RCA</li>
                </ul>
              </div>

              {station.station_phone && (
                <div className="text-gray-600 mb-8">
                  <p className="text-lg">
                    Întrebări? Sună la: <strong>{station.station_phone}</strong>
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Ecranul se va reseta automat în 30 secunde...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
