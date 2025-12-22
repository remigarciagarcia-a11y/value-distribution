// ============================================
// EMPLOYEE SALARY CALCULATOR
// Computes: gross → contributions → netBeforeIR → IR → netAfterIR
// ============================================

import type {
  AutomatedSettings,
  EmployeeInputs,
  SocialAutomationConfig,
  EmployeeSalaryResult,
  SocialContributionsResult,
  ContributionLine,
  SocialRatesConfig,
} from '../types';

// Import default rates
import ratesFr2025 from '../rates/fr/2025/social.json';
// Import full rates config for PAS brackets
import fullRates2025 from '../rates/fr/2025.json';

/**
 * Compute complete employee salary breakdown
 * 
 * Flow: grossMonthly → employee contributions → netBeforeIR → IR → netAfterIR
 */
export function computeEmployeeSalary(
  employee: EmployeeInputs,
  settings: AutomatedSettings,
  automation: SocialAutomationConfig,
  ratesConfig: SocialRatesConfig = ratesFr2025 as SocialRatesConfig
): EmployeeSalaryResult {
  const missingInputs: string[] = [];
  const sources: string[] = [];
  const assumptions: string[] = [];

  // Source of truth: grossMonthly (with fallback to brutMonthly for compatibility)
  const grossMonthly = employee.grossMonthly ?? employee.brutMonthly ?? null;

  if (grossMonthly === null || grossMonthly <= 0) {
    missingInputs.push('employee.grossMonthly');
    return {
      grossMonthly: null,
      employeeContribMonthly: null,
      csgCrdsMonthly: null,
      netBeforeIR: null,
      netTaxable: null,
      irMonthly: null,
      netAfterIR: null,
      irMode: 'nd',
      pasRateUsed: null,
      contributions: createEmptyContribResult(),
      formula: 'Salaire brut requis pour calcul',
      sources: [],
      assumptions: [],
      missingInputs,
    };
  }

  // Step 1: Compute employee contributions (salariées seulement)
  const contribResult = computeEmployeeContributions(
    grossMonthly,
    employee.status,
    ratesConfig
  );

  sources.push(...contribResult.sources);
  assumptions.push(...contribResult.assumptions);

  const employeeContribMonthly = contribResult.totalMonthlyEmployee;
  const csgCrdsMonthly = contribResult.csgCrdsMonthly;

  // Step 2: Compute net before IR
  let netBeforeIR: number | null = null;
  if (employeeContribMonthly !== null && csgCrdsMonthly !== null) {
    netBeforeIR = grossMonthly - employeeContribMonthly - csgCrdsMonthly;
  }

  // Step 3: Compute net taxable (V1 simplification: ≈ netBeforeIR)
  // More precise would be: grossMonthly - employeeContrib - CSG_deductible + CSG_non_deductible
  let netTaxable: number | null = netBeforeIR;
  assumptions.push('Net imposable ≈ Net avant IR (simplification V1)');

  // Step 4: Compute IR
  let irMonthly: number | null = null;
  let irMode: 'auto' | 'manual' | 'nd' = 'nd';
  let pasRateUsed: number | null = null;

  // Mode manual: use the pasRate input to calculate IR
  if (automation.irMode.mode === 'manual') {
    if (employee.pasRate !== null && employee.pasRate >= 0 && employee.pasRate <= 1) {
      if (netTaxable !== null) {
        pasRateUsed = employee.pasRate;
        irMonthly = netTaxable * pasRateUsed;
        irMode = 'manual';
        sources.push('Taux PAS saisi manuellement');
      }
    } else if (automation.irMode.manualValueMonthly !== null) {
      // Fallback: direct IR amount (legacy)
      irMonthly = automation.irMode.manualValueMonthly;
      irMode = 'manual';
    }
  }

  // Mode auto: calculate PAS rate from net imposable using default brackets
  if (irMode === 'nd' && automation.irMode.mode === 'auto') {
    if (netTaxable !== null) {
      // Find the PAS rate from default brackets based on net imposable
      pasRateUsed = findDefaultPASRate(netTaxable, ratesConfig);
      irMonthly = netTaxable * pasRateUsed;
      irMode = 'auto';
      sources.push('Taux PAS calculé automatiquement (barème par défaut)');
    } else {
      missingInputs.push('netTaxable (dérivé de grossMonthly)');
    }
  }

  // Step 5: Compute net after IR
  let netAfterIR: number | null = null;
  if (netBeforeIR !== null && irMonthly !== null) {
    netAfterIR = netBeforeIR - irMonthly;
  } else if (netBeforeIR !== null && irMonthly === null) {
    // IR is ND, so netAfterIR is also ND
    netAfterIR = null;
  }

  // Build formula
  const formulaParts: string[] = [];
  formulaParts.push(`Brut: ${grossMonthly.toFixed(2)} €`);
  if (employeeContribMonthly !== null) {
    formulaParts.push(`Cotis. sal.: -${employeeContribMonthly.toFixed(2)} €`);
  }
  if (csgCrdsMonthly !== null) {
    formulaParts.push(`CSG/CRDS: -${csgCrdsMonthly.toFixed(2)} €`);
  }
  if (netBeforeIR !== null) {
    formulaParts.push(`Net avant IR: ${netBeforeIR.toFixed(2)} €`);
  }
  if (irMonthly !== null) {
    formulaParts.push(`IR: -${irMonthly.toFixed(2)} €`);
  }
  if (netAfterIR !== null) {
    formulaParts.push(`Net après IR: ${netAfterIR.toFixed(2)} €`);
  }

  return {
    grossMonthly,
    employeeContribMonthly,
    csgCrdsMonthly,
    netBeforeIR,
    netTaxable,
    irMonthly,
    netAfterIR,
    irMode,
    pasRateUsed,
    contributions: contribResult,
    formula: formulaParts.join(' → '),
    sources,
    assumptions,
    missingInputs,
  };
}

