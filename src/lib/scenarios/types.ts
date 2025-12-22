// Types for scenario JSON data (new prefill format)

export interface ScenarioVatLine {
  rate: number;
  baseHTAnnual: number;
}

export interface ScenarioPrefill {
  'base.ponderation': 'HEADCOUNT' | 'FTE';
  'base.effectif': number;
  'base.etp': number;
  'base.caAnnuelHT': number;
  'sociale.company.taxableProfitAnnual': number;
  'sociale.company.isReducedRateEnabled': boolean;
  'sociale.automation.isMode': 'AUTO' | 'MANUAL';
  'capital.dividendes': number;
  'capital.reserves': number;
  'sociale.vat.sales': ScenarioVatLine[];
  'sociale.vat.purchases': ScenarioVatLine[];
  'sociale.automation.vatMode.manualValue': number | null;
  'organisation.locauxEnergie': number;
  'organisation.outilsIT': number;
  'organisation.managementIntermediaire': number;
  'organisation.fonctionsSupport': number;
  'investissement.amortissements': number;
  'investissement.formation': number;
  'investissement.rAndD': number;
}

export interface ScenarioTotals {
  'organisation.total': number;
  'investissement.total': number;
  'fonctionnelle.total': number;
  'capital.total': number;
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  prefill: ScenarioPrefill;
  totals: ScenarioTotals;
}
