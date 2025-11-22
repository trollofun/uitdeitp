'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Zap, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface IdleSlide {
  id: number;
  icon: typeof AlertTriangle;
  iconSize: number;
  badge: string;
  badgeColor: string;
  title: React.ReactNode;
  desc: string;
  buttonText: string;
  color: string;
}

const IDLE_SLIDES: IdleSlide[] = [
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
      x: { type: "spring" as const, stiffness: 300, damping: 30 },
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
      x: { type: "spring" as const, stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 },
      rotateY: { duration: 0.4 },
      z: { duration: 0.4 }
    }
  })
};

interface IdleSliderProps {
  onStart: () => void;
  autoRotate?: boolean;
  rotateInterval?: number;
}

export function IdleSlider({ onStart, autoRotate = true, rotateInterval = 8000 }: IdleSliderProps) {
  const [[currentIndex, direction], setCurrentIndex] = useState([0, 0]);

  // Auto-rotate slides
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setCurrentIndex(([prev]) => [(prev + 1) % IDLE_SLIDES.length, 1]);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval]);

  const paginate = (newDirection: number) => {
    setCurrentIndex(([prev]) => [
      (prev + newDirection + IDLE_SLIDES.length) % IDLE_SLIDES.length,
      newDirection
    ]);
  };

  const currentSlide = IDLE_SLIDES[currentIndex];
  const Icon = currentSlide.icon;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-8">
      {/* Main Slider Container with 3D perspective */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl" style={{ perspective: '1200px' }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={`relative bg-gradient-to-br ${currentSlide.color} p-8 sm:p-12`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${currentSlide.badgeColor}`}>
                {currentSlide.badge}
              </span>
            </motion.div>

            {/* Icon with Floating Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -10, 0]
              }}
              transition={{
                opacity: { delay: 0.3, duration: 0.4 },
                scale: { delay: 0.3, duration: 0.4, type: "spring" },
                y: { delay: 0.8, duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="mb-6"
            >
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Icon className="w-12 h-12" style={{ color: currentSlide.badgeColor.includes('red') ? '#DC2626' : currentSlide.badgeColor.includes('yellow') ? '#D97706' : '#2563EB' }} />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 leading-tight"
            >
              {currentSlide.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg sm:text-xl text-slate-600 mb-8 font-medium"
            >
              {currentSlide.desc}
            </motion.p>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-5 bg-slate-900 text-white rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl transition-shadow"
            >
              {currentSlide.buttonText}
            </motion.button>

            {/* Decorative Element */}
            <motion.div
              className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-10"
              style={{
                background: currentSlide.badgeColor.includes('red') ? '#DC2626' : currentSlide.badgeColor.includes('yellow') ? '#D97706' : '#2563EB'
              }}
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-slate-900" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-slate-900" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-3 mt-8">
        {IDLE_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => setCurrentIndex([index, index > currentIndex ? 1 : -1])}
            className="relative"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'w-12 bg-slate-900' : 'w-2 bg-slate-300'
              }`}
            />
            {index === currentIndex && autoRotate && (
              <motion.div
                className="absolute top-0 left-0 h-2 bg-slate-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: rotateInterval / 1000, ease: "linear" }}
                key={currentIndex}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
