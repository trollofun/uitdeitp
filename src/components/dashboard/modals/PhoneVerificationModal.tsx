'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { PhoneVerificationStep } from '@/components/kiosk/PhoneVerificationStep';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phone: string) => void;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verificare telefon</DialogTitle>
        </DialogHeader>
        <PhoneVerificationStep
          stationSlug={null}
          onVerified={(phone, consent) => {
            onVerified(phone);
            onClose();
          }}
          onBack={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
