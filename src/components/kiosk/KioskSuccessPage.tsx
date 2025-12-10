"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, Calendar, Car } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface KioskSuccessPageProps {
  plateNumber: string;
  itpExpiry: string;
  onComplete: () => void;
}

export function KioskSuccessPage({
  plateNumber,
  itpExpiry,
  onComplete,
}: KioskSuccessPageProps) {
  const [countdown, setCountdown] = useState(8);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        setProgress(((8 - countdown + 1) / 8) * 100);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [countdown, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto p-8"
    >
      <Card className="p-12">
        <div className="text-center space-y-8">
          {/* Animated Checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2
            }}
            className="flex justify-center"
          >
            <div className="relative">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
              />
              <CheckCircle2 className="w-32 h-32 text-green-500 relative z-10" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold text-green-500">
              Ești înregistrat!
            </h1>
            <p className="text-xl text-muted-foreground">
              Vei primi notificări cu 30 de zile înainte de expirare
            </p>
          </motion.div>

          {/* Vehicle Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4 pt-4"
          >
            <div className="flex items-center justify-center gap-3 text-lg">
              <Car className="w-6 h-6 text-muted-foreground" />
              <span className="font-bold text-2xl tracking-wider">
                {plateNumber}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 text-lg">
              <Calendar className="w-6 h-6 text-muted-foreground" />
              <span className="text-muted-foreground">ITP expiră la:</span>
              <span className="font-bold text-xl">{itpExpiry}</span>
            </div>
          </motion.div>

          {/* Auto-close Progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-3 pt-4"
          >
            <p className="text-sm text-muted-foreground">
              Revenire automată în {countdown} secunde
            </p>
            <Progress value={progress} className="h-2" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
