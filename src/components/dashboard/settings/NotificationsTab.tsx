'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChipInput } from '@/components/ui/ChipInput';
import { TimeRangePicker } from '@/components/ui/TimeRangePicker';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Bell, MessageSquare, Mail, Smartphone, Clock, Loader2, Send } from 'lucide-react';

interface NotificationSettings {
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  reminder_intervals: number[]; // days before expiry
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_enabled: boolean;
  quiet_hours_weekdays_only: boolean;
}

const defaultIntervals = [7, 3, 1];

export function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    sms_enabled: true,
    email_enabled: true,
    push_enabled: false,
    reminder_intervals: defaultIntervals,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    quiet_hours_enabled: true,
    quiet_hours_weekdays_only: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const [settingsRes, profileRes] = await Promise.all([
        fetch('/api/notifications/settings'),
        fetch('/api/profile'),
      ]);

      const [settingsData, profileData] = await Promise.all([
        settingsRes.json(),
        profileRes.json(),
      ]);

      if (settingsData.success) {
        setSettings(settingsData.data);
      }

      if (profileData.success) {
        setPhoneVerified(profileData.data.phone_verified);
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca setările',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (updates: Partial<NotificationSettings>) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setSettings({ ...settings, ...updates });
        toast({
          title: 'Salvat',
          description: 'Setările au fost actualizate',
        });
      } else {
        toast({
          title: 'Eroare',
          description: data.error || 'Nu s-au putut salva setările',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Eroare de conexiune',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestSMS = async () => {
    try {
      const response = await fetch('/api/notifications/test-sms', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'SMS trimis',
          description: 'Verifică telefonul pentru SMS-ul de test',
        });
      } else {
        toast({
          title: 'Eroare',
          description: data.error || 'Nu s-a putut trimite SMS-ul',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Eroare de conexiune',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Canale de notificare
        </h2>

        <div className="space-y-4">
          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Notificări SMS</p>
                <p className="text-sm text-muted-foreground">
                  {phoneVerified
                    ? 'Primește alerte prin SMS'
                    : 'Verifică numărul de telefon pentru a activa'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.sms_enabled}
              onCheckedChange={(checked) => saveSettings({ sms_enabled: checked })}
              disabled={!phoneVerified}
            />
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Notificări Email</p>
                <p className="text-sm text-muted-foreground">
                  Primește alerte pe email
                </p>
              </div>
            </div>
            <Switch
              checked={settings.email_enabled}
              onCheckedChange={(checked) => saveSettings({ email_enabled: checked })}
            />
          </div>

          <Separator />

          {/* Push (future) */}
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  În curând - Notificări mobile
                </p>
              </div>
            </div>
            <Switch checked={false} disabled />
          </div>
        </div>
      </Card>

      {/* Reminder Intervals */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Intervale de reamintire</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Zilele înainte de expirare când vrei să primești notificări
        </p>

        <ChipInput
          values={settings.reminder_intervals.map((d) => `${d} ${d === 1 ? 'zi' : 'zile'}`)}
          onChange={(values) => {
            const intervals = values
              .map((v) => parseInt(v))
              .filter((n) => !isNaN(n) && n > 0)
              .sort((a, b) => b - a);
            saveSettings({ reminder_intervals: intervals });
          }}
          placeholder="Adaugă zile (ex: 5)"
          validator={(value) => {
            const num = parseInt(value);
            return !isNaN(num) && num > 0 && num <= 30;
          }}
          formatter={(value) => {
            const num = parseInt(value);
            return `${num} ${num === 1 ? 'zi' : 'zile'}`;
          }}
        />

        <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>
            📅 Exemplu: Pentru un ITP care expiră pe 15 martie, vei primi notificări în zilele:{' '}
            {settings.reminder_intervals.map((d, i) => {
              const date = new Date();
              date.setDate(15 - d);
              return (
                <span key={i}>
                  {date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}
                  {i < settings.reminder_intervals.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          </p>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ore liniștite
          </h2>
          <Switch
            checked={settings.quiet_hours_enabled}
            onCheckedChange={(checked) => saveSettings({ quiet_hours_enabled: checked })}
          />
        </div>

        {settings.quiet_hours_enabled && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Nu trimite notificări în acest interval de timp
              </p>
              <TimeRangePicker
                startTime={settings.quiet_hours_start}
                endTime={settings.quiet_hours_end}
                onChange={(start, end) => {
                  saveSettings({
                    quiet_hours_start: start,
                    quiet_hours_end: end,
                  });
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Doar în zilele lucrătoare</p>
                <p className="text-sm text-muted-foreground">
                  Aplică orele liniștite doar luni-vineri
                </p>
              </div>
              <Switch
                checked={settings.quiet_hours_weekdays_only}
                onCheckedChange={(checked) =>
                  saveSettings({ quiet_hours_weekdays_only: checked })
                }
              />
            </div>
          </div>
        )}
      </Card>

      {/* Test SMS */}
      {phoneVerified && settings.sms_enabled && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Testează notificările</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Trimite un SMS de test pentru a verifica că notificările funcționează
          </p>
          <Button onClick={sendTestSMS} variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Trimite SMS de test
          </Button>
        </Card>
      )}

      {/* Save indicator */}
      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Se salvează...</span>
        </div>
      )}
    </div>
  );
}
