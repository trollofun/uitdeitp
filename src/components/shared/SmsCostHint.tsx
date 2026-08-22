'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Ban } from 'lucide-react';
import {
  computeSmsCost,
  creditsToEur,
  stripToGsm7,
  type SmsCost,
} from '@/lib/pricing/sms-cost';

/**
 * Panoul de cost live de sub orice câmp de compunere SMS (PRD credite §4).
 *
 * Arată cât COSTĂ mesajul — în credite și în bani — nu câte caractere are.
 * Trei stări, trei culori: 🟢 1 SMS, 🟠 aproape de limită sau diacritice,
 * 🔴 ≥2 SMS-uri; ⛔ peste 3 SMS-uri mesajul e blocat la trimitere.
 *
 * Limbaj (criteriul de acceptanță #9): fără „UCS-2", „GSM-7", „encoding",
 * „segment" — segmentul se spune „SMS". Explicația e în cuvinte: „cu
 * diacritice, un SMS are doar 70 de caractere în loc de 160".
 *
 * Același motor ca tarifarea de pe server (src/lib/pricing/sms-cost.ts);
 * divergența client/server pe același mesaj e bug de severitate maximă.
 */

const DEBOUNCE_MS = 150;

export type CostState = 'ok' | 'warn' | 'expensive' | 'blocked';

export function costState(cost: SmsCost): CostState {
  if (cost.blocked) return 'blocked';
  if (cost.segments >= 2) return 'expensive';
  const nearLimit = cost.charLimit > 0 && cost.chars >= Math.ceil(cost.charLimit * 0.85);
  if (nearLimit || cost.triggers.some((t) => t.kind === 'ucs2')) return 'warn';
  return 'ok';
}

function smsLabel(n: number): string {
  return n === 1 ? '1 SMS' : `${n} SMS-uri`;
}

function creditLabel(n: number): string {
  return n === 1 ? '1 credit' : `${n} credite`;
}

function eur(credits: number): string {
  return `${creditsToEur(credits).toFixed(2).replace('.', ',')} € + TVA`;
}

interface SmsCostHintProps {
  /**
   * Mesajul **randat**, cu variabilele deja înlocuite — nu șablonul brut.
   * `{station_name}` are 15 caractere, „Euro Auto Service ITP" are 21; contorul
   * pe șablon minte exact în cazurile care contează (PRD §3.4: worst-case).
   */
  rendered: string;
  /** Șablonul brut, ca butonul de reparare să poată scrie înapoi în editor. */
  template: string;
  /** Primește șablonul curățat de diacritice. Fără el, butonul nu apare. */
  onFix?: (fixed: string) => void;
}

