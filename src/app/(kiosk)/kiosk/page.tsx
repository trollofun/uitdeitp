'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence } from 'motion/react'
import KioskIdleState from '@/components/kiosk/KioskIdleState'
import { KioskVehiclePage } from '@/components/kiosk/KioskVehiclePage'
import { KioskContactPage } from '@/components/kiosk/KioskContactPage'
import { KioskVerifyPage } from '@/components/kiosk/KioskVerifyPage'
import { KioskSuccessPage } from '@/components/kiosk/KioskSuccessPage'

type FlowStep = 'idle' | 'vehicle' | 'contact' | 'verify' | 'success'

interface FormData {
  plate: string
  expiry: {
    day: string
    month: string
    year: string
  }
  name: string
  phone: string
  code: string
}

const INACTIVITY_TIMEOUT = 45000 // 45 seconds
const SUCCESS_DISPLAY_TIME = 5000 // 5 seconds

export default function KioskPage() {
  const [step, setStep] = useState<FlowStep>('idle')
  const [formData, setFormData] = useState<FormData>({
    plate: '',
    expiry: { day: '', month: '', year: '' },
    name: '',
    phone: '',
    code: ''
  })

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const successTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset function to go back to idle state
  const resetToIdle = useCallback(() => {
    setStep('idle')
    setFormData({
      plate: '',
      expiry: { day: '', month: '', year: '' },
      name: '',
      phone: '',
      code: ''
    })

    // Clear any existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Don't set timer for idle or success states
    if (step === 'idle' || step === 'success') {
      return
    }

    inactivityTimerRef.current = setTimeout(() => {
      resetToIdle()
    }, INACTIVITY_TIMEOUT)
  }, [step, resetToIdle])

  // Reset timer on any user interaction
  useEffect(() => {
    const handleUserActivity = () => {
      resetInactivityTimer()
    }

    // Listen for user interactions
    window.addEventListener('mousedown', handleUserActivity)
    window.addEventListener('touchstart', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)
    window.addEventListener('scroll', handleUserActivity)

    // Initial timer setup
    resetInactivityTimer()

    return () => {
      window.removeEventListener('mousedown', handleUserActivity)
      window.removeEventListener('touchstart', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      window.removeEventListener('scroll', handleUserActivity)

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [resetInactivityTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
    }
  }, [])

  // Handle step transitions
  const handleStart = useCallback(() => {
    setStep('vehicle')
    resetInactivityTimer()
  }, [resetInactivityTimer])

  const handleVehicleNext = useCallback((data: { plateNumber: string; itpExpiry: string }) => {
    // Convert DD/MM/YYYY to day/month/year format
    const [day, month, year] = data.itpExpiry.split('/')
    setFormData(prev => ({
      ...prev,
      plate: data.plateNumber,
      expiry: { day, month, year }
    }))
    setStep('contact')
    resetInactivityTimer()
  }, [resetInactivityTimer])

  const handleContactNext = useCallback((data: Pick<FormData, 'name' | 'phone'>) => {
    setFormData(prev => ({ ...prev, ...data }))
    setStep('verify')
    resetInactivityTimer()
  }, [resetInactivityTimer])

  const handleVerifyNext = useCallback((code: string) => {
    setFormData(prev => ({ ...prev, code }))
    setStep('success')

    // Auto-reset after success display time
    successTimerRef.current = setTimeout(() => {
      resetToIdle()
    }, SUCCESS_DISPLAY_TIME)
  }, [resetToIdle])

  const handleResendCode = useCallback(() => {
    // TODO: Implement SMS resend via NotifyHub API
  }, [])

  const handleBack = useCallback(() => {
    const stepOrder: FlowStep[] = ['idle', 'vehicle', 'contact', 'verify', 'success']
    const currentIndex = stepOrder.indexOf(step)

    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1] as FlowStep)
      resetInactivityTimer()
    }
  }, [step, resetInactivityTimer])

  const handleCancel = useCallback(() => {
    resetToIdle()
  }, [resetToIdle])

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <KioskIdleState
            key="idle"
            onStart={handleStart}
          />
        )}

        {step === 'vehicle' && (
          <KioskVehiclePage
            key="vehicle"
            onNext={handleVehicleNext}
          />
        )}

        {step === 'contact' && (
          <KioskContactPage
            key="contact"
            onNext={handleContactNext}
            onBack={handleBack}
          />
        )}

        {step === 'verify' && (
          <KioskVerifyPage
            key="verify"
            phone={formData.phone}
            onNext={handleVerifyNext}
            onBack={handleBack}
            onResend={handleResendCode}
          />
        )}

        {step === 'success' && (
          <KioskSuccessPage
            key="success"
            plateNumber={formData.plate}
            itpExpiry={`${formData.expiry.day}/${formData.expiry.month}/${formData.expiry.year}`}
            onComplete={resetToIdle}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
