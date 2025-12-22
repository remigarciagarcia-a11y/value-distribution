/**
 * Part Sociale V1 - Aggregate all social components
 * Combines: Social contributions + IR (auto/manual) + IS + VAT (per-person)
 */

import { computeSocialFromGross } from './socialContributions';
import { computeIS, computeVAT, computeIR } from './taxCalculations';
import type {
  RatesConfig,
  SocialSettings,
  EmployeeInputs,
  CompanyInputs,
  PartSocialeV1Result,
} from './types';
import ratesJson from '../rates/fr/2025.json';

const defaultRates = ratesJson as RatesConfig;

export interface PartSocialeV1Inputs {
  settings: SocialSettings;
  employee: EmployeeInputs;
  company: CompanyInputs;
}

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
 * Compute the complete Part Sociale
 * Aggregates: cotisations fusion + IR (auto/manual) + IS + TVA (per-person)
 */
export function computePartSocialeV1(
  inputs: PartSocialeV1Inputs,
  config: RatesConfig = defaultRates
): PartSocialeV1Result {
  const { settings, employee, company } = inputs;
  
  const diagnostics = {
    missingInputs: [] as string[],
    warnings: [] as string[],
  };
  
  const divisor = getDivisor(settings);
  
  // Compute social contributions
  const social = computeSocialFromGross(employee, company, settings, config);
  
  // Compute IR (uses social result for net imposable calculation)
  const ir = computeIR(employee, social, config);
  
  // Compute IS
  const is = computeIS(company, settings, config);
  
  // Compute VAT
  const vat = computeVAT(company, settings, config);
  
  // IR monthly from IR result
  const irMonthly = ir.irMonthly;
  
  // Merge diagnostics
  diagnostics.missingInputs.push(...social.diagnostics.missingInputs);
  diagnostics.missingInputs.push(...ir.diagnostics.missingInputs);
  diagnostics.missingInputs.push(...is.diagnostics.missingInputs);
  diagnostics.missingInputs.push(...vat.diagnostics.missingInputs);
  diagnostics.warnings.push(...social.diagnostics.warnings);
  diagnostics.warnings.push(...ir.diagnostics.warnings);
  diagnostics.warnings.push(...is.diagnostics.warnings);
  diagnostics.warnings.push(...vat.diagnostics.warnings);
  
  if (divisor === null) {
    diagnostics.missingInputs.push('divisor');
  }
  
  // Calculate total Part Sociale
  let partSocialeTotalMonthly: number | null = null;
  
  // Only calculate if we have social contributions
  if (social.totals.socialContribFusionMonthly > 0) {
    partSocialeTotalMonthly = social.totals.socialContribFusionMonthly;
    
    // Add IR if available
    if (irMonthly !== null) {
      partSocialeTotalMonthly += irMonthly;
    }
    
    // Add IS per person if available
    if (is.isMonthlyPerPerson !== null) {
      partSocialeTotalMonthly += is.isMonthlyPerPerson;
    }
    
    // Add VAT per person if available
    if (vat.vatNetMonthlyPerPerson !== null) {
      partSocialeTotalMonthly += vat.vatNetMonthlyPerPerson;
    }
  }
  
  return {
    social,
    ir,
    is,
    vat,
    irMonthly,
    divisor,
    totals: {
      socialContribFusionMonthly: social.totals.socialContribFusionMonthly,
      irMonthly,
      isMonthlyPerPerson: is.isMonthlyPerPerson,
      vatNetMonthlyPerPerson: vat.vatNetMonthlyPerPerson,
      partSocialeTotalMonthly,
    },
    diagnostics,
  };
}

// Re-export all types and functions
export * from './types';
export { computeSocialFromGross } from './socialContributions';
export { computeIS, computeVAT, computeIR } from './taxCalculations';
export { evalExpr, evalCondition } from './evaluator';
