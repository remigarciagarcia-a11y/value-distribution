// ============================================
// SOCIAL CONTRIBUTIONS CALCULATOR
// France V1
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
 * @param employee Employee inputs (must have brutMonthly for auto mode)
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
      lines: [],
      formula: 'Mode manuel: valeur saisie par l\'utilisateur',
      sources: ['Saisie manuelle'],
      assumptions: [],
      missingInputs,
    };
  }

  // AUTO mode - need brutMonthly
  if (employee.brutMonthly === null || employee.brutMonthly <= 0) {
    missingInputs.push('employee.brutMonthly');
    return {
      value: null,
      totalMonthly: null,
      totalAnnual: null,
      lines: [],
      formula: 'Cotisations = Σ(assiette × taux) — Salaire brut requis',
      sources: [],
      assumptions: [],
      missingInputs,
    };
  }

  const brutMonthly = employee.brutMonthly;
  const pmssMonthly = ratesConfig.pmss.monthly;
  const brutPlafonne = Math.min(brutMonthly, pmssMonthly);

  sources.push(`Barème cotisations ${ratesConfig.year}`);
  sources.push(`PMSS ${ratesConfig.year}: ${pmssMonthly.toLocaleString('fr-FR')} €/mois`);
  assumptions.push('Taux standards sans réduction Fillon');

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
      baseAmount = brutMonthly;
      baseUsed = 'brut_total';
    }

    // CSG/CRDS is calculated on 98.25% of brut
    let adjustedBase = baseAmount;
    if (contrib.category === 'csg_crds') {
      adjustedBase = baseAmount * 0.9825;
      assumptions.push(`${contrib.labelFr}: calculé sur 98.25% du brut`);
    }

    const valueMonthly = adjustedBase * contrib.rateTotal;

    const line: ContributionLine = {
      label: contrib.labelFr,
      category: contrib.category,
      baseUsed,
      rate: contrib.rateTotal,
      baseAmount: adjustedBase,
      valueMonthly,
      formula: `${adjustedBase.toFixed(2)} € × ${(contrib.rateTotal * 100).toFixed(2)}% = ${valueMonthly.toFixed(2)} €`,
    };

    lines.push(line);
  }

  // Calculate totals
  const totalMonthly = lines.reduce((sum, line) => sum + (line.valueMonthly ?? 0), 0);
  const totalAnnual = totalMonthly * 12;

  // Group by category for summary
  const byCategory: Record<string, number> = {};
  for (const line of lines) {
    byCategory[line.category] = (byCategory[line.category] ?? 0) + (line.valueMonthly ?? 0);
  }

  return {
    value: totalMonthly,
    totalMonthly,
    totalAnnual,
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
