// Scenario loader - converts JSON scenarios to SimulatorInputs format

import type { SimulatorInputs } from '../types';
import type { ScenarioData } from './types';
import scenariosJson from './scenarios.json';

export type { ScenarioData } from './types';

// Convert JSON scenario to SimulatorInputs format
function convertScenarioToInputs(scenario: ScenarioData): SimulatorInputs {
  const { settings, company, employee } = scenario;
  
  // Calculate total organisation costs
  const orgTotal = Object.values(company.pnlAnnual.organisation).reduce((sum, val) => sum + (val || 0), 0);
  const investTotal = Object.values(company.pnlAnnual.investment).reduce((sum, val) => sum + (val || 0), 0);
  
  // Extract specific organisation fields with fallbacks
  const org = company.pnlAnnual.organisation;
  const inv = company.pnlAnnual.investment;
  const cap = company.pnlAnnual.capital;
  
  return {
    base: {
      anneeReference: String(settings.year),
      caAnnuelHT: company.caAnnualHT,
      ponderation: settings.divisorMode === 'ETP' ? 'FTE' : 'HEADCOUNT',
      effectif: settings.headcount,
      etp: settings.headcount, // Use headcount as ETP default
    },
    capital: {
      dividendes: cap.dividends || null,
      reserves: null,
      interetsCapital: cap.interestCapital || null,
    },
    organisation: {
      achatsMatieresEtSousTraitance: (org.materialsPurchases || 0) + (org.subcontracting || 0) || null,
      chargesExternes: (org.marketingSales || 0) + (org.logistics || 0) + (org.insuranceFees || 0) || null,
      interetsDette: cap.interestDebt || null,
      locauxEnergie: (org.rentAndUtilities || 0) + (org.energy || 0) || null,
      outilsIT: (org.softwareAndTools || 0) + (org.hostingInfra || 0) || null,
      managementIntermediaire: org.maintenance || null,
      fonctionsSupport: org.staffingAgency || null,
    },
    investissement: {
      amortissements: inv.capexEquipment || null,
      formation: inv.training || null,
      rAndD: null,
    },
    sociale: {
      sante: null,
      retraite: null,
      chomage: null,
      solidarite: null,
      csgCrds: null,
      impotRevenu: null,
      impotSocietes: null,
      employee: {
        grossMonthly: employee.grossMonthly,
        brutMonthly: employee.grossMonthly,
        status: employee.isCadre ? 'cadre' : 'non_cadre',
        pasRate: employee.pasRate,
        irMonthlyManual: employee.irMonthlyManual || null,
      },
      company: {
        taxableProfitAnnual: company.taxableProfitAnnual,
        isReducedRateEnabled: company.isReducedRateEnabled,
      },
      vat: {
        sales: company.vat.sales.map((line, i) => ({
          id: `s${i}`,
          rate: line.rate,
          baseHTAnnual: line.baseHTAnnual,
        })),
        purchases: company.vat.purchases.map((line, i) => ({
          id: `p${i}`,
          rate: line.rate,
          baseHTAnnual: line.baseHTAnnual,
        })),
      },
      automation: {
        cotisationsMode: { mode: 'auto', manualValue: null },
        irMode: { mode: employee.pasRate > 0 ? 'manual' : 'auto', manualValue: null },
        isMode: { mode: company.pnlAnnual.social.citIS === 'AUTO' ? 'auto' : 'manual', manualValue: null },
        vatMode: { 
          mode: company.pnlAnnual.social.vatNet === 'AUTO' ? 'auto' : 'manual', 
          manualValue: company.pnlAnnual.social.vatNetAnnualManual || null 
        },
      },
    },
    salarie: {
      nom: '',
      adresse: '',
      poste: employee.jobTitle,
      statut: employee.isCadre ? 'Cadre' : 'Non-cadre',
      anciennete: '',
      moisAffiche: formatPeriodDate(settings.periodDate),
    },
    partPersonnelle: {
      salaireNetApresIR: null,
      primes: employee.primes.map((p, i) => ({
        id: `prime${i}`,
        label: p.label,
        montant: p.amount,
      })),
      avantages: employee.avantages.map((a, i) => ({
        id: `avantage${i}`,
        label: a.label,
        montant: a.amount,
      })),
    },
    deficitDette: {
      montantDeficit: null,
      dontSecuriteSociale: null,
    },
    mode: 'simple',
  };
}

function formatPeriodDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Load and convert all scenarios from JSON
export function loadScenarios(): Array<{ id: string; label: string; data: SimulatorInputs }> {
  return (scenariosJson as ScenarioData[]).map(scenario => ({
    id: scenario.scenarioId,
    label: scenario.label,
    data: convertScenarioToInputs(scenario),
  }));
}

// Get raw scenario data
export function getRawScenarios(): ScenarioData[] {
  return scenariosJson as ScenarioData[];
}
