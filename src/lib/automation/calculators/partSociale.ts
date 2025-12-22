// ============================================
// PART SOCIALE AGGREGATOR
// Combines all social components
// ============================================

import type {
  PartSocialeAutomationInputs,
  PartSocialeAutomatedResult,
  PartSocialeDiagnostic,
  CalculationResult,
  SocialRatesConfig,
  EmployeeSalaryResult,
} from '../types';
import { computeDivisor, annualToMonthlyPerPerson } from './divisor';
import { computeSocialContributions, aggregateContributionsByCategory } from './socialContributions';
import { computeEmployeeSalary } from './employeeSalary';
import { computeIS } from './corporateTax';
import { computeVAT } from './vat';

// Import default rates
import ratesFr2025 from '../rates/fr/2025/social.json';

/**
 * Compute the complete Part Sociale
 * 
 * Part Sociale = Cotisations sociales + IR + IS + TVA nette
 */
export function computePartSociale(
  inputs: PartSocialeAutomationInputs,
  ratesConfig: SocialRatesConfig = ratesFr2025 as SocialRatesConfig
): PartSocialeAutomatedResult {
  const diagnostics: PartSocialeDiagnostic[] = [];

  // Compute divisor first
  const divisorResult = computeDivisor(inputs.settings);
  if (divisorResult.divisor === null) {
    diagnostics.push({
      type: 'error',
      code: 'MISSING_DIVISOR',
      message: `Diviseur manquant: ${divisorResult.missingInputs.join(', ')}`,
    });
  }

  // 1. Compute employee salary (brut → net before IR → IR → net after IR)
  const employeeResult = computeEmployeeSalary(
    inputs.employee,
    inputs.settings,
    inputs.automation,
    ratesConfig
  );

  if (employeeResult.missingInputs.length > 0) {
    diagnostics.push({
      type: 'warning',
      code: 'MISSING_EMPLOYEE_INPUTS',
      message: `Salarié: données manquantes (${employeeResult.missingInputs.join(', ')})`,
      field: 'employee',
    });
  }

  // 2. Compute social contributions (full: employer + employee)
  const cotisations = computeSocialContributions(
    inputs.employee,
    inputs.settings,
    inputs.automation,
    ratesConfig
  );

  if (cotisations.missingInputs.length > 0 && inputs.automation.contribMode.mode === 'auto') {
    diagnostics.push({
      type: 'warning',
      code: 'MISSING_CONTRIB_INPUTS',
      message: `Cotisations: données manquantes (${cotisations.missingInputs.join(', ')})`,
      field: 'cotisations',
    });
  }

  // 3. Compute IS (Corporate Tax)
  const is = computeIS(
    inputs.company,
    inputs.settings,
    inputs.automation
  );

  if (is.missingInputs.length > 0 && inputs.automation.isMode.mode === 'auto') {
    diagnostics.push({
      type: 'warning',
      code: 'MISSING_IS_INPUTS',
      message: `IS: données manquantes (${is.missingInputs.join(', ')})`,
      field: 'is',
    });
  }

  // 4. Compute VAT
  const vat = computeVAT(
    inputs.company,
    inputs.settings,
    inputs.automation
  );

  if (vat.missingInputs.length > 0 && inputs.automation.vatMode.mode === 'auto') {
    diagnostics.push({
      type: 'warning',
      code: 'MISSING_VAT_INPUTS',
      message: `TVA: données manquantes (${vat.missingInputs.join(', ')})`,
      field: 'vat',
    });
  }

  // 5. Income Tax (IR) - from employee calculation
  const ir: CalculationResult = {
    value: employeeResult.irMonthly,
    formula: employeeResult.irMonthly !== null 
      ? `IR (${employeeResult.irMode}) = ${employeeResult.irMonthly.toFixed(2)} €/mois`
      : 'IR = ND (taux PAS manquant)',
    sources: employeeResult.irMode === 'auto' ? ['Calcul PAS automatique'] : 
             employeeResult.irMode === 'manual' ? ['Saisie manuelle'] : [],
    assumptions: employeeResult.irMode === 'nd' ? ['IR non calculable: taux PAS requis'] : [],
    missingInputs: employeeResult.irMode === 'nd' ? ['employee.pasRate'] : [],
  };

  if (ir.missingInputs.length > 0) {
    diagnostics.push({
      type: 'info',
      code: 'MISSING_IR_INPUTS',
      message: `IR: taux PAS manquant`,
      field: 'ir',
    });
  }

  // 6. Aggregate totals
  // Part sociale = cotisations (total) + IR + IS (mensuel/pers) + TVA (mensuel/pers)
  const components: (number | null)[] = [
    cotisations.totalMonthly,
    ir.value,
    is.monthlyPerPerson,
    vat.netMonthlyPerPerson,
  ];

  const nonNullComponents = components.filter((c): c is number => c !== null);
  const totalMonthly = nonNullComponents.length > 0
    ? nonNullComponents.reduce((sum, c) => sum + c, 0)
    : null;

  const isPartial = nonNullComponents.length < components.length;

  // Build formula
  const formulaParts: string[] = [];
  if (cotisations.totalMonthly !== null) {
    formulaParts.push(`Cotisations: ${cotisations.totalMonthly.toFixed(2)} €`);
  }
  if (ir.value !== null) {
    formulaParts.push(`IR: ${ir.value.toFixed(2)} €`);
  }
  if (is.monthlyPerPerson !== null) {
    formulaParts.push(`IS: ${is.monthlyPerPerson.toFixed(2)} €`);
  }
  if (vat.netMonthlyPerPerson !== null) {
    formulaParts.push(`TVA: ${vat.netMonthlyPerPerson.toFixed(2)} €`);
  }

  const formula = totalMonthly !== null
    ? `Part Sociale = ${formulaParts.join(' + ')} = ${totalMonthly.toFixed(2)} €/mois`
    : 'Part Sociale = ND (données insuffisantes)';

  // Add diagnostic if partial
  if (isPartial && totalMonthly !== null) {
    diagnostics.push({
      type: 'info',
      code: 'PARTIAL_TOTAL',
      message: 'Total partiel: certaines composantes sont ND',
    });
  }

  return {
    cotisations,
    is,
    vat,
    ir,
    employee: employeeResult,
    total: {
      monthlyPerPerson: totalMonthly,
      isPartial,
      formula,
    },
    diagnostics,
  };
}

