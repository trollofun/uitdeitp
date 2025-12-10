"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/Card";

interface KioskVehiclePageProps {
  onNext: (data: { plateNumber: string; itpExpiry: string }) => void;
}

export function KioskVehiclePage({ onNext }: KioskVehiclePageProps) {
  const [plateNumber, setPlateNumber] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPlateNumber = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();

    // Format: B 123 ABC (1-2 letters, space, 2-3 digits, space, 3 letters)
    let formatted = "";
    if (cleaned.length > 0) {
      formatted = cleaned.slice(0, 2); // First 1-2 letters
    }
    if (cleaned.length > 2) {
      formatted += " " + cleaned.slice(2, 5); // 2-3 digits
    }
    if (cleaned.length > 5) {
      formatted += " " + cleaned.slice(5, 8); // 3 letters
    }

    return formatted;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlateNumber(e.target.value);
    setPlateNumber(formatted);
    if (errors.plateNumber) {
      setErrors((prev) => ({ ...prev, plateNumber: "" }));
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(value);
    if (errors.itpExpiry) {
      setErrors((prev) => ({ ...prev, itpExpiry: "" }));
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonth(value);
    if (errors.itpExpiry) {
      setErrors((prev) => ({ ...prev, itpExpiry: "" }));
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(value);
    if (errors.itpExpiry) {
      setErrors((prev) => ({ ...prev, itpExpiry: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate plate number (B 123 ABC format)
    const plateRegex = /^[A-Z]{1,2}\s\d{2,3}\s[A-Z]{3}$/;
    if (!plateNumber) {
      newErrors.plateNumber = "Numărul de înmatriculare este obligatoriu";
    } else if (!plateRegex.test(plateNumber)) {
      newErrors.plateNumber = "Format invalid (ex: B 123 ABC)";
    }

    // Validate date
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (!day || !month || !year) {
      newErrors.itpExpiry = "Data expirării ITP este obligatorie";
    } else if (dayNum < 1 || dayNum > 31) {
      newErrors.itpExpiry = "Ziua trebuie să fie între 1 și 31";
    } else if (monthNum < 1 || monthNum > 12) {
      newErrors.itpExpiry = "Luna trebuie să fie între 1 și 12";
    } else if (yearNum < 2024 || yearNum > 2050) {
      newErrors.itpExpiry = "Anul trebuie să fie între 2024 și 2050";
    } else {
      // Validate full date
      const dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        newErrors.itpExpiry = "Data invalidă";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      const itpExpiry = `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
      onNext({ plateNumber, itpExpiry });
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
          Pas 1 din 3
        </p>
        <h1 className="text-3xl font-bold mb-2">Detalii vehicul</h1>
        <p className="text-lg text-muted-foreground">
          Introdu numărul de înmatriculare și data expirării ITP
        </p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Plate Number */}
          <div className="space-y-3">
            <Label htmlFor="plateNumber" className="text-lg font-semibold">
              Număr înmatriculare
            </Label>
            <Input
              id="plateNumber"
              type="text"
              value={plateNumber}
              onChange={handlePlateChange}
              placeholder="B 123 ABC"
              className="h-16 text-2xl font-bold text-center tracking-wider"
              maxLength={11}
            />
            {errors.plateNumber && (
              <p className="text-sm text-destructive mt-2">
                {errors.plateNumber}
              </p>
            )}
          </div>

          {/* ITP Expiry Date */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">
              Data expirării ITP
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={day}
                  onChange={handleDayChange}
                  placeholder="ZZ"
                  className="h-16 text-2xl font-bold text-center"
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Ziua
                </p>
              </div>
              <div className="flex items-center text-3xl font-bold pb-6">/</div>
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={month}
                  onChange={handleMonthChange}
                  placeholder="LL"
                  className="h-16 text-2xl font-bold text-center"
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Luna
                </p>
              </div>
              <div className="flex items-center text-3xl font-bold pb-6">/</div>
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={year}
                  onChange={handleYearChange}
                  placeholder="AAAA"
                  className="h-16 text-2xl font-bold text-center"
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Anul
                </p>
              </div>
            </div>
            {errors.itpExpiry && (
              <p className="text-sm text-destructive mt-2">
                {errors.itpExpiry}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-16 text-xl font-semibold"
          >
            Continuă
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
