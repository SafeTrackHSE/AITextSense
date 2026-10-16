import type { RiskSeverity } from '../shared/severity';
import type { ThreatFinding } from './types';

/**
 * Same shape as injection's computeOverallRisk, for UI/report consistency.
 * Decision (plan §2.7): Scanner, Injection, and Threat severities stay
 * independent per-tab — no unified cross-tab rollup in v2.2, matching the
 * app's existing pattern (none of the current tabs roll up into one score).
 */
export function computeThreatRisk(findings: ThreatFinding[]): { riskScore: number; severity: RiskSeverity } {
  if (findings.length === 0) return { riskScore: 0, severity: 'CLEAN' };

  let score = 0;
  for (const f of findings) {
    if (f.severity === 'CRITICAL') score += 45;
    else if (f.severity === 'HIGH') score += 28;
    else if (f.severity === 'MEDIUM') score += 14;
    else score += 5;

    // A finding surfaced only after a decode chain (i.e. it was deliberately
    // hidden) is weighted slightly higher than the same finding in plain sight.
    if (f.decodedFrom && f.decodedFrom.length > 0) score += 8;
  }

  const normalizedScore = Math.min(100, Math.max(0, score));

  let severity: RiskSeverity;
  if (normalizedScore >= 75 || findings.some(f => f.severity === 'CRITICAL')) severity = 'CRITICAL';
  else if (normalizedScore >= 50 || findings.some(f => f.severity === 'HIGH')) severity = 'HIGH';
  else if (normalizedScore >= 25) severity = 'MEDIUM';
  else if (normalizedScore > 0) severity = 'LOW';
  else severity = 'CLEAN';

  return { riskScore: normalizedScore, severity };
}
