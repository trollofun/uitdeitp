'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    remindersCount: number;
    notificationsCount: number;
  } | null>(null);
  const { toast } = useToast();

  // Load stats when modal opens
  useState(() => {
    if (isOpen && !stats) {
      fetch('/api/account/stats')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStats(data.stats);
          }
        });
    }
  });

  const handleDelete = async () => {
    setError(null);

    if (confirmText !== 'DELETE') {
      setError('Trebuie să scrii exact "DELETE" pentru a confirma');
      return;
    }

    if (!understood) {
      setError('Trebuie să confirmi că înțelegi consecințele');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Cont șters',
          description: 'Contul tău a fost șters cu succes',
        });

        // Redirect to home page after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setError(data.error || 'Nu s-a putut șterge contul');
      }
    } catch (err) {
      setError('Eroare de conexiune');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Șterge contul</DialogTitle>
          </div>
        </DialogHeader>

          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>ATENȚIE:</strong> Această acțiune este PERMANENTĂ și NU poate fi anulată!
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Se vor șterge:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • {stats?.remindersCount || 0} reamintiri și rovignete
                </li>
                <li>
                  • {stats?.notificationsCount || 0} notificări din istoric
                </li>
                <li>• Toate informațiile personale</li>
                <li>• Setările și preferințele</li>
                <li>• Avatar-ul și toate fișierele</li>
              </ul>
            </div>

            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Alternativă:</p>
              <p className="text-muted-foreground">
                Dacă dorești doar o pauză, te poți deconecta. Datele vor rămâne în siguranță și
                vei putea reveni oricând.
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-2 p-3 border rounded-lg">
              <Checkbox
                id="understand"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked as boolean)}
              />
              <label
                htmlFor="understand"
                className="text-sm cursor-pointer"
              >
                Înțeleg că această acțiune este permanentă și nu poate fi anulată.
                Toate datele mele vor fi șterse definitiv.
              </label>
            </div>

            {/* Type DELETE confirmation */}
            <div>
              <label htmlFor="confirm-delete" className="block text-sm font-medium mb-2">
                Scrie <span className="font-mono font-bold">DELETE</span> pentru a confirma
              </label>
              <Input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Anulează
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading || confirmText !== 'DELETE' || !understood}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se șterge...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Șterge contul
                  </>
                )}
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
