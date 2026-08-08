'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/InputField';
import { Card } from '@/components/ui/Card';
import { BrandingEditor } from '@/components/admin/BrandingEditor';
import { NotificationTemplateEditor } from '@/components/admin/NotificationTemplateEditor';
import { useToast } from '@/hooks/useToast';
import { Loader2, Save, Trash2 } from 'lucide-react';

const stationSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere'),
  slug: z
    .string()
    .min(3, 'Slug-ul trebuie să aibă minim 3 caractere')
    .regex(/^[a-z0-9-]+$/, 'Slug-ul poate conține doar litere mici, cifre și liniuțe'),
  station_phone: z.string().optional(),
  station_address: z.string().optional(),
  logo_url: z.string().url('URL invalid').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Culoare invalidă'),
  // Contract A / ecosystem fields. The API has accepted these since F1; without
  // them here every new station needed a hand-written UPDATE.
  rar_code: z
    .string()
    .regex(/^[A-Z]{2}[0-9]{3}$/, 'Format cod RAR invalid (ex: CT060)')
    .optional()
    .or(z.literal('')),
  default_intervals: z
    .string()
    .regex(/^\s*\d+(\s*,\s*\d+)*\s*$/, 'Zile separate prin virgulă (ex: 7, 3, 1)')
    .optional()
    .or(z.literal('')),
  ingest_enabled: z.boolean().optional(),
  hmac_mode: z.enum(['log', 'enforce']).optional(),
  owner_email: z.string().email('Email invalid').optional().or(z.literal('')),
});

type StationFormData = z.infer<typeof stationSchema>;

interface Station {
  id: string;
  name: string;
  slug: string;
  station_phone: string | null;
  station_address: string | null;
  logo_url: string | null;
  primary_color: string;
  rar_code?: string | null;
  owner_email?: string | null;
  default_intervals?: unknown;
  ingest_enabled?: boolean | null;
  hmac_mode?: string | null;
  sms_template_5d: string | null;
  sms_template_3d: string | null;
  sms_template_1d: string | null;
  email_template_5d: string | null;
  email_template_3d: string | null;
  email_template_1d: string | null;
}

interface StationFormProps {
  station?: Station;
}

