'use client';

import { Dialog } from '@/components/ui/Dialog';
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-md">
          <PhoneVerificationStep
            stationSlug="dashboard"
            onVerified={(phone) => {
              onVerified(phone);
              onClose();
            }}
            onBack={onClose}
          />
        </div>
      </div>
    </Dialog>
  );
}
