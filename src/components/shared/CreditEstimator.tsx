'use client';

/**
 * Estimatorul de consum (PRD credite §5): un singur slider — „Câte inspecții
 * faci pe lună?" — și recomandarea de pachet recalculată live. Un ecran, o
 * acțiune. Rulează și pe pagina publică de prețuri (fără cont).
 */

import { useMemo, useState } from 'react';
import {
  estimateConsumption,
  estimatorParams,
  type CreditPackage,
} from '@/lib/pricing/packages';

const STOPS = [50, 100, 150, 200, 300];

export interface CreditEstimatorProps {
  /** Apelat când stația alege pachetul recomandat (deschide checkout-ul). */
  onChoosePackage?: (pkg: CreditPackage) => void;
  defaultInspections?: number;
}

export function CreditEstimator({ onChoosePackage, defaultInspections = 100 }: CreditEstimatorProps) {
  const [inspections, setInspections] = useState(defaultInspections);
  const params = useMemo(() => estimatorParams(), []);
  const estimate = useMemo(
    () => estimateConsumption(inspections, params),
    [inspections, params]
  );

  const duration =
    estimate.durationMonths.min === estimate.durationMonths.max
      ? `~${formatMonths(estimate.durationMonths.min)} luni`
      : `~${formatMonths(estimate.durationMonths.min)}–${formatMonths(estimate.durationMonths.max)} luni`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <label htmlFor="estimator-slider" className="block font-medium text-gray-900">
        Câte inspecții faci pe lună?
      </label>

      <input
        id="estimator-slider"
        type="range"
        min={20}
        max={300}
        step={5}
        list="estimator-stops"
        value={inspections}
        onChange={(e) => setInspections(Number(e.target.value))}
        className="mt-3 w-full accent-blue-600"
      />
      <datalist id="estimator-stops">
        {STOPS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="mt-1 text-center text-sm text-gray-600">
        ~<strong>{inspections}</strong> inspecții / lună
      </p>

      <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-4 text-sm">
        <p>
          Pachetul recomandat:{' '}
          <strong>
            {estimate.recommended.name.toUpperCase()} — {estimate.recommended.priceEur} € + TVA
          </strong>
        </p>
        <p>
          Îți ajunge: <strong>{duration}</strong>
          {estimate.needsRenewal && ' (volum mare — vei reîncărca mai des)'}
        </p>
        <p>
          Cost lunar efectiv: <strong>~{Math.round(estimate.monthlyCostEur)} € + TVA</strong>
        </p>
        <p className="text-gray-500">+ e-mailuri nelimitate, gratuit</p>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        💡 Un singur client care se întoarce datorită reminderului (~150 lei) îți plătește 2 luni.
      </p>

      {onChoosePackage && (
        <button
          type="button"
          onClick={() => onChoosePackage(estimate.recommended)}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Alege {estimate.recommended.name} ({estimate.recommended.priceEur} € + TVA)
        </button>
      )}
    </div>
  );
}

function formatMonths(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
