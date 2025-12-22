/**
 * Compute IS (Corporate Tax), VAT, and IR (Income Tax)
 */

import type {
  RatesConfig,
  SocialSettings,
  CompanyInputs,
  EmployeeInputs,
  ISResult,
  VATResult,
  IRResult,
  SocialResult,
} from './types';
import ratesJson from '../rates/fr/2025.json';

const defaultRates = ratesJson as RatesConfig;

/**
 * Get divisor from settings
 */
function getDivisor(settings: SocialSettings): number | null {
  if (settings.divisorMode === 'HEADCOUNT') {
    return settings.headcount ?? null;
  } else {
    return settings.fte ?? null;
  }
}

/**
 * Compute IS (Corporate Tax) from taxable profit
 */
export function computeIS(
  company: CompanyInputs,
  settings: SocialSettings,
  config: RatesConfig = defaultRates
): ISResult {
  const diagnostics = {
    missingInputs: [] as string[],
    warnings: [] as string[],
  };
  
  const divisor = getDivisor(settings);
  
  // Check for missing inputs
  if (company.taxableProfitAnnual === undefined || company.taxableProfitAnnual === null) {
    diagnostics.missingInputs.push('taxableProfitAnnual');
    return {
      taxableProfitAnnual: null,
      isAnnual: null,
      isMonthlyPerPerson: null,
      isReducedRateApplied: false,
      formula: 'N/A - missing taxableProfitAnnual',
      diagnostics,
    };
  }
  
  if (divisor === null || divisor === 0) {
    diagnostics.missingInputs.push('divisor (headcount or fte)');
    return {
      taxableProfitAnnual: company.taxableProfitAnnual,
      isAnnual: null,
      isMonthlyPerPerson: null,
      isReducedRateApplied: false,
      formula: 'N/A - missing divisor',
      diagnostics,
    };
  }
  
  const profit = company.taxableProfitAnnual;
  const isReducedRateEnabled = company.isReducedRateEnabled ?? false;
  const taxRates = config.tax_rates.cit_is;
  
  let isAnnual: number;
  let formula: string;
  
  if (isReducedRateEnabled && profit > 0) {
    // Apply reduced rate on first 42500€, normal rate on rest
    const reducedPortion = Math.min(profit, taxRates.reduced_cap_profit);
    const normalPortion = Math.max(profit - taxRates.reduced_cap_profit, 0);
    
    isAnnual = reducedPortion * taxRates.reduced_rate + normalPortion * taxRates.normal_rate;
    formula = `${taxRates.reduced_rate * 100}% × min(${profit}, ${taxRates.reduced_cap_profit}) + ${taxRates.normal_rate * 100}% × max(${profit} - ${taxRates.reduced_cap_profit}, 0)`;
  } else {
    // Normal rate only
    isAnnual = profit * taxRates.normal_rate;
    formula = `${taxRates.normal_rate * 100}% × ${profit}`;
  }
  
  const isMonthlyPerPerson = isAnnual / (12 * divisor);
  
  return {
    taxableProfitAnnual: profit,
    isAnnual,
    isMonthlyPerPerson,
    isReducedRateApplied: isReducedRateEnabled,
    formula,
    diagnostics,
  };
}

/**
 * Compute VAT (TVA) from sales and purchases
 */
