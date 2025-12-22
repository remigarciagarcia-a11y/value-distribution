/**
 * Compute IS (Corporate Tax) and VAT
 */

import type {
  RatesConfig,
  SocialSettings,
  CompanyInputs,
  ISResult,
  VATResult,
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
