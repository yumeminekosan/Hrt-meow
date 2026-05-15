/**
 * Drug–drug interaction coupling types.
 *
 * Pure type definitions — no runtime logic.
 */

/** Supported inhibition / induction mechanisms. */
export type InteractionMechanism = 'competitive' | 'irreversible' | 'induction';

/** Describes how one drug modulates a PK parameter of another. */
export interface InteractionCoupling {
  /** PK parameter affected, e.g. "CL", "Vd", "ka". */
  targetParameter: string;

  /** Mechanism of interaction. */
  mechanism: InteractionMechanism;

  /** Inhibition constant (Ki) or induction EC₅₀, in `unit`. */
  Ki_or_EC50: number;

  /** Concentration unit for Ki_or_EC50, e.g. "μmol/L", "mg/L". */
  unit: string;

  /** Maximum induction fold (Emax), only used for induction. Default: 3.0. */
  Emax?: number;
}
