// ============================================
// DIVISOR CALCULATOR
// ============================================

import type { AutomatedSettings, CalculationResult } from '../types';

export interface DivisorResult extends CalculationResult<number> {
  divisor: number | null;
}

/**
 * Compute the divisor based on settings (headcount or FTE)
 */
export function computeDivisor(settings: AutomatedSettings): DivisorResult {
  const { divisorMode, headcount, fte } = settings;

  const missingInputs: string[] = [];
  let divisor: number | null = null;
  let formula = '';
  const sources: string[] = ['settings.divisorMode'];

  if (divisorMode === 'HEADCOUNT') {
    if (headcount === null || headcount <= 0) {
      missingInputs.push('settings.headcount');
      formula = 'Diviseur = Effectif (manquant)';
    } else {
      divisor = headcount;
      formula = `Diviseur = Effectif = ${headcount}`;
      sources.push('settings.headcount');
    }
  } else {
    // FTE mode
    if (fte === null || fte <= 0) {
      missingInputs.push('settings.fte');
      formula = 'Diviseur = ETP (manquant)';
    } else {
      divisor = fte;
      formula = `Diviseur = ETP = ${fte}`;
      sources.push('settings.fte');
    }
  }

  return {
    value: divisor,
    divisor,
    formula,
    sources,
    assumptions: [],
    missingInputs,
  };
}

/**
 * Convert annual value to monthly per person
 */
export function annualToMonthlyPerPerson(
  annual: number | null,
  divisor: number | null
): number | null {
  if (annual === null || divisor === null || divisor === 0) {
    return null;
  }
  return annual / (12 * divisor);
}

/**
 * Convert monthly value to annual
 */
export function monthlyToAnnual(monthly: number | null): number | null {
  if (monthly === null) {
    return null;
  }
  return monthly * 12;
}

/**
 * Convert monthly per person to annual total
 */
export function monthlyPerPersonToAnnual(
  monthlyPerPerson: number | null,
  divisor: number | null
): number | null {
  if (monthlyPerPerson === null || divisor === null || divisor === 0) {
    return null;
  }
  return monthlyPerPerson * 12 * divisor;
}
