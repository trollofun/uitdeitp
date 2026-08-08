'use client';

import { segmentSms, toGsm7 } from '@/lib/services/sms-encoding';
import { AlertTriangle, Check } from 'lucide-react';

interface SmsCostHintProps {
  /**
   * Mesajul **randat**, cu variabilele deja înlocuite — nu șablonul brut.
   * `{station_name}` are 15 caractere, „Euro Auto Service ITP" are 21; contorul
   * pe șablon minte exact în cazurile care contează.
   */
  rendered: string;
  /** Șablonul brut, ca butonul de reparare să poată scrie înapoi în editor. */
  template: string;
  /** Primește șablonul curățat de diacritice. Fără el, butonul nu apare. */
  onFix?: (fixed: string) => void;
}

/**
 * Arată cât costă mesajul, nu câte caractere are.
 *
 * Un „ă" mută mesajul pe UCS-2 (70 de caractere pe parte în loc de 160), deci
 * dublează factura. Stația nu are de unde ști asta — de-aia i-o spunem aici, cu
 * caracterele vinovate numite pe litere, și cu un buton care le scoate.
 */
export function SmsCostHint({ rendered, template, onFix }: SmsCostHintProps) {
  const { encoding, length, parts, remaining, offenders } = segmentSms(rendered);
  const costly = encoding === 'UCS-2';

  // Merită butonul doar dacă schimbarea chiar scade numărul de părți.
  const fixedTemplate = costly ? toGsm7(template) : template;
  const wouldSave = costly ? parts - segmentSms(toGsm7(rendered)).parts : 0;

  return (
    <div className="mt-1 space-y-1 text-sm">
      <p className="text-muted-foreground">
        {length} caractere · {encoding} ·{' '}
        <span className={costly ? 'font-medium text-amber-600 dark:text-amber-500' : 'font-medium'}>
          {parts} {parts === 1 ? 'SMS' : 'SMS-uri'}
        </span>
        {parts >= 1 && remaining >= 0 && (
          <span className="text-muted-foreground">
            {' '}
            (încă {remaining} până la {parts + 1})
          </span>
        )}
      </p>

      {costly && wouldSave > 0 && (
        <div className="flex flex-wrap items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p>
              Diacriticele îl fac de <strong>{parts} ori mai scump</strong>. Fără{' '}
              <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
                {offenders.slice(0, 6).join(' ')}
              </code>
              {offenders.length > 6 && ` și încă ${offenders.length - 6}`} ar costa{' '}
              {parts - wouldSave} {parts - wouldSave === 1 ? 'SMS' : 'SMS-uri'}.
            </p>
            {onFix && (
              <button
                type="button"
                onClick={() => onFix(fixedTemplate)}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Scoate diacriticele
              </button>
            )}
          </div>
        </div>
      )}

      {!costly && parts === 1 && (
        <p className="flex items-center gap-1 text-green-700 dark:text-green-500">
          <Check className="h-3.5 w-3.5" />
          Costă un singur SMS.
        </p>
      )}
    </div>
  );
}
