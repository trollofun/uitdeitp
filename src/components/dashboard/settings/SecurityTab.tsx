'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Key, Mail, Shield, Smartphone, Monitor, Loader2, AlertTriangle } from 'lucide-react';
import { ChangePasswordModal } from '@/components/dashboard/modals/ChangePasswordModal';
import { ChangeEmailModal } from '@/components/dashboard/modals/ChangeEmailModal';

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

export function SecurityTab() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { toast } = useToast();

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/security/sessions');
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca sesiunile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/security/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
        toast({
          title: 'Sesiune revocată',
          description: 'Sesiunea a fost închisă cu succes',
        });
      } else {
        toast({
          title: 'Eroare',
          description: data.error || 'Nu s-a putut revoca sesiunea',
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

  const revokeAllSessions = async () => {
    if (!confirm('Ești sigur că vrei să închizi toate sesiunile? Vei fi deconectat de pe toate dispozitivele.')) {
      return;
    }

    try {
      const response = await fetch('/api/security/sessions', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sesiuni revocate',
          description: 'Toate sesiunile au fost închise',
        });
        // Redirect to login
        window.location.href = '/login';
      } else {
        toast({
          title: 'Eroare',
          description: data.error || 'Nu s-au putut revoca sesiunile',
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

  return (
    <>
      <div className="space-y-6">
        {/* Change Password */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5" />
            Schimbă parola
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Asigură-te că folosești o parolă puternică și unică
          </p>
          <Button onClick={() => setShowPasswordModal(true)}>
            Schimbă parola
          </Button>
        </Card>

        {/* Change Email */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Schimbă email-ul
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Actualizează adresa de email asociată contului
          </p>
          <Button onClick={() => setShowEmailModal(true)} variant="outline">
            Schimbă email-ul
          </Button>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Autentificare în doi pași</h2>
            </div>
            <Badge variant="secondary">În curând</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Protejează-ți contul cu un cod de verificare suplimentar
          </p>
          <div className="space-y-3 opacity-50">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS</p>
                <p className="text-sm text-muted-foreground">
                  Primește coduri prin SMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Aplicație de autentificare</p>
                <p className="text-sm text-muted-foreground">
                  Google Authenticator, Authy, etc.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Active Sessions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Sesiuni active
            </h2>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={revokeAllSessions}
                className="text-destructive hover:text-destructive"
              >
                Închide toate sesiunile
              </Button>
            )}
          </div>

          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nu există sesiuni active</p>
              <Button onClick={loadSessions} variant="outline" className="mt-4">
                Încarcă sesiuni
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Monitor className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.device}</p>
                        {session.is_current && (
                          <Badge variant="default" className="text-xs">
                            Sesiune curentă
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.browser} • {session.location}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Activ {session.last_active}
                      </p>
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Revocă
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {sessions.length === 0 && !isLoading && (
            <Button onClick={loadSessions} className="w-full mt-4">
              Încarcă sesiuni
            </Button>
          )}
        </Card>

        {/* Security Tips */}
        <Card className="p-6 bg-muted/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2">Sfaturi de securitate</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Folosește o parolă puternică, cu minim 12 caractere</li>
                <li>• Nu partaja parola cu nimeni</li>
                <li>• Activează autentificarea în doi pași când va fi disponibilă</li>
                <li>• Verifică regulat sesiunile active</li>
                <li>• Închide sesiunile de pe dispozitive necunoscute</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <ChangeEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </>
  );
}