export function StationForm({ station }: StationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: station?.name || '',
      slug: station?.slug || '',
      station_phone: station?.station_phone || '',
      station_address: station?.station_address || '',
      logo_url: station?.logo_url || '',
      primary_color: station?.primary_color || '#3B82F6',
      rar_code: station?.rar_code || '',
      owner_email: station?.owner_email || '',
      default_intervals: Array.isArray(station?.default_intervals)
        ? (station.default_intervals as number[]).join(', ')
        : '',
      ingest_enabled: station?.ingest_enabled ?? false,
      hmac_mode: (station?.hmac_mode === 'enforce' ? 'enforce' : 'log') as 'log' | 'enforce',
    },
  });

  const watchName = watch('name');
  const watchLogoUrl = watch('logo_url');
  const watchPrimaryColor = watch('primary_color');

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!station) {
      // Only auto-generate slug for new stations
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', slug);
    }
  };

  const onSubmit = async (data: StationFormData) => {
    setIsLoading(true);
    try {
      const url = station ? `/api/stations/${station.id}` : '/api/stations';
      const method = station ? 'PATCH' : 'POST';

      // The API validates rar_code/default_intervals strictly, so empty inputs
      // are omitted rather than sent as '' (which would 400 the whole save).
      const { rar_code, default_intervals, owner_email, ...rest } = data;
      const payload: Record<string, unknown> = { ...rest };

      if (rar_code?.trim()) payload.rar_code = rar_code.trim().toUpperCase();
      // Only sent when the admin actually typed something: an empty field must
      // not be read as "remove the current owner".
      if (owner_email?.trim()) payload.owner_email = owner_email.trim();
      if (default_intervals?.trim()) {
        payload.default_intervals = default_intervals
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((n) => Number.isInteger(n) && n > 0);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Eroare la salvare');
      }

      toast({
        title: station ? 'Stație actualizată' : 'Stație creată',
        description: station
          ? 'Modificările au fost salvate cu succes'
          : 'Stația a fost creată cu succes',
        variant: 'success',
      });

      router.push('/admin/stations');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'A apărut o eroare',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!station) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/stations/${station.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Eroare la ștergere');
      }

      toast({
        title: 'Stație ștearsă',
        description: 'Stația a fost ștearsă cu succes',
        variant: 'success',
      });

      router.push('/admin/stations');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'A apărut o eroare',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <Card className="p-8">
        <h2 className="text-xl font-semibold mb-6">Informații de Bază</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nume Stație <span className="text-error">*</span>
            </label>
            <Input
              {...register('name')}
              onChange={(e) => {
                register('name').onChange(e);
                handleNameChange(e);
              }}
              placeholder="Ex: Stație ITP București Nord"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Slug <span className="text-error">*</span>
            </label>
            <Input
              {...register('slug')}
              placeholder="bucuresti-nord"
              disabled={!!station}
              error={errors.slug?.message}
            />
            <p className="text-sm text-muted-foreground mt-1">
              URL-ul va fi: /kiosk/{watch('slug')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Telefon Stație</label>
            <Input
              {...register('station_phone')}
              placeholder="+40 XXX XXX XXX"
              error={errors.station_phone?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Adresă Stație</label>
            <Input
              {...register('station_address')}
              placeholder="Str. Exemplu, Nr. 123, București"
              error={errors.station_address?.message}
            />
          </div>
        </div>
      </Card>

      {/* Ecosystem / Contract A */}
      <Card className="p-8">
        <h2 className="text-xl font-semibold mb-2">Integrare ecosistem</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Setările folosite de importul automat din SIRAR. Cheile de ingest se emit separat,
          din pagina stației.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Proprietar (email)</label>
            <Input
              {...register('owner_email')}
              placeholder="patron@statie.ro"
              error={errors.owner_email?.message}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Contul care vede dashboard-ul stației și primește alertele. Trebuie să fie
              deja înregistrat pe platformă.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cod RAR</label>
            <Input
              {...register('rar_code')}
              placeholder="CT060"
              error={errors.rar_code?.message}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Codul autorizației stației. Identifică aceeași stație în toate aplicațiile
              ecosistemului și e verificat față de cheia de ingest.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Zile de notificare</label>
            <Input
              {...register('default_intervals')}
              placeholder="7, 3, 1"
              error={errors.default_intervals?.message}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Cu câte zile înainte de expirare se trimit mesajele. Gol = 5 zile.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="ingest_enabled"
              type="checkbox"
              {...register('ingest_enabled')}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor="ingest_enabled" className="text-sm">
              <span className="font-medium">Permite importul automat</span>
              <span className="block text-muted-foreground">
                Cât e oprit, cererile venite pe cheia acestei stații primesc 403.
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Verificare semnătură</label>
            <select
              {...register('hmac_mode')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="log">Doar înregistrare (recomandat la început)</option>
              <option value="enforce">Respinge cererile nesemnate corect</option>
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              Treci pe „respinge" abia după ce vezi în log că toate cererile reale ale
              stației se semnează corect.
            </p>
          </div>
        </div>
      </Card>

      {/* Branding */}
      <Card className="p-8">
        <h2 className="text-xl font-semibold mb-6">Branding</h2>
        <BrandingEditor
          logoUrl={watchLogoUrl || ''}
          primaryColor={watchPrimaryColor}
          stationName={watchName}
          onLogoChange={(url) => setValue('logo_url', url)}
          onColorChange={(color) => setValue('primary_color', color)}
          errors={{
            logo_url: errors.logo_url?.message,
            primary_color: errors.primary_color?.message,
          }}
        />
      </Card>

      {/* Notification Templates (only for existing stations) */}
      {station && (
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-6">Template-uri Notificări</h2>
          <p className="text-muted-foreground mb-6">
            Personalizează mesajele SMS și email trimise clienților tăi. Folosește variabile pentru a include date dinamice.
          </p>
          <NotificationTemplateEditor
            smsTemplate5d={station.sms_template_5d || ''}
            smsTemplate3d={station.sms_template_3d || ''}
            smsTemplate1d={station.sms_template_1d || ''}
            emailTemplate5d={station.email_template_5d || ''}
            emailTemplate3d={station.email_template_3d || ''}
            emailTemplate1d={station.email_template_1d || ''}
            stationName={watchName}
            stationPhone={watch('station_phone') || ''}
            stationAddress={watch('station_address') || ''}
            onSave={async (templates) => {
              // Save templates directly to API
              const response = await fetch(`/api/stations/${station.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templates),
              });

              if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error?.message || 'Eroare la salvare');
              }

              toast({
                title: 'Template-uri actualizate',
                description: 'Template-urile de notificare au fost salvate cu succes',
                variant: 'success',
              });

              router.refresh();
            }}
          />
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {station && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Sigur ștergi?</p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    Da, șterge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isLoading}
                  >
                    Anulează
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge Stația
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Anulează
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {station ? 'Salvează Modificările' : 'Creează Stația'}
          </Button>
        </div>
      </div>
    </form>
  );
}
