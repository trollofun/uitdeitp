'use client';

/**
 * Kiosk Mode - Guest Registration Flow
 *
 * 7-Step Workflow (Simplified per Gestalt Pragnanz Law):
 * 1. Idle Screen
 * 2. Name Input
 * 3. Phone Input
 * 4. Phone Verification (SMS Code + GDPR Consent)
 * 5. Plate Number
 * 6. Expiry Date
 * 7. Success Screen
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { KioskLayout, type StationConfig } from '@/components/kiosk/KioskLayout';
import { StepIndicator } from '@/components/kiosk/StepIndicator';
import KioskIdleState from '@/components/kiosk/KioskIdleState';
import { PhoneVerificationStep } from '@/components/kiosk/PhoneVerificationStep';
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
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Activity tracking callback
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

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
        setPhoneVerified(false);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // Inactivity timeout - auto-reset to idle if no activity
  useEffect(() => {
    // Only monitor steps 2-6 (not idle state or success screen)
    if (step >= 2 && step <= 6) {
      const checkInactivity = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivity;

        // Extended timeout for Step 4 (phone verification - waiting for SMS)
        // Standard timeout for other steps
        const IDLE_TIMEOUT_VERIFICATION = 300000; // 5 minutes (300 seconds) for SMS wait
        const IDLE_TIMEOUT_DEFAULT = 30000; // 30 seconds for other steps

        const timeout = step === 4 ? IDLE_TIMEOUT_VERIFICATION : IDLE_TIMEOUT_DEFAULT;

        if (timeSinceLastActivity >= timeout) {
          // Reset to idle state
          console.log(`[Kiosk] Idle timeout reached on step ${step} (${timeout}ms)`);
          setStep(1);
          setFormData({
            name: '',
            phone: '',
            plateNumber: '',
            expiryDate: null,
            consent: false
          });
          setErrors({});
          setPhoneVerified(false);
        }
      }, 1000); // Check every second

      return () => clearInterval(checkInactivity);
    }
  }, [step, lastActivity]);

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
            <div key="step1" className="fixed inset-0 z-50">
              <KioskIdleState onStart={() => setStep(2)} />
            </div>
          )}

          {/* Step 2: Name Input */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.h3
                className="text-3xl font-bold text-gray-900 mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Cum te numești?
              </motion.h3>

              <div className="relative mb-4">
                <motion.input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    updateActivity();
                  }}
                  onKeyDown={(e) => {
                    updateActivity();
                    if (e.key === 'Enter') handleNext('name');
                  }}
                  onFocus={updateActivity}
                  placeholder="Numele tău complet"
                  className="w-full px-6 py-6 text-2xl border-2 rounded-xl focus:outline-none transition-all"
                  style={{
                    borderColor: errors.name ? '#ef4444' : formData.name && !errors.name ? primaryColor : '#d1d5db',
                  }}
                  whileFocus={{
                    scale: 1.02,
                    boxShadow: `0 0 0 4px ${primaryColor}20`
                  }}
                  transition={{ duration: 0.2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  autoFocus
                />
                {formData.name && !errors.name && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </motion.div>
                )}
              </div>

              {errors.name && (
                <motion.p
                  initial={{ x: 0 }}
                  animate={{ x: [-10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-red-600 text-lg mb-4"
                >
                  {errors.name}
                </motion.p>
              )}

              <motion.button
                onClick={() => {
                  updateActivity();
                  handleNext('name');
                }}
                disabled={!formData.name.trim()}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: primaryColor }}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Continuă →
              </motion.button>
            </motion.div>
          )}

          {/* Step 3: Phone Input */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.h3
                className="text-3xl font-bold text-gray-900 mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Numărul tău de telefon?
              </motion.h3>

              <div className="relative mb-4">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-gray-500 pointer-events-none">
                  +40
                </div>
                <motion.input
                  type="tel"
                  value={formData.phone.replace('+40', '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({
                      ...prev,
                      phone: value.startsWith('7') ? `+40${value}` : value ? `+407${value}` : ''
                    }));
                    updateActivity();
                  }}
                  onKeyDown={(e) => {
                    updateActivity();
                    if (e.key === 'Enter') handleNext('phone');
                  }}
                  onFocus={updateActivity}
                  placeholder="712345678"
                  className="w-full pl-20 pr-16 py-6 text-2xl border-2 rounded-xl focus:outline-none transition-all"
                  style={{
                    borderColor: errors.phone ? '#ef4444' : formData.phone && !errors.phone ? primaryColor : '#d1d5db',
                  }}
                  whileFocus={{
                    scale: 1.02,
                    boxShadow: `0 0 0 4px ${primaryColor}20`
                  }}
                  transition={{ duration: 0.2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  maxLength={9}
                  autoFocus
                />
                {formData.phone && !errors.phone && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </motion.div>
                )}
              </div>

              {errors.phone && (
                <motion.p
                  initial={{ x: 0 }}
                  animate={{ x: [-10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-red-600 text-lg mb-4"
                >
                  {errors.phone}
                </motion.p>
              )}

              <motion.button
                onClick={() => {
                  updateActivity();
                  handleNext('phone');
                }}
                disabled={!formData.phone}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: primaryColor }}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Continuă →
              </motion.button>
            </motion.div>
          )}

          {/* Step 4: Phone Verification + GDPR Consent */}
          {step === 4 && (
            <div key="step4" className="h-full">
              <PhoneVerificationStep
                stationSlug={stationSlug}
                onVerified={(verifiedPhone, consent) => {
                  setFormData(prev => ({ ...prev, phone: verifiedPhone, consent }));
                  setPhoneVerified(true);
                  updateActivity();
                  setStep(5);
                }}
                onBack={() => {
                  setStep(3);
                  updateActivity();
                }}
              />
            </div>
          )}

          {/* Step 5: Plate Number */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.h3
                className="text-3xl font-bold text-gray-900 mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Numărul de înmatriculare?
              </motion.h3>

              <div className="relative mb-4">
                <motion.input
                  type="text"
                  value={formData.plateNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setFormData(prev => ({ ...prev, plateNumber: value }));
                    updateActivity();
                  }}
                  onKeyDown={(e) => {
                    updateActivity();
                    if (e.key === 'Enter') handleNext('plateNumber');
                  }}
                  onFocus={updateActivity}
                  placeholder="B123ABC sau B-123-ABC"
                  className="w-full px-6 py-6 text-2xl text-center font-mono border-2 rounded-xl focus:outline-none transition-all uppercase"
                  style={{
                    borderColor: errors.plateNumber ? '#ef4444' : formData.plateNumber && !errors.plateNumber ? primaryColor : '#d1d5db',
                  }}
                  whileFocus={{
                    scale: 1.02,
                    boxShadow: `0 0 0 4px ${primaryColor}20`
                  }}
                  transition={{ duration: 0.2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  maxLength={15}
                  autoFocus
                />
                {formData.plateNumber && !errors.plateNumber && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </motion.div>
                )}
              </div>

              <motion.p
                className="text-gray-600 text-center mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Scrie în orice format: B123ABC, B-123-ABC sau B 123 ABC
              </motion.p>

              {errors.plateNumber && (
                <motion.p
                  initial={{ x: 0 }}
                  animate={{ x: [-10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-red-600 text-lg text-center mb-4"
                >
                  {errors.plateNumber}
                </motion.p>
              )}

              <motion.button
                onClick={() => {
                  updateActivity();
                  handleNext('plateNumber');
                }}
                disabled={!formData.plateNumber}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: primaryColor }}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Continuă →
              </motion.button>
            </motion.div>
          )}

          {/* Step 6: Expiry Date */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.h3
                className="text-3xl font-bold text-gray-900 mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Când expiră ITP-ul?
              </motion.h3>

              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                onClick={updateActivity}
              >
                <Calendar
                  mode="single"
                  selected={formData.expiryDate || undefined}
                  onSelect={(date) => {
                    setFormData(prev => ({ ...prev, expiryDate: date || null }));
                    updateActivity();
                  }}
                  disabled={(date) => date < new Date()}
                  className="rounded-xl border-2 p-4"
                  classNames={{
                    day_selected: 'bg-blue-600 text-white hover:bg-blue-700'
                  }}
                />
              </motion.div>

              {errors.expiryDate && (
                <motion.p
                  initial={{ x: 0 }}
                  animate={{ x: [-10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-red-600 text-lg text-center mb-4"
                >
                  {errors.expiryDate}
                </motion.p>
              )}

              <motion.button
                onClick={() => {
                  updateActivity();
                  handleSubmit();
                }}
                disabled={!formData.expiryDate || submitting}
                className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                style={{ backgroundColor: primaryColor }}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Se salvează...</span>
                  </>
                ) : (
                  'Salvează Reminder-ul ✓'
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Step 7: Success Screen */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-center"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 260,
                    damping: 20
                  }}
                >
                  <CheckCircle2 className="w-40 h-40 mx-auto mb-6" style={{ color: primaryColor }} />
                </motion.div>

                <motion.h3
                  className="text-5xl font-bold text-gray-900 mb-4"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  🎉 Reminder Salvat!
                </motion.h3>

                <motion.p
                  className="text-2xl text-gray-600 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Vei primi SMS/Email cu reminder înainte de expirarea ITP.
                </motion.p>
              </div>

              <motion.div
                className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-8 rounded-2xl mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-xl text-gray-700 mb-4 font-semibold">
                  Vrei să gestionezi reminder-ele tale online?
                </p>
                <p className="text-gray-600 mb-4">
                  Creează cont pe <strong className="text-blue-600">uitdeITP.ro</strong> și ai acces la:
                </p>
                <motion.ul
                  className="text-left text-gray-600 space-y-3 max-w-md mx-auto"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.7
                      }
                    }
                  }}
                >
                  {['Dashboard cu toate mașinile tale', 'Istoric ITP și reminder-e multiple', 'Integrare cu Rovinieta și RCA'].map((item, i) => (
                    <motion.li
                      key={i}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      className="flex items-center gap-2"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className="text-green-500 text-xl"
                      >
                        ✓
                      </motion.span>
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>

              {station.station_phone && (
                <motion.div
                  className="text-gray-600 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <p className="text-xl">
                    Întrebări? Sună la: <strong className="text-blue-600">{station.station_phone}</strong>
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                <p className="text-sm text-gray-500 mb-3">
                  Resetare automată în 30 secunde...
                </p>
                <div className="w-full max-w-md mx-auto h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: primaryColor }}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 30, ease: "linear" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
