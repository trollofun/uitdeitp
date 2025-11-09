'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle2, Phone, Car, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ConfirmationStepProps {
  phone: string;
  plateNumber: string;
  expiryDate: Date;
  stationName: string;
  confirmationCode?: string;
}

export function ConfirmationStep({
  phone,
  plateNumber,
  expiryDate,
  stationName,
  confirmationCode = 'ITP' + Math.random().toString(36).substring(2, 8).toUpperCase(),
}: ConfirmationStepProps) {
  const formatPhone = (phoneNumber: string): string => {
    // Format 0712345678 as 0712 345 678
    if (phoneNumber.length === 10) {
      return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 7)} ${phoneNumber.slice(7)}`;
    }
    return phoneNumber;
  };

  const handleNewRegistration = () => {
    window.location.reload();
  };

  const handleClose = () => {
    window.location.href = '/';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
        </motion.div>

        <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">
          Înregistrare Reușită!
        </h2>

        <p className="text-lg text-muted-foreground">
          Vei primi reminder-e prin SMS înainte de expirarea ITP-ului
        </p>

        <div className="inline-block px-4 py-2 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">Cod confirmare</p>
          <p className="text-2xl font-mono font-bold text-primary">
            {confirmationCode}
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="bg-muted px-4 py-3 border-b">
          <h3 className="font-semibold">Detalii Înregistrare</h3>
        </div>

        <div className="divide-y">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Stație ITP</p>
              <p className="font-medium">{stationName}</p>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Număr de telefon</p>
              <p className="font-medium font-mono">{formatPhone(phone)}</p>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Număr înmatriculare</p>
              <p className="font-medium font-mono text-lg">{plateNumber}</p>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Data expirării ITP</p>
              <p className="font-medium">
                {format(expiryDate, 'dd MMMM yyyy', { locale: ro })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">
          📱 Ce urmează?
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
          <li>Vei primi un SMS de confirmare în câteva momente</li>
          <li>Reminder-e vor fi trimise cu <strong>30 de zile</strong> și <strong>7 zile</strong> înainte de expirare</li>
          <li>Poți opta oricând să nu mai primești notificări răspunzând cu "STOP"</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleNewRegistration}
          className="w-full h-14"
          size="lg"
        >
          Înregistrează Alt Vehicul
        </Button>
        <Button
          variant="outline"
          onClick={handleClose}
          className="w-full h-12"
        >
          Închide
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>✅ Pasul 5 din 5 - Complet!</p>
      </div>
    </motion.div>
  );
}