/**
 * Find the PAS rate from default brackets based on net imposable
 */
function findDefaultPASRate(
  netImposable: number,
  _ratesConfig: SocialRatesConfig
): number {
  // Use imported rates for PAS brackets
  const brackets = fullRates2025.pas_default_rates?.brackets;
  
  if (!brackets || !Array.isArray(brackets)) {
    // Fallback to a default rate if brackets not available
    return 0;
  }
  
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
 * Compute only the employee portion of social contributions
 */
function computeEmployeeContributions(
  grossMonthly: number,
  status: 'cadre' | 'non_cadre',
  ratesConfig: SocialRatesConfig
): SocialContributionsResult {
  const sources: string[] = [];
  const assumptions: string[] = [];
  const lines: ContributionLine[] = [];

  const pmssMonthly = ratesConfig.pmss.monthly;
  const brutPlafonne = Math.min(grossMonthly, pmssMonthly);

  sources.push(`Barème cotisations ${ratesConfig.year}`);
  sources.push(`PMSS ${ratesConfig.year}: ${pmssMonthly.toLocaleString('fr-FR')} €/mois`);

  let totalMonthlyEmployee = 0;
  let totalMonthlyEmployer = 0;
  let csgCrdsMonthly = 0;

  for (const contrib of ratesConfig.contributions) {
    // Skip if status-specific and doesn't match
    if (contrib.cadreOnly && status !== 'cadre') continue;
    if (contrib.nonCadreOnly && status === 'cadre') continue;

    let baseAmount: number;
    let baseUsed: ContributionLine['baseUsed'];

    if (contrib.base === 'brut_plafonne_pmss') {
      baseAmount = brutPlafonne;
      baseUsed = 'brut_plafonne_pmss';
    } else {
      baseAmount = grossMonthly;
      baseUsed = 'brut_total';
    }

    // CSG/CRDS is calculated on 98.25% of brut
    let adjustedBase = baseAmount;
    if (contrib.category === 'csg_crds') {
      adjustedBase = grossMonthly * 0.9825;
    }

    const valueMonthlyEmployer = adjustedBase * contrib.rateEmployer;
    const valueMonthlyEmployee = adjustedBase * contrib.rateEmployee;
    const valueMonthly = valueMonthlyEmployer + valueMonthlyEmployee;

    totalMonthlyEmployer += valueMonthlyEmployer;
    totalMonthlyEmployee += valueMonthlyEmployee;

    if (contrib.category === 'csg_crds') {
      csgCrdsMonthly += valueMonthlyEmployee;
    }

    const line: ContributionLine = {
      label: contrib.labelFr,
      category: contrib.category,
      baseUsed,
      rate: contrib.rateTotal,
      rateEmployer: contrib.rateEmployer,
      rateEmployee: contrib.rateEmployee,
      baseAmount: adjustedBase,
      valueMonthly,
      valueMonthlyEmployer,
      valueMonthlyEmployee,
      formula: `${adjustedBase.toFixed(2)} € × ${(contrib.rateEmployee * 100).toFixed(2)}% = ${valueMonthlyEmployee.toFixed(2)} € (sal.)`,
    };

    lines.push(line);
  }

  const totalMonthly = totalMonthlyEmployer + totalMonthlyEmployee;

  return {
    value: totalMonthlyEmployee,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    totalMonthlyEmployer,
    totalMonthlyEmployee,
    csgCrdsMonthly,
    lines,
    formula: `Cotisations salariales (${status}) = ${totalMonthlyEmployee.toFixed(2)} €/mois`,
    sources,
    assumptions,
    missingInputs: [],
  };
}

function createEmptyContribResult(): SocialContributionsResult {
  return {
    value: null,
    totalMonthly: null,
    totalAnnual: null,
    totalMonthlyEmployer: null,
    totalMonthlyEmployee: null,
    csgCrdsMonthly: null,
    lines: [],
    formula: 'ND',
    sources: [],
    assumptions: [],
    missingInputs: ['employee.grossMonthly'],
  };
}