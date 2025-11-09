'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { Shield, AlertCircle } from 'lucide-react';

interface ConsentStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ConsentStep({ onNext, onBack }: ConsentStepProps) {
  const [gdprConsent, setGdprConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!gdprConsent) {
      setError('Trebuie să accepți termenii și condițiile pentru a continua');
      return;
    }
    if (!smsConsent) {
      setError('Trebuie să accepți primirea notificărilor SMS');
      return;
    }
    onNext();
  };

  const isValid = gdprConsent && smsConsent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Consimțământ și Confidențialitate</h2>
        <p className="text-muted-foreground">
          Te rugăm să citești și să accepți termenii
        </p>
      </div>

      <div className="space-y-4 border rounded-lg p-6 bg-muted/20">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="gdpr"
            checked={gdprConsent}
            onCheckedChange={(checked) => {
              setGdprConsent(checked === true);
              setError('');
            }}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor="gdpr"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Accept termenii și condițiile *
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              Am citit și accept{' '}
              <a
                href="/termeni-si-conditii"
                target="_blank"
                className="text-primary hover:underline"
              >
                Termenii și Condițiile
              </a>{' '}
              și{' '}
              <a
                href="/politica-confidentialitate"
                target="_blank"
                className="text-primary hover:underline"
              >
                Politica de Confidențialitate
              </a>
              . Sunt de acord ca datele mele personale (număr de telefon, număr de înmatriculare)
              să fie procesate conform GDPR pentru serviciul de reminder-e ITP.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="sms"
            checked={smsConsent}
            onCheckedChange={(checked) => {
              setSmsConsent(checked === true);
              setError('');
            }}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor="sms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Accept primirea notificărilor SMS *
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              Sunt de acord să primesc notificări prin SMS despre expirarea ITP-ului.
              Voi primi un SMS cu <strong>30 de zile</strong> și{' '}
              <strong>7 zile</strong> înainte de expirare. Pot opta să nu mai primesc
              aceste mesaje în orice moment.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
          🔒 Datele tale sunt în siguranță
        </h4>
        <p className="text-xs text-blue-800 dark:text-blue-200">
          Respectăm confidențialitatea ta. Datele tale vor fi folosite exclusiv
          pentru trimiterea reminder-elor și nu vor fi partajate cu terți.
          Poți solicita ștergerea datelor în orice moment.
        </p>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-14"
        >
          Înapoi
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 h-14"
        >
          Accept și Continuă
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Pasul 4 din 5</p>
      </div>
    </motion.div>
  );
}
