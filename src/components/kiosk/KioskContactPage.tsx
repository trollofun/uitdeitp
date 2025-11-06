"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/Card";
import { MessageCircle } from "lucide-react";

interface KioskContactPageProps {
  onNext: (data: { name: string; phone: string }) => void;
  onBack: () => void;
}

export function KioskContactPage({ onNext, onBack }: KioskContactPageProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, "");

    // Always ensure +40 prefix
    if (cleaned.startsWith("40")) {
      return "+40 " + cleaned.slice(2, 11);
    } else if (cleaned.startsWith("0")) {
      return "+40 " + cleaned.slice(1, 10);
    } else {
      return "+40 " + cleaned.slice(0, 9);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Numele este obligatoriu";
    } else if (name.trim().length < 3) {
      newErrors.name = "Numele trebuie să aibă cel puțin 3 caractere";
    }

    // Validate phone (Romanian format: +40 7XX XXX XXX)
    const phoneDigits = phone.replace(/\D/g, "");
    if (!phone) {
      newErrors.phone = "Numărul de telefon este obligatoriu";
    } else if (phoneDigits.length !== 11) {
      newErrors.phone = "Număr de telefon invalid (10 cifre după +40)";
    } else if (!phoneDigits.startsWith("407")) {
      newErrors.phone = "Numărul trebuie să înceapă cu 07";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onNext({ name: name.trim(), phone });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto p-8"
    >
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Pas 2 din 3
        </p>
        <h1 className="text-3xl font-bold mb-2">Date de contact</h1>
        <p className="text-lg text-muted-foreground">
          Vom trimite un cod de verificare prin SMS
        </p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-lg font-semibold">
              Nume complet
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Ion Popescu"
              className="h-16 text-2xl"
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-2">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-lg font-semibold">
              Număr de telefon
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+40 712 345 678"
              className="h-16 text-2xl font-mono"
              autoComplete="tel"
            />
            {errors.phone && (
              <p className="text-sm text-destructive mt-2">{errors.phone}</p>
            )}

            {/* Helper Text */}
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <MessageCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                Primești SMS în 5 secunde cu codul de verificare
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onBack}
              className="flex-1 h-16 text-xl font-semibold"
            >
              Înapoi
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-16 text-xl font-semibold"
            >
              Trimite codul
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
