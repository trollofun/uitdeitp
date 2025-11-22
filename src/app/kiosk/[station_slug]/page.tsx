'use client';

/**
 * Kiosk Mode - Motion 3D Ultimate Edition
 *
 * Integrated features:
 * - 3D page transitions with rotateY perspective
 * - Animated numpad with spring physics
 * - Plate shimmer effect
 * - Atmospheric background mesh
 * - Dancing digits with LayoutGroup
 * - Phone verification (preserved from original)
 * - Station branding (preserved from original)
 * - Calendar responsive (no overflow)
 * - Numpad h-24 fix (mobile-friendly)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { SimpleDatePicker } from '@/components/kiosk/SimpleDatePicker';
import { KioskLayout, type StationConfig } from '@/components/kiosk/KioskLayout';
import { StepIndicator } from '@/components/kiosk/StepIndicator';
import { PhoneVerificationStep } from '@/components/kiosk/PhoneVerificationStep';
import KioskIdleState from '@/components/kiosk/KioskIdleState';
import {
  validateName,
  validatePhoneNumber,
  validatePlateNumber,
  normalizePhoneNumber,
  normalizePlateNumber,
  type KioskFormData,
  type ValidationResult
} from '@/lib/kiosk/validation';
import {
  CheckCircle2, Loader2, AlertTriangle,
  Lock, ChevronRight, ShieldCheck, Sparkles, BellRing, Zap
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { ro } from 'date-fns/locale';

// --- INLINE COMPONENTS (Motion 3D Style) ---

// Tastatura Numerică (h-24 fix aplicat)
const ResponsiveNumpad = ({ onInput, onDelete }: { onInput: (v: string) => void, onDelete: () => void }) => (
  <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-[400px] mx-auto select-none">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
      <motion.button
        key={num}
        whileTap={{ scale: 0.9, backgroundColor: "#e2e8f0" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: num * 0.03 }}
        onClick={() => onInput(num.toString())}
        className="h-20 sm:h-24 text-3xl sm:text-4xl font-bold bg-white rounded-xl sm:rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.05)] border border-slate-200 text-slate-800 active:shadow-none active:translate-y-1 transition-all"
      >
        {num}
      </motion.button>
    ))}
    <div className="h-20 sm:h-24" />
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onInput('0')}
      className="h-20 sm:h-24 text-3xl sm:text-4xl font-bold bg-white rounded-xl sm:rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.05)] border border-slate-200 text-slate-800 active:shadow-none active:translate-y-1 transition-all"
    >
      0
    </motion.button>
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onDelete}
      className="h-20 sm:h-24 flex items-center justify-center bg-red-50 rounded-xl sm:rounded-2xl shadow-[0_4px_0_0_#fee2e2] border border-red-100 text-red-500 active:shadow-none active:translate-y-1 transition-all text-2xl sm:text-3xl"
    >
      ⌫
    </motion.button>
  </div>
);

// Tastatura QWERTY (Optimizată pt Plate Number)
const ResponsivePlateKeyboard = ({ onInput, onDelete }: { onInput: (v: string) => void, onDelete: () => void }) => {
  const rows = [['1','2','3','4','5','6','7','8','9','0'], ['Q','W','E','R','T','Y','U','I','O','P'], ['A','S','D','F','G','H','J','K','L'], ['Z','X','C','V','B','N','M']];
  return (
    <div className="flex flex-col gap-1.5 sm:gap-2 w-full select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
          {row.map((k) => (
            <motion.button
              key={k}
              whileTap={{ scale: 0.85, backgroundColor: "#cbd5e1" }}
              onClick={() => onInput(k)}
              className="w-8 h-12 sm:w-12 sm:h-16 text-lg sm:text-2xl font-bold bg-white rounded-lg sm:rounded-xl shadow-sm border-b-2 sm:border-b-4 border-slate-200 text-slate-900 active:border-b-0 active:translate-y-[2px] sm:active:translate-y-[4px]"
            >
              {k}
            </motion.button>
          ))}
        </div>
      ))}
      <div className="flex justify-center mt-3">
         <motion.button
           whileTap={{ scale: 0.95 }}
           onClick={onDelete}
           className="px-8 sm:px-10 py-3 bg-red-100 text-red-600 rounded-xl font-bold text-sm sm:text-lg uppercase tracking-wider shadow-sm"
         >
            ȘTERGE
         </motion.button>
      </div>
    </div>
  );
};

// --- ANIMATIONS CONFIG (3D WOW EFFECT) ---

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8,
    rotateY: direction > 0 ? 25 : -25,
    z: -500
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    z: 0,
    transition: {
      type: "spring" as const,
      stiffness: 180,
      damping: 20,
      mass: 0.7
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8,
    rotateY: direction < 0 ? 25 : -25,
    transition: { duration: 0.4 }
  })
};

// Enhanced slide transition variants with 3D depth
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? 15 : -15,
    z: -200
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    z: 0,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 },
      rotateY: { duration: 0.4 },
      z: { duration: 0.4 }
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.9,
    rotateY: direction < 0 ? 15 : -15,
    z: -200,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 },
      rotateY: { duration: 0.4 },
      z: { duration: 0.4 }
    }
  })
};

// --- IDLE SLIDER MESSAGES (Attractor Screen) ---
const IDLE_SLIDES = [
  {
    id: 1,
    icon: AlertTriangle,
    iconSize: 48,
    badge: "Atenție: Amenzi ITP Mărite",
    badgeColor: "bg-red-100 text-red-700",
    title: <>Nu lăsa statul să-ți ia <br/><span className="text-red-600 underline decoration-red-200">3.000 LEI</span></>,
    desc: "Înscrie-te la alertă și scapă de griji.",
    buttonText: "Vreau Protecție Gratuită",
    color: "from-red-50 to-white"
  },
  {
    id: 2,
    icon: Zap,
    iconSize: 48,
    badge: "Rapid & Ușor",
    badgeColor: "bg-yellow-100 text-yellow-700",
    title: <>Gata în doar <br/><span className="text-yellow-600">30 de Secunde</span></>,
    desc: "Fără conturi. Fără parole. Doar numărul tău.",
    buttonText: "Start Rapid",
    color: "from-yellow-50 to-white"
  },
  {
    id: 3,
    icon: ShieldCheck,
    iconSize: 48,
    badge: "100% Gratuit & Sigur",
    badgeColor: "bg-blue-100 text-blue-700",
    title: <>Un singur <br/><span className="text-blue-600">SMS pe an</span></>,
    desc: "Zero Spam. Datele tale sunt în siguranță.",
    buttonText: "Activează Gratuit",
    color: "from-blue-50 to-white"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300 } }
};

// Atmospheric Background Mesh
const BackgroundMesh = ({ color }: { color: string }) => (
  <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 10, -10, 0],
        opacity: [0.2, 0.4, 0.2]
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      className="absolute -top-[20%] -right-[20%] w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-multiply"
      style={{ backgroundColor: color }}
    />
    <motion.div
      animate={{
        scale: [1, 1.5, 1],
        x: [0, 50, 0],
        opacity: [0.1, 0.3, 0.1]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -bottom-[20%] -left-[20%] w-[600px] h-[600px] rounded-full blur-[100px] bg-indigo-200 mix-blend-multiply"
    />
  </div>
);

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function KioskPage() {
  const params = useParams();
  const stationSlug = params.station_slug as string;

  // STATE
  const [station, setStation] = useState<StationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState(1);
  const [formData, setFormData] = useState<KioskFormData>({
    name: '',
    phone: '',
    plateNumber: '',
    expiryDate: null,
    consent: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastActivity, setLastActivity] = useState(0); // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0); // For idle slider rotation

  const updateActivity = useCallback(() => setLastActivity(Date.now()), []);

  // Initialize after mount
  useEffect(() => {
    setMounted(true);
    setLastActivity(Date.now());
  }, []);

  // FETCH STATION
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

  // AUTO-RESET
  useEffect(() => {
    if (step === 7) {
      const timer = setTimeout(() => {
        setStep(1);
        setFormData({ name: '', phone: '', plateNumber: '', expiryDate: null, consent: false });
      }, 30000);
      return () => clearTimeout(timer);
    }

    // Inactivity timeout (steps 2-6 only)
    if (step > 1 && step < 7) {
      const timer = setInterval(() => {
        if (Date.now() - lastActivity > (step === 4 ? 600000 : 45000)) {
          setStep(1);
          setFormData({ name: '', phone: '', plateNumber: '', expiryDate: null, consent: false });
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, lastActivity]);

  // IDLE SLIDER AUTO-ROTATION (8 seconds)
  useEffect(() => {
    if (step !== 1) return;

    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % IDLE_SLIDES.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [step]);

  // NAVIGATION
  const nextStep = () => {
    setDir(1);
    setStep(s => (s + 1) as Step);
    updateActivity();
  };

  const prevStep = () => {
    setDir(-1);
    setStep(s => (s - 1) as Step);
    updateActivity();
  };

  const handleNameChange = (val: string) => {
    setFormData({...formData, name: val.replace(/\b\w/g, l => l.toUpperCase())});
    updateActivity();
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
        setDir(1);
        setStep(7);
      }
    } catch (e) {
      console.error(e);
    }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 w-12 h-12"/>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Stație indisponibilă</p>
      </div>
    );
  }

  const themeColor = station.primary_color || '#2563eb';

  return (
    <KioskLayout station={station} showHeader={false}>
      <div className="relative w-full min-h-[100dvh] bg-slate-50/80 overflow-hidden flex flex-col font-sans text-slate-900 perspective-[1000px]">

        <BackgroundMesh color={themeColor} />

        {/* HEADER */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 flex justify-between items-center z-20 h-16 sm:h-20 shrink-0">
            {step > 1 && step < 7 ? (
                <motion.button
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  onClick={prevStep}
                  className="text-slate-500 hover:text-slate-800 font-bold text-base sm:text-lg flex items-center gap-1 px-3 sm:px-4 py-2 bg-white/50 backdrop-blur rounded-xl shadow-sm active:scale-95 transition-all"
                >
                   &larr; Înapoi
                </motion.button>
            ) : <div />}

            {/* STEP INDICATOR */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 sm:top-6 cursor-default select-none z-50">
                {step > 1 && step < 7 && (
                  <StepIndicator currentStep={step} totalSteps={7} primaryColor={themeColor} />
                )}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex items-center justify-center p-4 w-full max-w-7xl mx-auto overflow-y-auto sm:overflow-visible perspective-[1000px]">
            <AnimatePresence mode="wait" custom={dir} initial={false}>

                {/* STEP 1: IDLE STATE - Clean Interface */}
                {step === 1 && (
                    <div key="step1" className="fixed inset-0 z-50">
                        <KioskIdleState
                            onStart={() => nextStep()}
                            primaryColor={station?.primary_color || '#3B82F6'}
                        />
                    </div>
                )}

                {/* STEP 2: NAME */}
                {step === 2 && (
                    <motion.div
                      key="s2"
                      variants={pageVariants}
                      custom={dir}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="w-full max-w-xl text-center mt-[-10vh] sm:mt-0"
                    >
                        <motion.div variants={containerVariants} initial="hidden" animate="show">
                            <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">
                              Să facem cunoștință
                            </motion.h2>
                            <motion.p variants={itemVariants} className="text-lg sm:text-xl text-slate-500 mb-8 sm:mb-10">
                              Numele tău este?
                            </motion.p>

                            <motion.input
                                variants={itemVariants}
                                autoFocus
                                type="text"
                                value={formData.name}
                                onChange={e => handleNameChange(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && formData.name && nextStep()}
                                className="w-full bg-transparent border-b-4 border-slate-200 focus:border-blue-600 py-4 sm:py-6 text-center text-3xl sm:text-4xl font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 rounded-none mb-10"
                                placeholder="ex: Andrei"
                            />

                            <motion.button
                                variants={itemVariants}
                                onClick={() => nextStep()}
                                disabled={!formData.name}
                                className="w-full bg-slate-900 text-white py-5 sm:py-6 rounded-2xl text-xl sm:text-2xl font-bold disabled:opacity-50 disabled:shadow-none shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Încântat de cunoștință &rarr;
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}

                {/* STEP 3: PHONE */}
                {step === 3 && (
                    <motion.div
                      key="s3"
                      variants={pageVariants}
                      custom={dir}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center max-w-5xl h-full content-start md:content-center"
                    >

                        {/* LEFT */}
                        <div className="text-center md:text-left space-y-6 sm:space-y-8">
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Unde te anunțăm?</h2>
                                <p className="text-base sm:text-lg text-slate-500 mt-2 font-medium">
                                  Îți trimitem un SMS doar când expiră ITP-ul.
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 sm:p-6 rounded-2xl flex items-start gap-4 text-left">
                                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm sm:text-base">Zero Spam. Promis.</h4>
                                    <p className="text-blue-700/80 text-xs sm:text-sm leading-tight mt-1">
                                      Numărul tău este criptat și folosit strict pentru alerta ITP.
                                    </p>
                                </div>
                            </div>

                            {/* Dancing Digits Display */}
                            <div className={`bg-white rounded-3xl border-4 p-4 sm:p-6 shadow-lg transition-all duration-300 flex items-center justify-center md:justify-between ${formData.phone.length >= 12 ? 'border-green-500 shadow-green-100' : 'border-slate-100'}`}>
                                <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-800 flex items-center h-10 sm:h-12 overflow-hidden">
                                    <span className="text-slate-300 mr-2 tracking-tighter select-none">+40</span>
                                    <LayoutGroup>
                                        {formData.phone.replace('+40', '').split('').map((digit, i) => (
                                            <motion.span
                                              layoutId={`digit-${i}`}
                                              initial={{ y: 20, opacity: 0 }}
                                              animate={{ y: 0, opacity: 1 }}
                                              key={i}
                                            >
                                                {digit}
                                            </motion.span>
                                        ))}
                                    </LayoutGroup>
                                    {formData.phone.length < 12 && (
                                      <motion.div
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.8 }}
                                        className="w-0.5 sm:w-1 h-6 sm:h-8 bg-blue-600 ml-1"
                                      />
                                    )}
                                </div>
                                {formData.phone.length >= 12 && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                        <CheckCircle2 className="hidden md:block w-10 h-10 text-green-500" />
                                    </motion.div>
                                )}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => nextStep()}
                                disabled={formData.phone.length < 12}
                                className="hidden md:block w-full bg-blue-600 text-white py-6 rounded-2xl text-2xl font-bold shadow-xl shadow-blue-600/30 disabled:opacity-50 hover:bg-blue-700 transition-all"
                            >
                                Trimite SMS de Verificare
                            </motion.button>
                            <p className="hidden md:block text-xs text-slate-400 text-center">
                              Prin continuare accepți Termenii și Condițiile.
                            </p>
                        </div>

                        {/* RIGHT - NUMPAD */}
                        <div className="flex flex-col items-center w-full">
                            <div className="bg-white/80 backdrop-blur p-4 sm:p-6 rounded-[2rem] shadow-xl border border-white w-full max-w-[450px]">
                                <ResponsiveNumpad
                                    onInput={(d) => {
                                        const currentDigits = formData.phone.replace('+40', '');
                                        if(currentDigits.length < 10) {
                                            setFormData({...formData, phone: '+40' + currentDigits + d});
                                            updateActivity();
                                        }
                                    }}
                                    onDelete={() => {
                                        const currentDigits = formData.phone.replace('+40', '');
                                        if(currentDigits.length > 0) {
                                            setFormData({...formData, phone: '+40' + currentDigits.slice(0, -1)});
                                        } else {
                                            setFormData({...formData, phone: ''});
                                        }
                                        updateActivity();
                                    }}
                                />
                            </div>
                            <div className="md:hidden w-full mt-6 space-y-3">
                                <button
                                  onClick={() => nextStep()}
                                  disabled={formData.phone.length < 12}
                                  className="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl font-bold shadow-xl disabled:opacity-50"
                                >
                                  Continuă
                                </button>
                                <p className="text-[10px] text-slate-400 text-center px-4">
                                  Prin apăsarea butonului ești de acord cu prelucrarea datelor cf. GDPR.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: VERIFICATION (Preserved from original) */}
                {step === 4 && (
                   <motion.div
                     key="s4"
                     variants={pageVariants}
                     custom={dir}
                     initial="initial"
                     animate="animate"
                     exit="exit"
                     className="w-full max-w-lg bg-white/90 backdrop-blur p-6 sm:p-8 rounded-3xl shadow-2xl border border-white"
                   >
                      <PhoneVerificationStep
                        phone={formData.phone.replace(/^\+40/, '0')}
                        stationSlug={stationSlug}
                        onVerified={(verifiedPhone, consent) => {
                          setFormData({...formData, consent: true});
                          nextStep();
                        }}
                        onBack={prevStep}
                      />
                   </motion.div>
                )}

                {/* STEP 5: PLATE NUMBER */}
                {step === 5 && (
                    <motion.div
                      key="s5"
                      variants={pageVariants}
                      custom={dir}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="w-full flex flex-col items-center space-y-6 sm:space-y-8 mt-[-5vh] sm:mt-0"
                    >
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 text-center">
                          Ce mașină protejăm?
                        </h2>

                        {/* PLATE VISUAL with Shimmer */}
                        <div className="group bg-white border-[4px] sm:border-[6px] border-slate-900 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl w-full max-w-[340px] sm:max-w-[480px] h-20 sm:h-28 relative flex items-center transform hover:scale-105 transition-transform duration-300 shrink-0">
                            <div className="h-full w-14 sm:w-20 bg-[#003399] flex flex-col items-center justify-center text-white border-r-2 border-white z-10">
                                <span className="text-[10px] sm:text-xs mb-1">🇪🇺</span>
                                <span className="font-bold text-lg sm:text-2xl">RO</span>
                            </div>
                            <div className="flex-1 flex justify-center items-center bg-white z-10">
                                <span className="text-4xl sm:text-6xl font-mono font-bold tracking-widest text-slate-900 uppercase truncate px-2">
                                    {formData.plateNumber || <span className="opacity-10 text-slate-300">B00AAA</span>}
                                </span>
                            </div>
                            {/* CSS Shimmer Animation */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full -skew-x-12 translate-x-[-200%] group-hover:animate-[shimmer_2s_ease-in-out]"
                                 style={{
                                   animation: 'shimmer 3s infinite'
                                 }}
                            />
                        </div>

                        <div className="w-full max-w-3xl bg-white/80 backdrop-blur p-2 sm:p-4 rounded-3xl shadow-xl border border-white">
                             <ResponsivePlateKeyboard
                                onInput={(k) => {
                                    if(formData.plateNumber.length < 9) {
                                        setFormData({...formData, plateNumber: (formData.plateNumber + k).toUpperCase()});
                                        updateActivity();
                                    }
                                }}
                                onDelete={() => {
                                    setFormData({...formData, plateNumber: formData.plateNumber.slice(0, -1)});
                                    updateActivity();
                                }}
                             />
                        </div>

                        <motion.button
                             whileTap={{ scale: 0.95 }}
                             onClick={() => nextStep()}
                             disabled={formData.plateNumber.length < 5}
                             className="w-full max-w-md bg-slate-900 text-white py-4 sm:py-5 rounded-2xl text-xl sm:text-2xl font-bold shadow-2xl disabled:opacity-50 hover:bg-slate-800 transition-all"
                        >
                            Confirmă Numărul
                        </motion.button>
                    </motion.div>
                )}

                {/* STEP 6: EXPIRY DATE (Calendar Responsive Fixed) */}
                {step === 6 && (
                    <motion.div
                      key="s6"
                      variants={pageVariants}
                      custom={dir}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 items-center max-w-5xl h-full content-start md:content-center"
                    >
                        <div className="space-y-4 sm:space-y-6 text-center md:text-left">
                             <motion.div
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 sm:px-5 py-2 rounded-full font-bold text-sm sm:text-base"
                             >
                                <BellRing size={18} /> Pasul Final
                             </motion.div>
                             <h2 className="text-4xl sm:text-5xl font-black text-slate-900">Când expiră?</h2>
                             <p className="text-lg sm:text-xl text-slate-500 font-medium">
                               Uită-te în talon și selectează data.
                             </p>

                             {formData.expiryDate && (
                                 <motion.div
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   className="bg-white p-6 rounded-3xl border-l-8 border-blue-600 shadow-md text-left"
                                 >
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                                      Vei primi notificare pe:
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {format(subDays(formData.expiryDate, 7), 'dd MMMM yyyy', {locale: ro})}
                                    </p>
                                    <p className="text-sm text-blue-600 font-medium mt-1">
                                      (cu 7 zile înainte de expirare)
                                    </p>
                                 </motion.div>
                             )}
                        </div>

                        {/* SIMPLE DATE PICKER - Touch-Friendly */}
                        <div className="flex justify-center md:col-span-1">
                             <SimpleDatePicker
                                value={formData.expiryDate}
                                onChange={(d) => {
                                  setFormData({...formData, expiryDate: d});
                                  updateActivity();
                                }}
                                minDate={new Date()}
                             />
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSubmit}
                            disabled={!formData.expiryDate || submitting}
                            className="col-span-1 md:col-span-2 w-full bg-green-600 text-white py-6 rounded-3xl text-3xl font-bold shadow-[0_20px_50px_-12px_rgba(22,163,74,0.5)] disabled:opacity-50 hover:bg-green-700 transition-all flex items-center justify-center gap-3"
                        >
                            {submitting ? <Loader2 className="animate-spin w-8 h-8"/> : 'Activează Gratuit Acum'}
                        </motion.button>
                    </motion.div>
                )}

                {/* STEP 7: SUCCESS */}
                {step === 7 && (
                    <motion.div
                      key="s7"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center space-y-8 max-w-2xl mx-auto relative"
                    >
                         {/* Confetti Particles (Deterministic - No Hydration Error) */}
                         {mounted && [...Array(12)].map((_, i) => {
                           const angle = (i / 12) * 360;
                           const distance = 300 + (i % 3) * 100;
                           const xOffset = Math.cos(angle * Math.PI / 180) * distance;
                           const yOffset = Math.sin(angle * Math.PI / 180) * distance;

                           return (
                             <motion.div
                               key={i}
                               initial={{ x: 0, y: 0, opacity: 1 }}
                               animate={{
                                 x: xOffset,
                                 y: yOffset,
                                 opacity: 0,
                                 rotate: angle
                               }}
                               transition={{ duration: 1.5, ease: "easeOut" }}
                               className="absolute w-3 h-3 rounded-sm"
                               style={{
                                 backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 4],
                                 top: '50%',
                                 left: '50%'
                               }}
                             />
                           );
                         })}

                        <div className="w-48 h-48 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-inner animate-[bounce_1s_infinite]">
                            <CheckCircle2 className="w-28 h-28 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">Felicitări!</h2>
                            <p className="text-2xl text-slate-600 font-medium">Ești protejat împotriva amenzilor.</p>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-white border border-blue-100 p-6 rounded-3xl shadow-xl flex items-center gap-4 text-left max-w-md mx-auto"
                        >
                             <div className="bg-yellow-100 p-3 rounded-full">
                               <Sparkles className="w-6 h-6 text-yellow-600" />
                             </div>
                             <div>
                                <p className="font-bold text-slate-800">Sfat Pro:</p>
                                <p className="text-slate-600 text-sm">
                                  Salvează numărul nostru. Când primești mesajul, sună-ne direct pentru programare.
                                </p>
                             </div>
                        </motion.div>

                        <button
                          onClick={() => {
                            setStep(1);
                            setFormData({name: '', phone: '', plateNumber: '', expiryDate: null, consent: false});
                          }}
                          className="text-slate-400 font-bold py-4 hover:text-slate-600 transition-colors"
                        >
                          Închide ecranul
                        </button>

                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                             <motion.div
                               initial={{ width: '100%' }}
                               animate={{ width: '0%' }}
                               transition={{ duration: 30, ease: 'linear' }}
                               className="h-full bg-green-500"
                             />
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
      </div>

      {/* CSS Keyframes for Shimmer */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-200%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </KioskLayout>
  );
}