/**
 * Convert Part Sociale result to legacy PartSocialeVM format for display
 */
export function toPartSocialeVM(
  result: PartSocialeAutomatedResult,
  vp: number | null
): {
  lines: { label: string; value: number | null; pct: number | null }[];
  total: { total: number | null; pct: number | null; isPartial: boolean };
} {
  const calculatePct = (value: number | null): number | null => {
    if (value === null || vp === null || vp === 0) return null;
    return (value / vp) * 100;
  };

  // Aggregate contributions by category
  const contribCategories = aggregateContributionsByCategory(result.cotisations);

  const lines: { label: string; value: number | null; pct: number | null }[] = [];

  // Add contribution categories
  for (const cat of contribCategories) {
    lines.push({
      label: cat.label,
      value: cat.totalMonthly,
      pct: calculatePct(cat.totalMonthly),
    });
  }

  // Add IR
  lines.push({
    label: 'Impôt sur le revenu',
    value: result.ir.value,
    pct: calculatePct(result.ir.value),
  });

  // Add IS (monthly per person)
  lines.push({
    label: 'Impôt sur les sociétés',
    value: result.is.monthlyPerPerson,
    pct: calculatePct(result.is.monthlyPerPerson),
  });

  // Add TVA (monthly per person)
  lines.push({
    label: 'TVA nette reversée',
    value: result.vat.netMonthlyPerPerson,
    pct: calculatePct(result.vat.netMonthlyPerPerson),
  });

  return {
    lines,
    total: {
      total: result.total.monthlyPerPerson,
      pct: calculatePct(result.total.monthlyPerPerson),
      isPartial: result.total.isPartial,
    },
  };
}
