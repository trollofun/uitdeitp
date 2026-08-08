/**
 * Contract A payload schemas (SIRAR automation and Lite agent -> uitdeITP).
 *
 * Two variants share one endpoint:
 *  - `full`: the existing CRM payload (inspectie / vehicul / odometru blocks)
 *    plus the new `destinatar` block
 *  - `lite`: what the Lite agent's end-of-capture popup can collect
 *
 * Unknown blocks pass through untouched ("expand, never break"): the legacy
 * `statie` string field stays valid alongside the new `statie_ref` object.
 */

import { z } from 'zod';
import { plateNumberSchema, roPhoneSchema } from '@/lib/validation';

/** Consent wording approved for automated sends; see 00-arhitectura §3. */
export const CANONICAL_CONSENT_VERSIONS = ['v1'] as const;

const destinatarSchema = z.object({
  telefon: roPhoneSchema,
  consimtamant_la: z.string().min(1),
  consimtamant_versiune: z.string().default('v1'),
  canal: z.string().optional(),
  nume: z.string().optional(),
});

const statieRefSchema = z.object({
  rar_code: z.string().min(1),
});

const futureDate = z.coerce
  .date()
  .refine((d) => d > new Date(), 'Data expirării trebuie să fie în viitor');

export const contractAFullSchema = z
  .object({
    payload_variant: z.literal('full'),
    // .passthrough() on the nested blocks too, not just the root: Zod strips
    // unknown keys from nested objects by default, so SIRAR's rev-3 additions
    // inside `inspectie` (deficiente, warnings, valabilitate) and `vehicul`
    // (an_fabricatie, cilindree, …) arrived and were silently dropped. No 422,
    // no error — the data simply evaporated between the wire and the handler.
    inspectie: z
      .object({
        expirare: futureDate,
        data: z.coerce.date().optional(),
        rezultat: z.string().optional(),
        serie_certificat: z.string().optional(),
        cod_tranzactie: z.string().optional(),
      })
      .passthrough(),
    vehicul: z
      .object({
        numar_inmatriculare: z.string().optional(),
        placa: z.string().optional(),
      })
      .passthrough(),
    odometru: z.unknown().optional(),
    destinatar: destinatarSchema.optional(),
    statie_ref: statieRefSchema.optional(),
    // Legacy field kept accepted (and ignored) for backwards compatibility
    statie: z.string().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const plate = val.vehicul.numar_inmatriculare ?? val.vehicul.placa;
    if (!plate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vehicul', 'numar_inmatriculare'],
        message: 'Numărul de înmatriculare este obligatoriu',
      });
      return;
    }
    const parsed = plateNumberSchema.safeParse(plate);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vehicul', 'numar_inmatriculare'],
        message: 'Număr de înmatriculare invalid',
      });
    }
  });

export const contractALiteSchema = z
  .object({
    payload_variant: z.literal('lite'),
    plate_number: plateNumberSchema,
    expiry_date: futureDate.optional(),
    /** Validity picked in the Lite popup, in months */
    valabilitate_luni: z.union([z.literal(6), z.literal(12), z.literal(24)]).optional(),
    data_inspectie: z.coerce.date().optional(),
    destinatar: destinatarSchema,
    statie_ref: statieRefSchema.optional(),
    statie: z.string().optional(),
  })
  .passthrough()
  .refine(
    (val) => Boolean(val.expiry_date || val.valabilitate_luni),
    'expiry_date sau valabilitate_luni este obligatoriu'
  );

/**
 * Dispatch on payload_variant by hand: both schemas carry .superRefine() /
 * .passthrough(), which makes them ZodEffects — and z.discriminatedUnion only
 * accepts plain objects (it throws at module load otherwise).
 */
export function parseContractA(input: unknown): ContractAPayload {
  const declared = z
    .object({ payload_variant: z.enum(['full', 'lite']).optional() })
    .passthrough()
    .parse(input);

  // The existing SIRAR CRM payload predates payload_variant, so infer it from
  // the shape rather than rejecting: an `inspectie` block means full, a bare
  // plate means lite. Declared value always wins.
  const variant =
    declared.payload_variant ??
    (typeof declared === 'object' && declared !== null && 'inspectie' in declared
      ? 'full'
      : 'lite');

  return variant === 'full'
    ? contractAFullSchema.parse({ ...declared, payload_variant: 'full' })
    : contractALiteSchema.parse({ ...declared, payload_variant: 'lite' });
}

export type ContractAFull = z.infer<typeof contractAFullSchema>;
export type ContractALite = z.infer<typeof contractALiteSchema>;
export type ContractAPayload = ContractAFull | ContractALite;
