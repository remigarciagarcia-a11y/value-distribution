// Types for scenario JSON data

export interface ScenarioVatLine {
  rate: number;
  baseHTAnnual: number;
}

export interface ScenarioPrime {
  label: string;
  amount: number;
}

export interface ScenarioAvantage {
  label: string;
  amount: number;
}

export interface ScenarioSettings {
  year: number;
  periodDate: string;
  divisorMode: 'HEADCOUNT' | 'ETP';
  headcount: number;
}

export interface ScenarioCompany {
  name: string;
  sector: string;
  caAnnualHT: number;
  taxableProfitAnnual: number;
  isReducedRateEnabled: boolean;
  accidentAtMpRateDefault: number;
  pnlAnnual: {
    organisation: Record<string, number>;
    investment: Record<string, number>;
    capital: Record<string, number>;
    social: {
      citIS: 'AUTO' | 'MANUAL';
      vatNet: 'AUTO' | 'MANUAL';
      vatNetAnnualManual?: number;
    };
  };
  vat: {
    sales: ScenarioVatLine[];
    purchases: ScenarioVatLine[];
  };
}

export interface ScenarioEmployee {
  jobTitle: string;
  isCadre: boolean;
  grossMonthly: number;
  pasRate: number;
  irMonthlyManual?: number | null;
  primes: ScenarioPrime[];
  avantages: ScenarioAvantage[];
  accidentAtMpRate: number;
}

export interface ScenarioData {
  scenarioId: string;
  label: string;
  settings: ScenarioSettings;
  company: ScenarioCompany;
  employee: ScenarioEmployee;
}
