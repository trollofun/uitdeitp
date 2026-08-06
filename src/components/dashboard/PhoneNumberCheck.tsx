'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { PhoneVerificationModal } from '@/components/dashboard/modals/PhoneVerificationModal';
import { useToast } from '@/hooks/useToast';

export function PhoneNumberCheck() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const supabase = createBrowserClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkPhoneVerification = async () => {
      try {
        // Get current user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) return;

        // Get user profile with phone verification status
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('phone, phone_verified')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        // Check if phone needs verification
        // Show modal if: no phone OR phone exists but not verified
        if (!profile.phone || !profile.phone_verified) {
          // Only show modal once per session
          const hasSeenModal = sessionStorage.getItem('phone_verification_prompted');

          if (!hasSeenModal) {
            // Delay showing modal slightly to avoid jarring UX
            setTimeout(() => {
              setIsModalOpen(true);
              sessionStorage.setItem('phone_verification_prompted', 'true');
            }, 1000);
          }
        }

        setHasChecked(true);
      } catch (error) {
        console.error('Error checking phone verification:', error);
        setHasChecked(true);
      }
    };

    checkPhoneVerification();
  }, [supabase]);

  const handleVerified = async (phone: string) => {
    // The phone and phone_verified flag are persisted server-side by
    // /api/verification/verify — the client only confirms and refreshes.
    toast({
      title: 'Telefon verificat cu succes!',
      description: 'Acum poți primi notificări SMS.',
      variant: 'success',
    });

    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // User can re-open from settings if they dismiss
  };

  // Don't render anything until we've checked
  if (!hasChecked) {
    return null;
  }

  return (
    <PhoneVerificationModal
      isOpen={isModalOpen}
      onClose={handleClose}
      onVerified={handleVerified}
    />
  );
}
