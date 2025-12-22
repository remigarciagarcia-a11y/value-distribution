// ============================================
// SOCIAL CONTRIBUTIONS CALCULATOR
// France V1 - Employer + Employee combined
// ============================================

import type {
  AutomatedSettings,
  EmployeeInputs,
  SocialAutomationConfig,
  SocialContributionsResult,
  ContributionLine,
  SocialRatesConfig,
} from '../types';
import { computeDivisor } from './divisor';

// Default rates for 2025 if config not loaded
import ratesFr2025 from '../rates/fr/2025/social.json';

/**
 * Compute social contributions (employer + employee combined)
 * 
 * @param employee Employee inputs (must have grossMonthly or brutMonthly for auto mode)
 * @param settings Calculation settings
 * @param automation Automation config (auto/manual mode)
 * @param ratesConfig Optional rates configuration
 */
export function computeSocialContributions(
  employee: EmployeeInputs,
  settings: AutomatedSettings,
  automation: SocialAutomationConfig,
  ratesConfig: SocialRatesConfig = ratesFr2025 as SocialRatesConfig
): SocialContributionsResult {
  const missingInputs: string[] = [];
  const sources: string[] = [];
  const assumptions: string[] = [];
  const lines: ContributionLine[] = [];

  // Check if manual mode
  if (automation.contribMode.mode === 'manual') {
    const manualMonthly = automation.contribMode.manualValueMonthly;
    const manualAnnual = automation.contribMode.manualValueAnnual;
    
    let totalMonthly: number | null = null;
    let totalAnnual: number | null = null;
    
    if (manualMonthly !== null && manualMonthly !== undefined) {
      totalMonthly = manualMonthly;
      totalAnnual = manualMonthly * 12;
    } else if (manualAnnual !== null && manualAnnual !== undefined) {
      const divisorResult = computeDivisor(settings);
      if (divisorResult.divisor !== null) {
        totalMonthly = manualAnnual / (12 * divisorResult.divisor);
        totalAnnual = manualAnnual;
      } else {
        missingInputs.push(...divisorResult.missingInputs);
      }
    } else {
      missingInputs.push('automation.contribMode.manualValue');
    }

    return {
      value: totalMonthly,
      totalMonthly,
      totalAnnual,
      totalMonthlyEmployer: null,
      totalMonthlyEmployee: null,
      csgCrdsMonthly: null,
      lines: [],
      formula: 'Mode manuel: valeur saisie par l\'utilisateur',
      sources: ['Saisie manuelle'],
      assumptions: [],
      missingInputs,
    };
  }

  // AUTO mode - need grossMonthly (with fallback to brutMonthly)
  const grossMonthly = employee.grossMonthly ?? employee.brutMonthly ?? null;
  
  if (grossMonthly === null || grossMonthly <= 0) {
    missingInputs.push('employee.grossMonthly');
    return {
      value: null,
      totalMonthly: null,
      totalAnnual: null,
      totalMonthlyEmployer: null,
      totalMonthlyEmployee: null,
      csgCrdsMonthly: null,
      lines: [],
      formula: 'Cotisations = Σ(assiette × taux) — Salaire brut requis',
      sources: [],
      assumptions: [],
      missingInputs,
    };
  }

  const pmssMonthly = ratesConfig.pmss.monthly;
  const brutPlafonne = Math.min(grossMonthly, pmssMonthly);

  sources.push(`Barème cotisations ${ratesConfig.year}`);
  sources.push(`PMSS ${ratesConfig.year}: ${pmssMonthly.toLocaleString('fr-FR')} €/mois`);
  assumptions.push('Taux standards sans réduction Fillon');

  let totalMonthlyEmployer = 0;
  let totalMonthlyEmployee = 0;
  let csgCrdsMonthly = 0;

  // Calculate each contribution
  for (const contrib of ratesConfig.contributions) {
    // Skip if status-specific and doesn't match
    if (contrib.cadreOnly && employee.status !== 'cadre') continue;
    if (contrib.nonCadreOnly && employee.status === 'cadre') continue;

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
      assumptions.push(`${contrib.labelFr}: calculé sur 98.25% du brut`);
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
      formula: `${adjustedBase.toFixed(2)} € × ${(contrib.rateTotal * 100).toFixed(2)}% = ${valueMonthly.toFixed(2)} €`,
    };

    lines.push(line);
  }

  // Calculate totals
  const totalMonthly = totalMonthlyEmployer + totalMonthlyEmployee;
  const totalAnnual = totalMonthly * 12;

  return {
    value: totalMonthly,
    totalMonthly,
    totalAnnual,
    totalMonthlyEmployer,
    totalMonthlyEmployee,
    csgCrdsMonthly,
    lines,
    formula: `Cotisations sociales (${employee.status}) = ${totalMonthly.toFixed(2)} €/mois`,
    sources,
    assumptions,
    missingInputs,
  };
}

/**
 * Aggregate contributions by category for display
 */
export function aggregateContributionsByCategory(
  result: SocialContributionsResult
): { category: string; label: string; totalMonthly: number }[] {
  const categoryLabels: Record<string, string> = {
    health: 'Santé',
    retirement: 'Retraite',
    unemployment: 'Chômage / sécurisation',
    solidarity: 'Solidarité, famille',
    csg_crds: 'CSG / CRDS',
    other: 'Autres contributions',
  };

  const byCategory: Record<string, number> = {};
  
  for (const line of result.lines) {
    byCategory[line.category] = (byCategory[line.category] ?? 0) + (line.valueMonthly ?? 0);
  }

  return Object.entries(byCategory).map(([category, total]) => ({
    category,
    label: categoryLabels[category] ?? category,
    totalMonthly: total,
  }));
}
