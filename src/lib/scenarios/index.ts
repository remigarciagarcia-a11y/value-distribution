// Scenario loader - converts JSON scenarios to SimulatorInputs format

import type { SimulatorInputs } from '../types';
import type { ScenarioData } from './types';
import scenariosJson from './scenarios.json';

export type { ScenarioData } from './types';

// Convert JSON scenario prefill to SimulatorInputs format
function convertScenarioToInputs(scenario: ScenarioData): SimulatorInputs {
  const { prefill } = scenario;
  
  return {
    base: {
      anneeReference: '2025',
      caAnnuelHT: prefill['base.caAnnuelHT'],
      ponderation: prefill['base.ponderation'] === 'FTE' ? 'FTE' : 'HEADCOUNT',
      effectif: prefill['base.effectif'],
      etp: prefill['base.etp'],
    },
    capital: {
      dividendes: prefill['capital.dividendes'] || null,
      reserves: prefill['capital.reserves'] || null,
      interetsCapital: null,
    },
    organisation: {
      achatsMatieresEtSousTraitance: null,
      chargesExternes: null,
      interetsDette: null,
      locauxEnergie: prefill['organisation.locauxEnergie'] || null,
      outilsIT: prefill['organisation.outilsIT'] || null,
      managementIntermediaire: prefill['organisation.managementIntermediaire'] || null,
      fonctionsSupport: prefill['organisation.fonctionsSupport'] || null,
    },
    investissement: {
      amortissements: prefill['investissement.amortissements'] || null,
      formation: prefill['investissement.formation'] || null,
      rAndD: prefill['investissement.rAndD'] || null,
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
        grossMonthly: 3500,
        brutMonthly: 3500,
        status: 'cadre',
        pasRate: 0,
        irMonthlyManual: null,
      },
      company: {
        taxableProfitAnnual: prefill['sociale.company.taxableProfitAnnual'],
        isReducedRateEnabled: prefill['sociale.company.isReducedRateEnabled'],
      },
      vat: {
        sales: prefill['sociale.vat.sales'].map((line, i) => ({
          id: `s${i}`,
          rate: line.rate,
          baseHTAnnual: line.baseHTAnnual,
        })),
        purchases: prefill['sociale.vat.purchases'].map((line, i) => ({
          id: `p${i}`,
          rate: line.rate,
          baseHTAnnual: line.baseHTAnnual,
        })),
      },
      automation: {
        cotisationsMode: { mode: 'auto', manualValue: null },
        irMode: { mode: 'auto', manualValue: null },
        isMode: { mode: prefill['sociale.automation.isMode'] === 'AUTO' ? 'auto' : 'manual', manualValue: null },
        vatMode: { 
          mode: prefill['sociale.automation.vatMode.manualValue'] !== null ? 'manual' : 'auto', 
          manualValue: prefill['sociale.automation.vatMode.manualValue'] 
        },
      },
    },
    salarie: {
      nom: '',
      adresse: '',
      poste: '',
      statut: 'Cadre',
      anciennete: '',
      moisAffiche: 'Janvier 2025',
    },
    partPersonnelle: {
      salaireNetApresIR: null,
      primes: [],
      avantages: [],
    },
    deficitDette: {
      montantDeficit: null,
      dontSecuriteSociale: null,
    },
    mode: 'simple',
  };
}

// Load and convert all scenarios from JSON
export function loadScenarios(): Array<{ id: string; label: string; data: SimulatorInputs }> {
  return (scenariosJson as ScenarioData[]).map(scenario => ({
    id: scenario.id,
    label: scenario.name,
    data: convertScenarioToInputs(scenario),
  }));
}

// Get raw scenario data
export function getRawScenarios(): ScenarioData[] {
  return scenariosJson as ScenarioData[];
}
