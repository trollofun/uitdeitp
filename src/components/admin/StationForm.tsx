'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
