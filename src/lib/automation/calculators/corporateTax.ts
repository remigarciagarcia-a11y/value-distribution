// ============================================
// CORPORATE TAX (IS) CALCULATOR
// France V1
// ============================================

import type {
  AutomatedSettings,
  CompanyInputs,
  SocialAutomationConfig,
  ISResult,
} from '../types';
import { computeDivisor, annualToMonthlyPerPerson } from './divisor';

// IS rates for France 2025
const IS_RATES = {
  normalRate: 0.25, // 25% standard rate
  reducedRate: 0.15, // 15% reduced rate for PME
  reducedRateCap: 42500, // Cap for reduced rate (€)
};

/**
 * Compute Corporate Tax (Impôt sur les Sociétés)
 * 
 * @param company Company inputs
 * @param settings Calculation settings
 * @param automation Automation config
 */
export function computeIS(
  company: CompanyInputs,
  settings: AutomatedSettings,
  automation: SocialAutomationConfig
): ISResult {
  const missingInputs: string[] = [];
  const sources: string[] = ['Code Général des Impôts - Art. 219'];
  const assumptions: string[] = [];
  const tranches: ISResult['tranches'] = [];

  // Check if manual mode
  if (automation.isMode.mode === 'manual') {
    const manualAnnual = automation.isMode.manualValueAnnual;
    const divisorResult = computeDivisor(settings);
    
    if (manualAnnual !== null && manualAnnual !== undefined) {
      const monthlyPerPerson = divisorResult.divisor !== null
        ? annualToMonthlyPerPerson(manualAnnual, divisorResult.divisor)
        : null;
      
      if (monthlyPerPerson === null) {
        missingInputs.push(...divisorResult.missingInputs);
      }

      return {
        value: manualAnnual,
        annual: manualAnnual,
        monthlyPerPerson,
        tranches: [],
        formula: 'Mode manuel: valeur saisie par l\'utilisateur',
        sources: ['Saisie manuelle'],
        assumptions: [],
        missingInputs,
      };
    } else {
      missingInputs.push('automation.isMode.manualValueAnnual');
      return {
        value: null,
        annual: null,
        monthlyPerPerson: null,
        tranches: [],
        formula: 'Mode manuel: valeur manquante',
        sources: [],
        assumptions: [],
        missingInputs,
      };
    }
  }

  // AUTO mode - need taxable profit
  if (company.taxableProfitAnnual === null) {
    missingInputs.push('company.taxableProfitAnnual');
    return {
      value: null,
      annual: null,
      monthlyPerPerson: null,
      tranches: [],
      formula: 'IS = Bénéfice imposable × Taux — Bénéfice requis',
      sources,
      assumptions: [],
      missingInputs,
    };
  }

  const taxableProfit = company.taxableProfitAnnual;
  
  // Handle negative profit (loss)
  if (taxableProfit <= 0) {
    assumptions.push('Résultat déficitaire: IS = 0');
    
    const divisorResult = computeDivisor(settings);
    
    return {
      value: 0,
      annual: 0,
      monthlyPerPerson: 0,
      tranches: [],
      formula: `IS = 0 € (déficit de ${Math.abs(taxableProfit).toLocaleString('fr-FR')} €)`,
      sources,
      assumptions,
      missingInputs: divisorResult.missingInputs,
    };
  }

  let isAnnual = 0;
  let formula = '';

  const cap = company.isReducedRateCap ?? IS_RATES.reducedRateCap;

  if (company.isReducedRateEnabled) {
    // Apply reduced rate for PME
    assumptions.push('Taux réduit PME appliqué (éligibilité présumée)');
    
    if (taxableProfit <= cap) {
      // All profit at reduced rate
      isAnnual = taxableProfit * IS_RATES.reducedRate;
      tranches.push({
        label: `Tranche réduite (0 - ${cap.toLocaleString('fr-FR')} €)`,
        base: taxableProfit,
        rate: IS_RATES.reducedRate,
        amount: isAnnual,
      });
      formula = `IS = ${taxableProfit.toLocaleString('fr-FR')} € × ${IS_RATES.reducedRate * 100}% = ${isAnnual.toLocaleString('fr-FR')} €`;
    } else {
      // Split: reduced rate up to cap, normal rate above
      const reducedPart = cap * IS_RATES.reducedRate;
      const normalPart = (taxableProfit - cap) * IS_RATES.normalRate;
      isAnnual = reducedPart + normalPart;
      
      tranches.push({
        label: `Tranche réduite (0 - ${cap.toLocaleString('fr-FR')} €)`,
        base: cap,
        rate: IS_RATES.reducedRate,
        amount: reducedPart,
      });
      tranches.push({
        label: `Tranche normale (> ${cap.toLocaleString('fr-FR')} €)`,
        base: taxableProfit - cap,
        rate: IS_RATES.normalRate,
        amount: normalPart,
      });
      
      formula = `IS = (${cap.toLocaleString('fr-FR')} € × ${IS_RATES.reducedRate * 100}%) + (${(taxableProfit - cap).toLocaleString('fr-FR')} € × ${IS_RATES.normalRate * 100}%) = ${isAnnual.toLocaleString('fr-FR')} €`;
    }
  } else {
    // Standard rate only
    isAnnual = taxableProfit * IS_RATES.normalRate;
    tranches.push({
      label: 'Taux normal',
      base: taxableProfit,
      rate: IS_RATES.normalRate,
      amount: isAnnual,
    });
    formula = `IS = ${taxableProfit.toLocaleString('fr-FR')} € × ${IS_RATES.normalRate * 100}% = ${isAnnual.toLocaleString('fr-FR')} €`;
  }

  // Convert to monthly per person
  const divisorResult = computeDivisor(settings);
  const monthlyPerPerson = annualToMonthlyPerPerson(isAnnual, divisorResult.divisor);

  if (divisorResult.missingInputs.length > 0) {
    missingInputs.push(...divisorResult.missingInputs);
  }

  sources.push(`Taux IS ${settings.year}: ${IS_RATES.normalRate * 100}% (normal), ${IS_RATES.reducedRate * 100}% (réduit)`);

  return {
    value: isAnnual,
    annual: isAnnual,
    monthlyPerPerson,
    tranches,
    formula,
    sources,
    assumptions,
    missingInputs,
  };
}
