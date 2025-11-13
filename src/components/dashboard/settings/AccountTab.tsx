'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { AlertTriangle, Trash2, Download, FileText } from 'lucide-react';
import { DeleteAccountModal } from '@/components/dashboard/modals/DeleteAccountModal';

export function AccountTab() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportData = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/account/export');
      const data = await response.json();

      if (data.success) {
        // Create download
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uitdeitp-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'Date exportate',
          description: 'Datele au fost descărcate cu succes',
        });
      } else {
        toast({
          title: 'Eroare',
          description: data.error || 'Nu s-au putut exporta datele',
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
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Export Data */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportă datele
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Descarcă toate datele tale într-un fișier JSON (GDPR compliant)
          </p>

          <div className="space-y-3 mb-4 text-sm text-muted-foreground">
            <p>Fișierul va conține:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Informații profil (nume, email, telefon, locație)</li>
              <li>Toate rovignete și reamintirile tale</li>
              <li>Istoricul notificărilor</li>
              <li>Setările de preferințe</li>
            </ul>
          </div>

          <Button onClick={exportData} disabled={isExporting} variant="outline">
            {isExporting ? (
              <>
                <FileText className="mr-2 h-4 w-4 animate-pulse" />
                Se exportă...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportă datele mele
              </>
            )}
          </Button>
        </Card>

        {/* Delete Account - Danger Zone */}
        <Card className="p-6 border-destructive">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Zona periculoasă
          </h2>

          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenție:</strong> Această acțiune este permanentă și nu poate fi anulată.
              Toate datele tale vor fi șterse definitiv.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Ce se va șterge:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Contul tău de utilizator</li>
                <li>Toate rovignetele și reamintirile</li>
                <li>Istoricul notificărilor</li>
                <li>Informațiile personale (nume, email, telefon)</li>
                <li>Avatar-ul și preferințele</li>
                <li>Toate datele asociate contului</li>
              </ul>
            </div>

            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Alternativă:</p>
              <p className="text-muted-foreground">
                Dacă dorești doar să faci o pauză, poți să te deconectezi și să revii oricând.
                Datele tale vor rămâne în siguranță.
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Șterge contul meu
            </Button>
          </div>
        </Card>

        {/* GDPR Info */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Drepturile tale GDPR
          </h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              În conformitate cu GDPR (Regulamentul General privind Protecția Datelor), ai următoarele drepturi:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Dreptul de acces la datele personale</li>
              <li>Dreptul la portabilitatea datelor (export)</li>
              <li>Dreptul la ștergerea datelor (&quot;dreptul de a fi uitat&quot;)</li>
              <li>Dreptul la rectificare (actualizare date)</li>
              <li>Dreptul la restricționarea prelucrării</li>
            </ul>
            <p className="mt-4">
              Pentru întrebări despre datele tale, contactează-ne la:{' '}
              <a
                href="mailto:privacy@uitdeitp.ro"
                className="text-primary hover:underline"
              >
                privacy@uitdeitp.ro
              </a>
            </p>
          </div>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  );
}
