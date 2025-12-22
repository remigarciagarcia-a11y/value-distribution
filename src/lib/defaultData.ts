// Default data and example scenarios for the simulator

import type { SimulatorInputs, SocialeInputs } from './types';
import { loadScenarios } from './scenarios';

// Default automation config for Part Sociale
const defaultSocialeAutomation: Pick<SocialeInputs, 'employee' | 'company' | 'vat' | 'automation'> = {
  employee: {
    grossMonthly: null,
    brutMonthly: null,
    status: 'cadre',
    pasRate: null,
    irMonthlyManual: null,
  },
  company: {
    taxableProfitAnnual: null,
    isReducedRateEnabled: false,
  },
  vat: {
    sales: [],
    purchases: [],
  },
  automation: {
    cotisationsMode: { mode: 'auto', manualValue: null },
    irMode: { mode: 'auto', manualValue: null },
    isMode: { mode: 'auto', manualValue: null },
    vatMode: { mode: 'auto', manualValue: null },
  },
};

export const emptyInputs: SimulatorInputs = {
  base: {
    anneeReference: '2025',
    caAnnuelHT: null,
    ponderation: 'HEADCOUNT',
    effectif: null,
    etp: null,
  },
  capital: {
    dividendes: null,
    reserves: null,
    interetsCapital: null,
  },
  organisation: {
    achatsMatieresEtSousTraitance: null,
    chargesExternes: null,
    interetsDette: null,
    locauxEnergie: null,
    outilsIT: null,
    managementIntermediaire: null,
    fonctionsSupport: null,
  },
  investissement: {
    amortissements: null,
    formation: null,
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
    ...defaultSocialeAutomation,
  },
  salarie: {
    nom: '',
    adresse: '',
    poste: '',
    statut: '',
    anciennete: '',
    moisAffiche: 'Décembre 2025',
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

// Example scenario matching the reference design
export const exampleScenario1: SimulatorInputs = {
  base: {
    anneeReference: '2025',
    caAnnuelHT: 1047600, // 8730 × 12 × 10 = gives 8730 VP with 10 employees
    ponderation: 'HEADCOUNT',
    effectif: 10,
    etp: 9.5,
  },
  capital: {
    dividendes: 72000, // → 600 €/mois/personne
    reserves: 58800, // → 490 €/mois/personne
    interetsCapital: null,
  },
  organisation: {
    achatsMatieresEtSousTraitance: null,
    chargesExternes: null,
    interetsDette: null,
    locauxEnergie: 60000, // → 500 €
    outilsIT: 50400, // → 420 €
    managementIntermediaire: 42000, // → 350 €
    fonctionsSupport: 51600, // → 430 €
  },
  investissement: {
    amortissements: 54000, // → 450 €
    formation: 36000, // → 300 €
    rAndD: 42000, // → 350 €
  },
  sociale: {
    sante: 820,
    retraite: 880,
    chomage: 260,
    solidarite: 190,
    csgCrds: 210,
    impotRevenu: 170,
    impotSocietes: null,
    employee: {
      grossMonthly: 4500,
      brutMonthly: 4500,
      status: 'cadre',
      pasRate: 0.12,
      irMonthlyManual: null,
    },
    company: {
      taxableProfitAnnual: 150000,
      isReducedRateEnabled: true,
    },
    vat: {
      sales: [{ id: '1', rate: 0.20, baseHTAnnual: 1047600 }],
      purchases: [{ id: '2', rate: 0.20, baseHTAnnual: 400000 }],
    },
    automation: {
      cotisationsMode: { mode: 'auto', manualValue: null },
      irMode: { mode: 'auto', manualValue: null },
      isMode: { mode: 'auto', manualValue: null },
      vatMode: { mode: 'auto', manualValue: null },
    },
  },
  salarie: {
    nom: 'Karl Marx',
    adresse: '12 rue de la Commune\n75000 Paris',
    poste: 'Développeur logiciel',
    statut: 'Cadre - Syntec 140',
    anciennete: '2 ans et 6 mois',
    moisAffiche: 'Décembre 2025',
  },
  partPersonnelle: {
    salaireNetApresIR: 2310,
    primes: [],
    avantages: [],
  },
  deficitDette: {
    montantDeficit: -450,
    dontSecuriteSociale: 45,
  },
  mode: 'simple',
};

// Second scenario: smaller company
export const exampleScenario2: SimulatorInputs = {
  base: {
    anneeReference: '2025',
    caAnnuelHT: 360000,
    ponderation: 'HEADCOUNT',
    effectif: 5,
    etp: 4.5,
  },
  capital: {
    dividendes: 24000,
    reserves: 12000,
    interetsCapital: null,
  },
  organisation: {
    achatsMatieresEtSousTraitance: 36000,
    chargesExternes: 24000,
    interetsDette: null,
    locauxEnergie: 18000,
    outilsIT: 12000,
    managementIntermediaire: null,
    fonctionsSupport: null,
  },
  investissement: {
    amortissements: 6000,
    formation: 3000,
    rAndD: 12000,
  },
  sociale: {
    sante: 650,
    retraite: 720,
    chomage: 180,
    solidarite: 150,
    csgCrds: 180,
    impotRevenu: 140,
    impotSocietes: 18000,
    employee: {
      grossMonthly: 3800,
      brutMonthly: 3800,
      status: 'cadre',
      pasRate: 0.10,
      irMonthlyManual: null,
    },
    company: {
      taxableProfitAnnual: 45000,
      isReducedRateEnabled: true,
    },
    vat: {
      sales: [{ id: '1', rate: 0.20, baseHTAnnual: 360000 }],
      purchases: [{ id: '2', rate: 0.20, baseHTAnnual: 150000 }],
    },
    automation: {
      cotisationsMode: { mode: 'auto', manualValue: null },
      irMode: { mode: 'auto', manualValue: null },
      isMode: { mode: 'auto', manualValue: null },
      vatMode: { mode: 'auto', manualValue: null },
    },
  },
  salarie: {
    nom: 'Marie Curie',
    adresse: '45 avenue des Sciences\n69000 Lyon',
    poste: 'Responsable R&D',
    statut: 'Cadre - Convention Chimie',
    anciennete: '5 ans et 3 mois',
    moisAffiche: 'Décembre 2025',
  },
  partPersonnelle: {
    salaireNetApresIR: 3200,
    primes: [
      { id: '1', label: 'Prime annuelle', montant: 250 },
    ],
    avantages: [
      { id: '2', label: 'Tickets restaurant', montant: 150 },
    ],
  },
  deficitDette: {
    montantDeficit: null,
    dontSecuriteSociale: null,
  },
  mode: 'simple',
};

// Load scenarios from JSON and add the empty scenario
const jsonScenarios = loadScenarios();

export const scenarios = [
  { id: 'empty', label: 'Vide', data: emptyInputs },
  ...jsonScenarios,
];
