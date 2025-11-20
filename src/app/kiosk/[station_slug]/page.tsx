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
import { Numpad } from '@/components/kiosk/Numpad';
import { PlateKeyboard } from '@/components/kiosk/PlateKeyboard';
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
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

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
        const IDLE_TIMEOUT_VERIFICATION = 600000; // 10 minutes (600 seconds) - matches SMS expiry
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

          {/* Step 3: Phone Input - iPad Split Layout with Custom Numpad */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: '100%', scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: '-100%', scale: 0.95, filter: 'blur(10px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              {/* Left Column: Display */}
              <div className="space-y-6">
                <motion.h3
                  className="text-3xl lg:text-4xl font-bold text-gray-900 text-center lg:text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Numărul tău de telefon?
                </motion.h3>

                <motion.div
                  className="relative bg-gradient-to-br from-white to-gray-50/50 backdrop-blur border-2 rounded-2xl p-8 shadow-lg"
                  style={{
                    borderColor: errors.phone ? '#ef4444' : formData.phone.length >= 12 ? primaryColor : '#e5e7eb',
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-5xl lg:text-6xl font-mono text-center tracking-wider">
                    <span className="text-gray-500">+40</span>
                    <span className="ml-2 text-gray-900">
                      {formData.phone.replace('+40', '') || '---'}
                    </span>
                  </div>

                  {formData.phone.length >= 12 && !errors.phone && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-3 -right-3"
                    >
                      <CheckCircle2 className="w-12 h-12 text-green-500 bg-white rounded-full" />
                    </motion.div>
                  )}
                </motion.div>

                {errors.phone && (
                  <motion.p
                    initial={{ x: 0 }}
                    animate={{ x: [-10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                    className="text-red-600 text-lg text-center lg:text-left"
                  >
                    {errors.phone}
                  </motion.p>
                )}

                <motion.button
                  onClick={() => {
                    updateActivity();
                    handleNext('phone');
                  }}
                  disabled={formData.phone.length < 12}
                  className="w-full py-6 text-xl font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ backgroundColor: primaryColor }}
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Continuă →
                </motion.button>
              </div>

              {/* Right Column: Custom Numpad */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={updateActivity}
              >
                <Numpad
                  onInput={(digit) => {
                    const currentDigits = formData.phone.replace('+40', '');
                    if (currentDigits.length < 9) {
                      const newPhone = `+40${currentDigits}${digit}`;
                      setFormData(prev => ({ ...prev, phone: newPhone }));
                      updateActivity();
                    }
                  }}
                  onDelete={() => {
                    const currentDigits = formData.phone.replace('+40', '');
                    if (currentDigits.length > 0) {
                      const newPhone = `+40${currentDigits.slice(0, -1)}`;
                      setFormData(prev => ({ ...prev, phone: newPhone }));
                      updateActivity();
                    }
                  }}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Step 4: Phone Verification + GDPR Consent */}
          {step === 4 && (
            <div key="step4" className="h-full">
              <PhoneVerificationStep
                phone={formData.phone.replace('+40', '0')}
                stationSlug={stationSlug}
                onVerified={(phone, consent) => {
                  // Convert back to E.164 format for storage
                  const e164Phone = phone.startsWith('0') ? `+40${phone.substring(1)}` : `+40${phone}`;
                  setFormData(prev => ({ ...prev, phone: e164Phone, consent }));
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

          {/* Step 5: Plate Number - Euroband Visual + Custom Keyboard */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: '100%', scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: '-100%', scale: 0.95, filter: 'blur(10px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <motion.h3
                className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Numărul de înmatriculare?
              </motion.h3>

              {/* Euroband License Plate Visual */}
              <motion.div
                className="flex items-center justify-center bg-white border-4 border-black rounded-lg overflow-hidden shadow-2xl max-w-[600px] mx-auto"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                style={{ height: '140px' }}
              >
                {/* EU Blue Band */}
                <div className="w-20 h-full bg-[#003399] flex flex-col items-center justify-center text-white">
                  <div className="text-xs mb-1">⭐⭐⭐</div>
                  <div className="text-xs mb-1">⭐ ⭐</div>
                  <div className="text-xs mb-1">⭐⭐⭐</div>
                  <div className="text-xs mb-1">⭐ ⭐</div>
                  <div className="text-xs mb-2">⭐⭐⭐</div>
                  <div className="font-bold text-lg">RO</div>
                </div>

                {/* Plate Number Display */}
                <div className="flex-1 flex items-center justify-center bg-white px-6">
                  <span className="text-6xl lg:text-7xl font-mono font-black tracking-wider uppercase text-gray-900">
                    {formData.plateNumber || 'B12ABC'}
                  </span>
                </div>

                {formData.plateNumber && !errors.plateNumber && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-4 -right-4"
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-500 bg-white rounded-full shadow-lg" />
                  </motion.div>
                )}
              </motion.div>

              {errors.plateNumber && (
                <motion.p
                  initial={{ x: 0 }}
                  animate={{ x: [-10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-red-600 text-lg text-center"
                >
                  {errors.plateNumber}
                </motion.p>
              )}

              {/* Custom QWERTY Keyboard */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={updateActivity}
              >
                <PlateKeyboard
                  onInput={(key) => {
                    if (formData.plateNumber.length < 15) {
                      const newPlate = (formData.plateNumber + key).toUpperCase();
                      setFormData(prev => ({ ...prev, plateNumber: newPlate }));
                      updateActivity();
                    }
                  }}
                  onDelete={() => {
                    if (formData.plateNumber.length > 0) {
                      const newPlate = formData.plateNumber.slice(0, -1);
                      setFormData(prev => ({ ...prev, plateNumber: newPlate }));
                      updateActivity();
                    }
                  }}
                />
              </motion.div>

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
                transition={{ delay: 0.4 }}
              >
                Continuă →
              </motion.button>
            </motion.div>
          )}

          {/* Step 6: Expiry Date - iPad Split Layout with Enhanced Calendar */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: '100%', scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: '-100%', scale: 0.95, filter: 'blur(10px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              {/* Left Column: Selected Date Display */}
              <div className="space-y-6">
                <motion.h3
                  className="text-3xl lg:text-4xl font-bold text-gray-900 text-center lg:text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Când expiră ITP-ul?
                </motion.h3>

                <motion.div
                  className="relative bg-gradient-to-br from-white to-blue-50/30 backdrop-blur border-2 rounded-2xl p-10 shadow-lg"
                  style={{
                    borderColor: errors.expiryDate ? '#ef4444' : formData.expiryDate ? primaryColor : '#e5e7eb',
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {formData.expiryDate ? (
                    <>
                      <div className="text-center">
                        <div className="text-6xl lg:text-7xl font-bold text-gray-900 mb-2">
                          {format(formData.expiryDate, 'dd', { locale: ro })}
                        </div>
                        <div className="text-2xl lg:text-3xl text-gray-600 mb-1">
                          {format(formData.expiryDate, 'MMMM', { locale: ro })}
                        </div>
                        <div className="text-xl lg:text-2xl text-gray-500">
                          {format(formData.expiryDate, 'yyyy', { locale: ro })}
                        </div>
                      </div>
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-3 -right-3"
                      >
                        <CheckCircle2 className="w-12 h-12 text-green-500 bg-white rounded-full" />
                      </motion.div>
                    </>
                  ) : (
                    <div className="text-center text-gray-400 text-3xl py-8">
                      Selectează data →
                    </div>
                  )}
                </motion.div>

                {errors.expiryDate && (
                  <motion.p
                    initial={{ x: 0 }}
                    animate={{ x: [-10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                    className="text-red-600 text-lg text-center lg:text-left"
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
                  transition={{ delay: 0.3 }}
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
              </div>

              {/* Right Column: Enhanced Calendar */}
              <motion.div
                className="flex justify-center"
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
                  className="rounded-2xl border-2 p-6 bg-white shadow-lg scale-110"
                  classNames={{
                    months: 'space-y-4',
                    month: 'space-y-4',
                    caption: 'flex justify-center pt-1 relative items-center text-xl font-semibold',
                    caption_label: 'text-2xl font-bold',
                    nav: 'space-x-1 flex items-center',
                    nav_button: 'h-12 w-12 bg-transparent hover:bg-gray-100 p-0 rounded-lg transition-colors',
                    nav_button_previous: 'absolute left-1',
                    nav_button_next: 'absolute right-1',
                    table: 'w-full border-collapse space-y-1',
                    head_row: 'flex',
                    head_cell: 'text-gray-500 rounded-md w-14 font-semibold text-lg',
                    row: 'flex w-full mt-2',
                    cell: 'h-14 w-14 text-center text-xl p-0 relative',
                    day: 'h-14 w-14 p-0 font-semibold rounded-xl hover:bg-gray-100 transition-all',
                    day_selected: `bg-blue-600 text-white hover:bg-blue-700 scale-110 shadow-lg`,
                    day_today: 'bg-gray-100 text-gray-900 font-bold',
                    day_outside: 'text-gray-300 opacity-50',
                    day_disabled: 'text-gray-300 opacity-30 cursor-not-allowed',
                    day_hidden: 'invisible',
                  }}
                />
              </motion.div>
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