export function SmsCostHint({ rendered, template, onFix }: SmsCostHintProps) {
  // Debounce 150ms (PRD §4.1): la tastare rapidă calculăm o singură dată.
  const [debounced, setDebounced] = useState(rendered);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(rendered), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rendered]);

  const cost = useMemo(() => computeSmsCost(debounced), [debounced]);
  const state = costState(cost);

  const diacritics = cost.triggers.filter((t) => t.kind === 'ucs2').map((t) => t.char);
  const specials = cost.triggers.filter((t) => t.kind === 'extended').map((t) => t.char);

  // Merită butonul doar dacă transliterarea chiar ieftinește mesajul.
  const fixedTemplate = diacritics.length > 0 ? stripToGsm7(template) : template;
  const costAfterFix = useMemo(
    () => (diacritics.length > 0 ? computeSmsCost(stripToGsm7(debounced)) : null),
    [debounced, diacritics.length]
  );
  const savedCredits = costAfterFix
    ? cost.blocked
      ? costAfterFix.blocked
        ? 0
        : 1 // orice deblocare e un câștig, indiferent de credite
      : Math.max(0, cost.credits - costAfterFix.credits)
    : 0;

  return (
    <div className="mt-1 space-y-1 text-sm" data-cost-state={state}>
      <p className="text-muted-foreground">
        {state === 'blocked' ? (
          <span className="font-medium text-red-700 dark:text-red-400">
            ⛔ Peste 3 SMS-uri — mesajul nu se poate trimite. Scurtează-l.
          </span>
        ) : (
          <>
            <span
              className={
                state === 'expensive'
                  ? 'font-medium text-red-700 dark:text-red-400'
                  : state === 'warn'
                    ? 'font-medium text-amber-600 dark:text-amber-500'
                    : 'font-medium text-green-700 dark:text-green-500'
              }
            >
              {state === 'expensive' ? '🔴' : state === 'warn' ? '🟠' : '🟢'}{' '}
              {smsLabel(cost.segments)} · {creditLabel(cost.credits)} ({eur(cost.credits)}) /
              destinatar
            </span>{' '}
            <span className="text-muted-foreground">
              · {cost.chars} / {cost.charLimit} caractere
              {diacritics.length === 0 && ' · fără diacritice'}
              {state === 'warn' && cost.segments === 1 && (
                <> · încă {cost.remaining} până la 2 SMS-uri</>
              )}
            </span>
          </>
        )}
      </p>

      {(state === 'expensive' || state === 'blocked' || (state === 'warn' && diacritics.length > 0)) && (
        <div className="flex flex-wrap items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          {state === 'blocked' ? (
            <Ban className="mt-0.5 h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-1">
            {diacritics.length > 0 ? (
              <p>
                Mesajul conține <strong>diacritice</strong>:{' '}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
                  {diacritics.slice(0, 6).join(' ')}
                </code>
                {diacritics.length > 6 && ` și încă ${diacritics.length - 6}`}. Cu diacritice, un
                SMS poate avea doar <strong>70 de caractere</strong> în loc de 160. Mesajul tău are{' '}
                {cost.chars}
                {cost.blocked
                  ? ' — prea mult pentru a fi trimis.'
                  : ` → ${smsLabel(cost.segments)} → ${creditLabel(cost.credits)}.`}
              </p>
            ) : specials.length > 0 ? (
              <p>
                Simbolurile{' '}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
                  {specials.join(' ')}
                </code>{' '}
                ocupă cât două caractere fiecare. Mesajul ajunge la {cost.chars} →{' '}
                {smsLabel(cost.segments)} → {creditLabel(cost.credits)}.
              </p>
            ) : (
              <p>
                Mesajul are {cost.chars} de caractere.{' '}
                {cost.blocked ? (
                  <>Scurtează-l sub 459 ca să poată fi trimis.</>
                ) : (
                  <>
                    Peste {cost.segments === 2 ? 160 : 306} → {smsLabel(cost.segments)} →{' '}
                    {creditLabel(cost.credits)}. Scurtează cu{' '}
                    <strong>{cost.chars - (cost.segments === 2 ? 160 : 306)}</strong> pentru{' '}
                    {creditLabel(cost.segments === 2 ? 2 : 3)}.
                  </>
                )}
              </p>
            )}
            {onFix && savedCredits > 0 && (
              <button
                type="button"
                onClick={() => onFix(fixedTemplate)}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Scrie fără diacritice
                {!cost.blocked && costAfterFix ? ` (−${creditLabel(savedCredits)})` : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {state === 'ok' && (
        <p className="flex items-center gap-1 text-green-700 dark:text-green-500">
          <Check className="h-3.5 w-3.5" />
          Costă {creditLabel(cost.credits)} — un singur SMS.
        </p>
      )}
    </div>
  );
}

/**
 * Eticheta de cost pentru biblioteca de template-uri (PRD §4.4):
 * „🟢 1 credit garantat", recalculată la fiecare editare.
 */
export function SmsCostBadge({ text }: { text: string }) {
  const cost = useMemo(() => computeSmsCost(text), [text]);
  const state = costState(cost);

  const color =
    state === 'ok'
      ? 'text-green-700 dark:text-green-500'
      : state === 'warn'
        ? 'text-amber-600 dark:text-amber-500'
        : 'text-red-700 dark:text-red-400';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <span aria-hidden>{state === 'ok' ? '🟢' : state === 'warn' ? '🟠' : '🔴'}</span>
      {cost.blocked
        ? 'prea lung — nu se poate trimite'
        : `${creditLabel(cost.credits)}${state === 'ok' ? ' garantat' : ` · ${smsLabel(cost.segments)}`}`}
    </span>
  );
}