export function computeVAT(
  company: CompanyInputs,
  settings: SocialSettings,
  config: RatesConfig = defaultRates
): VATResult {
  const diagnostics = {
    missingInputs: [] as string[],
    warnings: [] as string[],
  };
  
  const divisor = getDivisor(settings);
  
  // Check for missing VAT data
  if (!company.vat || !company.vat.sales || !company.vat.purchases) {
    diagnostics.missingInputs.push('vat.sales', 'vat.purchases');
    return {
      vatCollectedAnnual: null,
      vatDeductibleAnnual: null,
      vatNetAnnual: null,
      vatNetMonthlyPerPerson: null,
      formula: 'N/A - missing VAT data',
      diagnostics,
    };
  }
  
  if (divisor === null || divisor === 0) {
    diagnostics.missingInputs.push('divisor (headcount or fte)');
    return {
      vatCollectedAnnual: null,
      vatDeductibleAnnual: null,
      vatNetAnnual: null,
      vatNetMonthlyPerPerson: null,
      formula: 'N/A - missing divisor',
      diagnostics,
    };
  }
  
  // Calculate collected VAT (on sales)
  const vatCollectedAnnual = company.vat.sales.reduce((sum, item) => {
    return sum + (item.baseHTAnnual * item.rate);
  }, 0);
  
  // Calculate deductible VAT (on purchases)
  const vatDeductibleAnnual = company.vat.purchases.reduce((sum, item) => {
    return sum + (item.baseHTAnnual * item.rate);
  }, 0);
  
  // Net VAT
  const vatNetAnnual = vatCollectedAnnual - vatDeductibleAnnual;
  const vatNetMonthlyPerPerson = vatNetAnnual / (12 * divisor);
  
  const formula = `(Σ sales × rate) - (Σ purchases × rate) = ${vatCollectedAnnual.toFixed(2)} - ${vatDeductibleAnnual.toFixed(2)}`;
  
  return {
    vatCollectedAnnual,
    vatDeductibleAnnual,
    vatNetAnnual,
    vatNetMonthlyPerPerson,
    formula,
    diagnostics,
  };
}

/**
 * Compute net imposable from gross salary and social contributions
 * Net imposable ≈ Gross - employee contributions (excluding CSG non-deductible)
 */
function computeNetImposable(
  grossMonthly: number,
  social: SocialResult
): number {
  // Net imposable = Gross - cotisations salariales - CSG déductible - CRDS (approximation)
  // In practice: Net imposable ≈ Gross × 0.78 for simplification
  // More accurate: Gross - (employee contributions + CSG déductible)
  const employeeContrib = social.totals.employeeContribMonthly;
  const csgDeductible = social.breakdown?.csgDeductible ?? 0;
  
  // Net imposable = Gross - cotisations salariales (hors CSG/CRDS) - CSG déductible
  return grossMonthly - employeeContrib - csgDeductible;
}

/**
 * Find the PAS rate from default brackets based on net imposable
 */
function findDefaultPASRate(
  netImposable: number,
  config: RatesConfig
): number {
  const brackets = config.pas_default_rates.brackets;
  
  for (const bracket of brackets) {
    const minOk = bracket.min === null || netImposable >= bracket.min;
    const maxOk = bracket.max === null || netImposable < bracket.max;
    
    if (minOk && maxOk) {
      return bracket.rate;
    }
  }
  
  // Fallback to highest bracket
  return brackets[brackets.length - 1].rate;
}

/**
 * Compute IR (Income Tax / Prélèvement à la Source)
 * Priority: manual IR > custom PAS rate > default bracket
 */
export function computeIR(
  employee: EmployeeInputs,
  social: SocialResult,
  config: RatesConfig = defaultRates
): IRResult {
  const diagnostics = {
    missingInputs: [] as string[],
    warnings: [] as string[],
  };
  
  // Priority 1: Manual IR amount
  if (employee.irMonthly !== undefined && employee.irMonthly !== null) {
    return {
      netImposable: null,
      pasRate: null,
      irMonthly: employee.irMonthly,
      source: 'manual',
      formula: `IR manuel: ${employee.irMonthly.toFixed(2)} €`,
      diagnostics,
    };
  }
  
  // Compute net imposable
  const netImposable = computeNetImposable(employee.grossMonthly, social);
  
  // Priority 2: Custom PAS rate
  if (employee.pasRate !== undefined && employee.pasRate !== null) {
    const irMonthly = netImposable * employee.pasRate;
    return {
      netImposable,
      pasRate: employee.pasRate,
      irMonthly,
      source: 'custom_rate',
      formula: `${netImposable.toFixed(2)} × ${(employee.pasRate * 100).toFixed(2)}%`,
      diagnostics,
    };
  }
  
  // Priority 3: Default bracket
  const defaultRate = findDefaultPASRate(netImposable, config);
  const irMonthly = netImposable * defaultRate;
  
  return {
    netImposable,
    pasRate: defaultRate,
    irMonthly,
    source: 'default_bracket',
    formula: `${netImposable.toFixed(2)} × ${(defaultRate * 100).toFixed(2)}% (barème par défaut)`,
    diagnostics,
  };
}
