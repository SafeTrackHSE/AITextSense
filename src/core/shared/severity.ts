/**
 * Shared risk-severity scale used by every forensic module (Injection, Threat, …).
 * Promoted out of `injection/types.ts` so new modules don't have to either
 * duplicate it or import from a sibling module's internals.
 */
export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN';

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  CLEAN: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

/** Highest of two severities — used when combining findings from multiple sources into one result. */
export function maxSeverity(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

export function severityRank(s: RiskSeverity): number {
  return SEVERITY_ORDER[s];
}
