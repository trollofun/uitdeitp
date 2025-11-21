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
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
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
  type KioskFormData,
  type ValidationResult
} from '@/lib/kiosk/validation';
import { CheckCircle2, Loader2, Sparkles, Car, ChevronRight, AlertTriangle, ShieldCheck, Lock, BellRing } from 'lucide-react';
import { useParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { ro } from 'date-fns/locale';

// --- ANIMATIONS CONFIG ---
const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? 15 : -15, // 3D effect
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 25,
      mass: 0.5
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
    rotateY: direction < 0 ? 15 : -15,
    transition: { duration: 0.3 }
  })
};

const digitVariants = {
  initial: { y: 20, opacity: 0, scale: 0.5 },
  animate: { y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 500, damping: 15 } },
  exit: { y: -20, opacity: 0, transition: { duration: 0.1 } }
};

// Componentă simplă de fundal animat
const BackgroundMesh = ({ color }: { color: string }) => (
  <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 10, -10, 0],
        opacity: [0.3, 0.5, 0.3]
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      className="absolute -top-[20%] -right-[20%] w-[800px] h-[800px] rounded-full blur-[100px] opacity-30 mix-blend-multiply"
      style={{ backgroundColor: color }}
    />
    <motion.div
      animate={{
        scale: [1, 1.5, 1],
        x: [0, 50, 0],
        opacity: [0.2, 0.4, 0.2]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -bottom-[20%] -left-[20%] w-[600px] h-[600px] rounded-full blur-[80px] opacity-20 bg-blue-300 mix-blend-multiply"
    />
  </div>
);

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function KioskPage() {
  const params = useParams();
  const stationSlug = params.station_slug as string;

  const [station, setStation] = useState<StationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1); // Pentru direcția animației

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

  // Helpers
  const updateActivity = useCallback(() => setLastActivity(Date.now()), []);

  const changeStep = (newStep: Step) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
    updateActivity();
  };

  // Fetch station
  useEffect(() => {
    async function fetchStation() {
      try {
        const response = await fetch(`/api/kiosk/station/${stationSlug}`);
        if (response.ok) {
          const data = await response.json();
          setStation(data);
        }
      } catch (error) {
        console.error('Failed to fetch station:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStation();
  }, [stationSlug]);

  // Auto-reset logic (Simplified)
  useEffect(() => {
    if (step === 7) {
      const timer = setTimeout(() => {
        setStep(1);
        setFormData({ name: '', phone: '', plateNumber: '', expiryDate: null, consent: false });
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Validation & Navigation
  const handleNext = (field: keyof KioskFormData) => {
    let validationResult: ValidationResult = { valid: true };

    switch (field) {
      case 'name': validationResult = validateName(formData.name); break;
      case 'phone':
        validationResult = validatePhoneNumber(formData.phone);
        if (validationResult.valid) setFormData(p => ({...p, phone: normalizePhoneNumber(p.phone)}));
        break;
      case 'plateNumber':
        validationResult = validatePlateNumber(formData.plateNumber);
        if (validationResult.valid) setFormData(p => ({...p, plateNumber: normalizePlateNumber(p.plateNumber)}));
        break;
    }

    if (!validationResult.valid) {
      setErrors(prev => ({ ...prev, [field]: validationResult.error }));
      // Shake animation logic could go here
      return;
    }

    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    changeStep((step + 1) as Step);
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

      if (response.ok) changeStep(7);
      else alert('Eroare la salvare.');
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;
  if (!station) return <div className="min-h-screen flex items-center justify-center">Stație indisponibilă</div>;

  const primaryColor = station.primary_color || '#2563eb';

  return (
    <KioskLayout station={station} showHeader={step !== 1 && step !== 7}>
      {/* Container Principal cu perspectivă pentru efecte 3D */}
      <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 w-full h-[85vh] flex flex-col overflow-hidden border border-white/50">

        <BackgroundMesh color={primaryColor} />

        {step !== 1 && step !== 7 && (
          <div className="mb-6 shrink-0">
            <StepIndicator currentStep={step} totalSteps={7} primaryColor={primaryColor} />
          </div>
        )}

        <div className="flex-1 relative flex flex-col justify-center">
          <AnimatePresence mode="wait" custom={direction} initial={false}>

            {/* Step 1: Idle Screen - Conversion-Optimized with Fear Hook */}
            {step === 1 && (
              <motion.div
                key="step1"
                className="absolute inset-0 z-50 flex items-center justify-center"
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center w-full max-w-3xl mx-auto bg-white rounded-[3rem] shadow-2xl p-8 sm:p-12"
                  onClick={() => changeStep(2)}
                >
                  {/* Fear Hook - Loss Aversion */}
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-5 py-2 rounded-full font-bold text-sm uppercase tracking-wide mb-6 border border-red-100"
                  >
                    <AlertTriangle size={18} /> Risc: Amendă ITP
                  </motion.div>

                  <h1 className="text-4xl sm:text-6xl font-black text-slate-900 mb-4 leading-tight">
                    Nu uita când expiră <br className="hidden sm:block" />
                    <span style={{ color: primaryColor }}>ITP-ul mașinii tale</span>
                  </h1>

                  <p className="text-xl sm:text-2xl text-slate-600 font-medium mb-8">
                    Înscrie-te <strong className="text-slate-900">gratuit</strong> și primești reminder automat prin SMS.
                  </p>

                  {/* Trust Signals - Reduce Friction with Pulsing Animation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: 1
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
                        opacity: { delay: 0.3 }
                      }}
                      className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl"
                    >
                      <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">100% Gratuit</span>
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: 1
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
                        opacity: { delay: 0.4 }
                      }}
                      className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl"
                    >
                      <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">Zero Spam</span>
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: 1
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                        opacity: { delay: 0.5 }
                      }}
                      className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl"
                    >
                      <BellRing className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">1 SMS/an</span>
                    </motion.div>
                  </div>

                  {/* Strong CTA with Pulse Animation */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      scale: [1, 1.02, 1]
                    }}
                    transition={{
                      scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 sm:py-8 rounded-3xl text-2xl sm:text-3xl font-bold shadow-lg transition-all"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                  >
                    Începe Acum
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Name Input */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full max-w-2xl mx-auto text-center"
              >
                <motion.h3
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="text-4xl font-bold text-gray-900 mb-8"
                >
                  Cum te numești?
                </motion.h3>

                <div className="relative mb-8 group">
                  <motion.input
                    type="text"
                    value={formData.name}
                    onChange={(e) => { setFormData(p => ({ ...p, name: e.target.value })); updateActivity(); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext('name')}
                    placeholder="Ion Popescu"
                    autoFocus
                    className="w-full px-8 py-8 text-4xl text-center font-medium border-b-4 bg-gray-50/50 focus:bg-white rounded-t-2xl focus:outline-none transition-all"
                    style={{ borderColor: errors.name ? '#ef4444' : formData.name ? primaryColor : '#e5e7eb' }}
                  />
                  {/* Animated Underline */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-blue-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNext('name')}
                  disabled={!formData.name.trim()}
                  className="px-12 py-6 text-2xl font-bold text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 mx-auto"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuă <ChevronRight size={32} />
                </motion.button>
              </motion.div>
            )}

            {/* Step 3: Phone Input - FIX LAYOUT (md:grid-cols-2) */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center content-center"
              >
                {/* Left: Display */}
                <div className="flex flex-col justify-center space-y-6">
                  <h3 className="text-3xl font-bold text-gray-900">Numărul de telefon?</h3>

                  {/* Anti-Spam Messaging - Build Trust */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Garantăm: <strong>1 singur SMS</strong>, 7 zile înainte de expirare
                    </p>
                  </div>

                  <div className={`
                    relative p-8 rounded-3xl border-2 bg-white/80 backdrop-blur-sm shadow-xl transition-all duration-300
                    ${formData.phone.length >= 12 ? 'border-green-500 ring-4 ring-green-100' : 'border-gray-200'}
                  `}>
                    <div className="flex justify-center items-center gap-1 text-5xl font-mono font-bold tracking-wider h-20">
                      <span className="text-gray-400 select-none">+40</span>

                      {/* Animated Digits */}
                      <LayoutGroup>
                        {formData.phone.replace('+40', '').split('').map((digit, i) => (
                          <motion.span
                            key={i}
                            layoutId={`digit-${i}`}
                            variants={digitVariants}
                            initial="initial"
                            animate="animate"
                            className="text-gray-900"
                          >
                            {digit}
                          </motion.span>
                        ))}
                        {/* Cursor */}
                        <motion.div
                          animate={{ opacity: [1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="w-1 h-12 bg-blue-600 ml-1"
                        />
                      </LayoutGroup>
                    </div>

                    {formData.phone.length >= 12 && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-4 -right-4 bg-white rounded-full">
                         <CheckCircle2 className="w-12 h-12 text-green-500 shadow-lg rounded-full" />
                       </motion.div>
                    )}
                  </div>

                  {errors.phone && <p className="text-red-500 text-lg font-medium animate-pulse">{errors.phone}</p>}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNext('phone')}
                    disabled={formData.phone.length < 12}
                    className="hidden md:block w-full py-6 text-xl font-bold text-white rounded-2xl shadow-md disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Trimite SMS
                  </motion.button>
                </div>

                {/* Right: Numpad (Always visible on side in md+) */}
                <div className="flex justify-center w-full">
                  <div className="bg-gray-100/50 p-6 rounded-[2rem] shadow-inner w-full max-w-[350px]">
                    <Numpad
                      onInput={(d) => {
                        const curr = formData.phone.replace('+40', '');
                        if (curr.length < 9) { setFormData(p => ({ ...p, phone: `+40${curr}${d}` })); updateActivity(); }
                      }}
                      onDelete={() => {
                        const curr = formData.phone.replace('+40', '');
                        if (curr.length > 0) { setFormData(p => ({ ...p, phone: `+40${curr.slice(0, -1)}` })); updateActivity(); }
                      }}
                    />
                  </div>
                </div>

                {/* Mobile-only button */}
                <button className="md:hidden w-full py-4 bg-blue-600 text-white font-bold rounded-xl mt-4">Continuă</button>
              </motion.div>
            )}

            {/* Step 4: Verification */}
            {step === 4 && (
              <motion.div key="step4" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
                <PhoneVerificationStep
                  phone={formData.phone.replace('+40', '0')}
                  stationSlug={stationSlug}
                  onVerified={(phone, consent) => {
                    const e164 = phone.startsWith('0') ? `+40${phone.substring(1)}` : `+40${phone}`;
                    setFormData(p => ({ ...p, phone: e164, consent }));
                    setPhoneVerified(true); changeStep(5);
                  }}
                  onBack={() => changeStep(3)}
                />
              </motion.div>
            )}

            {/* Step 5: Plate Number - Shiny Plate Effect */}
            {step === 5 && (
              <motion.div
                key="step5"
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center justify-center h-full space-y-8"
              >
                <h3 className="text-3xl font-bold text-gray-900">Numărul de înmatriculare?</h3>

                {/* Realistic Plate with Shimmer */}
                <div className="relative group">
                    <motion.div
                      className="relative flex items-center w-[340px] sm:w-[500px] h-[110px] bg-white border-[6px] border-black rounded-lg overflow-hidden shadow-2xl"
                      whileHover={{ scale: 1.02 }}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full -skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite]" />

                        <div className="w-20 h-full bg-[#003399] flex flex-col items-center justify-center text-white border-r-2 border-white z-10">
                            <div className="grid grid-cols-6 gap-0.5 mb-2 w-10">{[...Array(12)].map((_,i)=><div key={i} className="w-1 h-1 bg-yellow-400 rounded-full"/>)}</div>
                            <span className="font-bold text-2xl">RO</span>
                        </div>

                        <div className="flex-1 flex justify-center items-center z-10">
                            <span className="text-5xl sm:text-6xl font-mono font-bold tracking-[0.2em] uppercase text-gray-900">
                                {formData.plateNumber || <span className="opacity-20">B12ABC</span>}
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Custom Keyboard Overlay */}
                <div className="w-full max-w-3xl bg-gray-100/80 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/50">
                  <PlateKeyboard
                    onInput={(k) => {
                      if (formData.plateNumber.length < 15) {
                        setFormData(p => ({ ...p, plateNumber: (p.plateNumber + k).toUpperCase() }));
                        updateActivity();
                      }
                    }}
                    onDelete={() => {
                      setFormData(p => ({ ...p, plateNumber: p.plateNumber.slice(0, -1) }));
                      updateActivity();
                    }}
                  />
                </div>

                <motion.button
                   whileTap={{ scale: 0.95 }}
                   onClick={() => handleNext('plateNumber')}
                   disabled={!formData.plateNumber}
                   className="px-16 py-4 text-xl font-bold text-white rounded-full shadow-lg transition-all disabled:opacity-50"
                   style={{ backgroundColor: primaryColor }}
                >
                  Confirmă
                </motion.button>
              </motion.div>
            )}

            {/* Step 6: Calendar - Scaled & Friendly */}
            {step === 6 && (
              <motion.div
                key="step6"
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              >
                 <div className="space-y-6 text-center md:text-left pl-4">
                    <h3 className="text-4xl font-bold text-gray-900">Când expiră?</h3>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm inline-block min-w-[250px]">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Data Selectată</p>
                        <p className="text-4xl font-bold text-blue-900 mt-2">
                          {formData.expiryDate ? format(formData.expiryDate, 'dd MMMM yyyy', { locale: ro }) : '---'}
                        </p>
                    </div>

                    {/* Reminder Preview - Immediate Reward Visualization */}
                    {formData.expiryDate && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-2xl border-2 border-green-200 shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <BellRing className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-bold text-green-900 text-lg">Vei primi SMS pe:</p>
                            <p className="text-2xl font-black text-green-700 mt-1">
                              {format(subDays(formData.expiryDate, 7), 'dd MMMM yyyy', { locale: ro })}
                            </p>
                            <p className="text-sm text-green-700 mt-2">
                              (cu 7 zile înainte de expirare)
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSubmit}
                          disabled={!formData.expiryDate || submitting}
                          className="w-full md:w-auto px-12 py-6 text-xl font-bold text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {submitting ? <Loader2 className="animate-spin" /> : 'Finalizează'}
                        </motion.button>
                    </div>
                 </div>

                 <div className="flex justify-center w-full">
                    <div className="w-full max-w-md bg-white p-4 rounded-3xl shadow-2xl border-2 border-gray-300 scale-90 md:scale-100">
                        <Calendar
                            mode="single"
                            selected={formData.expiryDate || undefined}
                            onSelect={(d) => { setFormData(p => ({...p, expiryDate: d || null})); updateActivity(); }}
                            disabled={(d) => d < new Date()}
                            captionLayout="dropdown-buttons"
                            fromYear={2025}
                            toYear={2030}
                            className="p-2 rounded-2xl"
                            classNames={{
                                day_selected: "bg-blue-600 text-white font-bold border-2 border-blue-800 rounded-lg hover:bg-blue-700 scale-105 shadow-md transition-all duration-200",
                                day: "h-14 w-14 p-0 font-semibold text-lg rounded-md border border-gray-300 hover:bg-gray-100 aria-selected:opacity-100",
                                day_today: "bg-blue-50 font-bold border-2 border-blue-400",
                                head_cell: "text-gray-500 w-14 font-semibold",
                                caption: "mb-4",
                                caption_label: "text-xl font-bold text-gray-800",
                                caption_dropdowns: "flex gap-3 justify-center",
                                dropdown: "px-4 py-3 text-lg font-semibold border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer",
                                nav_button: "h-12 w-12 border-2 border-gray-300 rounded-lg hover:bg-gray-100"
                            }}
                        />
                    </div>
                 </div>
              </motion.div>
            )}

            {/* Step 7: Success - Confetti & Stamp */}
            {step === 7 && (
              <motion.div
                key="step7"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                {/* CSS-based Confetti Particles (Simplificat, fără librărie externă) */}
                {[...Array(12)].map((_, i) => (
                   <motion.div
                     key={i}
                     initial={{ x: 0, y: 0, opacity: 1 }}
                     animate={{
                        x: (Math.random() - 0.5) * 600,
                        y: (Math.random() - 0.5) * 600,
                        opacity: 0,
                        rotate: Math.random() * 360
                     }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className="absolute w-3 h-3 rounded-sm"
                     style={{
                        backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 4],
                        top: '50%', left: '50%'
                     }}
                   />
                ))}

                <motion.div
                    initial={{ scale: 3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="mb-8"
                >
                    <div className="w-40 h-40 bg-green-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50">
                        <CheckCircle2 className="w-24 h-24 text-green-600" />
                    </div>
                </motion.div>

                <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tight">Gata!</h1>
                <p className="text-2xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                   Reminder-ul a fost setat cu succes. Vei primi o notificare înainte de expirare.
                </p>

                {/* Pro Tip - Additional Value */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg max-w-md mx-auto"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="text-left">
                      <p className="font-bold text-blue-900 text-lg mb-2">💡 Pro Tip:</p>
                      <p className="text-blue-800 text-base">
                        Creează un cont gratuit pentru a gestiona toate reminder-ele tale (ITP, RCA, Rovinieta) dintr-un singur loc!
                      </p>
                    </div>
                  </div>
                </motion.div>

                <div className="mt-12 w-64 h-2 bg-gray-100 rounded-full overflow-hidden mx-auto">
                    <motion.div
                        className="h-full bg-green-500"
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 30, ease: "linear" }}
                    />
                </div>
                <p className="text-sm text-gray-400 mt-2">Resetare automată...</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </KioskLayout>
  );
}
