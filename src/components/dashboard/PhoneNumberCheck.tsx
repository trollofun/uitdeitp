'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { PhoneVerificationModal } from '@/components/dashboard/modals/PhoneVerificationModal';
import { useToast } from '@/hooks/useToast';

export function PhoneNumberCheck() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
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

        setUser(authUser);

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
    if (!user) return;

    try {
      // Update user profile with verified phone
      const { error } = await supabase
        .from('user_profiles')
        .update({
          phone: phone,
          phone_verified: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Telefon verificat cu succes!',
        description: 'Acum poți primi notificări SMS.',
        variant: 'success',
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: 'Eroare la salvarea numărului de telefon',
        description: 'Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    }
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
