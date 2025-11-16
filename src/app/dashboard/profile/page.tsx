'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Bell,
  Settings,
  Loader2,
  Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

interface ProfileStats {
  total_reminders: number;
  upcoming_reminders: Array<{
    id: string;
    plate_number: string;
    expiry_date: string;
    days_until_expiry: number;
  }>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/profile/stats'),
      ]);

      const [profileData, statsData] = await Promise.all([
        profileRes.json(),
        statsRes.json(),
      ]);

      if (profileData.success) {
        setProfile(profileData.data);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (!profile) return 'U';
    return profile.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (days <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Nu s-a putut încărca profilul</p>
          <Button onClick={loadProfile} className="mt-4">
            Reîncearcă
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Profilul meu</h1>
        <Button onClick={() => router.push('/dashboard/settings')} variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Editează profilul
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-background">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{profile.email}</span>
                  <VerifiedBadge verified size="sm" />
                </div>

                {profile.phone && (
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                    <VerifiedBadge verified={profile.phone_verified} size="sm" />
                  </div>
                )}

                {(profile.city || profile.country) && (
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {profile.city && profile.country
                        ? `${profile.city}, ${profile.country}`
                        : profile.city || profile.country}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Membru din {formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Card */}
        {stats && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Statistici
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">{stats.total_reminders}</div>
                <p className="text-sm text-muted-foreground">
                  {stats.total_reminders === 1 ? 'Reamintire activă' : 'Reamintiri active'}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {stats.upcoming_reminders.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.upcoming_reminders.length === 1
                    ? 'Reamintire următoare'
                    : 'Reamintiri următoare'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Upcoming Reminders */}
        {stats && stats.upcoming_reminders.length > 0 && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Următoarele reamintiri
            </h3>
            <div className="space-y-3">
              {stats.upcoming_reminders.slice(0, 3).map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{reminder.plate_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Expiră pe {formatDate(reminder.expiry_date)}
                    </p>
                  </div>
                  <Badge
                    className={getUrgencyColor(reminder.days_until_expiry)}
                    variant="outline"
                  >
                    {reminder.days_until_expiry === 0
                      ? 'Astăzi'
                      : reminder.days_until_expiry === 1
                      ? 'Mâine'
                      : `${reminder.days_until_expiry} zile`}
                  </Badge>
                </div>
              ))}
            </div>

            {stats.total_reminders > 3 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => router.push('/dashboard')}
              >
                Vezi toate reamintirile
              </Button>
            )}
          </Card>
        )}

        {/* Empty State */}
        {stats && stats.total_reminders === 0 && (
          <Card className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nu ai reamintiri active</h3>
            <p className="text-muted-foreground mb-6">
              Adaugă prima ta rovignetă pentru a primi notificări automate
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Adaugă rovignetă
            </Button>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Acțiuni rapide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Setări cont
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/dashboard/settings?tab=notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Setări notificări
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/dashboard/settings?tab=security')}
            >
              <User className="mr-2 h-4 w-4" />
              Securitate
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/dashboard')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Rovignete
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
