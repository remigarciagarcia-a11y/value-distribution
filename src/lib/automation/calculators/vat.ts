// ============================================
// VAT CALCULATOR
// France V1
// ============================================

import type {
  AutomatedSettings,
  CompanyInputs,
  SocialAutomationConfig,
  VATResult,
  VATLine,
} from '../types';
import { computeDivisor, annualToMonthlyPerPerson } from './divisor';

/**
 * Compute VAT (TVA) - Net amount to be paid to the state
 * TVA nette = TVA collectée - TVA déductible
 * 
 * @param company Company inputs with VAT lines
 * @param settings Calculation settings
 * @param automation Automation config
 */
export function computeVAT(
  company: CompanyInputs,
  settings: AutomatedSettings,
  automation: SocialAutomationConfig
): VATResult {
  const missingInputs: string[] = [];
  const sources: string[] = ['Code Général des Impôts - TVA'];
  const assumptions: string[] = [];

  // Check if manual mode
  if (automation.vatMode.mode === 'manual') {
    const manualAnnual = automation.vatMode.manualValueAnnual;
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
        collectedAnnual: null,
        deductibleAnnual: null,
        netAnnual: manualAnnual,
        netMonthlyPerPerson: monthlyPerPerson,
        salesBreakdown: [],
        purchasesBreakdown: [],
        formula: 'Mode manuel: valeur saisie par l\'utilisateur',
        sources: ['Saisie manuelle'],
        assumptions: [],
        missingInputs,
      };
    } else {
      missingInputs.push('automation.vatMode.manualValueAnnual');
      return {
        value: null,
        collectedAnnual: null,
        deductibleAnnual: null,
        netAnnual: null,
        netMonthlyPerPerson: null,
        salesBreakdown: [],
        purchasesBreakdown: [],
        formula: 'Mode manuel: valeur manquante',
        sources: [],
        assumptions: [],
        missingInputs,
      };
    }
  }

  // AUTO mode - need VAT lines
  const hasSales = company.vatSales && company.vatSales.length > 0;
  const hasPurchases = company.vatPurchases && company.vatPurchases.length > 0;

  if (!hasSales && !hasPurchases) {
    missingInputs.push('company.vatSales');
    missingInputs.push('company.vatPurchases');
    return {
      value: null,
      collectedAnnual: null,
      deductibleAnnual: null,
      netAnnual: null,
      netMonthlyPerPerson: null,
      salesBreakdown: [],
      purchasesBreakdown: [],
      formula: 'TVA nette = TVA collectée - TVA déductible — Données TVA requises',
      sources,
      assumptions: [],
      missingInputs,
    };
  }

  // Calculate VAT collected (on sales)
  const salesBreakdown = calculateVATBreakdown(company.vatSales ?? []);
  const collectedAnnual = salesBreakdown.reduce((sum, item) => sum + item.vatAmount, 0);

  // Calculate VAT deductible (on purchases)
  const purchasesBreakdown = calculateVATBreakdown(company.vatPurchases ?? []);
  const deductibleAnnual = purchasesBreakdown.reduce((sum, item) => sum + item.vatAmount, 0);

  // Net VAT to pay
  const netAnnual = collectedAnnual - deductibleAnnual;

  // Convert to monthly per person
  const divisorResult = computeDivisor(settings);
  const netMonthlyPerPerson = annualToMonthlyPerPerson(netAnnual, divisorResult.divisor);

  if (divisorResult.missingInputs.length > 0) {
    missingInputs.push(...divisorResult.missingInputs);
  }

  // Build formula
  const formulaParts: string[] = [];
  for (const item of salesBreakdown) {
    formulaParts.push(`${item.baseHT.toLocaleString('fr-FR')} € × ${(item.rate * 100).toFixed(1)}%`);
  }
  
  const formula = `TVA nette = ${collectedAnnual.toLocaleString('fr-FR')} € (collectée) - ${deductibleAnnual.toLocaleString('fr-FR')} € (déductible) = ${netAnnual.toLocaleString('fr-FR')} €`;

  // Add rate breakdown to sources
  const rates = [...new Set([...salesBreakdown, ...purchasesBreakdown].map(b => b.rate))];
  sources.push(`Taux TVA utilisés: ${rates.map(r => `${(r * 100).toFixed(1)}%`).join(', ')}`);

  if (netAnnual < 0) {
    assumptions.push('Crédit de TVA: montant à récupérer auprès de l\'État');
  }

  return {
    value: netAnnual,
    collectedAnnual,
    deductibleAnnual,
    netAnnual,
    netMonthlyPerPerson,
    salesBreakdown,
    purchasesBreakdown,
    formula,
    sources,
    assumptions,
    missingInputs,
  };
}

/**
 * Calculate VAT breakdown for a set of lines
 */
function calculateVATBreakdown(
  lines: VATLine[]
): { rate: number; baseHT: number; vatAmount: number }[] {
  return lines.map(line => ({
    rate: line.rate,
    baseHT: line.baseHTAnnual,
    vatAmount: line.baseHTAnnual * line.rate,
  }));
}

/**
 * Standard French VAT rates for reference
 */
export const FRENCH_VAT_RATES = {
  normal: 0.20, // 20% - standard rate
  intermediate: 0.10, // 10% - intermediate rate (restaurants, transport, etc.)
  reduced: 0.055, // 5.5% - reduced rate (food, books, etc.)
  superReduced: 0.021, // 2.1% - super reduced (press, medicine)
};
