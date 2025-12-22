// ============================================
// PART SOCIALE AGGREGATOR
// Combines all social components using V1 engine
// ============================================

import type {
  PartSocialeAutomationInputs,
  PartSocialeAutomatedResult,
  PartSocialeDiagnostic,
  CalculationResult,
  SocialRatesConfig,
  EmployeeSalaryResult,
  SocialContributionsResult,
  ContributionLine,
} from '../types';
import { computeDivisor, annualToMonthlyPerPerson } from './divisor';
import { computeSocialContributions, aggregateContributionsByCategory } from './socialContributions';
import { computeEmployeeSalary } from './employeeSalary';
import { computeIS } from './corporateTax';
import { computeVAT } from './vat';

// Import the new V1 engine
import {
  computePartSocialeV1,
  type PartSocialeV1Inputs,
  type SocialSettings,
  type EmployeeInputs as EngineEmployeeInputs,
  type CompanyInputs as EngineCompanyInputs,
} from '../engine';

// Import legacy rates for fallback
import ratesFr2025 from '../rates/fr/2025/social.json';

/**
 * Convert automation inputs to V1 engine inputs
 */
function toEngineInputs(inputs: PartSocialeAutomationInputs): PartSocialeV1Inputs {
  const { settings, employee, company, automation } = inputs;
  
  // Build period date from year (default to current month)
  const now = new Date();
  const periodDate = `${settings.year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  const engineSettings: SocialSettings = {
    year: settings.year,
    divisorMode: settings.divisorMode,
    headcount: settings.headcount,
    fte: settings.fte,
    periodDate,
  };
  
  const grossMonthly = employee.grossMonthly ?? employee.brutMonthly ?? null;
  
  // Get PAS rate if in auto mode with custom rate
  const pasRate = automation.irMode.mode === 'auto' && employee.pasRate !== undefined
    ? employee.pasRate
    : undefined;

  const engineEmployee: EngineEmployeeInputs = {
    grossMonthly: grossMonthly ?? 0,
    isCadre: employee.status === 'cadre',
    irMonthly: automation.irMode.mode === 'manual' 
      ? (automation.irMode.manualValueMonthly ?? employee.irMonthlyManual ?? employee.irMonthly ?? undefined)
      : undefined,
    pasRate: pasRate, // Pass PAS rate for auto calculation
    accidentAtMpRate: 0.0125, // Default AT/MP rate
  };
  
  const engineCompany: EngineCompanyInputs = {
    companyHeadcount: settings.headcount ?? 1,
    taxableProfitAnnual: company.taxableProfitAnnual,
    isReducedRateEnabled: company.isReducedRateEnabled,
    vat: {
      sales: company.vatSales.map(s => ({ rate: s.rate, baseHTAnnual: s.baseHTAnnual })),
      purchases: company.vatPurchases.map(p => ({ rate: p.rate, baseHTAnnual: p.baseHTAnnual })),
    },
  };
  
  return {
    settings: engineSettings,
    employee: engineEmployee,
    company: engineCompany,
  };
}

/**
 * Convert V1 engine social result to legacy ContributionLine format
 */
function engineLinesToContributionLines(lines: Array<{
  id: string;
  label: string;
  base: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  status: string;
  formula: string;
}>): ContributionLine[] {
  // Map engine contribution IDs to categories
  const categoryMap: Record<string, ContributionLine['category']> = {
    'maladie_employer': 'health',
    'vieillesse_plafonnee': 'retirement',
    'vieillesse_deplafonnee': 'retirement',
    'agirc_arrco_t1': 'retirement',
    'agirc_arrco_t2': 'retirement',
    'ceg_t1': 'retirement',
    'ceg_t2': 'retirement',
    'cet': 'retirement',
    'assurance_chomage': 'unemployment',
    'ags': 'unemployment',
    'apec': 'unemployment',
    'allocations_familiales': 'solidarity',
    'fnal': 'solidarity',
    'csa': 'solidarity',
    'at_mp': 'health',
    'csg': 'csg_crds',
    'crds': 'csg_crds',
  };

  return lines
    .filter(line => line.status === 'active')
    .map(line => ({
      label: line.label,
      category: categoryMap[line.id] ?? 'other',
      baseUsed: 'brut_total' as const,
      rate: line.base > 0 ? line.totalAmount / line.base : 0,
      rateEmployer: line.base > 0 ? line.employerAmount / line.base : 0,
      rateEmployee: line.base > 0 ? line.employeeAmount / line.base : 0,
      baseAmount: line.base,
      valueMonthly: line.totalAmount,
      valueMonthlyEmployer: line.employerAmount,
      valueMonthlyEmployee: line.employeeAmount,
      formula: line.formula,
    }));
}

/**
 * Compute the complete Part Sociale using the V1 engine
 * 
 * Part Sociale = Cotisations sociales + IR + IS + TVA nette
 */
export function computePartSociale(
  inputs: PartSocialeAutomationInputs,
  ratesConfig: SocialRatesConfig = ratesFr2025 as SocialRatesConfig
): PartSocialeAutomatedResult {
  const diagnostics: PartSocialeDiagnostic[] = [];

  // Check if we should use V1 engine (auto mode for contributions)
  const useV1Engine = inputs.automation.contribMode.mode === 'auto';
  
  if (useV1Engine) {
    // Use V1 engine with new JSON rates
    const engineInputs = toEngineInputs(inputs);
    const v1Result = computePartSocialeV1(engineInputs);
    
    // Convert engine diagnostics
    for (const warning of v1Result.diagnostics.warnings) {
      diagnostics.push({
        type: 'warning',
        code: 'ENGINE_WARNING',
        message: warning,
      });
    }
    
    for (const missing of v1Result.diagnostics.missingInputs) {
      diagnostics.push({
        type: 'warning',
        code: 'MISSING_INPUT',
        message: `Donnée manquante: ${missing}`,
        field: missing,
      });
    }
    
    // Convert social contributions result
    const contributionLines = engineLinesToContributionLines(v1Result.social.lines);
    
    // Calculate totals from lines
    let totalMonthlyEmployer = 0;
    let totalMonthlyEmployee = 0;
    let csgCrdsMonthly = 0;
    
    for (const line of contributionLines) {
      totalMonthlyEmployer += line.valueMonthlyEmployer ?? 0;
      totalMonthlyEmployee += line.valueMonthlyEmployee ?? 0;
      if (line.category === 'csg_crds') {
        csgCrdsMonthly += line.valueMonthlyEmployee ?? 0;
      }
    }
    
    const cotisations: SocialContributionsResult = {
      value: v1Result.social.totals.socialContribFusionMonthly,
      totalMonthly: v1Result.social.totals.socialContribFusionMonthly,
      totalAnnual: v1Result.social.totals.socialContribFusionMonthly * 12,
      totalMonthlyEmployer,
      totalMonthlyEmployee,
      csgCrdsMonthly: v1Result.social.totals.csgCrdsMonthly,
      lines: contributionLines,
      formula: `Cotisations V1 = ${v1Result.social.totals.socialContribFusionMonthly.toFixed(2)} €/mois`,
      sources: ['Barème France 2025 (JSON complet)'],
      assumptions: ['Calcul dynamique avec évaluateur sécurisé'],
      missingInputs: v1Result.diagnostics.missingInputs,
    };
    
    // Build IS result
    const is = {
      value: v1Result.is.isAnnual,
      annual: v1Result.is.isAnnual,
      monthlyPerPerson: v1Result.is.isMonthlyPerPerson,
      tranches: [] as { label: string; base: number; rate: number; amount: number }[],
      formula: v1Result.is.isAnnual !== null 
        ? `IS = ${v1Result.is.isAnnual.toFixed(2)} € annuel`
        : 'IS = ND',
      sources: ['Barème IS 2025'],
      assumptions: [],
      missingInputs: v1Result.is.diagnostics.missingInputs,
    };
    
    // Build VAT result
    const vat = {
      value: v1Result.vat.vatNetAnnual,
      collectedAnnual: v1Result.vat.vatCollectedAnnual,
      deductibleAnnual: v1Result.vat.vatDeductibleAnnual,
      netAnnual: v1Result.vat.vatNetAnnual,
      netMonthlyPerPerson: v1Result.vat.vatNetMonthlyPerPerson,
      salesBreakdown: [] as { rate: number; baseHT: number; vatAmount: number }[],
      purchasesBreakdown: [] as { rate: number; baseHT: number; vatAmount: number }[],
      formula: v1Result.vat.vatNetAnnual !== null
        ? `TVA nette = ${v1Result.vat.vatNetAnnual.toFixed(2)} € annuel`
        : 'TVA = ND',
      sources: ['Taux TVA France 2025'],
      assumptions: [],
      missingInputs: v1Result.vat.diagnostics.missingInputs,
    };
    
    // Build IR result from engine
    const irSource = v1Result.ir.source === 'manual' 
      ? ['Saisie manuelle'] 
      : v1Result.ir.source === 'custom_rate'
        ? ['Taux PAS personnalisé']
        : ['Barème PAS par défaut 2025'];
    
    const ir: CalculationResult & { 
      netImposable?: number | null;
      pasRate?: number | null;
      irSource?: string;
    } = {
      value: v1Result.ir.irMonthly,
      netImposable: v1Result.ir.netImposable,
      pasRate: v1Result.ir.pasRate,
      irSource: v1Result.ir.source,
      formula: v1Result.ir.formula,
      sources: irSource,
      assumptions: [],
      missingInputs: v1Result.ir.diagnostics.missingInputs,
    };
    
    // Build employee result (simplified for V1)
    const grossMonthly = inputs.employee.grossMonthly ?? inputs.employee.brutMonthly ?? null;
    const netBeforeIR = grossMonthly !== null 
      ? grossMonthly - totalMonthlyEmployee - csgCrdsMonthly
      : null;
    const netAfterIR = netBeforeIR !== null && v1Result.irMonthly !== null
      ? netBeforeIR - v1Result.irMonthly
      : null;
    
    const employee: EmployeeSalaryResult = {
      grossMonthly,
      employeeContribMonthly: totalMonthlyEmployee,
      csgCrdsMonthly,
      netBeforeIR,
      netTaxable: v1Result.ir.netImposable ?? netBeforeIR, // Use engine's net imposable
      irMonthly: v1Result.ir.irMonthly,
      netAfterIR,
      irMode: v1Result.ir.source === 'manual' ? 'manual' : 'auto',
      contributions: cotisations,
      formula: netAfterIR !== null 
        ? `Net après IR = ${netAfterIR.toFixed(2)} €/mois`
        : 'Net après IR = ND',
      sources: ['Calcul V1'],
      assumptions: [],
      missingInputs: [],
    };
    
    // Calculate total
    const totalMonthly = v1Result.totals.partSocialeTotalMonthly;
    const isPartial = v1Result.totals.irMonthly === null || 
                      v1Result.totals.isMonthlyPerPerson === null ||
                      v1Result.totals.vatNetMonthlyPerPerson === null;
    
    return {
      cotisations,
      is,
      vat,
      ir,
      employee,
      total: {
        monthlyPerPerson: totalMonthly,
        isPartial,
        formula: totalMonthly !== null
          ? `Part Sociale V1 = ${totalMonthly.toFixed(2)} €/mois`
          : 'Part Sociale = ND (données insuffisantes)',
      },
      diagnostics,
    };
  }

  // Fallback to legacy calculation
  return computePartSocialeLegacy(inputs, ratesConfig);
}

/**
 * Legacy computation (original implementation)
 */
function computePartSocialeLegacy(
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
  lines: { 
    label: string; 
    value: number | null; 
    pct: number | null;
    rate?: number | null;
    rateEmployee?: number | null;
    rateEmployer?: number | null;
    irDetails?: {
      netImposable: number | null;
      pasRate: number | null;
      source: 'manual' | 'custom_rate' | 'default_bracket';
    };
  }[];
  total: { total: number | null; pct: number | null; isPartial: boolean };
} {
  const calculatePct = (value: number | null): number | null => {
    if (value === null || vp === null || vp === 0) return null;
    return (value / vp) * 100;
  };

  // Aggregate contributions by category
  const contribCategories = aggregateContributionsByCategory(result.cotisations);

  const lines: { 
    label: string; 
    value: number | null; 
    pct: number | null;
    rate?: number | null;
    rateEmployee?: number | null;
    rateEmployer?: number | null;
    irDetails?: {
      netImposable: number | null;
      pasRate: number | null;
      source: 'manual' | 'custom_rate' | 'default_bracket';
    };
  }[] = [];

  // Add contribution categories with rates
  for (const cat of contribCategories) {
    lines.push({
      label: cat.label,
      value: cat.totalMonthly,
      pct: calculatePct(cat.totalMonthly),
      rate: cat.totalRate,
      rateEmployee: cat.totalRateEmployee,
      rateEmployer: cat.totalRateEmployer,
    });
  }

  // Add IR with details (taux PAS, source, net imposable)
  const irResult = result.ir as { 
    value: number | null; 
    netImposable?: number | null; 
    pasRate?: number | null; 
    irSource?: string; 
  };
  lines.push({
    label: 'Impôt sur le revenu',
    value: result.ir.value,
    pct: calculatePct(result.ir.value),
    rate: irResult.pasRate ?? null,
    irDetails: {
      netImposable: irResult.netImposable ?? null,
      pasRate: irResult.pasRate ?? null,
      source: (irResult.irSource as 'manual' | 'custom_rate' | 'default_bracket') ?? 'manual',
    },
  });

  // Add IS (monthly per person) - show 25% or 15% rate
  const isRate = result.is.annual !== null && result.is.annual > 0 
    ? (result.is.tranches?.length > 0 
        ? result.is.tranches.reduce((sum, t) => sum + t.amount, 0) / 
          result.is.tranches.reduce((sum, t) => sum + t.base, 0)
        : 0.25)
    : null;
  lines.push({
    label: 'Impôt sur les sociétés',
    value: result.is.monthlyPerPerson,
    pct: calculatePct(result.is.monthlyPerPerson),
    rate: isRate,
  });

  // Add TVA (monthly per person) - typically 20%
  lines.push({
    label: 'TVA nette reversée',
    value: result.vat.netMonthlyPerPerson,
    pct: calculatePct(result.vat.netMonthlyPerPerson),
    rate: 0.20, // Default French VAT rate
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
